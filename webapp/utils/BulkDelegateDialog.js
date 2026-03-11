sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/Token",
    "../utils/UserSearchHelpDialog",
    "../utils/TasksSearchHelpDialog"
], function (Fragment, MessageBox, MessageToast, Token, UserSearchHelpDialogHelper, TasksSearchHelpDialogHelper)
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

            oView.setBusy(true);
            oOperation.execute().then(
                function ()
                {
                    that._clearInputs();
                    that._oBulkDelegateDialog.then(function (oDialog)
                    {
                        oDialog.close();
                    });

                    oView.setBusy(false);

                    MessageToast.show("Delegation successful.");
                    oModel.refresh();
                }
            ).catch(
                function (oError)
                {
                    oView.setBusy(false);
                    MessageBox.error("Error: " + oError.message);
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
            oView.byId("multiTaskInput").removeAllTokens();
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