sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
  "use strict";

  return Controller.extend("z.wf.zwfmanagement.controller.MainView", {
    onListItemPress: function (oEvent) {
      var oItem = oEvent.getSource();
      var oCtx = oItem.getBindingContext();

      var sPath = oCtx.getPath().substr(1);

      var oRouter = this.getOwnerComponent().getRouter();
      oRouter.navTo("RouteDetail", {
        propertyPath: window.encodeURIComponent(sPath),
      });
    },

    onNavBackToDashboard: function () {
      this.getOwnerComponent().getRouter().navTo("RouteDashboard");
    },
  });
});
