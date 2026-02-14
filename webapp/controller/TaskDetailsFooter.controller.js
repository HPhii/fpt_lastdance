sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
], function (BaseController, MessageBox, MessageToast)
{
    "use strict";

    return BaseController.extend("z.wf.zwfmanagement.controller.TaskDetailsFooter", {
        onDecisionPress: function (oEvent)
        {
            var oButton = oEvent.getSource();
            var sDecisionKey = oButton.data("DecisionKey");
            var sWorkItemID = oButton.data("WorkItemID");
            var sText = oButton.getText();

            if (sDecisionKey)
            {
                sDecisionKey = sDecisionKey.toString().padStart(4, "0");
            }

            var that = this;

            MessageBox.confirm("Do you want to perform action: " + sText + "?", {
                onClose: function (oAction)
                {
                    if (oAction === MessageBox.Action.OK)
                    {
                        that._callODataV4Action(sWorkItemID, sDecisionKey);
                    }
                },
            });
        },

        onApproveAction: function ()
        {
            var oDetailPanel = this.byId("detailPanel");
            var oContext = oDetailPanel.getBindingContext();
            var oResourceBundle = this.getView()
                .getModel("i18n")
                .getResourceBundle();
            var sConfirmMessage = oResourceBundle.getText("confirmApprove");

            var that = this;
            MessageBox.confirm(sConfirmMessage, {
                onClose: function (oAction)
                {
                    if (oAction === MessageBox.Action.OK)
                    {
                        that._callBoundAction("approve", oContext);
                    }
                },
            });
        },

        onRejectAction: function ()
        {
            var oDetailPanel = this.byId("detailPanel");
            var oContext = oDetailPanel.getBindingContext();
            var oResourceBundle = this.getView()
                .getModel("i18n")
                .getResourceBundle();
            var sConfirmMessage = oResourceBundle.getText("confirmReject");

            var that = this;
            MessageBox.confirm(sConfirmMessage, {
                onClose: function (oAction)
                {
                    if (oAction === MessageBox.Action.OK)
                    {
                        that._callBoundAction("reject", oContext);
                    }
                },
            });
        },

        onClaimAction: function ()
        {
            var oDetailPanel = this.byId("detailPanel");
            var oContext = oDetailPanel.getBindingContext();
            var oResourceBundle = this.getView()
                .getModel("i18n")
                .getResourceBundle();
            var sConfirmMessage = oResourceBundle.getText("confirmClaim");

            var that = this;
            MessageBox.confirm(sConfirmMessage, {
                onClose: function (oAction)
                {
                    if (oAction === MessageBox.Action.OK)
                    {
                        that._callBoundAction("claim", oContext);
                    }
                },
            });
        },

        onForwardAction: function ()
        {
            var oDetailPanel = this.byId("detailPanel");
            var oContext = oDetailPanel.getBindingContext();
            var oResourceBundle = this.getView()
                .getModel("i18n")
                .getResourceBundle();
            var sConfirmMessage = oResourceBundle.getText("confirmForward");

            var that = this;
            MessageBox.confirm(sConfirmMessage, {
                onClose: function (oAction)
                {
                    if (oAction === MessageBox.Action.OK)
                    {
                        that._callBoundAction("forward", oContext);
                    }
                },
            });
        },

        onReleaseAction: function ()
        {
            var oDetailPanel = this.byId("detailPanel");
            var oContext = oDetailPanel.getBindingContext();
            var oResourceBundle = this.getView()
                .getModel("i18n")
                .getResourceBundle();
            var sConfirmMessage = oResourceBundle.getText("confirmRelease");

            var that = this;
            MessageBox.confirm(sConfirmMessage, {
                onClose: function (oAction)
                {
                    if (oAction === MessageBox.Action.OK)
                    {
                        that._callBoundAction("release", oContext);
                    }
                },
            });
        },

        onSuspendAction: function ()
        {
            var oDetailPanel = this.byId("detailPanel");
            var oContext = oDetailPanel.getBindingContext();
            var oResourceBundle = this.getView()
                .getModel("i18n")
                .getResourceBundle();
            var sConfirmMessage = oResourceBundle.getText("confirmSuspend");

            var that = this;
            MessageBox.confirm(sConfirmMessage, {
                onClose: function (oAction)
                {
                    if (oAction === MessageBox.Action.OK)
                    {
                        that._callBoundAction("suspend", oContext);
                    }
                },
            });
        },

        _callBoundAction: function (sActionName, oContext)
        {
            var oResourceBundle = this.getView()
                .getModel("i18n")
                .getResourceBundle();
            var oViewModel = this.getView().getModel("worklistView");

            if (!oContext)
            {
                MessageBox.error(oResourceBundle.getText("errorNoContext"));
                return;
            }

            var sPath =
                "com.sap.gateway.srvd.zsd_gsp26sap02_wf_task.v0001." +
                sActionName +
                "(...)";
            var oModel = this.getView().getModel();

            var oOperation = oModel.bindContext(sPath, oContext);

            oViewModel.setProperty("/detailBusy", true);

            oOperation
                .execute()
                .then(
                    function ()
                    {
                        oViewModel.setProperty("/detailBusy", false);
                        MessageToast.show(oResourceBundle.getText("successMessage"));

                        // Refresh the list and counts
                        this._oList.getBinding("items").refresh();
                        this._updateCounts();

                        // Close detail panel
                        this.onCloseDetail();
                    }.bind(this),
                )
                .catch(
                    function (oError)
                    {
                        oViewModel.setProperty("/detailBusy", false);
                        MessageBox.error("Error: " + oError.message);
                    }.bind(this),
                );
        },

    });
});