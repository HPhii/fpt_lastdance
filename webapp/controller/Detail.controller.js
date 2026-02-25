sap.ui.define(
  [
    "./BaseController",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "../utils/ForwardDialog",
    "../utils/SuspendDialog",
    "../utils/DetailOdata",
    "../utils/SetPriorityDialog"
  ],
  function (
    BaseController,
    MessageToast,
    MessageBox,
    JSONModel,
    ForwardDialogHelper,
    SuspendDialogHelper,
    DetailOdataHelper,
    SetPriorityDialogHelper
  )
  {
    "use strict";

    return BaseController.extend("z.wf.zwfmanagement.controller.Detail", {
      onInit: function ()
      {
        this.oRouter = this.getOwnerComponent().getRouter();

        var oViewModel = new JSONModel({
          headerBusy: false,
          bodyBusy: false,
          today: new Date(),
          headerSubtitle: "",
          snappedTitle: ""
        });

        this.getView().setModel(oViewModel, "detailView");
        this.oModel = this.getOwnerComponent().getModel();

        this.oRouter
          .getRoute("RouteDetail")
          .attachPatternMatched(this._onObjectMatched, this);
      },

      _onObjectMatched: function (oEvent)
      {
        var that = this;
        var oView = this.getView();
        var oViewModel = oView.getModel("detailView");
        var oDetailPanel = this.byId("DetailObjectPageLayout");

        // Get the propertyPath parameter from the route
        var sPropertyPath = oEvent.getParameter("arguments").propertyPath;
        this._propertyPath = sPropertyPath; // Store for navigation
        var sPath = "/WfTasks('" + window.decodeURIComponent(sPropertyPath) + "')";

        console.log("Detail view matched, binding to:", sPath);

        oView.bindElement({
          path: sPath,
          parameters: {
            $select: "*,__OperationControl",
            $expand: "_DecisionOptions",
          },
          events: {
            dataReceived: function ()
            {
              // Hide loading indicator when data is received
              oViewModel.setProperty("/headerBusy", false);

              // Get the bound context of the detail panel
              var oBoundContext = oDetailPanel.getBindingContext();

              if (oBoundContext)
              {
                var sServiceUrl = oBoundContext.getProperty("TargetServicePath");
                var sEntitySet = oBoundContext.getProperty("TargetEntitySet");
                var sKey = oBoundContext.getProperty("ObjectID");
                var sExpand = oBoundContext.getProperty("TargetExpandParams");
                var sExpand2 = oBoundContext.getProperty("TargetExpandParams2");

                if (sServiceUrl && sEntitySet && sKey)
                {
                  DetailOdataHelper.callODataService(oView, {
                    serviceUrl: sServiceUrl,
                    entitySet: sEntitySet,
                    key: sKey,
                    expands: [sExpand, sExpand2].filter(Boolean)
                  });

                  DetailOdataHelper.loadFragmentsForEntitySet(oView, sEntitySet);
                }
              }
            },
            dataRequested: function ()
            {
              oViewModel.setProperty("/headerBusy", true);
            },
          },
        });
      },

      onDecisionPress: function (oEvent)
      {
        var oButton = oEvent.getSource();
        var oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();
        // get data attributes
        var sDecisionKey = oButton.data("DecisionKey");
        var sWorkItemID = oButton.data("WorkItemID");
        var sText = oButton.getText();

        if (sDecisionKey)
        {
          sDecisionKey = sDecisionKey.toString().padStart(4, "0");
        }

        var that = this;
        var sConfirmMessage = oResourceBundle.getText("confirmDecision", [
          sText,
        ]);

        MessageBox.confirm(sConfirmMessage, {
          onClose: function (oAction)
          {
            if (oAction === MessageBox.Action.OK)
            {
              that._callODataV4Action(sWorkItemID, sDecisionKey);
            }
          },
        });
      },

      onApproveAction: function ()
      {
        var oContext = this.getView().getBindingContext();
        var oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();
        var sConfirmMessage = oResourceBundle.getText("confirmApprove");

        var that = this;
        MessageBox.confirm(sConfirmMessage, {
          onClose: function (oAction)
          {
            if (oAction === MessageBox.Action.OK)
            {
              that.callBoundAction("approve", oContext);

              that.getOwnerComponent().getRouter().navTo("RouteMainView", {}, true);
            }
          },
        });
      },

      onRejectAction: function ()
      {
        var oContext = this.getView().getBindingContext();
        var oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();
        var sConfirmMessage = oResourceBundle.getText("confirmReject");

        var that = this;
        MessageBox.confirm(sConfirmMessage, {
          onClose: function (oAction)
          {
            if (oAction === MessageBox.Action.OK)
            {
              that.callBoundAction("reject", oContext);
            }
          },
        });
      },

      onClaimAction: function ()
      {
        var oContext = this.getView().getBindingContext();
        var oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();
        var sConfirmMessage = oResourceBundle.getText("confirmClaim");

        var that = this;
        MessageBox.confirm(sConfirmMessage, {
          onClose: function (oAction)
          {
            if (oAction === MessageBox.Action.OK)
            {
              that.callBoundAction("claim", oContext);
            }
          },
        });
      },

      onForwardAction: function ()
      {
        var oView = this.getView();
        ForwardDialogHelper.onForwardDialogOpen(oView);
      },

      onReleaseAction: function ()
      {
        var oContext = this.getView().getBindingContext();
        var oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();
        var sConfirmMessage = oResourceBundle.getText("confirmRelease");
        var that = this;

        var that = this;
        MessageBox.confirm(sConfirmMessage, {
          onClose: function (oAction)
          {
            if (oAction === MessageBox.Action.OK)
            {
              that.callBoundAction("release", oContext);
            }
          },
        });
      },

      onSetPriorityAction: function ()
      {
        var oView = this.getView();
        SetPriorityDialogHelper.openSetPriorityDialog(oView);
      },

      onSuspendAction: function ()
      {
        var oView = this.getView();

        SuspendDialogHelper.onSuspendDialogOpen(oView);
      },

      _callODataV4Action: function (sWorkItemID, sDecisionKey)
      {
        var oModel = this.getView().getModel();
        var oView = this.getView();
        var oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();

        var oContext = oView.getBindingContext();

        if (!oContext)
        {
          MessageBox.error(oResourceBundle.getText("errorNoContext"));
          return;
        }

        var oOperation = oModel.bindContext(
          "com.sap.gateway.srvd.zsd_gsp26sap02_wf_task.v0001.executionDecision(...)",
          oContext,
        );
        oOperation.setParameter("DecisionKey", sDecisionKey);
        oOperation.setParameter("WorkItemID", sWorkItemID);
        oOperation.setParameter("DecisionComment", "");

        oOperation
          .execute()
          .then(
            function ()
            {
              MessageToast.show(oResourceBundle.getText("successMessage"));

              oModel.refresh();
            }.bind(this),
          )
          .catch(function (oError)
          {
            MessageBox.error("Error: " + oError.message);
          });
      },

      handleFullScreen: function ()
      {
        this.oRouter.navTo("RouteDetail", {
          layout: "MidColumnFullScreen",
          propertyPath: this._propertyPath
        });
      },

      handleExitFullScreen: function ()
      {
        this.oRouter.navTo("RouteDetail", {
          layout: "TwoColumnsMidExpanded",
          propertyPath: this._propertyPath
        });
      },

      handleClose: function ()
      {
        // Clear the selection in the main view list
        var oFCL = this.getOwnerComponent().getRootControl().byId("fcl");
        if (oFCL)
        {
          var oBeginColumn = oFCL.getBeginColumnPages()[0];
          if (oBeginColumn)
          {
            var oList = oBeginColumn.byId("idTasksList");
            if (oList)
            {
              oList.removeSelections(true);
            }
          }
        }

        this.oRouter.navTo("RouteMainView", {
          layout: "OneColumn"
        });
      },
    });
  },
);
