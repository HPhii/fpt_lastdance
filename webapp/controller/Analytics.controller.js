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

      /* ROUTE MATCHED */

      _onObjectMatched: function () {
        this._loadAgingChart();
        this._loadBottleneckHeatmap();
        this._connectPopovers();

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
            oStatsModel.setProperty("/busy", false);

            var aResults = oData.results || [];

            if (aResults.length > 0) {
              oStatsModel.setProperty("/result", aResults[0]);
            }
          }.bind(this),

          error: function (oError) {
            console.error("Failed to fetch analytics data:", oError);
          },
        });
      },

      /* AGING CHART */

      _loadAgingChart: function () {
        var oView = this.getView();
        var oModel = oView.getModel("bottleneckAnalytics");

        var oChart = this.byId("agingChart");

        if (oChart) {
          oChart.setVizProperties({
            title: {
              text: "Open Tasks by Business Object Type and Aging Bucket",
            },
            legend: { position: "bottom" },
            plotArea: { dataLabel: { visible: true } },
          });
        }

        oModel.read("/ZC_GSP26SAP02_WF_AGIG", {
          success: function (oData) {
            var aResults = oData.results || [];
            var mGrouped = {};

            aResults.forEach(function (item) {
              var obj = item.BusinessObjectType;
              var bucket = item.AgingBucket;
              var count = Number(item.IsOpenCount);

              if (!mGrouped[obj]) {
                mGrouped[obj] = {
                  BusinessObject: obj,
                  "0-2 Days": 0,
                  "3-7 Days": 0,
                  ">7 Days": 0,
                };
              }

              if (bucket && bucket.includes("0-2")) {
                mGrouped[obj]["0-2 Days"] = count;
              }

              if (bucket && bucket.includes("3-7")) {
                mGrouped[obj]["3-7 Days"] = count;
              }

              if (bucket && bucket.includes(">7")) {
                mGrouped[obj][">7 Days"] = count;
              }
            });

            var oJSON = new JSONModel({
              AgingData: Object.values(mGrouped),
            });

            oView.setModel(oJSON, "agingModel");
          }.bind(this),

          error: function (oError) {
            console.error("OData ERROR:", oError);
          },
        });
      },

      /* BOTTLENECK HEATMAP */

      _loadBottleneckHeatmap: function () {
        var oView = this.getView();
        var oModel = oView.getModel("bottleneckAnalytics");

        oModel.read("/ZC_GSP26SAP02_WF_AGIG", {
          urlParameters: {
            $select: "PriorityLevel,AgingBucket,IsOpenCount",
          },

          success: function (oData) {
            var aRaw = oData.results || [];

            var oJSON = new JSONModel({
              HeatData: aRaw,
            });

            oView.setModel(oJSON, "bottleneckModel");
          }.bind(this),

          error: function (oError) {
            console.error("Heatmap load error:", oError);
          },
        });
      },

      /* CONNECT POPOVERS */

      _connectPopovers: function () {
        var oBundle = this.getView().getModel("i18n").getResourceBundle();

        var oColumnChart = this.byId("OpenCompletedColumnChart");
        var oColumnPopover = this.byId("OpenCompletedPopover");

        if (oColumnChart && oColumnPopover) {
          oColumnChart.setVizProperties({
            title: { text: oBundle.getText("userWorkloadColumnChartTitle") },
          });
          oColumnPopover.connect(oColumnChart.getVizUid());
        }

        var oScatterChart = this.byId("CycleTimeScatterChart");
        var oScatterPopover = this.byId("CycleTimePopover");

        if (oScatterChart && oScatterPopover) {
          oScatterChart.setVizProperties({
            title: { text: oBundle.getText("userWorkloadScatterChartTitle") },
          });
          oScatterPopover.connect(oScatterChart.getVizUid());
        }
      },

      onNavBackToDashboard: function () {
        this.getOwnerComponent().getRouter().navTo("RouteDashboard");
      },
    });
  },
);
