sap.ui.define(
  ["./BaseController", "sap/m/library", "sap/m/MessageToast"],
  function (BaseController, MLibrary, MessageToast)
  {
    "use strict";

    return BaseController.extend("z.wf.zwfmanagement.controller.Dashboard", {
      _oRouter: null,

      onInit: function ()
      {
        BaseController.prototype.onInit.apply(this, arguments);
        this._oRouter = this.getOwnerComponent().getRouter();
      },

      onNavToTask: function ()
      {
        var oHelper = this.getOwnerComponent().getHelper();
        if (oHelper)
        {
          var oNextUIState = oHelper.getNextUIState(0);
          this._oRouter.navTo("RouteMainView", { layout: oNextUIState.layout });
        } else
        {
          this._oRouter.navTo("RouteMainView");
        }
      },

      onNavToAnalytics: function ()
      {
        this._oRouter.navTo("RouteAnalytics");
      },

      onNavToHelp: function ()
      {
        this._oRouter.navTo("RouteHelp");
      },

      onNavToSubstitution: function ()
      {
        this._oRouter.navTo("RouteSubstitution");
      },

      onNavToUserKPIDashboard: function ()
      {
        this._oRouter.navTo("RouteUserKPIDashboard");
      },

      onNavToAdminInbox: function ()
      {
        this._oRouter.navTo("RouteAdminInbox");
      },

      onNavToRoleManagement: function ()
      {
        var oView = this.getView();
        var oUserRolesModel = oView.getModel("userRole");
        var isAdmin = oUserRolesModel.getProperty("/isAdmin");

        if (!isAdmin)
        {
          MessageToast.show(
            "You do not have permission to access Role Management.",
          );
          return;
        }

        var sUrl =
          "/sap/bc/ui5_ui5/ui2/ushell/shells/abap/FioriLaunchpad.html?sap-client=324&sap-language=EN#ZRole-display";
        MLibrary.URLHelper.redirect(sUrl, true);
      },
    });
  },
);
