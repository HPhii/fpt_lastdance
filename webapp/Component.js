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

        // Attach layout handler BEFORE router initializes
        // so deep links (direct URL paste) set the correct FCL layout
        this.getRouter().attachBeforeRouteMatched(this._onBeforeRouteMatched, this);

        // enable routing
        this.getRouter().initialize();
      },

      _onBeforeRouteMatched: function (oEvent)
      {
        var sLayout = oEvent.getParameters().arguments.layout;

        if (!sLayout)
        {
          sLayout = "OneColumn";
        }

        // Try to apply layout directly to FCL
        var oRootControl = this.getRootControl();
        if (oRootControl)
        {
          var oFCL = oRootControl.byId("fcl");
          if (oFCL)
          {
            oFCL.setLayout(sLayout);
            return;
          }
        }

        // FCL not ready yet (async root view), store for later
        this._sPendingLayout = sLayout;
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
