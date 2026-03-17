sap.ui.define(
    ["./BaseController"],
    function (BaseController)
    {
        "use strict";
        return BaseController.extend("z.wf.zwfmanagement.controller.Help", {
            onInit: function ()
            {
                BaseController.prototype.onInit.apply(this, arguments);
            },

        });
    }
);