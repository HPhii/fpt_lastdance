sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
  "use strict";

  return Controller.extend("z.wf.zwfmanagement.controller.MainView", {
    onListItemPress: function (oEvent) {
      // Lấy binding context của dòng được click
      var oItem = oEvent.getSource();
      var oCtx = oItem.getBindingContext();

      // Lấy đường dẫn (ví dụ: WfTasks('123456')) nhưng bỏ dấu / ở đầu
      var sPath = oCtx.getPath().substr(1);

      // Chuyển hướng sang trang Detail
      var oRouter = this.getOwnerComponent().getRouter();
      oRouter.navTo("RouteDetail", {
        propertyPath: window.encodeURIComponent(sPath),
      });
    },
  });
});
