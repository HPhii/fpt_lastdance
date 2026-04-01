sap.ui.define([
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/ViewSettingsDialog",
    "sap/m/ViewSettingsItem",
    "sap/m/ViewSettingsFilterItem",
    "sap/m/ViewSettingsCustomItem",
    "sap/m/DateRangeSelection"
], function (
    Filter,
    FilterOperator,
    ViewSettingsDialog,
    ViewSettingsItem,
    ViewSettingsFilterItem,
    ViewSettingsCustomItem,
    DateRangeSelection
)
{
    "use strict";

    return {
        onOpen: function (oView, oList, fnGetBaseFilters)
        {
            if (!oView._oFilterDialog)
            {
                oView._oFilterDialog = new ViewSettingsDialog({
                    filterItems: [
                        new ViewSettingsFilterItem({
                            text: "Priority",
                            key: "PriorityText",
                            items: [
                                new ViewSettingsItem({ text: "Highest", key: "Priority___1" }),
                                new ViewSettingsItem({ text: "Very High", key: "Priority___2" }),
                                new ViewSettingsItem({ text: "Higher", key: "Priority___3" }),
                                new ViewSettingsItem({ text: "High", key: "Priority___4" }),
                                new ViewSettingsItem({ text: "Medium", key: "Priority___5" }),
                                new ViewSettingsItem({ text: "Low", key: "Priority___6" }),
                                new ViewSettingsItem({ text: "Lower", key: "Priority___7" }),
                                new ViewSettingsItem({ text: "Very low", key: "Priority___8" }),
                                new ViewSettingsItem({ text: "Lowest", key: "Priority___9" })
                            ]
                        }),
                        new ViewSettingsCustomItem({
                            key: "CreationDate",
                            text: "Creation Date",
                            customControl: new DateRangeSelection({
                                displayFormat: "yyyy-MM-dd",
                                valueFormat: "yyyy-MM-dd",
                                width: "100%"
                            })
                        })
                    ],
                    confirm: function (oEvent)
                    {
                        if (oView._fnFilterConfirm)
                        {
                            oView._fnFilterConfirm(oEvent);
                        } else
                        {
                            this.onConfirm(oList, oView, oEvent);
                        }
                    }.bind(this),
                    resetFilters: this.onResetFilter.bind(this, oView)
                });
            }

            if (fnGetBaseFilters)
            {
                oView._fnGetBaseFilters = fnGetBaseFilters;
            }

            oView._oFilterDialog.open();
        },

        onConfirm: function (oList, oView, oEvent)
        {
            var oParams = oEvent.getParameters();
            var oBinding = oList.getBinding("items");
            var aFilters = [];

            // Standard string/key matched filters (Priority)
            oParams.filterItems.forEach(function (oItem)
            {
                if (oItem instanceof sap.m.ViewSettingsCustomItem) return;
                var sPath = oItem.getKey().split("___")[0];
                var sValue = oItem.getKey().split("___")[1];
                var oFilter = new Filter(sPath, FilterOperator.EQ, sValue);
                aFilters.push(oFilter);
            });

            // Grab the Custom Control filters (CreationDate)
            oView._oFilterDialog.getFilterItems().forEach(function (oItem)
            {
                if (oItem.getKey() === "CreationDate" && oItem.getCustomControl())
                {
                    var oDateRange = oItem.getCustomControl();
                    var oStart = oDateRange.getDateValue();
                    var oEnd = oDateRange.getSecondDateValue();

                    if (oStart)
                    {
                        var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
                        var sStart = oDateFormat.format(oStart);

                        if (oEnd)
                        {
                            var sEnd = oDateFormat.format(oEnd);
                            aFilters.push(new Filter("CreationDate", FilterOperator.BT, sStart, sEnd));
                        } else
                        {
                            aFilters.push(new Filter("CreationDate", FilterOperator.EQ, sStart));
                        }

                        oItem.setSelected(true);
                        oItem.setFilterCount(1);
                    } else
                    {
                        oItem.setSelected(false);
                        oItem.setFilterCount(0);
                    }
                }
            });

            if (oView._fnGetBaseFilters)
            {
                var aBaseFilters = oView._fnGetBaseFilters();
                aFilters = aFilters.concat(aBaseFilters);
            }

            oBinding.filter(aFilters);
        },

        onResetFilter: function (oView)
        {
            if (!oView._oFilterDialog)
                return;

            oView._oFilterDialog.getFilterItems().forEach(function (oItem)
            {
                if (oItem.getKey() === "CreationDate" && oItem.getCustomControl())
                {
                    var oDateRange = oItem.getCustomControl();
                    oDateRange.setValue("");
                    oDateRange.setDateValue(null);
                    oDateRange.setSecondDateValue(null);
                    oItem.setSelected(false);
                    oItem.setFilterCount(0);
                }
            });
        }
    };
});