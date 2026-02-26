sap.ui.define(
  [
    "./BaseController",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "../utils/ForwardDialog",
    "../utils/SuspendDialog",
    "../utils/DetailOdata",
    "../utils/SetPriorityDialog",
    "../utils/UserInfoPopover"
  ],
  function (
    BaseController,
    MessageToast,
    MessageBox,
    JSONModel,
    ForwardDialogHelper,
    SuspendDialogHelper,
    DetailOdataHelper,
    SetPriorityDialogHelper,
    UserInfoPopoverHelper
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
        this.getView().setModel(new JSONModel({ comments: [] }), "commentsModel");
        this.oModel = this.getOwnerComponent().getModel();

        this.oRouter
          .getRoute("RouteDetail")
          .attachPatternMatched(this._onObjectMatched, this);
      },

      _onObjectMatched: function (oEvent)
      {
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
            $expand: "_DecisionOptions,_Comments",
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
                var aComments = oBoundContext.getObject("_Comments") || [];
                oView.getModel("commentsModel").setProperty("/comments", aComments);

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
                }

                DetailOdataHelper.loadFragmentsForEntitySet(oView, sEntitySet);
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
              var oPayload = {
                ELEMENT: "0001"
              };

              that.callBoundAction("executionDecision", oContext, oPayload);
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
              var oPayload = {
                ELEMENT: "0002"
              };

              that.callBoundAction("executionDecision", oContext, oPayload);
              that.getOwnerComponent().getRouter().navTo("RouteMainView", {}, true);
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

      onShowUserInfo: function (oEvent)
      {
        var oView = this.getView();
        var oSource = oEvent.getSource();
        var oContext = oSource.getBindingContext();

        if (!oContext) return;

        var sUserId = oSource.getText();

        UserInfoPopoverHelper.onOpen(oView, oSource, sUserId);
      },

      onPostComment: function (oEvent)
      {
        MessageToast.show("Comming Soon.");
        // var sValue = oEvent.getParameter("value");
        // if (!sValue || !sValue.trim())
        // {
        //   return;
        // }

        // var oView = this.getView();
        // var oContext = oView.getBindingContext();
        // var oModel = oView.getModel();
        // var oResourceBundle = oView.getModel("i18n").getResourceBundle();

        // if (!oContext)
        // {
        //   MessageBox.error(oResourceBundle.getText("errorNoContext"));
        //   return;
        // }

        // var sWorkItemID = oContext.getProperty("WorkItemID");

        // var oListBinding = oModel.bindList("_Comments", oContext);
        // oListBinding.create({
        //   WorkItemID: sWorkItemID,
        //   line: sValue.trim(),
        //   title: "COMMENT"
        // });

        // var that = this;
        // oModel.submitBatch("$auto").then(
        //   function ()
        //   {
        //     MessageToast.show(oResourceBundle.getText("commentPostSuccess"));

        //     // Refresh the element binding to re-fetch _Comments via $expand
        //     var oElementBinding = oView.getElementBinding();
        //     if (oElementBinding)
        //     {
        //       oElementBinding.refresh();
        //     }
        //   }
        // ).catch(
        //   function (oError)
        //   {
        //     MessageBox.error("Error: " + oError.message);
        //   }
        // );
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
