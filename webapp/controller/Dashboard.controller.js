sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
  "use strict";

  return Controller.extend("z.wf.zwfmanagement.controller.Dashboard", {
    onNavToTask: function () {
      // Navigate vào cái Route cũ (MainView danh sách)
      this.getOwnerComponent().getRouter().navTo("RouteMainView");
    },

    onNavToAnalytics: function () {
      this.getOwnerComponent().getRouter().navTo("RouteAnalytics");
    },

    onNavToHelp: function () {
      // Nếu muốn mở PDF tab mới thay vì navigate trong app:
      // window.open("link_to_pdf", "_blank");

      // Hoặc navigate vào trang Help nội bộ
      this.getOwnerComponent().getRouter().navTo("RouteHelp");
    },
  });
});
