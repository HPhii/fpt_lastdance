sap.ui.define(
  [
    "./BaseController",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v2/ODataModel",
    "../utils/ForwardDialog",
    "../utils/SuspendDialog"
  ],
  function (BaseController, MessageToast, MessageBox, JSONModel, ODataV2Model, ForwardDialogHelper, SuspendDialogHelper)
  {
    "use strict";

    return BaseController.extend("z.wf.zwfmanagement.controller.Detail", {
      onInit: function ()
      {
        this.oRouter = this.getOwnerComponent().getRouter();

        var oViewModel = new JSONModel({
          headerBusy: false,
          bodyBusy: false,
          today: new Date()
        });

        this.getView().setModel(oViewModel, "detailView");
        this.oModel = this.getOwnerComponent().getModel();

        this.oRouter
          .getRoute("RouteDetail")
          .attachPatternMatched(this._onObjectMatched, this);
      },

      _onObjectMatched: function (oEvent)
      {
        var oViewModel = this.getView().getModel("detailView");
        var oDetailPanel = this.byId("DetailObjectPageLayout");
        var that = this;

        // Get the propertyPath parameter from the route
        var sPropertyPath = oEvent.getParameter("arguments").propertyPath;
        this._propertyPath = sPropertyPath; // Store for navigation
        var sPath = "/WfTasks('" + window.decodeURIComponent(sPropertyPath) + "')";

        console.log("Detail view matched, binding to:", sPath);

        this.getView().bindElement({
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

                console.log(sServiceUrl);
                console.log(sEntitySet);
                console.log(sKey);
                console.log(sExpand);


                if (sServiceUrl && sEntitySet && sKey)
                {
                  that._callODataService(sServiceUrl, sEntitySet, sKey, sExpand);
                }
              }
            },
            dataRequested: function ()
            {
              // var oCurrentModel = that.getView().getModel("businessModel");
              // if (oCurrentModel)
              // {
              //   oCurrentModel.refresh(true);
              // }

              oViewModel.setProperty("/headerBusy", true);
            },
          },
        });
      },

      _callODataService: function (sServiceUrl, sEntitySet, sKey, sExpand)
      {
        var oViewModel = this.getView().getModel("detailView");

        var oBusinessContainer = this.byId("DetailObjectPageLayout");
        if (!oBusinessContainer)
        {
          oBusinessContainer = this.byId("detailPanel");
        }

        // Get existing model
        var oCurrentModel = this.getView().getModel("businessModel");

        if (!oCurrentModel || oCurrentModel.sServiceUrl !== sServiceUrl)
        {
          // Create new OData V2 Model
          var oNewModel = new ODataV2Model(sServiceUrl, {
            json: true,
            useBatch: false, // Turn off batch
            defaultBindingMode: "OneWay",
          });

          this.getView().setModel(oNewModel, "businessModel");
        }

        // Create binding path
        var sPath = "/" + sEntitySet + "('" + sKey + "')";

        // 4. Bind Element
        oBusinessContainer.bindElement({
          path: sPath,
          model: "businessModel",
          parameters: {
            expand: sExpand
          },
          events: {
            dataReceived: function ()
            {
              console.log("Business Object Loaded: " + sPath);
              oViewModel.setProperty("/bodyBusy", false);
            },
            change: function ()
            {
              // Todo: Handle data change if needed

            },
            dataRequested: function ()
            {
              oViewModel.setProperty("/bodyBusy", true);

              console.log("Requesting Business Object Data: " + sPath);
            }
          }
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

        console.log("Key FE", sDecisionKey);
        console.log("Data type:", typeof sDecisionKey);

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

              var oRouter = this.getOwnerComponent().getRouter();
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
