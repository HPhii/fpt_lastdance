sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/Token",
    "../utils/UserSearchHelpDialog",
    "../utils/TasksSearchHelpDialog",
    "../utils/BulkDelegateResultDialog"
], function (Fragment, MessageBox, MessageToast, Token, UserSearchHelpDialogHelper, TasksSearchHelpDialogHelper, BulkDelegateResultDialogHelper)
{
    "use strict";

    return {
        _oView: null,
        _oBulkDelegateDialog: null,

        onOpen: function (oView)
        {
            this._oView = oView;
            var that = this;

            if (!this._oBulkDelegateDialog)
            {
                this._oBulkDelegateDialog = Fragment.load({
                    id: oView.getId(),
                    name: "z.wf.zwfmanagement.view.fragments.dialog.BulkDelegateDialog",
                    controller: this,
                }).then(function (oDialog)
                {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._oBulkDelegateDialog.then(function (oDialog)
            {
                oDialog.open();
                that._fillTaskTokens();

                var oMultiInput = oView.byId("multiTaskInput");
                if (!oMultiInput.data("validatorAdded"))
                {
                    oMultiInput.addValidator(function (args)
                    {
                        if (args.suggestionObject)
                        {
                            oMultiInput.setValueState("None");
                            return new Token({
                                key: args.suggestionObject.getKey(),
                                text: args.suggestionObject.getText()
                            });
                        }

                        var text = args.text;
                        var oModel = oView.getModel();

                        return new Promise(function (resolve, reject)
                        {
                            var sPath = "/WfTasks('" + text + "')";
                            var oBinding = oModel.bindContext(sPath);

                            oMultiInput.setBusy(true);
                            oBinding.requestObject().then(function (oData)
                            {
                                oMultiInput.setBusy(false);
                                if (oData.TechnicalStatus !== "SELECTED") {
                                    oMultiInput.setValueState("Error");
                                    oMultiInput.setValueStateText("Only SELECTED tasks can be delegated");
                                    reject();
                                    return;
                                }
                                oMultiInput.setValueState("None");
                                resolve(new Token({ key: oData.WorkItemID, text: oData.WorkItemText }));
                            }).catch(function ()
                            {
                                oMultiInput.setBusy(false);
                                oMultiInput.setValueState("Error");
                                oMultiInput.setValueStateText("Work item does not exist");
                                reject();
                            });
                        });
                    });
                    oMultiInput.data("validatorAdded", true);
                }
            });
        },

        _fillTaskTokens: function ()
        {
            var oView = this._oView,
                oList = oView.byId("idTasksList"),
                aItems = oList.getSelectedItems();

            if (aItems.length === 0) return;

            aItems.forEach(function (oItem)
            {
                var oContext = oItem.getBindingContext(),
                    sWorkItemID = oContext.getProperty("WorkItemID"),
                    sTaskTitle = oContext.getProperty("WorkItemText");

                var oToken = new Token({
                    key: sWorkItemID,
                    text: sTaskTitle
                });

                oView.byId("multiTaskInput").addToken(oToken);
            });
        },

        onConfirmDelegate: function ()
        {
            var that = this,
                oView = this._oView,
                oModel = oView.getModel(),
                oMultiInput = oView.byId("multiTaskInput"),
                aTokens = oMultiInput.getTokens(),
                oUserInput = oView.byId("delegateUserInput"),
                sDelegateUser = oUserInput.getValue();

            if (!sDelegateUser || aTokens.length === 0)
            {
                MessageToast.show("Please select a user and at least one task to delegate.");
                return;
            }

            var oPayload = {
                USER_ID: sDelegateUser,
                _WorkItems: aTokens.map(function (oToken)
                {
                    return {
                        WorkItemID: oToken.getKey()
                    };
                })
            };

            var sNamespace = "com.sap.gateway.srvd.zsd_gsp26sap02_wf_task.v0001.";
            var sPath = "/WfTasks(WorkItemID='')/" + sNamespace + "bulkDelegation(...)";
            var oOperation = oModel.bindContext(sPath);

            Object.keys(oPayload).forEach(function (sKey)
            {
                oOperation.setParameter(sKey, oPayload[sKey]);
            });

            var oMessageManager = sap.ui.getCore().getMessageManager();
            var iMessagesBefore = oMessageManager.getMessageModel().getData().length;

            oView.setBusy(true);
            oOperation.execute().then(
                function ()
                {
                    oView.setBusy(false);
                    oModel.refresh();
                    var oList = oView.byId("idTasksList");
                    if (oList && oList.getBinding("items"))
                    {
                        oList.getBinding("items").refresh();
                    }

                    var aMessages = oMessageManager.getMessageModel().getData().slice(iMessagesBefore);

                    if (aMessages.length > 0)
                    {
                        BulkDelegateResultDialogHelper.show(oView, aMessages, false, "Delegation completed. Please check the statuses below.", function ()
                        {
                            that._clearInputs();
                            that._oBulkDelegateDialog.then(function (d) { d.close(); });
                        });
                    } else
                    {
                        that._clearInputs();
                        that._oBulkDelegateDialog.then(function (oDialog)
                        {
                            oDialog.close();
                        });
                        MessageToast.show("Delegation successful.");
                    }
                }
            ).catch(
                function (oError)
                {
                    oView.setBusy(false);

                    var aDetails = [];
                    var oMainErrorMsg = null;

                    if (oError.error)
                    {
                        oMainErrorMsg = {
                            code: oError.error.code || "Error",
                            message: oError.error.message || oError.message,
                            numericSeverity: 4
                        };
                        aDetails.push(oMainErrorMsg);

                        if (oError.error.details)
                        {
                            aDetails = aDetails.concat(oError.error.details);
                        }
                    } else
                    {
                        oMainErrorMsg = {
                            code: "Error",
                            message: oError.message,
                            numericSeverity: 4
                        };
                        aDetails.push(oMainErrorMsg);
                        aDetails = aDetails.concat(oMessageManager.getMessageModel().getData().slice(iMessagesBefore));
                    }

                    if (aDetails && aDetails.length > 0)
                    {
                        BulkDelegateResultDialogHelper.show(oView, aDetails, true, "An error occurred during delegation. Please see details below.", function ()
                        {
                            that._clearInputs();
                            that._oBulkDelegateDialog.then(function (d) { d.close(); });
                        });
                    } else
                    {
                        MessageBox.error("Error: " + oError.message);
                    }
                }
            );

        },



        onCloseDelegateDialog: function ()
        {
            this._clearInputs();
            this._oBulkDelegateDialog.then(function (oDialog)
            {
                oDialog.close();
            });
        },

        _clearInputs: function ()
        {
            var oView = this._oView;
            oView.byId("delegateUserInput").setValue("");
            var oMultiTaskInput = oView.byId("multiTaskInput");
            oMultiTaskInput.removeAllTokens();
            oMultiTaskInput.setValueState("None");
            oMultiTaskInput.setValue("");
        },

        onTaskLiveChange: function (oEvent)
        {
            var oInput = oEvent.getSource();
            oInput.setValueState("None");
        },

        onOpenUserSearchHelp: function ()
        {
            var oView = this._oView;
            var oUserInput = oView.byId("delegateUserInput");

            UserSearchHelpDialogHelper.onOpen(oView, oUserInput);
        },

        onOpenTaskSearchHelp: function ()
        {
            var oView = this._oView;

            TasksSearchHelpDialogHelper.onOpen(oView);
        }
    };
});