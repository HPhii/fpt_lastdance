sap.ui.define(
  ["./BaseController", "sap/ui/model/json/JSONModel"],
  function (BaseController, JSONModel) {
    "use strict";

    return BaseController.extend("z.wf.zwfmanagement.controller.Analytics", {
      onInit: function () {
        BaseController.prototype.onInit.apply(this, arguments);

        var oStatsModel = new JSONModel({
          busy: false,
          result: {},
        });

        this.getView().setModel(oStatsModel, "statsAnalyticsModel");

        this.oRouter = this.getOwnerComponent().getRouter();

        this.oRouter
          .getRoute("RouteAnalytics")
          .attachPatternMatched(this._onObjectMatched, this);
      },

      _onObjectMatched: function (oEvent) {
        this._callUserWorkloadOData();
        var oView = this.getView();
        var oStatsAnalyticsModel = oView.getModel("statsAnalytics");
        var oStatsModel = oView.getModel("statsAnalyticsModel");

        oStatsModel.setProperty("/busy", true);

        oStatsAnalyticsModel.read("/ZC_GSP26SAP02_WF_ANALYTICS", {
          urlParameters: {
            $select:
              "IsOpenCount,IsCompletedThisMonth,IsOverdueCount,TaskCounter,IsCompletedCount",
          },
          success: function (oData) {
            console.log(oData);
            oStatsModel.setProperty("/busy", false);

            var aResults = oData.results || [];

            if (aResults.length > 0) {
              var oStatsData = aResults[0];
              oStatsModel.setProperty("/result", oStatsData);
            }
          }.bind(this),
          error: function (oError) {
            console.error("Failed to fetch analytics data:", oError);
          }.bind(this),
        });
      },

      _callUserWorkloadOData: function () {
        var oView = this.getView();
        var oWorkloadAnalyticsModel = oView.getModel("workloadAnalytics");

        oView.setModel(new JSONModel({ result: [] }), "workloadAnalyticsData");

        oWorkloadAnalyticsModel.read("/ZC_GSP26SAP02_WF_AGT", {
          success: function (oData) {
            oView
              .getModel("workloadAnalyticsData")
              .setProperty("/result", oData.results);
            console.log("User workload data:", oData);
          },
          error: function (oError) {
            console.error("Failed to fetch user workload data:", oError);
          },
        });
      },

      onNavBackToDashboard: function () {
        this.getOwnerComponent().getRouter().navTo("RouteDashboard");
      },
    });
  },
);
