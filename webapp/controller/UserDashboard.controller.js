sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/m/Popover",
  "sap/m/Text"
], function (BaseController, JSONModel, Popover, Text)
{
  "use strict";

  return BaseController.extend("z.wf.zwfmanagement.controller.UserDashboard", {

    onInit: function ()
    {
      BaseController.prototype.onInit.apply(this, arguments);
      this._loadKPIData();
      this._loadPerformanceData();
      this._loadProductivityData();
      this._loadWorkflowTypeData();
    },

    onAfterRendering: function ()
    {
      this._detachSlaHoverEvents();
      this._attachSlaHoverEvents();
      this._configureProductivityChart();
      this._configureWorkflowTypeChart();
    },

    onExit: function ()
    {
      this._detachSlaHoverEvents();
      if (this._oSlaPopover)
      {
        this._oSlaPopover.destroy();
        this._oSlaPopover = null;
        this._oSlaPopoverText = null;
      }
    },

    _loadKPIData: function ()
    {
      var oView = this.getView();
      var oModel = this.getOwnerComponent().getModel("userKPIAnalytics");

      oView.setModel(new JSONModel({
        MyOpenTasksCount: "0",
        DueTodayCount: "0",
        MyOverdueCount: "0",
        busy: true
      }), "kpiModel");

      oModel.read("/ZC_GSP26SAP02_MYKPIACT", {
        success: function (oData)
        {
          var oResult = oData.results && oData.results.length > 0
            ? oData.results[0]
            : { MyOpenTasksCount: "0", DueTodayCount: "0", MyOverdueCount: "0" };

          var oKpiModel = new JSONModel({
            MyOpenTasksCount: oResult.MyOpenTasksCount,
            DueTodayCount: oResult.DueTodayCount,
            MyOverdueCount: oResult.MyOverdueCount,
            busy: false
          });

          oView.setModel(oKpiModel, "kpiModel");
        },
        error: function ()
        {
          var oKpiModel = new JSONModel({
            MyOpenTasksCount: "–",
            DueTodayCount: "–",
            MyOverdueCount: "–",
            busy: false
          });
          oView.setModel(oKpiModel, "kpiModel");
        }
      });
    },

    onNavBack: function ()
    {
      this.getOwnerComponent().getRouter().navTo("RouteDashboard");
    },

    _attachSlaHoverEvents: function ()
    {
      var oChartArea = this.byId("slaChartHoverArea");
      if (!oChartArea)
      {
        return;
      }

      oChartArea.attachBrowserEvent("mouseenter", this._handleSlaMouseEnter, this);
      oChartArea.attachBrowserEvent("mouseleave", this._handleSlaMouseLeave, this);
    },

    _detachSlaHoverEvents: function ()
    {
      var oChartArea = this.byId("slaChartHoverArea");
      if (!oChartArea)
      {
        return;
      }

      oChartArea.detachBrowserEvent("mouseenter", this._handleSlaMouseEnter, this);
      oChartArea.detachBrowserEvent("mouseleave", this._handleSlaMouseLeave, this);
    },

    _handleSlaMouseEnter: function ()
    {
      var oChartArea = this.byId("slaChartHoverArea");
      var oAggregateModel = this.getView().getModel("kpiAggregateModel");
      var iSlaHitRate = oAggregateModel ? oAggregateModel.getProperty("/slaHitRate") : 0;

      if (!oChartArea)
      {
        return;
      }

      if (!this._oSlaPopover)
      {
        this._oSlaPopoverText = new Text();
        this._oSlaPopover = new Popover({
          showHeader: false,
          placement: "Top",
          contentWidth: "12rem",
          content: [this._oSlaPopoverText]
        });
        this._oSlaPopover.addStyleClass("sapUiContentPadding");
        this.getView().addDependent(this._oSlaPopover);
      }

      this._oSlaPopoverText.setText("SLA Hit Rate: " + iSlaHitRate + "%");
      this._oSlaPopover.openBy(oChartArea);
    },

    _handleSlaMouseLeave: function ()
    {
      if (this._oSlaPopover)
      {
        this._oSlaPopover.close();
      }
    },

    _loadProductivityData: function ()
    {
      var oView = this.getView();
      var oModel = this.getOwnerComponent().getModel("userProductivityAnalytics");

      oView.setModel(new JSONModel({ data: [], loading: true }), "productivityModel");

      if (!oModel)
      {
        oView.getModel("productivityModel").setProperty("/loading", false);
        return;
      }

      var iCurrentYear = new Date().getFullYear();
      var sYearStart = iCurrentYear + "0101";
      var sYearEnd   = iCurrentYear + "1231";

      oModel.read("/ZC_GSP26SAP02_MYPERF", {
        urlParameters: {
          $select: "CompletionDate,CompletedCount,TotalProcessingDays",
          $filter: "CompletionDate ge '" + sYearStart + "' and CompletionDate le '" + sYearEnd + "'"
        },
        success: function (oData)
        {
          var aResults = oData.results || [];
          console.log("[ProductivityChart] raw results:", aResults.length, aResults);

          var aTransformed = aResults.reduce(function (acc, oItem)
          {
            var sRaw = String(oItem.CompletionDate || "");
            if (!sRaw || sRaw === "null") { return acc; }

            // Handle both YYYYMMDD (8-char) and YYYY-MM-DD (10-char with dashes)
            var sNorm = sRaw.replace(/-/g, "");
            if (sNorm.length < 8) { return acc; }

            var oDate = new Date(
              parseInt(sNorm.substring(0, 4), 10),
              parseInt(sNorm.substring(4, 6), 10) - 1,
              parseInt(sNorm.substring(6, 8), 10)
            );
            if (isNaN(oDate.getTime())) { return acc; }

            var iCompleted = parseFloat(oItem.CompletedCount) || 0;
            var iTotalDays = parseFloat(oItem.TotalProcessingDays) || 0;
            var fAvg = iCompleted > 0
              ? parseFloat((iTotalDays / iCompleted).toFixed(2))
              : 0;

            acc.push({
              CompletionDate: oDate,
              CompletedCount: iCompleted,
              AvgProcessingTime: fAvg
            });
            return acc;
          }, []);

          aTransformed.sort(function (a, b)
          {
            return a.CompletionDate - b.CompletionDate;
          });

          console.log("[ProductivityChart] transformed:", aTransformed.length, aTransformed);

          oView.getModel("productivityModel").setData({
            data: aTransformed,
            loading: false
          });

          if (aTransformed.length > 0)
          {
            var oMaxItem = aTransformed.reduce(function (acc, cur)
            {
              return cur.CompletedCount > acc.CompletedCount ? cur : acc;
            }, aTransformed[0]);

            var oMinItem = aTransformed.reduce(function (acc, cur)
            {
              return cur.CompletedCount < acc.CompletedCount ? cur : acc;
            }, aTransformed[0]);

            var oVizFrame = oView.byId("productivityVizFrame");
            if (oVizFrame)
            {
              oVizFrame.setVizProperties(
                this._buildProductivityVizProperties(
                  oMaxItem.CompletionDate,
                  oMinItem.CompletionDate
                )
              );
            }
          }
        }.bind(this),
        error: function (oError)
        {
          console.error("[ProductivityChart] OData read failed:", oError);
          oView.getModel("productivityModel").setProperty("/loading", false);
        }
      });
    },

    _configureProductivityChart: function ()
    {
      var oVizFrame = this.byId("productivityVizFrame");
      if (!oVizFrame) { return; }
      oVizFrame.setVizProperties(this._buildProductivityVizProperties());
    },

    _buildProductivityVizProperties: function (oMaxDate, oMinDate)
    {
      var oProps = {
        title: {
          visible: true,
          text: "Daily Task Completion Trend"
        },
        plotArea: {
          marker: {
            visible: true,
            size: 6
          }
        },
        tooltip: {
          visible: true
        },
        timeAxis: {
          title: {
            visible: true,
            text: "Date"
          }
        },
        valueAxis: {
          title: {
            visible: true,
            text: "Completed Tasks"
          }
        },
        valueAxis2: {
          title: {
            visible: true,
            text: "Avg Processing Time (Days)"
          }
        },
        legend: {
          visible: true
        }
      };

      if (oMaxDate && oMinDate)
      {
        oProps.plotArea.dataPointStyle = {
          rules: [
            {
              dataContext: { "Completion Date": oMaxDate },
              properties: {
                color: "#3fae2a",
                symbolSize: 14
              },
              displayName: "Best Day"
            },
            {
              dataContext: { "Completion Date": oMinDate },
              properties: {
                color: "#e64a45",
                symbolSize: 14
              },
              displayName: "Lowest Day"
            }
          ]
        };
      }

      return oProps;
    },

    _loadWorkflowTypeData: function ()
    {
      var oView = this.getView();
      var oModel = this.getOwnerComponent().getModel("userProductivityAnalytics");

      var mTypeLabels = {
        "BUS2009001":              "Purchase Requisition",
        "CL_MM_PUR_WF_OBJECT_PO":  "Purchase Order",
        "CL_MM_PUR_WF_OBJECT_RFQ": "Request for Quotation",
        "Unknown":                 "Order"
      };

      oView.setModel(new JSONModel({ data: [], loading: true }), "workflowTypeModel");

      if (!oModel)
      {
        oView.getModel("workflowTypeModel").setProperty("/loading", false);
        return;
      }

      oModel.read("/ZC_GSP26SAP02_MYPERF", {
        urlParameters: {
          $select: "BusinessObjectType,CompletedCount"
        },
        success: function (oData)
        {
          var aResults = oData.results || [];
          console.log("[WorkflowTypeChart] raw results:", aResults.length, aResults);

          var aTransformed = aResults.reduce(function (acc, oItem)
          {
            var sCode  = String(oItem.BusinessObjectType || "");
            var iCount = parseFloat(oItem.CompletedCount) || 0;
            if (!sCode || sCode === "null" || iCount === 0) { return acc; }

            acc.push({
              Type:     mTypeLabels[sCode] || sCode,
              Category: "Completed Tasks",
              Count:    iCount
            });
            return acc;
          }, []);

          // Sort descending so highest workload appears first
          aTransformed.sort(function (a, b) { return b.Count - a.Count; });

          console.log("[WorkflowTypeChart] transformed:", aTransformed.length, aTransformed);

          oView.getModel("workflowTypeModel").setData({
            data: aTransformed,
            loading: false
          });

          var oVizFrame = oView.byId("workflowTypeVizFrame");
          if (oVizFrame)
          {
            oVizFrame.setVizProperties({
              title: {
                visible: true,
                text: "Workflow Workload Heat Map"
              },
              plotArea: {
                colorScale: {
                  colorRange: ["#d6eaf8", "#2980b9", "#1a5276"]
                }
              },
              tooltip: {
                visible: true
              },
              categoryAxis: {
                title: { visible: true, text: "Document Type" }
              },
              categoryAxis2: {
                title: { visible: false }
              },
              legendGroup: {
                linesOfWrap: 1
              }
            });
          }
        },
        error: function (oError)
        {
          console.error("[WorkflowTypeChart] OData read failed:", oError);
          oView.getModel("workflowTypeModel").setProperty("/loading", false);
        }
      });
    },

    _configureWorkflowTypeChart: function ()
    {
      var oVizFrame = this.byId("workflowTypeVizFrame");
      if (!oVizFrame) { return; }
      oVizFrame.setVizProperties({
        title: {
          visible: true,
          text: "Workflow Workload Heat Map"
        },
        plotArea: {
          colorScale: {
            colorRange: ["#d6eaf8", "#2980b9", "#1a5276"]
          }
        },
        tooltip: { visible: true },
        categoryAxis: {
          title: { visible: true, text: "Document Type" }
        },
        categoryAxis2: {
          title: { visible: false }
        }
      });
    },

    _loadPerformanceData: function ()
    {
      var oView = this.getView();
      var oModel = this.getOwnerComponent().getModel("userProductivityAnalytics");

      // Set initial loading state
      var oAggregateModel = new JSONModel({
        avgProcessingTime: "0.00",
        avgTimeMeterPct: "0%",
        avgTimeState: "good",
        slaHitRate: 0,
        slaColor: "Neutral",
        slaState: "None",
        completedCount: 0,
        onTimeCount: 0,
        totalDays: 0,
        loading: true
      });
      oView.setModel(oAggregateModel, "kpiAggregateModel");

      if (!oModel) {
        console.error("userProductivityAnalytics model not found");
        oAggregateModel.setProperty("/loading", false);
        return;
      }

      oModel.read("/ZC_GSP26SAP02_MYPERF", {
        urlParameters: {
          $select: "CompletedCount,TotalProcessingDays,CompletedOnTimeCount"
        },
        success: function (oData)
        {
          var aResults = oData.results || [];
          var oResult = aResults.length > 0
            ? aResults[0]
            : { CompletedCount: "0", TotalProcessingDays: "0", CompletedOnTimeCount: "0" };

          var iCompleted = parseInt(oResult.CompletedCount, 10) || 0;
          var iTotalDays = parseInt(oResult.TotalProcessingDays, 10) || 0;
          var iOnTime = parseInt(oResult.CompletedOnTimeCount, 10) || 0;

          var fAvgProcessingTime = iCompleted > 0 ? (iTotalDays / iCompleted) : 0;
          var fSlaHitRate = iCompleted > 0 ? (iOnTime / iCompleted) * 100 : 0;
          var fSlaRounded = Math.max(0, Math.min(100, Math.round(fSlaHitRate)));

          // Determine SLA color (for RadialMicroChart) and state (for ObjectStatus)
          var sSlaColor;
          var sSlaState;

          if (fSlaHitRate >= 95) {
            sSlaColor = "Good";
            sSlaState = "Success";
          } else if (fSlaHitRate >= 80) {
            sSlaColor = "Critical";
            sSlaState = "Warning";
          } else {
            sSlaColor = "Error";
            sSlaState = "Error";
          }

          var fAvgMeterPct = parseFloat(Math.min(fAvgProcessingTime / 15 * 100, 100).toFixed(1));
          var sAvgTimeState = fAvgProcessingTime <= 5 ? "good" : fAvgProcessingTime <= 10 ? "warn" : "bad";

          oAggregateModel.setData({
            avgProcessingTime: fAvgProcessingTime.toFixed(2),
            avgTimeMeterPct: fAvgMeterPct + "%",
            avgTimeState: sAvgTimeState,
            slaHitRate: fSlaRounded,
            slaColor: sSlaColor,
            slaState: sSlaState,
            completedCount: iCompleted,
            onTimeCount: iOnTime,
            totalDays: iTotalDays,
            loading: false
          });
        },
        error: function (oError)
        {
          console.error("Failed to fetch performance data:", oError);
          oAggregateModel.setProperty("/loading", false);
        }
      });
    }
  });
});
