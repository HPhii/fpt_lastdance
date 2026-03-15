sap.ui.define([
  "./BaseController",
  "sap/m/library",
  "sap/m/MessageToast"
], function (BaseController, MLibrary, MessageToast)
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

    onNavToUserDashboard: function ()
    {
      this.getOwnerComponent().getRouter().navTo("RouteUserDashboard");
    },

    onNavToRoleManagement: function ()
    {
      var oView = this.getView();
      var oUserRolesModel = oView.getModel("userRole");
      var isAdmin = oUserRolesModel.getProperty("/isAdmin");

      console.log(isAdmin);

      if (!isAdmin)
      {
        MessageToast.show("You do not have permission to access Role Management.");
        return;
      }

      var sUrl = "/sap/bc/ui5_ui5/ui2/ushell/shells/abap/FioriLaunchpad.html?sap-client=324&sap-language=EN#ZRole-display";
      MLibrary.URLHelper.redirect(sUrl, true);
    },
  });
});
