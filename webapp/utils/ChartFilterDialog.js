sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Fragment, Filter, FilterOperator)
{
    "use strict";

    return {
        _oView: null,
        _oFilterDialog: null,

        onOpen: function (oView, sChartId)
        {
            this._oView = oView;

            if (!this._oFilterDialog)
            {
                this._oFilterDialog = Fragment.load({
                    id: oView.getId(),
                    name: "z.wf.zwfmanagement.view.fragments.dialog.ChartFilterDialog",
                    controller: this
                }).then(function (oDialog)
                {
                    oView.addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }

            this._oFilterDialog.then(function (oDialog)
            {
                oDialog.data("chartId", sChartId);
                oView.byId("chartFilterAgentInput").setValue("");
                oView.byId("chartFilterOpenInput").setValue("");
                oView.byId("chartFilterCompletedInput").setValue("");
                oDialog.open();
            });
        },


        onChartOpenFilter: function (oEvent)
        {
            var sChartId = oEvent.getSource().data("chartId");
            var oChart = this.byId(sChartId);
            if (!oChart)
            {
                return;
            }

            if (!this._oFilterDialog)
            {
                this._oFilterDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "z.wf.zwfmanagement.view.fragments.dialog.ChartFilterDialog",
                    controller: this,
                }).then(function (oDialog)
                {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }

            this._oFilterDialog.then(function (oDialog)
            {
                oDialog.data("chartId", sChartId);

                this.byId("chartFilterAgentInput").setValue("");
                this.byId("chartFilterOpenInput").setValue("");
                this.byId("chartFilterCompletedInput").setValue("");

                oDialog.open();
            }.bind(this));
        },

        onApplyChartFilter: function ()
        {
            var oDialog = this.byId("chartFilterDialog");
            if (!oDialog)
            {
                return;
            }

            var sAgentVal = this.byId("chartFilterAgentInput").getTokens().map(function (oToken) { return oToken.getKey(); }).join(", ");
            var sOpenVal = this.byId("chartFilterOpenInput").getValue();
            var sCompletedVal = this.byId("chartFilterCompletedInput").getValue();

            var oBinding = this._getChartBinding(oDialog.data("chartId"));
            if (oBinding)
            {
                var aFilters = [];
                if (sAgentVal)
                {
                    aFilters.push(new Filter("ActualAgent", FilterOperator.Contains, sAgentVal));
                }
                if (sOpenVal)
                {
                    aFilters.push(new Filter("IsOpenCount", FilterOperator.GE, Number(sOpenVal)));
                }
                if (sCompletedVal)
                {
                    aFilters.push(new Filter("IsCompletedCount", FilterOperator.GE, Number(sCompletedVal)));
                }
                oBinding.filter(aFilters);
            }

            oDialog.close();
        },

        onCancelChartFilter: function ()
        {
            var oView = this._oView;

            this._oFilterDialog.then(function (oDialog)
            {
                oDialog.close();
                oView.byId("chartFilterAgentInput").setTokens([]);
                oView.byId("chartFilterOpenInput").setValue("");
                oView.byId("chartFilterCompletedInput").setValue("");
            });
        },
    };
});