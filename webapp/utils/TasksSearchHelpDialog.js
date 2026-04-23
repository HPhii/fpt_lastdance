sap.ui.define([
    "sap/ui/core/Fragment",
    'sap/m/Token',
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "../model/formatter"
], function (Fragment, Token, Filter, FilterOperator, formatter)
{
    "use strict";

    return {
        formatter: formatter,
        _oView: null,
        _oTasksSearchHelpDialog: null,

        onOpen: function (oView)
        {
            this._oView = oView;

            if (!this._oTasksSearchHelpDialog)
            {
                this._oTasksSearchHelpDialog = Fragment.load({
                    id: oView.getId(),
                    name: "z.wf.zwfmanagement.view.fragments.dialog.TasksSearchHelpDialog",
                    controller: this,
                }).then(function (oDialog)
                {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._oTasksSearchHelpDialog.then(function (oDialog)
            {
                oDialog.open();
            });
        },

        _handleValueHelpSearch: function (oEvent)
        {
            var sValue = oEvent.getParameter("value");

            var aProcessFilters = [
                new Filter("TechnicalStatus", FilterOperator.EQ, "SELECTED")
            ];

            if (sValue)
            {
                aProcessFilters.push(new Filter({
                    filters: [
                        new Filter("WorkItemText", FilterOperator.Contains, sValue),
                        new Filter("WorkItemID", FilterOperator.Contains, sValue)
                    ],
                    and: false
                }));
            }

            var oFilter = new Filter({
                filters: aProcessFilters,
                and: true
            });

            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter([oFilter]);
        },

        onCloseTaskSearchHelp: function (evt)
        {
            var aSelectedItems = evt.getParameter("selectedItems"),
                oMultiInput = this._oView.byId("multiTaskInput");

            if (aSelectedItems && aSelectedItems.length > 0)
            {
                var aExistingKeys = oMultiInput.getTokens().map(function (oToken)
                {
                    return oToken.getKey();
                });

                aSelectedItems.forEach(function (oItem)
                {
                    var oContext = oItem.getBindingContext();
                    var sKey = oContext.getProperty("WorkItemID");

                    if (aExistingKeys.indexOf(sKey) === -1)
                    {
                        oMultiInput.addToken(new Token({
                            key: sKey,
                            text: oContext.getProperty("WorkItemText"),
                        }));
                    }
                });
            }
        }
    };
});