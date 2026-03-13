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
    },

    onAfterRendering: function ()
    {
      this._detachSlaHoverEvents();
      this._attachSlaHoverEvents();
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

    _loadPerformanceData: function ()
    {
      var oView = this.getView();
      var oModel = this.getOwnerComponent().getModel("userProductivityAnalytics");

      // Set initial loading state
      var oAggregateModel = new JSONModel({
        avgProcessingTime: "0.00",
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

          oAggregateModel.setData({
            avgProcessingTime: fAvgProcessingTime.toFixed(2),
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
