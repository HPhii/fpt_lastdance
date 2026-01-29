sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
  "use strict";

  return Controller.extend("z.wf.zwfmanagement.controller.Analytics", {
    onNavBackToDashboard: function () {
      this.getOwnerComponent().getRouter().navTo("RouteDashboard");
    },
  });
});
