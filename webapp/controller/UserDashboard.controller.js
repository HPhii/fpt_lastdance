sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel)
{
  "use strict";

  return BaseController.extend("z.wf.zwfmanagement.controller.UserDashboard", {

    onInit: function ()
    {
      BaseController.prototype.onInit.apply(this, arguments);
      this._loadKPIData();
      this._loadPerformanceData();
    },

    _loadKPIData: function ()
    {
      var oView = this.getView();
      var oModel = this.getOwnerComponent().getModel("userKPIAnalytics");

      oModel.read("/ZC_GSP26SAP02_MYKPIACT", {
        success: function (oData)
        {
          var oResult = oData.results && oData.results.length > 0
            ? oData.results[0]
            : { MyOpenTasksCount: "0", DueTodayCount: "0", MyOverdueCount: "0" };

          var oKpiModel = new JSONModel({
            MyOpenTasksCount: oResult.MyOpenTasksCount,
            DueTodayCount: oResult.DueTodayCount,
            MyOverdueCount: oResult.MyOverdueCount
          });

          oView.setModel(oKpiModel, "kpiModel");
        },
        error: function ()
        {
          var oKpiModel = new JSONModel({
            MyOpenTasksCount: "–",
            DueTodayCount: "–",
            MyOverdueCount: "–"
          });
          oView.setModel(oKpiModel, "kpiModel");
        }
      });
    },

    onNavBack: function ()
    {
      this.getOwnerComponent().getRouter().navTo("RouteDashboard");
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
            slaHitRate: Math.round(fSlaHitRate),
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
