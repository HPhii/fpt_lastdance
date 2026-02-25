sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "../utils/UserSearchHelpDialog"
], function (Fragment, MessageToast, UserSearchHelpDialogHelper)
{
    "use strict";

    return {
        _oForwardDialog: null,
        _oView: null,

        onForwardDialogOpen: function (oView)
        {
            this._oView = oView;

            if (!this._oForwardDialog)
            {
                this._oForwardDialog = Fragment.load({
                    id: oView.getId(),
                    name: "z.wf.zwfmanagement.view.fragments.dialog.ForwardDialog",
                    controller: this
                }).then(function (oDialog)
                {
                    oView.addDependent(oDialog);
                    return oDialog;
                })
            }

            this._oForwardDialog.then(function (oDialog)
            {
                oDialog.open();
            });
        },

        onCancelForward: function ()
        {
            var oUserInput = this._oView.byId("forwardUserInput");

            this._oForwardDialog.then(function (oDialog)
            {
                oDialog.close();
                oUserInput.setValue("");
            });
        },

        onConfirmForward: function ()
        {
            var oView = this._oView;
            var oContext = oView.getBindingContext();
            var oUserInput = oView.byId("forwardUserInput");
            var sUserId = oUserInput.getValue();

            if (!sUserId)
            {
                MessageToast.show("Please enter a user ID to forward the task.");
                return;
            }

            const payload = { USER_ID: sUserId };

            oView.getController().callBoundAction("forward", oContext, payload);

            this._oForwardDialog.then(function (oDialog)
            {
                oDialog.close();
                oUserInput.setValue("");
            });
        },

        onOpenUserSearchHelp: function ()
        {
            var oView = this._oView;
            var oUserInput = oView.byId("forwardUserInput");

            UserSearchHelpDialogHelper.onOpen(oView, oUserInput);
        }
    }
});