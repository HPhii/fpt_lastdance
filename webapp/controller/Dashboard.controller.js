sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
  "use strict";

  return Controller.extend("z.wf.zwfmanagement.controller.Dashboard", {
    onNavToTask: function () {
      this.getOwnerComponent().getRouter().navTo("RouteMainView");
    },

    onNavToAnalytics: function () {
      this.getOwnerComponent().getRouter().navTo("RouteAnalytics");
    },

    onNavToHelp: function () {
      this.getOwnerComponent().getRouter().navTo("RouteHelp");
    },
  });
});
