sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    'sap/m/FlexItemData',
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    "../utils/ChartFilterDialog"
  ],
  function (BaseController, JSONModel, FlexItemData, Filter, FilterOperator, ChartFilterDialogHelper)
  {
    "use strict";

    return BaseController.extend("z.wf.zwfmanagement.controller.Analytics", {
      onInit: function ()
      {
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
      _onObjectMatched: function (oEvent)
      {
        this._loadOpenCompletedSlider(); //TODO
        this._loadStatusChart();
        this._loadPriorityChart();
        this._loadPerformanceChart();
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
          success: function (oData)
          {
            oStatsModel.setProperty("/busy", false);

            var aResults = oData.results || [];

            if (aResults.length > 0)
            {
              var oStatsData = aResults[0];
              oStatsModel.setProperty("/result", oStatsData);
            }
          }.bind(this),
          error: function (oError)
          {
            console.error("Failed to fetch analytics data:", oError);
          }.bind(this),
        });
      },

      //TODO
      _loadOpenCompletedSlider: function ()
      {
        var oVizFrame = this.byId("OpenCompletedColumnChart");
        var oRangeSlider = this.byId("OpenCompletedSlider");
        if (!oRangeSlider)
        {
          return;
        }

        oRangeSlider.setValueAxisVisible(false);
        oRangeSlider.setShowPercentageLabel(false);
        oRangeSlider.setShowStartEndLabel(false);
        oRangeSlider.setLayoutData(new FlexItemData({
          maxHeight: '7%',
          baseSize: '100%',
          order: 1,
          styleClass: 'rangeSliderPadding'
        }));

        oRangeSlider.attachRangeChanged(function (e)
        {
          var data = e.getParameters().data;
          console.log(">>>> ", data);

          var oBinding = oVizFrame.getDataset().getBinding("data");
          if (!oBinding) return;

          var aOrder = oBinding.getContexts().map(function (ctx) { return ctx.getProperty("ActualAgent"); });

          console.log("aOrder ", aOrder);

          var iStart = 0;
          var iEnd = aOrder.length - 1;

          var iMin = Math.min(iStart, iEnd);
          var iMax = Math.max(iStart, iEnd);

          var aKeep = aOrder.filter(function (sAgent, idx) { return idx >= iMin && idx <= iMax; });

          var oMultiFilter = new Filter({
            filters: aKeep.map(function (sAgent)
            {
              return new Filter("ActualAgent", FilterOperator.EQ, sAgent);
            }),
            and: false,
          });

          oBinding.filter([oMultiFilter]);
        });
      },

      //TODO
      _getChartBinding: function (sChartId)
      {
        var oChart = this.byId(sChartId);
        if (!oChart)
        {
          return null;
        }
        var oDataset = oChart.getDataset();
        return oDataset && oDataset.getBinding("data");
      },

      //TODO
      onChartToggleFullScreen: function (oEvent)
      {
        var sChartId = oEvent.getSource().data("chartId");
        var oPanel = this.byId(sChartId);
        if (!oPanel)
        {
          return;
        }

        var bFull = oPanel.data("fullScreen") === true;
        if (bFull)
        {
          oPanel.removeStyleClass("fullScreenPanel");
          oPanel.data("fullScreen", false);
          oEvent.getSource().setIcon("sap-icon://full-screen");
        }
        else
        {
          oPanel.addStyleClass("fullScreenPanel");
          oPanel.data("fullScreen", true);
          oEvent.getSource().setIcon("sap-icon://exit-full-screen");
        }
      },

      //TODO
      onChartOpenFilter: function (oEvent)
      {
        var oView = this.getView(),
          sChartId = oEvent.getSource().data("chartId"),
          oChart = this.byId(sChartId);
        if (!oChart)
        {
          return;
        }

        ChartFilterDialogHelper.onOpen(oView, sChartId);
      },

      /* STATUS CHART (DONUT)          */
      _loadStatusChart: function ()
      {
        var oView = this.getView();
        var oStatsAnalyticsModel = oView.getModel("statsAnalytics");

        if (!oStatsAnalyticsModel)
        {
          console.error("statsAnalytics model not found");
          return;
        }

        oStatsAnalyticsModel.read("/ZC_GSP26SAP02_WF_ANALYTICS", {
          urlParameters: {
            $select: "StatusCategory,TaskCounter",
          },
          success: function (oData)
          {
            var aData = oData.results || [];

            var oStatusModel = new sap.ui.model.json.JSONModel({
              StatusData: aData,
            });

            oView.setModel(oStatusModel, "statusModel");

            var oChart = this.byId("idStatusChart");
            if (oChart)
            {
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

          error: function (oError)
          {
            console.error("Failed to fetch status chart data:", oError);
          }.bind(this),
        });
      },

      /* PRIORITY CHART (BAR)          */
      _loadPriorityChart: function ()
      {
        var oView = this.getView();
        var oStatsAnalyticsModel = oView.getModel("statsAnalytics");

        if (!oStatsAnalyticsModel)
        {
          console.error("statsAnalytics model not found");
          return;
        }

        oStatsAnalyticsModel.read("/ZC_GSP26SAP02_WF_ANALYTICS", {
          urlParameters: {
            $select: "PriorityLevel,TaskCounter",
            $filter:
              "StatusCategory eq 'Open' or StatusCategory eq 'In Process'",
          },
          success: function (oData)
          {
            var aData = oData.results || [];

            var oPriorityModel = new sap.ui.model.json.JSONModel({
              PriorityData: aData,
            });

            oView.setModel(oPriorityModel, "priorityModel");

            var oChart = this.byId("idPriorityChart");
            if (oChart)
            {
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

          error: function (oError)
          {
            console.error("Failed to fetch priority chart data:", oError);
          }.bind(this),
        });
      },

      /* PERFORMANCE CHART     */
      _loadPerformanceChart: function ()
      {
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

        if (!oPerfModel)
        {
          console.error("performanceAnalytics model not found");
          return;
        }

        oPerfModel.read("/ZC_GSP26SAP02_WF_PERF", {
          urlParameters: {
            $select: "CreationYearMonth,IsCompletedCount,CycleTimeDays",
            $filter: "StatusCategory eq 'Completed'",
          },
          success: function (oData)
          {
            var aFormatted = (oData.results || []).map(function (item)
            {
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

          error: function (oError)
          {
            console.error("Failed to fetch performance data:", oError);
          },
        });
      },

      /* BARCHART HORIZONAL */
      _loadHeatmapChart: function ()
      {
        var oView = this.getView();
        var oPerfModel = oView.getModel("performanceAnalytics");

        if (!oPerfModel)
        {
          console.error("performanceAnalytics model not found");
          return;
        }

        oPerfModel.read("/ZC_GSP26SAP02_WF_PERF", {
          urlParameters: {
            $select: "TaskID,CreationYearMonth,CycleTimeDays,IsCompletedCount",
            $filter: "StatusCategory eq 'Completed'",
          },

          success: function (oData)
          {
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
              .filter(function (item)
              {
                if (!item.CreationYearMonth)
                {
                  return false;
                }

                var completed = Number(item.IsCompletedCount);
                var totalDays = Number(item.CycleTimeDays);

                return completed > 0 && totalDays > 0;
              })
              .map(function (item)
              {
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
              .filter(function (item)
              {
                return item.Task && item.Task.trim() !== "";
              });

            aFormatted.sort(function (a, b)
            {
              return a.YearMonth.localeCompare(b.YearMonth);
            });

            var oHeatModel = new sap.ui.model.json.JSONModel({
              HeatData: aFormatted,
            });

            oView.setModel(oHeatModel, "heatmapModel");

            var oChart = this.byId("idHeatmapChart");

            if (oChart)
            {
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

          error: function (oError)
          {
            console.error("Failed to fetch chart data:", oError);
          },
        });
      },

      /* AGING CHART */
      _loadAgingChart: function ()
      {
        var oView = this.getView();
        var oModel = oView.getModel("bottleneckAnalytics");

        var oChart = this.byId("agingChart");

        if (oChart)
        {
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
          success: function (oData)
          {
            var aResults = oData.results || [];
            var mGrouped = {};

            aResults.forEach(function (item)
            {
              var obj = item.BusinessObjectType;
              var bucket = item.AgingBucket;
              var count = Number(item.IsOpenCount);
              if (!mGrouped[obj])
              {
                mGrouped[obj] = {
                  BusinessObject: obj,
                  "0-2 Days": 0,
                  "3-7 Days": 0,
                  ">7 Days": 0,
                };
              }

              if (bucket && (bucket.includes("0") || bucket.includes("2")))
              {
                mGrouped[obj]["0-2 Days"] = count;
              }

              if (bucket && bucket.includes("3-7"))
              {
                mGrouped[obj]["3-7 Days"] = count;
              }

              if (
                bucket &&
                (bucket.includes(">7") || bucket.includes("Critical"))
              )
              {
                mGrouped[obj][">7 Days"] = count;
              }
            });

            var aChartData = Object.values(mGrouped);

            var oJSON = new sap.ui.model.json.JSONModel({
              AgingData: aChartData,
            });

            oView.setModel(oJSON, "agingModel");
          }.bind(this),

          error: function (oError)
          {
            console.error("OData ERROR - Status:", oError.statusCode);
          }.bind(this),
        });
      },

      /* CONNECT POPOVERS TO VIZFRAMES */
      _connectPopovers: function ()
      {
        var oBundle = this.getView().getModel("i18n").getResourceBundle();

        var oColumnChart = this.byId("OpenCompletedColumnChart");
        var oColumnPopover = this.byId("OpenCompletedPopover");
        if (oColumnChart)
        {
          oColumnChart.setVizProperties({
            title: { text: oBundle.getText("userWorkloadColumnChartTitle") }
          });
          if (oColumnPopover)
          {
            oColumnPopover.connect(oColumnChart.getVizUid());
          }
        }

        var oScatterChart = this.byId("CycleTimeScatterChart");
        var oScatterPopover = this.byId("CycleTimePopover");
        if (oScatterChart)
        {
          oScatterChart.setVizProperties({
            title: { text: oBundle.getText("userWorkloadScatterChartTitle") }
          });
          if (oScatterPopover)
          {
            oScatterPopover.connect(oScatterChart.getVizUid());
          }
        }
      },

      onChartZoomIn: function (oEvent)
      {
        var sChartId = oEvent.getSource().data("chartId");

        console.log(sChartId);

        var oChart = this.byId(sChartId);
        if (oChart) { oChart.zoom({ direction: "in" }); }
      },

      onChartZoomOut: function (oEvent)
      {
        var sChartId = oEvent.getSource().data("chartId");
        var oChart = this.byId(sChartId);
        if (oChart) { oChart.zoom({ direction: "out" }); }
      },

      onNavBackToDashboard: function ()
      {
        this.getOwnerComponent().getRouter().navTo("RouteDashboard");
      },
    });
  },
);
