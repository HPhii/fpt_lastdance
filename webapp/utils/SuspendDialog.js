sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/m/MessageBox"
], function (Fragment, MessageBox)
{
    "use strict";

    return {
        _oSuspendDialog: null,
        _oView: null,

        onSuspendDialogOpen: function (oView)
        {
            this._oView = oView;

            if (!this._oSuspendDialog)
            {
                this._oSuspendDialog = Fragment.load({
                    id: oView.getId(),
                    name: "z.wf.zwfmanagement.view.fragments.dialog.SuspendDialog",
                    controller: this
                }).then(function (oDialog)
                {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._oSuspendDialog.then(function (oDialog)
            {
                oDialog.open();
            });
        },

        onConfirmSuspend: function ()
        {
            var oView = this._oView;
            var oDatePicker = oView.byId("suspendDatePicker");
            var oTimePicker = oView.byId("suspendTimePicker");
            var oResourceBundle = oView.getModel("i18n").getResourceBundle();

            var sDate = oDatePicker.getValue();
            var sTime = oTimePicker.getValue();

            if (!sDate || !sTime)
            {
                MessageBox.error(oResourceBundle.getText("errorSuspendDateTime") || "Please select both date and time");
                return;
            }

            // Format date as YYYY-MM-DD for Edm.Date
            var oDate = oDatePicker.getDateValue();
            var sFormattedDate = oDate.getFullYear() + "-" +
                String(oDate.getMonth() + 1).padStart(2, "0") + "-" +
                String(oDate.getDate()).padStart(2, "0");

            // Ensure time is in HH:mm:ss format for Edm.TimeOfDay
            var sFormattedTime = sTime;
            if (sTime.split(":").length === 2)
            {
                sFormattedTime = sTime + ":00";
            }

            var oContext = oView.getBindingContext();
            var oParameters = {
                resubmission_date: sFormattedDate,
                resubmission_time: sFormattedTime
            };

            oView.getController().callBoundAction("suspend", oContext, oParameters);

            this._oSuspendDialog.then(function (oDialog)
            {
                oDialog.close();
                oDatePicker.setValue("");
                oTimePicker.setValue("");
            });
        },

        onCancelSuspend: function ()
        {
            var oView = this._oView;
            var oDatePicker = oView.byId("suspendDatePicker");
            var oTimePicker = oView.byId("suspendTimePicker");

            this._oSuspendDialog.then(function (oDialog)
            {
                oDialog.close();
                oDatePicker.setValue("");
                oTimePicker.setValue("");
            });
        },
    };
})