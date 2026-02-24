sap.ui.define(["./BaseController"], function (BaseController)
{
  "use strict";

  return BaseController.extend("z.wf.zwfmanagement.controller.Dashboard", {

    onInit: function ()
    {
      BaseController.prototype.onInit.apply(this, arguments);
    },

    onNavToTask: function ()
    {
      var oHelper = this.getOwnerComponent().getHelper();
      if (oHelper)
      {
        var oNextUIState = oHelper.getNextUIState(0);
        this.getOwnerComponent()
          .getRouter()
          .navTo("RouteMainView", { layout: oNextUIState.layout });
      } else
      {
        this.getOwnerComponent().getRouter().navTo("RouteMainView");
      }
    },

    onNavToAnalytics: function ()
    {
      this.getOwnerComponent().getRouter().navTo("RouteAnalytics");
    },

    onNavToHelp: function ()
    {
      // Nếu muốn mở PDF tab mới thay vì navigate trong app:
      // window.open("link_to_pdf", "_blank");

      // Hoặc navigate vào trang Help nội bộ
      this.getOwnerComponent().getRouter().navTo("RouteHelp");
    },

    onNavToSubstitution: function ()
    {
      this.getOwnerComponent().getRouter().navTo("RouteSubstitution");
    },
  });
});
