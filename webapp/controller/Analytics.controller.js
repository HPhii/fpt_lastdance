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

      /* ROUTE MATCHED */
      _onObjectMatched: function ()
      {
        this._loadOpenCompletedSlider(); //TODO
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
              var obj = item.BusinessObjectType;
              var bucket = item.AgingBucket;
              var count = Number(item.IsOpenCount);

              if (!mGrouped[obj])
              {
                mGrouped[obj] = {
                  BusinessObject: obj,
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

            // Thu thập các giá trị hợp lệ để loại trừ "N/A" và tạo đủ các điểm giao cắt, tránh lỗi "No value"
            var aPriorities = [];
            var aBuckets = [];
            var mData = {};

            aRaw.forEach(function (item)
            {
              var p = item.PriorityLevel || "";
              var b = item.AgingBucket || "";
              var c = Number(item.IsOpenCount) || 0;

              // Bỏ qua các dòng có nội dung N/A
              if (b.indexOf("N/A") !== -1 || p.indexOf("N/A") !== -1 || b === "" || p === "")
              {
                return;
              }

              if (aPriorities.indexOf(p) === -1) aPriorities.push(p);
              if (aBuckets.indexOf(b) === -1) aBuckets.push(b);

              var key = p + "|||" + b;
              mData[key] = (mData[key] || 0) + c;
            });

            // Tạo list data hoàn chỉnh cho tất cả các trục (nếu không có data thì mặc định là 0)
            var aHeatData = [];
            aPriorities.forEach(function (p)
            {
              aBuckets.forEach(function (b)
              {
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

          error: function (oError)
          {
            console.error("Heatmap load error:", oError);
          },
        });
      },

      /* CONNECT POPOVERS */

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

        var oScatterChart = this.byId("CycleTimeScatterChart");
        var oScatterPopover = this.byId("CycleTimePopover");

        if (oScatterChart && oScatterPopover)
        {
          oScatterChart.setVizProperties({
            title: { text: oBundle.getText("userWorkloadScatterChartTitle") },
          });
          oScatterPopover.connect(oScatterChart.getVizUid());
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
