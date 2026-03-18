sap.ui.define([
    "./BaseController",
], function (BaseController)
{
    "use strict";

    return BaseController.extend("z.wf.zwfmanagement.controller.AdminInbox", {
        onInit: function ()
        {
            BaseController.prototype.onInit.apply(this, arguments);
        },
    });

});