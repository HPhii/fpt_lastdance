sap.ui.define([
  "./BaseController"
], function (BaseController)
{
  "use strict";

  return BaseController.extend("z.wf.zwfmanagement.controller.Analytics", {
    onInit: function ()
    {
      BaseController.prototype.onInit.apply(this, arguments);
    },
    onNavBackToDashboard: function ()
    {
      this.getOwnerComponent().getRouter().navTo("RouteDashboard");
    },
  });
});
