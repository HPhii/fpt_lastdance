sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/m/MessageToast"
], function (Fragment, MessageToast)
{
    "use strict";

    return {
        _oColumnSettingsDialog: null,
        _oView: null,

        onCustomColumnOpen: function (oView)
        {
            this._oView = oView;

            if (!this._oColumnSettingsDialog)
            {
                Fragment.load({
                    id: oView.getId(),
                    name: "z.wf.zwfmanagement.view.fragments.dialog.ColumnSettingsDialog",
                    controller: this
                }).then(function (oDialog)
                {
                    this._oColumnSettingsDialog = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.open();
                }.bind(this));
            } else
            {
                this._oColumnSettingsDialog.open();
            }
        },

        onCloseColumnSettings: function ()
        {
            this._oColumnSettingsDialog.close();
        },

        onResetColumns: function ()
        {
            var oViewModel = this._oView.getModel("worklistView");
            oViewModel.setProperty("/columns", {
                taskName: true,
                taskID: false,
                workItemID: false,
                creationDate: true,
                endDate: false,
                daysToDeadline: true,
                status: true,
                priority: true,
                assignedUser: false,
                assignedUserName: false
            });
            MessageToast.show("Columns reset to default");
        },
    }
})