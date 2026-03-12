sap.ui.define([
    "sap/ui/core/Fragment"
], function (Fragment)
{
    "use strict";

    return {
        _oView: null,
        _oDecisionDialog: null,
        _sActionType: null,
        _sDecisionKey: null,

        onOpen: function (oView, sText, sActionType, sDecisionKey)
        {
            this._oView = oView;
            this._sActionType = sActionType;
            this._sDecisionKey = sDecisionKey || null;

            var oResourceBundle = oView.getModel("i18n").getResourceBundle(),
                sConfirmMessage = oResourceBundle.getText("confirmDecision", [sText]);

            if (!this._oDecisionDialog)
            {
                this._oDecisionDialog = Fragment.load({
                    id: oView.getId(),
                    name: "z.wf.zwfmanagement.view.fragments.dialog.ActionDecisionDialog",
                    controller: this
                }).then(function (oDialog)
                {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._oDecisionDialog.then(function (oDialog)
            {
                oView.byId("textReason").setText(sConfirmMessage);
                oDialog.open();
            });
        },

        onCancel: function ()
        {
            var oView = this._oView;

            this._oDecisionDialog.then(function (oDialog)
            {
                oView.byId("reasonInput").setValue("");
                oDialog.close();
            });
        },

        onConfirm: function ()
        {
            var oView = this._oView,
                sReason = oView.byId("reasonInput").getValue(),
                oController = oView.getController(),
                oContext = oView.getBindingContext(),
                sActionType = this._sActionType,
                oPayload;

            switch (sActionType)
            {
                case "approve":
                    oPayload = { REASON: sReason };
                    oController.callBoundAction("approve", oContext, oPayload);
                    break;
                case "reject":
                    oPayload = { REASON: sReason };
                    oController.callBoundAction("reject", oContext, oPayload);
                    break;
                case "executionDecision":
                    oPayload = { ELEMENT: this._sDecisionKey, REASON: sReason };
                    oController.callBoundAction("executionDecision", oContext, oPayload);
                    break;
                default:
                    break;
            }

            this.onCancel();
        }

    }
});