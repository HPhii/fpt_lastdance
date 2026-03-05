sap.ui.define(
  ["./BaseController", "sap/ui/model/json/JSONModel"],
  function (BaseController, JSONModel) {
    "use strict";

    return BaseController.extend("z.wf.zwfmanagement.controller.Analytics", {
      onInit: function () {
        BaseController.prototype.onInit.apply(this, arguments);

        this._loadPerformanceChart(); // thêm dòng này
      },

      _loadPerformanceChart: function () {
        var oModel = this.getOwnerComponent().getModel();

        var oListBinding = oModel.bindList("/ZC_GSP26SAP02_WF_PERF");

        oListBinding
          .requestContexts()
          .then(
            function (aContexts) {
              var aFormatted = aContexts.map(
                function (oContext) {
                  var item = oContext.getObject();

                  var completed = parseInt(item.IsCompletedCount);
                  var totalDays = parseInt(item.CycleTimeDays);

                  return {
                    Month: this._formatMonth(item.CreationYearMonth),
                    Completed: completed,
                    AvgCycle: completed > 0 ? totalDays / completed : 0,
                  };
                }.bind(this),
              );

              var oJsonModel = new JSONModel({
                PerfData: aFormatted,
              });

              this.getView().setModel(oJsonModel);
            }.bind(this),
          )
          .catch(function (err) {
            console.error("OData V4 error:", err);
          });
      },

      _formatMonth: function (yyyymm) {
        if (!yyyymm || yyyymm.length !== 6) {
          return yyyymm;
        }

        var year = yyyymm.substring(0, 4);
        var month = yyyymm.substring(4, 6);

        return year + "-" + month;
      },

      onNavBackToDashboard: function () {
        this.getOwnerComponent().getRouter().navTo("RouteDashboard");
      },
    });
  },
);
