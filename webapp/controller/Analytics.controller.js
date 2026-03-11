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
        this._loadStatusChart();
        this._loadPriorityChart();
        this._loadPerformanceChart();
        this._connectPopovers();
        this._loadBottleneckHeatmap();
        this._loadHeatmapChart();
        this._loadAgingChart();
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
              var oStatsData = aResults[0];
              oStatsModel.setProperty("/result", oStatsData);
            }
          }.bind(this),
          error: function (oError) {
            console.error("Failed to fetch analytics data:", oError);
          }.bind(this),
        });
      },

      /* STATUS CHART (DONUT)          */
      _loadStatusChart: function () {
        var oView = this.getView();
        var oStatsAnalyticsModel = oView.getModel("statsAnalytics");

        if (!oStatsAnalyticsModel) {
          console.error("statsAnalytics model not found");
          return;
        }

        oStatsAnalyticsModel.read("/ZC_GSP26SAP02_WF_ANALYTICS", {
          urlParameters: {
            $select: "StatusCategory,TaskCounter",
          },
          success: function (oData) {
            var aData = oData.results || [];

            var oStatusModel = new sap.ui.model.json.JSONModel({
              StatusData: aData,
            });

            oView.setModel(oStatusModel, "statusModel");

            var oChart = this.byId("idStatusChart");
            if (oChart) {
              oChart.setVizProperties({
                title: {
                  visible: true,
                  text: "Status Distribution",
                },
                legend: {
                  position: "top",
                  alignment: "center",
                },
                plotArea: {
                  dataLabel: {
                    visible: true,
                  },
                },
              });
            }
          }.bind(this),

          error: function (oError) {
            console.error("Failed to fetch status chart data:", oError);
          }.bind(this),
        });
      },

      /* PRIORITY CHART (BAR)          */
      _loadPriorityChart: function () {
        var oView = this.getView();
        var oStatsAnalyticsModel = oView.getModel("statsAnalytics");

        if (!oStatsAnalyticsModel) {
          console.error("statsAnalytics model not found");
          return;
        }

        oStatsAnalyticsModel.read("/ZC_GSP26SAP02_WF_ANALYTICS", {
          urlParameters: {
            $select: "PriorityLevel,TaskCounter",
            $filter:
              "StatusCategory eq 'Open' or StatusCategory eq 'In Process'",
          },
          success: function (oData) {
            var aData = oData.results || [];

            var oPriorityModel = new sap.ui.model.json.JSONModel({
              PriorityData: aData,
            });

            oView.setModel(oPriorityModel, "priorityModel");

            var oChart = this.byId("idPriorityChart");
            if (oChart) {
              oChart.setVizProperties({
                title: {
                  visible: true,
                  text: "Task in Processing by Priority",
                },
                legend: {
                  visible: false,
                },
                plotArea: {
                  dataLabel: {
                    visible: true,
                  },
                  dataPointStyle: {
                    rules: [
                      {
                        dataContext: { PriorityLevel: "High" },
                        properties: {
                          color: "#d9534f",
                        },
                      },
                      {
                        dataContext: { PriorityLevel: "Medium" },
                        properties: {
                          color: "#f0ad4e",
                        },
                      },
                      {
                        dataContext: { PriorityLevel: "Low" },
                        properties: {
                          color: "#5cb85c",
                        },
                      },
                    ],
                  },
                },
              });
            }
          }.bind(this),

          error: function (oError) {
            console.error("Failed to fetch priority chart data:", oError);
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
              var sYearMonth = item.CreationYearMonth;
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

      /* BARCHART HORIZONAL */
      _loadHeatmapChart: function () {
        var oView = this.getView();
        var oPerfModel = oView.getModel("performanceAnalytics");

        if (!oPerfModel) {
          console.error("performanceAnalytics model not found");
          return;
        }

        oPerfModel.read("/ZC_GSP26SAP02_WF_PERF", {
          urlParameters: {
            $select: "TaskID,CreationYearMonth,CycleTimeDays,IsCompletedCount",
            $filter: "StatusCategory eq 'Completed'",
          },

          success: function (oData) {
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

            var aFormatted = (oData.results || [])
              .filter(function (item) {
                if (!item.CreationYearMonth) {
                  return false;
                }

                var completed = Number(item.IsCompletedCount);
                var totalDays = Number(item.CycleTimeDays);

                return completed > 0 && totalDays > 0;
              })
              .map(function (item) {
                var completed = Number(item.IsCompletedCount);
                var totalDays = Number(item.CycleTimeDays);

                var sYearMonth = item.CreationYearMonth;
                var year = sYearMonth.substring(0, 4);
                var month = sYearMonth.substring(4, 6);

                var monthLabel = aMonthNames[month - 1] + " " + year;

                return {
                  Task: item.TaskID,
                  Month: monthLabel,
                  YearMonth: sYearMonth,
                  AvgCycle: Number((totalDays / completed).toFixed(2)),
                };
              })
              .filter(function (item) {
                return item.Task && item.Task.trim() !== "";
              });

            aFormatted.sort(function (a, b) {
              return a.YearMonth.localeCompare(b.YearMonth);
            });

            var oHeatModel = new sap.ui.model.json.JSONModel({
              HeatData: aFormatted,
            });

            oView.setModel(oHeatModel, "heatmapModel");

            var oChart = this.byId("idHeatmapChart");

            if (oChart) {
              oChart.setVizProperties({
                title: {
                  text: "Average Cycle Time (All Tasks)",
                },

                plotArea: {
                  dataLabel: {
                    visible: false,
                  },
                  dataPointSize: {
                    min: 20,
                  },
                },

                categoryAxis: {
                  label: {
                    rotationAngle: 45,
                  },
                },

                legend: {
                  position: "right",
                  isScrollable: true,
                  title: {
                    visible: true,
                    text: "Task IDs",
                  },
                },
              });
            }
          }.bind(this),

          error: function (oError) {
            console.error("Failed to fetch chart data:", oError);
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
              visible: true,
            },
            legend: {
              position: "bottom",
            },
            plotArea: {
              dataLabel: {
                visible: true,
              },
            },
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

              if (bucket && (bucket.includes("0") || bucket.includes("2"))) {
                mGrouped[obj]["0-2 Days"] = count;
              }

              if (bucket && bucket.includes("3-7")) {
                mGrouped[obj]["3-7 Days"] = count;
              }

              if (
                bucket &&
                (bucket.includes(">7") || bucket.includes("Critical"))
              ) {
                mGrouped[obj][">7 Days"] = count;
              }
            });

            var aChartData = Object.values(mGrouped);

            var oJSON = new sap.ui.model.json.JSONModel({
              AgingData: aChartData,
            });

            oView.setModel(oJSON, "agingModel");
          }.bind(this),

          error: function (oError) {
            console.error("OData ERROR - Status:", oError.statusCode);
          }.bind(this),
        });
      },

      /* BOTTLENECK HEATMAP */
      _loadBottleneckHeatmap: function () {
        var oView = this.getView();
        var oModel = oView.getModel("bottleneckAnalytics");

        if (!oModel) {
          console.error("bottleneckAnalytics model not found");
          return;
        }

        oModel.read("/ZC_GSP26SAP02_WF_AGIG", {
          urlParameters: {
            $select: "PriorityLevel,AgingBucket,IsOpenCount",
          },

          success: function (oData) {
            var aRaw = oData.results || [];

            var aPriority = ["Low", "Medium", "High"];
            var aAging = [
              "0. N/A",
              "1. 0-2 Days (Normal)",
              "2. 3-7 Days (Warning)",
              "3. >7 Days (Critical)",
            ];

            // convert data
            var mData = {};
            aRaw.forEach(function (item) {
              var key = item.PriorityLevel + "|" + item.AgingBucket;
              mData[key] = Number(item.IsOpenCount);
            });

            var aFinal = [];

            aAging.forEach(function (aging) {
              aPriority.forEach(function (priority) {
                var key = priority + "|" + aging;

                aFinal.push({
                  PriorityLevel: priority,
                  AgingBucket: aging,
                  IsOpenCount: mData[key] || 0,
                });
              });
            });

            var oJSON = new sap.ui.model.json.JSONModel({
              HeatData: aFinal,
            });

            oView.setModel(oJSON, "agingModel");

            var oChart = this.byId("bottleneckHeatmap");

            if (oChart) {
              oChart.setVizProperties({
                title: {
                  text: "Workflow Task Aging by Priority",
                  visible: true,
                },
                plotArea: {
                  dataLabel: {
                    visible: true,
                  },
                },
                legend: {
                  visible: false,
                },
              });
            }
          }.bind(this),
          error: function (oError) {
            console.error("Heatmap load error:", oError);
          },
        });
      },

      /* CONNECT POPOVERS TO VIZFRAMES */
      _connectPopovers: function () {
        var oBundle = this.getView().getModel("i18n").getResourceBundle();

        var oColumnChart = this.byId("OpenCompletedColumnChart");
        var oColumnPopover = this.byId("OpenCompletedPopover");
        if (oColumnChart) {
          oColumnChart.setVizProperties({
            title: { text: oBundle.getText("userWorkloadColumnChartTitle") },
          });
          if (oColumnPopover) {
            oColumnPopover.connect(oColumnChart.getVizUid());
          }
        }

        var oScatterChart = this.byId("CycleTimeScatterChart");
        var oScatterPopover = this.byId("CycleTimePopover");
        if (oScatterChart) {
          oScatterChart.setVizProperties({
            title: { text: oBundle.getText("userWorkloadScatterChartTitle") },
          });
          if (oScatterPopover) {
            oScatterPopover.connect(oScatterChart.getVizUid());
          }
        }
      },

      onNavBackToDashboard: function () {
        this.getOwnerComponent().getRouter().navTo("RouteDashboard");
      },
    });
  },
);
