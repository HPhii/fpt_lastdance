sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
], function (Fragment, MessageBox, MessageToast)
{
    "use strict";

    return {
        _oUpdateSubstitutionDialog: null,
        _oView: null,
        _oSelectedContext: null,

        onOpen: function (oView, oEvent)
        {
            this._oView = oView;
            const oContext = oEvent.getSource().getBindingContext();

            // save context of current selected rule to use in confirm handler
            this._oSelectedContext = oContext;

            if (!this._oUpdateSubstitutionDialog)
            {
                this._oUpdateSubstitutionDialog = Fragment.load({
                    id: oView.getId(),
                    name: "z.wf.zwfmanagement.view.fragments.dialog.UpdateSubstitutionDialog",
                    controller: this,
                }).then(function (oDialog)
                {
                    oView.addDependent(oDialog);

                    // set current EndDate to input field in dialog
                    const sCurrentDate = oContext.getProperty("EndDate");
                    oView.byId("inpUpdateEndDate").setValue(sCurrentDate);

                    return oDialog;
                });
            }

            this._oUpdateSubstitutionDialog.then(function (oDialog)
            {
                const sCurrentDate = oContext.getProperty("EndDate");
                oView.byId("inpUpdateEndDate").setValue(sCurrentDate);
                oDialog.open();
            });

        },

        onCloseUpdateDialog: function ()
        {
            this._oSelectedContext = null;
            this._oUpdateSubstitutionDialog.then(function (oDialog)
            {
                oDialog.close();
            });
        },

        onConfirmUpdateRule: function ()
        {
            var oView = this._oView;

            const oDatePicker = oView.byId("inpUpdateEndDate");
            const sNewDate = oDatePicker.getValue(); // Format yyyy-MM-dd
            const oResourceBundle = oView.getModel("i18n").getResourceBundle();

            if (!sNewDate)
            {
                MessageBox.error(oResourceBundle.getText("msgSelectDates"));
                return;
            }

            if (this._oSelectedContext)
            {
                // update by context
                this._oSelectedContext
                    .setProperty("EndDate", sNewDate)
                    .then(() =>
                    {
                        // refresh context -> sync data
                        this._oSelectedContext.refresh();

                        MessageToast.show(oResourceBundle.getText("msgUpdateSuccess"));
                        this.onCloseUpdateDialog();
                    })
                    .catch((oError) =>
                    {
                        MessageBox.error(oError.message);
                    });
            }
        },
    }

});