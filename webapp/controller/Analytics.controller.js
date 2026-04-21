// @ts-nocheck
sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../utils/ChartFilterDialog",
  ],
  function (BaseController, JSONModel, ChartFilterDialogHelper)
  {
    "use strict";

    return BaseController.extend("z.wf.zwfmanagement.controller.Analytics", {
      onInit: function ()
      {
        BaseController.prototype.onInit.apply(this, arguments);

        var oStatsModel = new JSONModel({
          busy: false,
          result: {},
          priorityBusy: false,
          priorityData: [],
        });

        var oChartFilterUsersModel = new JSONModel({
          userIds: [],
        });

        this.getView().setModel(oStatsModel, "statsAnalyticsModel");
        this.getView().setModel(oChartFilterUsersModel, "chartFilterUsers");

        this.oRouter = this.getOwnerComponent().getRouter();

        this.oRouter
          .getRoute("RouteAnalytics")
          .attachPatternMatched(this._onObjectMatched, this);
      },

      /* ROUTE MATCHED */
      _onObjectMatched: function ()
      {
        this._loadAgingChart();
        this._loadBottleneckHeatmap();
        this._loadStatusDonutChart();
        this._loadPriorityBarChart();
        this._loadGroupedColumnChartUserIds();
        this._connectPopovers();
        this._initDefaultDateRange();

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
              oStatsModel.setProperty("/result", aResults[0]);
            }
          }.bind(this),

          error: function (oError)
          {
            console.error("Failed to fetch analytics data:", oError);
          }.bind(this),
        });
      },

      /**
       * @param {sap.ui.base.Event} oEvent
       */
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

      /**
       * @param {sap.ui.base.Event} oEvent
       */
      onChartResetFilter: function (oEvent)
      {
        var sChartId = oEvent.getSource().data("chartId");
        var oChart = this.byId(sChartId);
        if (!oChart)
        {
          return;
        }

        var oDataset = oChart.getDataset();
        if (oDataset) {
          var oBinding = oDataset.getBinding("data");
          if (oBinding) {
            var aFilters = [];
            // Preserve base filter for workload chart
            if (sChartId === "OpenCompletedColumnChart") {
              aFilters.push(new sap.ui.model.Filter("ActualAgent", sap.ui.model.FilterOperator.NE, "Unassigned"));
            }
            oBinding.filter(aFilters);
          }
        }
      },

      _loadGroupedColumnChartUserIds: function ()
      {
        var oView = this.getView();
        var oWorkloadModel = oView.getModel("workloadAnalytics");
        var oChartFilterUsersModel = oView.getModel("chartFilterUsers");

        if (!oChartFilterUsersModel)
        {
          oChartFilterUsersModel = new JSONModel({
            userIds: [],
          });
          oView.setModel(oChartFilterUsersModel, "chartFilterUsers");
        }

        if (!oWorkloadModel)
        {
          oChartFilterUsersModel.setProperty("/userIds", []);
          return;
        }

        oWorkloadModel.read("/ZC_GSP26SAP02_WF_AGT", {
          urlParameters: {
            $select: "ActualAgent",
            $filter: "ActualAgent ne 'Unassigned'",
          },
          success: function (oData)
          {
            var aResults = oData.results || [];
            var mSeen = {};
            var aUserIds = [];

            aResults.forEach(function (oItem)
            {
              var sUserId = String(oItem.ActualAgent || "")
                .trim()
                .toUpperCase();

              if (!sUserId || mSeen[sUserId])
              {
                return;
              }

              mSeen[sUserId] = true;
              aUserIds.push({
                UserId: sUserId,
              });
            });

            aUserIds.sort(function (a, b)
            {
              return a.UserId.localeCompare(b.UserId);
            });

            oChartFilterUsersModel.setProperty("/userIds", aUserIds);
          }.bind(this),
          error: function (oError)
          {
            oChartFilterUsersModel.setProperty("/userIds", []);
            console.error("Failed to load grouped chart users:", oError);
          }.bind(this),
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
            },
            legend: { position: "bottom" },
            plotArea: { dataLabel: { visible: true } },
          });
        }

        oModel.read("/ZC_GSP26SAP02_WF_AGIG", {
          success: function (oData)
          {
            var aResults = oData.results || [];
            var mGrouped = {};

            aResults.forEach(function (item)
            {
              var obj = item.BusinessObjectDesc || item.BusinessObjectType;
              var bucket = item.AgingBucket;
              var count = Number(item.IsOpenCount);

              if (!mGrouped[obj])
              {
                mGrouped[obj] = {
                  BusinessObjectDesc: obj,
                  ZeroToTwoDays: 0,
                  ThreeToSevenDays: 0,
                  OverSevenDays: 0,
                };
              }

              if (bucket && bucket.includes("0-2"))
              {
                mGrouped[obj]["ZeroToTwoDays"] = count;
              }

              if (bucket && bucket.includes("3-7"))
              {
                mGrouped[obj]["ThreeToSevenDays"] = count;
              }

              if (bucket && bucket.includes(">7"))
              {
                mGrouped[obj]["OverSevenDays"] = count;
              }
            });

            var oJSON = new JSONModel({
              AgingData: Object.values(mGrouped),
            });

            oView.setModel(oJSON, "agingModel");
          }.bind(this),

          error: function (oError)
          {
            console.error("OData ERROR:", oError);
          },
        });
      },

      /* BOTTLENECK HEATMAP */
      _loadBottleneckHeatmap: function ()
      {
        var oView = this.getView();
        var oModel = oView.getModel("bottleneckAnalytics");

        oModel.read("/ZC_GSP26SAP02_WF_AGIG", {
          urlParameters: {
            $select: "PriorityLevel,AgingBucket,IsOpenCount",
          },

          success: function (oData)
          {
            var aRaw = oData.results || [];

            var aPriorities = [];
            var aBuckets = [];
            var mData = {};

            aRaw.forEach(function (item)
            {
              var p = item.PriorityLevel || "";
              var b = item.AgingBucket || "";
              var c = Number(item.IsOpenCount) || 0;

              if (
                b.indexOf("N/A") !== -1 ||
                p.indexOf("N/A") !== -1 ||
                b === "" ||
                p === ""
              )
              {
                return;
              }

              if (aPriorities.indexOf(p) === -1) aPriorities.push(p);
              if (aBuckets.indexOf(b) === -1) aBuckets.push(b);

              var key = p + "|||" + b;
              mData[key] = (mData[key] || 0) + c;
            });

            var aHeatData = [];
            aPriorities.forEach(function (p)
            {
              aBuckets.forEach(function (b)
              {
                var key = p + "|||" + b;
                aHeatData.push({
                  PriorityLevel: p,
                  AgingBucket: b,
                  IsOpenCount: mData[key] || 0,
                });
              });
            });

            var oJSON = new JSONModel({
              HeatData: aHeatData,
            });

            oView.setModel(oJSON, "bottleneckModel");
          }.bind(this),

          error: function (oError)
          {
            console.error("Heatmap load error:", oError);
          },
        });
      },

      /* STATUS DONUT CHART - Group Data Manually */
      _loadStatusDonutChart: function ()
      {
        var oView = this.getView();
        var oModel = oView.getModel("statsAnalytics");

        var oStatsModel = oView.getModel("statsAnalyticsModel");
        oStatsModel.setProperty("/donutBusy", true);

        oModel.read("/ZC_GSP26SAP02_WF_ANALYTICS", {
          urlParameters: {
            $select: "StatusCategory,TaskCounter",
          },
          success: function (oData)
          {
            oStatsModel.setProperty("/donutBusy", false);

            var aRaw = oData.results || [];
            var mData = {};

            aRaw.forEach(function (item)
            {
              var status = item.StatusCategory || "Unknown";
              var count = Number(item.TaskCounter) || 0;

              mData[status] = (mData[status] || 0) + count;
            });

            var aGroupedData = [];
            for (var key in mData)
            {
              aGroupedData.push({
                StatusCategory: key,
                TaskCounter: mData[key],
              });
            }

            var oDonutModel = new JSONModel({
              DonutData: aGroupedData,
            });
            oView.setModel(oDonutModel, "donutModel");
          }.bind(this),
          error: function (oError)
          {
            oStatsModel.setProperty("/donutBusy", false);
            console.error("Donut chart data error:", oError);
          }.bind(this),
        });
      },

      /* PRIORITY BAR CHART - Group Data Manually */
      _loadPriorityBarChart: function ()
      {
        var oView = this.getView();
        var oModel = oView.getModel("statsAnalytics");

        var oStatsModel = oView.getModel("statsAnalyticsModel");
        oStatsModel.setProperty("/priorityBusy", true);

        oModel.read("/ZC_GSP26SAP02_WF_ANALYTICS", {
          urlParameters: {
            $select: "PriorityLevel,TaskCounter",
          },
          success: function (oData)
          {
            oStatsModel.setProperty("/priorityBusy", false);

            var aRaw = oData.results || [];
            var mData = {};

            aRaw.forEach(function (item)
            {
              var priority = item.PriorityLevel || "Unknown";
              var count = Number(item.TaskCounter) || 0;

              mData[priority] = (mData[priority] || 0) + count;
            });

            var aGroupedData = [];
            for (var key in mData)
            {
              aGroupedData.push({
                PriorityLevel: key,
                TaskCounter: mData[key],
              });
            }

            var oPriorityModel = new JSONModel({
              PriorityData: aGroupedData,
            });
            oView.setModel(oPriorityModel, "priorityModel");
          }.bind(this),
          error: function (oError)
          {
            oStatsModel.setProperty("/priorityBusy", false);
            console.error("Priority chart data error:", oError);
          }.bind(this),
        });
      },

      _initDefaultDateRange: function ()
      {
        var oDateRange = this.byId("perfChartDateRange");
        if (oDateRange)
        {
          var oToDate = new Date();
          var oFromDate = new Date();
          oFromDate.setMonth(oFromDate.getMonth() - 1);

          oDateRange.setDateValue(oFromDate);
          oDateRange.setSecondDateValue(oToDate);

          // trigger the change event manually to apply filters
          this.onPerfChartDateChange({
            getSource: function ()
            {
              return oDateRange;
            },
          });
        }
      },

      _connectPopovers: function ()
      {
        var oBundle = this.getView().getModel("i18n").getResourceBundle();

        var oColumnChart = this.byId("OpenCompletedColumnChart");
        var oColumnPopover = this.byId("OpenCompletedPopover");

        if (oColumnChart && oColumnPopover)
        {
          oColumnChart.setVizProperties({
            title: { text: oBundle.getText("userWorkloadColumnChartTitle") },
          });
          oColumnPopover.connect(oColumnChart.getVizUid());
        }
      },

      /**
       * @param {sap.ui.base.Event} oEvent
       */
      onChartInfoPress: function (oEvent)
      {
        var oSourceButton = oEvent.getSource();
        var sType = oSourceButton.data("chartType");

        var oView = this.getView();
        if (!this._oChartInfoPopover)
        {
          this._oChartInfoPopover = sap.ui.xmlfragment(
            oView.getId(),
            "z.wf.zwfmanagement.view.fragments.analytics.ChartInfoPopover",
            this,
          );
          oView.addDependent(this._oChartInfoPopover);
          this._oChartInfoModel = new sap.ui.model.json.JSONModel({ text: "" });
          this._oChartInfoPopover.setModel(
            this._oChartInfoModel,
            "chartInfoModel",
          );
        }

        var oBundle = oView.getModel("i18n").getResourceBundle();
        var sText = "";

        if (sType === "status")
        {
          sText =
            "This chart displays the distribution of total tasks by their status (Open, In Process, Completed...).";
        } else if (sType === "priority")
        {
          sText =
            "This chart displays the number of tasks in processing based on their priority (High, Medium, Low).";
        } else if (sType === "performance")
        {
          sText =
            "This chart displays the number of completed tasks and the average cycle time (in days) over months.";
        } else if (sType === "cycleTime")
        {
          sText =
            "This heat map chart displays the average cycle time by different business objects and tasks.";
        } else if (sType === "aging")
        {
          sText =
            "This chart displays the aging of tasks by business object, categorized into 0-2 days, 3-7 days, and over 7 days.";
        } else if (sType === "bottleneck")
        {
          sText =
            "This heatmap helps identify bottlenecks by showing open tasks grouped by priority and their aging buckets.";
        } else if (sType === "outstanding")
        {
          sText =
            "This table lists the top 10 longest outstanding tasks, showing the user, aging in days, and current status.";
        } else if (sType === "workloadGroup")
        {
          sText =
            "This chart compares the volume of open and completed tasks handled by each agent.";
        }

        this._oChartInfoModel.setProperty("/text", sText);
        this._oChartInfoPopover.openBy(oSourceButton);
      },

      /**
       * @param {sap.ui.base.Event} oEvent
       */
      onPerfChartDateChange: function (oEvent)
      {
        var oDateRange = oEvent.getSource();
        var oDateFrom = oDateRange.getDateValue();
        var oDateTo = oDateRange.getSecondDateValue();

        var aFilters = [
          new sap.ui.model.Filter(
            "StatusCategory",
            sap.ui.model.FilterOperator.EQ,
            "Completed",
          ),
        ];

        if (oDateFrom && oDateTo)
        {
          sap.ui.require(
            ["sap/ui/core/format/DateFormat"],
            function (DateFormat)
            {
              var oFormat = DateFormat.getDateInstance({
                pattern: "yyyyMMdd",
              });
              var sDateFrom = oFormat.format(oDateFrom);
              var sDateTo = oFormat.format(oDateTo);
              aFilters.push(
                new sap.ui.model.Filter(
                  "CreationDate",
                  sap.ui.model.FilterOperator.BT,
                  sDateFrom,
                  sDateTo,
                ),
              );

              var oChart = this.byId("perfChartPanel");
              var oDataset = oChart.getDataset();
              var oBinding = oDataset.getBinding("data");
              if (oBinding)
              {
                oBinding.filter(aFilters);
              }

              var oHeatmapChart = this.byId("idHeatmapChart");
              if (oHeatmapChart)
              {
                var oHeatmapDataset = oHeatmapChart.getDataset();
                var oHeatmapBinding = oHeatmapDataset.getBinding("data");
                if (oHeatmapBinding)
                {
                  oHeatmapBinding.filter(aFilters);
                }
              }
            }.bind(this),
          );
        } else
        {
          var oChart = this.byId("perfChartPanel");
          var oDataset = oChart.getDataset();
          var oBinding = oDataset.getBinding("data");
          if (oBinding)
          {
            oBinding.filter(aFilters);
          }

          var oHeatmapChart = this.byId("idHeatmapChart");
          if (oHeatmapChart)
          {
            var oHeatmapDataset = oHeatmapChart.getDataset();
            var oHeatmapBinding = oHeatmapDataset.getBinding("data");
            if (oHeatmapBinding)
            {
              oHeatmapBinding.filter(aFilters);
            }
          }
        }
      },

      /**
       * @param {sap.ui.base.Event} oEvent
       */
      onChartZoomIn: function (oEvent)
      {
        var sChartId = oEvent.getSource().data("chartId");
        var oChart = this.byId(sChartId);
        if (oChart)
        {
          oChart.zoom({ direction: "in" });
        }
      },

      /**
       * @param {sap.ui.base.Event} oEvent
       */
      onChartZoomOut: function (oEvent)
      {
        var sChartId = oEvent.getSource().data("chartId");
        var oChart = this.byId(sChartId);
        if (oChart)
        {
          oChart.zoom({ direction: "out" });
        }
      },
    });
  },
);
