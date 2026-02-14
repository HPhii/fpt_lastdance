sap.ui.define(
  [
    "sap/ui/core/UIComponent",
    "z/wf/zwfmanagement/model/models",
    "sap/f/library",
    "sap/f/FlexibleColumnLayoutSemanticHelper"
  ],
  (UIComponent, models, fioriLibrary, FlexibleColumnLayoutSemanticHelper) =>
  {
    "use strict";
    var LayoutType = fioriLibrary.LayoutType;

    return UIComponent.extend("z.wf.zwfmanagement.Component", {
      metadata: {
        manifest: "json",
        interfaces: ["sap.ui.core.IAsyncContentCreation"],
      },

      init()
      {
        // call the base component's init function
        UIComponent.prototype.init.apply(this, arguments);

        // set the device model
        this.setModel(models.createDeviceModel(), "device");

        // enable routing
        this.getRouter().initialize();
      },

      getHelper: function ()
      {
        var oFCL = this.getRootControl().byId("fcl");

        // Return null if FCL is not found (app not using FCL)
        if (!oFCL)
        {
          console.error("FlexibleColumnLayout not found.");
          return null;
        }

        var oParams = new URLSearchParams(window.location.search),
          oSettings = {
            defaultTwoColumnLayoutType: LayoutType.TwoColumnsMidExpanded,
            defaultThreeColumnLayoutType: LayoutType.ThreeColumnsMidExpanded,
            mode: oParams.get("mode"),
            maxColumnsCount: oParams.get("max")
          };

        return FlexibleColumnLayoutSemanticHelper.getInstanceFor(oFCL, oSettings);
      }
    });
  }
);
