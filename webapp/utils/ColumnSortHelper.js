sap.ui.define([
    "sap/ui/model/Sorter"
], function (Sorter)
{
    "use strict";

    function _getState(oController, sTableId)
    {
        if (!oController._mColumnSortState)
        {
            oController._mColumnSortState = {};
        }

        if (!oController._mColumnSortState[sTableId])
        {
            oController._mColumnSortState[sTableId] = {
                key: "",
                descending: false
            };
        }

        return oController._mColumnSortState[sTableId];
    }

    function _findColumnBySortKey(oTable, sSortKey)
    {
        if (!oTable || !sSortKey)
        {
            return null;
        }

        return oTable.getColumns().find(function (oColumn)
        {
            return oColumn.data("sortKey") === sSortKey;
        }) || null;
    }

    function _setSortIndicator(oTable, oActiveColumn, bDescending)
    {
        if (!oTable)
        {
            return;
        }

        oTable.getColumns().forEach(function (oColumn)
        {
            oColumn.setSortIndicator(
                oColumn === oActiveColumn
                    ? (bDescending ? "Descending" : "Ascending")
                    : "None"
            );
        });
    }

    return {
        setupDefaultSort: function (oController, oTable, sDefaultSortKey, bDefaultDescending)
        {
            if (!oController || !oTable || !sDefaultSortKey)
            {
                return;
            }

            var oState = _getState(oController, oTable.getId());
            oState.key = sDefaultSortKey;
            oState.descending = !!bDefaultDescending;

            var oDefaultColumn = _findColumnBySortKey(oTable, sDefaultSortKey);
            _setSortIndicator(oTable, oDefaultColumn, oState.descending);
        },

        onColumnSort: function (oController, oEvent, oTable)
        {
            if (!oController || !oEvent || !oTable)
            {
                return;
            }

            var oColumn = oEvent.getSource().getParent();
            var sSortKey = oColumn && oColumn.data("sortKey");

            if (!oColumn || !sSortKey)
            {
                return;
            }

            var oBinding = oTable.getBinding("items");
            if (!oBinding)
            {
                return;
            }

            var oState = _getState(oController, oTable.getId());
            if (oState.key === sSortKey)
            {
                oState.descending = !oState.descending;
            } else
            {
                oState.key = sSortKey;
                oState.descending = false;
            }

            oBinding.sort([new Sorter(sSortKey, oState.descending)]);
            _setSortIndicator(oTable, oColumn, oState.descending);
        }
    };
});