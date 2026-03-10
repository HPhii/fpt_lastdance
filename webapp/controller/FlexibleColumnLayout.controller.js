sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/mvc/Controller"
], function (JSONModel, Controller)
{
    "use strict";

    return Controller.extend("z.wf.zwfmanagement.controller.FlexibleColumnLayout", {
        onInit: function ()
        {
            this.oRouter = this.getOwnerComponent().getRouter();
            this.oRouter.attachRouteMatched(this.onRouteMatched, this);
            this.oRouter.attachBeforeRouteMatched(this.onBeforeRouteMatched, this);

            // Apply pending layout from deep link (initial URL paste)
            // The Component's _onBeforeRouteMatched may have fired before this view was ready
            var sPendingLayout = this.getOwnerComponent()._sPendingLayout;
            if (sPendingLayout)
            {
                var oFCL = this.byId("fcl");
                if (oFCL)
                {
                    oFCL.setLayout(sPendingLayout);
                }

                this.getOwnerComponent()._sPendingLayout = null;
            }
        },

        onBeforeRouteMatched: function (oEvent)
        {
            var sLayout = oEvent.getParameters().arguments.layout;

            // If there is no layout parameter, query for the default level 0 layout (normally OneColumn)
            if (!sLayout)
            {
                var oHelper = this.getOwnerComponent().getHelper();
                if (oHelper)
                {
                    var oNextUIState = oHelper.getNextUIState(0);
                    sLayout = oNextUIState.layout;
                }
            }

            // Update the layout of the FlexibleColumnLayout
            if (sLayout)
            {
                var oFCL = this.byId("fcl");
                if (oFCL)
                {
                    oFCL.setLayout(sLayout);
                }
            }
        },

        onRouteMatched: function (oEvent)
        {
            var sRouteName = oEvent.getParameter("name");
            var oArguments = oEvent.getParameter("arguments");

            // Save the current route name and property path
            this.currentRouteName = sRouteName;
            this.currentPropertyPath = oArguments.propertyPath;
        },

        onColumnResize: function (oEvent)
        {
            // This event is ideal to call scrollToIndex function of the Table
            var oMasterView = oEvent.getSource().getBeginColumnPages()[0];

            if (oMasterView && oMasterView.getController && oMasterView.getController().iIndex && oEvent.getParameter("beginColumn"))
            {
                var oTable = oMasterView.byId("idTasksList");
                if (oTable && oTable.$().is(":visible"))
                {
                    oTable.scrollToIndex(oMasterView.getController().iIndex);
                }
            }
        },

        onStateChanged: function (oEvent)
        {
            var bIsNavigationArrow = oEvent.getParameter("isNavigationArrow");
            var sLayout = oEvent.getParameter("layout");

            // Replace the URL with the new layout if a navigation arrow was used
            if (bIsNavigationArrow)
            {
                this.oRouter.navTo(this.currentRouteName, {
                    layout: sLayout,
                    propertyPath: this.currentPropertyPath
                }, true);
            }
        },

        onExit: function ()
        {
            this.oRouter.detachRouteMatched(this.onRouteMatched, this);
            this.oRouter.detachBeforeRouteMatched(this.onBeforeRouteMatched, this);
        }
    });
});
