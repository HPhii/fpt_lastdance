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

      /* ROUTE MATCHED                 */
      _onObjectMatched: function (oEvent) {
        this._callUserWorkloadOData();
        this._loadPerformanceChart();

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
              var oStatsData = aResults[0];
              oStatsModel.setProperty("/result", oStatsData);
            }
          }.bind(this),
          error: function (oError) {
            console.error("Failed to fetch analytics data:", oError);
          }.bind(this),
        });
      },

      /* PERFORMANCE CHART     */
      _loadPerformanceChart: function () {
        this.byId("idPerfChart").setVizProperties({
          legend: {
            visible: true,
          },
          legendGroup: {
            layout: {
              position: "bottom",
              allignment: "center",
            },
          },
        });
        var oView = this.getView();
        var oPerfModel = oView.getModel("performanceAnalytics");

        if (!oPerfModel) {
          console.error("performanceAnalytics model not found");
          return;
        }

        oPerfModel.read("/ZC_GSP26SAP02_WF_PERF", {
          urlParameters: {
            $select: "CreationYearMonth,IsCompletedCount,CycleTimeDays",
            $filter: "StatusCategory eq 'Completed'",
          },
          success: function (oData) {
            var aFormatted = (oData.results || []).map(function (item) {
              var completed = parseInt(item.IsCompletedCount);
              var totalDays = parseInt(item.CycleTimeDays);

              // 🔥 Format YYYYMM → Mar 2025
              var sYearMonth = item.CreationYearMonth; // ví dụ 202503
              var sYear = sYearMonth.substring(0, 4);
              var sMonth = sYearMonth.substring(4, 6);

              var aMonthNames = [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ];

              var sFormattedMonth =
                aMonthNames[parseInt(sMonth, 10) - 1] + " " + sYear;

              return {
                Month: sFormattedMonth,
                Completed: completed,
                AvgCycle: completed > 0 ? totalDays / completed : 0,
              };
            });

            var oJsonModel = new JSONModel({
              PerfData: aFormatted,
            });

            oView.setModel(oJsonModel);
          }.bind(this),

          error: function (oError) {
            console.error("Failed to fetch performance data:", oError);
          },
        });
      },

      /* WORKLOAD                     */
      _callUserWorkloadOData: function () {
        var oView = this.getView();
        var oWorkloadAnalyticsModel = oView.getModel("workloadAnalytics");

        oView.setModel(new JSONModel({ result: [] }), "workloadAnalyticsData");

        oWorkloadAnalyticsModel.read("/ZC_GSP26SAP02_WF_AGT", {
          success: function (oData) {
            oView
              .getModel("workloadAnalyticsData")
              .setProperty("/result", oData.results);
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
