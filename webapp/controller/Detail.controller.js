sap.ui.define(
  [
    "./BaseController",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "../utils/ForwardDialog",
    "../utils/SuspendDialog",
    "../utils/DetailOdata",
    "../utils/SetPriorityDialog",
    "../utils/UserInfoPopover",
    "../utils/Attachments",
    "sap/m/MessageToast"
  ],
  function (
    BaseController,
    MessageBox,
    JSONModel,
    ForwardDialogHelper,
    SuspendDialogHelper,
    DetailOdataHelper,
    SetPriorityDialogHelper,
    UserInfoPopoverHelper,
    AttachmentsHelper,
    MessageToast
  )
  {
    "use strict";

    return BaseController.extend("z.wf.zwfmanagement.controller.Detail", {
      onInit: function ()
      {
        var oView = this.getView();
        this.oRouter = this.getOwnerComponent().getRouter();

        var oViewModel = new JSONModel({
          headerBusy: false,
          bodyBusy: false,
          today: new Date(),
          headerSubtitle: "",
          snappedTitle: ""
        });

        oView.setModel(oViewModel, "detailView");
        oView.setModel(new JSONModel({}), "commentsModel");
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

        var sPath = "/WfTasks(WorkItemID='" + window.decodeURIComponent(sPropertyPath) + "')";

        console.log("Detail view matched, binding to:", sPath);

        oView.bindElement({
          path: sPath,
          parameters: {
            $select: "*,__OperationControl",
            $expand: "_DecisionOptions,_TraceLogs,_Comments",
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
                if (aComments && aComments.length > 0)
                {
                  oView.getModel("commentsModel").setData({
                    comments: aComments
                  });
                }

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
        var oContext = this.getView().getBindingContext();

        var sConfirmMessage = oResourceBundle.getText("confirmDecision", [
          sText,
        ]);

        const oPayload = {
          DecisionKey: sDecisionKey,
          WorkItemID: sWorkItemID,
          DecisionComment: ""
        };
        MessageBox.confirm(sConfirmMessage, {
          onClose: function (oAction)
          {
            if (oAction === MessageBox.Action.OK)
            {
              that.callBoundAction("executionDecision", oContext, oPayload);
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
              // var oPayload = {
              //   ELEMENT: "0001"
              // };

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
              // var oPayload = {
              //   ELEMENT: "0002"
              // };

              that.callBoundAction("reject", oContext);
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
        var oView = this.getView();
        var sValue = oEvent.getParameter("value").trim();
        if (!sValue) return;

        var oContext = oView.getBindingContext();
        if (!oContext) return;

        var oModel = oView.getModel();
        var oListBinding = oModel.bindList("_Comments", oContext, undefined, undefined, {
          $$ownRequest: true
        });

        // 2nd param bSkipRefresh=true → prevents auto-refresh of transient entity (empty ObjectID → 404)
        oListBinding.create({ Note: sValue }, true);

        oListBinding.attachEventOnce("createCompleted", function (oEvent)
        {
          var bSuccess = oEvent.getParameter("success");
          var oResourceBundle = oView.getModel("i18n").getResourceBundle();

          if (bSuccess)
          {
            MessageToast.show(oResourceBundle.getText("commentPostSuccess"));
            var oElementBinding = oView.getElementBinding();
            if (oElementBinding)
            {
              oElementBinding.refresh();
            }
          } else
          {
            MessageBox.error(oResourceBundle.getText("commentPostError"));
          }
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

      onDownloadAttachment: function (oEvent)
      {
        AttachmentsHelper.onDownloadAttachment(this.getView(), oEvent);
      },

      onUploadAttachment: function ()
      {
        AttachmentsHelper.onUploadAttachment(this.getView());
      },

      onRemoveAttachment: function (oEvent)
      {
        AttachmentsHelper.onRemoveAttachment(this.getView(), oEvent);
      },

      onToggleSidePanel: function (oEvent)
      {
        var oView = this.getView(),
          oItem = oEvent.getParameter("item"),
          sItemId = oItem ? oItem.getId().split("--").slice(-1)[0] : "N/A";

        if (sItemId === "traceLogsSidePanelItem")
        {
          var oContext = oView.getBindingContext();
          if (!oContext) return;
          oContext.requestObject("_TraceLogs").then(function (aTraceLogs)
          {
            if (!aTraceLogs || !aTraceLogs.length)
            {
              oView.setModel(new JSONModel({ nodes: [], lines: [] }), "traceLogGraph");
              return;
            }

            // Sort by LogCounter ascending
            var aSorted = aTraceLogs.slice().sort(function (a, b)
            {
              return parseInt(a.LogCounter, 10) - parseInt(b.LogCounter, 10);
            });

            console.log(aSorted);


            // Build nodes
            var aNodes = aSorted.map(function (oLog)
            {
              var sStatus;
              var sIcon;
              switch (oLog.StepStatus)
              {
                case "COMPLETED":
                  sStatus = "Success";
                  sIcon = "sap-icon://accept";
                  break;
                case "STARTED":
                  sStatus = "Information";
                  sIcon = "sap-icon://begin";
                  break;
                case "READY":
                  sStatus = "Warning";
                  sIcon = "sap-icon://pending";
                  break;
                case "ERROR":
                case "CANCELLED":
                  sStatus = "Error";
                  sIcon = "sap-icon://error";
                  break;
                default:
                  sStatus = "Standard";
                  sIcon = "sap-icon://process";
                  break;
              }

              return {
                key: oLog.StepWorkItemID,
                title: oLog.StepDescription,
                icon: sIcon,
                status: sStatus,
                // Main properties (content)
                stepStatus: oLog.StepStatus,
                agent: oLog.ActualAgent || oLog.CreatedByUser || "",
                stepCreationDate: oLog.StepCreationDate,
                stepCreationTime: oLog.StepCreationTime,
                logDate: oLog.LogDate,
                logTime: oLog.LogTime,
                // Secondary properties (attributes)
                taskID: oLog.TaskID || "",
                parentWorkItemID: oLog.ParentWorkItemID || "",
                stepWorkItemID: oLog.StepWorkItemID || "",
                taskShortText: oLog.TaskShortText || "",
                workItemType: oLog.WorkItemType || "",
                priority: oLog.Priority || "",
                nodeID: oLog.NodeID || "",
                predecessorWI: oLog.PredecessorWI || "",
                parentWorkItem: oLog.ParentWorkItem || "",
                completedDate: oLog.CompletedDate || "",
                completedTime: oLog.CompletedTime || "",
                returnCode: oLog.ReturnCode || "",
                deadlineStatus: oLog.DeadlineStatus || ""
              };
            });

            // Build lines: connect consecutive nodes by LogCounter order
            var aLines = [];
            for (var i = 0; i < aNodes.length - 1; i++)
            {
              aLines.push({
                from: aNodes[i].key,
                to: aNodes[i + 1].key
              });
            }

            oView.setModel(new JSONModel({ nodes: aNodes, lines: aLines }), "traceLogGraph");
          });
        }
      },
    });
  },
);
