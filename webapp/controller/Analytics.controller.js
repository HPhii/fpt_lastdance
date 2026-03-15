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
                  ZeroToTwoDays: 0,
                  ThreeToSevenDays: 0,
                  OverSevenDays: 0,
                };
              }

              if (bucket && bucket.includes("0-2")) {
                mGrouped[obj]["ZeroToTwoDays"] = count;
              }

              if (bucket && bucket.includes("3-7")) {
                mGrouped[obj]["ThreeToSevenDays"] = count;
              }

              if (bucket && bucket.includes(">7")) {
                mGrouped[obj]["OverSevenDays"] = count;
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

            // Thu thập các giá trị hợp lệ để loại trừ "N/A" và tạo đủ các điểm giao cắt, tránh lỗi "No value"
            var aPriorities = [];
            var aBuckets = [];
            var mData = {};

            aRaw.forEach(function (item) {
              var p = item.PriorityLevel || "";
              var b = item.AgingBucket || "";
              var c = Number(item.IsOpenCount) || 0;

              // Bỏ qua các dòng có nội dung N/A
              if (b.indexOf("N/A") !== -1 || p.indexOf("N/A") !== -1 || b === "" || p === "") {
                return;
              }

              if (aPriorities.indexOf(p) === -1) aPriorities.push(p);
              if (aBuckets.indexOf(b) === -1) aBuckets.push(b);

              var key = p + "|||" + b;
              mData[key] = (mData[key] || 0) + c;
            });

            // Tạo list data hoàn chỉnh cho tất cả các trục (nếu không có data thì mặc định là 0)
            var aHeatData = [];
            aPriorities.forEach(function (p) {
              aBuckets.forEach(function (b) {
                var key = p + "|||" + b;
                aHeatData.push({
                  PriorityLevel: p,
                  AgingBucket: b,
                  IsOpenCount: mData[key] || 0
                });
              });
            });

            var oJSON = new JSONModel({
              HeatData: aHeatData,
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
