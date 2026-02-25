sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Fragment, JSONModel, MessageToast)
{
    "use strict";

    return {
        _oView: null,
        _oSetPriorityDialog: null,

        openSetPriorityDialog: function (oView)
        {
            this._oView = oView;
            var oPriorityModel = new JSONModel({
                priorities: [
                    { key: "1", text: "Highest - Express" },
                    { key: "2", text: "Very high" },
                    { key: "3", text: "Higher" },
                    { key: "4", text: "High" },
                    { key: "5", text: "Medium" },
                    { key: "6", text: "Low" },
                    { key: "7", text: "Lower" },
                    { key: "8", text: "Very low" },
                    { key: "9", text: "Lowest" }
                ]
            });

            oView.setModel(oPriorityModel, "priorityModel");

            if (!this._oSetPriorityDialog)
            {
                this._oSetPriorityDialog = Fragment.load({
                    id: oView.getId(),
                    name: "z.wf.zwfmanagement.view.fragments.dialog.SetPriorityDialog",
                    controller: this
                }).then(function (oDialog)
                {
                    oView.addDependent(oDialog);
                    return oDialog;
                })
            }

            this._oSetPriorityDialog.then(function (oDialog)
            {
                oDialog.open();
            });
        },

        onClosePriorityDialog: function ()
        {
            var oView = this._oView;
            var oSelect = oView.byId("prioritySelect");

            this._oSetPriorityDialog.then(function (oDialog)
            {
                oDialog.close();
                if (oSelect)
                {
                    oSelect.setSelectedKey("");
                }
            });
        },

        onConfirmSetPriority: function ()
        {
            var oView = this._oView;
            var oSelect = oView.byId("prioritySelect");
            var sSelectedKey = oSelect.getSelectedKey();

            if (!sSelectedKey)
            {
                MessageToast.show("Please select a priority.");
                return;
            }

            var oContext = oView.getBindingContext();
            var oPayload = {
                PRIORITY: sSelectedKey
            };

            oView.getController().callBoundAction("setPriority", oContext, oPayload);

            this._oSetPriorityDialog.then(function (oDialog)
            {
                oDialog.close();
                oSelect.setSelectedKey("");
            });
        }
    };
})