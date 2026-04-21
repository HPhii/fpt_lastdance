sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/Token"
], function (Fragment, Filter, FilterOperator, Token)
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
                this._resetDialogInputs();
                oDialog.open();
            }.bind(this));
        },

        _resetDialogInputs: function ()
        {
            if (!this._oView)
            {
                return;
            }

            var oAgentInput = this._oView.byId("chartFilterAgentInput");

            if (oAgentInput)
            {
                oAgentInput.setTokens([]);
                oAgentInput.setValue("");
            }
        },

        _getChartBinding: function (sChartId)
        {
            if (!this._oView)
            {
                return null;
            }

            var oChart = this._oView.byId(sChartId);
            if (!oChart || !oChart.getDataset)
            {
                return null;
            }

            var oDataset = oChart.getDataset();
            if (!oDataset)
            {
                return null;
            }

            return oDataset.getBinding("data");
        },

        _normalizeUserId: function (sValue)
        {
            return String(sValue || "").trim().toUpperCase();
        },

        onChartFilterUserLiveChange: function (oEvent)
        {
            var oInput = oEvent.getSource();
            var sValue = oInput.getValue() || "";
            var sUpperValue = sValue.toUpperCase();

            if (sValue !== sUpperValue)
            {
                oInput.setValue(sUpperValue);
            }
        },

        onChartFilterSuggestionSelect: function (oEvent)
        {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            var oInput = oEvent.getSource();

            if (!oSelectedItem || !oInput)
            {
                return;
            }

            var sUserId = this._normalizeUserId(oSelectedItem.getKey() || oSelectedItem.getText());
            if (!sUserId)
            {
                return;
            }

            var bExists = oInput.getTokens().some(function (oToken)
            {
                return oToken.getKey() === sUserId;
            });

            if (!bExists)
            {
                oInput.addToken(new Token({
                    key: sUserId,
                    text: sUserId
                }));
            }

            oInput.setValue("");
        },

        onApplyChartFilter: function ()
        {
            if (!this._oView)
            {
                return;
            }

            var oDialog = this._oView.byId("chartFilterDialog");
            if (!oDialog)
            {
                return;
            }

            var oAgentInput = this._oView.byId("chartFilterAgentInput");

            var aTokens = oAgentInput ? oAgentInput.getTokens() : [];
            var sTypedUserIds = oAgentInput ? oAgentInput.getValue() : "";
            var mSeen = {};
            var aSelectedUserIds = [];

            aTokens.forEach(function (oToken)
            {
                var sUserId = this._normalizeUserId(oToken.getKey() || oToken.getText());
                if (!sUserId || mSeen[sUserId])
                {
                    return;
                }

                mSeen[sUserId] = true;
                aSelectedUserIds.push(sUserId);
            }.bind(this));

            sTypedUserIds.split(/[\s,;]+/).forEach(function (sUserId)
            {
                var sNormalizedUserId = this._normalizeUserId(sUserId);
                if (!sNormalizedUserId || mSeen[sNormalizedUserId])
                {
                    return;
                }

                mSeen[sNormalizedUserId] = true;
                aSelectedUserIds.push(sNormalizedUserId);
            }.bind(this));

            var oBinding = this._getChartBinding(oDialog.data("chartId"));
            if (oBinding)
            {
                var aFilters = [];

                if (aSelectedUserIds.length > 0)
                {
                    var aAgentFilters = aSelectedUserIds.map(function (sUserId)
                    {
                        return new Filter("ActualAgent", FilterOperator.EQ, sUserId);
                    });

                    aFilters.push(new Filter({
                        filters: aAgentFilters,
                        and: false
                    }));
                }

                oBinding.filter(aFilters);
            }

            oDialog.close();
        },

        onCancelChartFilter: function ()
        {
            if (!this._oFilterDialog)
            {
                return;
            }

            this._oFilterDialog.then(function (oDialog)
            {
                oDialog.close();
                this._resetDialogInputs();
            }.bind(this));
        },
    };
});