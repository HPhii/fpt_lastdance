sap.ui.define(
  [
    "./BaseController",
    "sap/ui/core/routing/History",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/core/Fragment"
  ],
  function (BaseController, History, MessageToast, MessageBox, JSONModel, ODataV2Model, Fragment)
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
              that._callBoundAction("approve", oContext);

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
              that._callBoundAction("reject", oContext);
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
              that._callBoundAction("claim", oContext);
            }
          },
        });
      },

      onForwardAction: function ()
      {
        var oView = this.getView();

        let oUserInfoList = new JSONModel({
          visible: false,
          busy: false,
          users: []
        });

        this.getView().setModel(oUserInfoList, "userInfoList");

        if (!this._oForwardDialog)
        {
          this._oForwardDialog = Fragment.load({
            id: oView.getId(),
            name: "z.wf.zwfmanagement.view.fragments.ForwardDialog",
            controller: this
          }).then(function (oDialog)
          {
            oView.addDependent(oDialog);
            return oDialog;
          })
        }

        this._oForwardDialog.then(function (oDialog)
        {
          oDialog.open();
        });

        // var oContext = this.getView().getBindingContext();
        // var oResourceBundle = this.getView()
        //   .getModel("i18n")
        //   .getResourceBundle();
        // var sConfirmMessage = oResourceBundle.getText("confirmForward");

        // var that = this;
        // MessageBox.confirm(sConfirmMessage, {
        //   onClose: function (oAction)
        //   {
        //     if (oAction === MessageBox.Action.OK)
        //     {
        //       that._callBoundAction("forward", oContext);
        //     }
        //   },
        // });
      },

      onConfirmForward: function ()
      {
        var oView = this.getView();
        var oContext = oView.getBindingContext();
        var oUserInput = this.byId("forwardUserInput");
        var userId = oUserInput.getValue();

        if (!userId)
        {
          MessageToast.show("Please enter a user ID to forward the task.");
          return;
        }

        const payload = { USER_ID: userId };

        this._callBoundAction("forward", oContext, payload);

        this._oForwardDialog.then(function (oDialog)
        {
          oDialog.close();
          oUserInput.setValue("");
        });
      },

      onCancelForward: function ()
      {
        var oUserInput = this.byId("forwardUserInput");

        this._oForwardDialog.then(function (oDialog)
        {
          oDialog.close();
          oUserInput.setValue("");
        });
      },

      onValueHelpUserID: function (oEvent)
      {
        var oInput = this.byId("forwardUserInput");
        var userId = oInput.getValue();
        var oUserInfoList = this.getView().getModel("userInfoList");

        const sServiceUrl = "/sap/opu/odata/IWPGW/TASKPROCESSING;mo;v=2/";
        const oODataModel = new ODataV2Model(sServiceUrl, {
          json: true,
          useBatch: false,
        });


        const sEntityPath = "/SearchUsers";


        oUserInfoList.setProperty("/busy", true);
        oODataModel.callFunction(sEntityPath, {
          method: "GET",
          urlParameters: {
            "sap-client": "324",
            "SAP__Origin": "LOCAL_TGW",
            "SearchPattern": userId
          },
          success: function (oData)
          {
            oUserInfoList.setProperty("/users", oData.results || []);
            oUserInfoList.setProperty("/visible", true);
            oUserInfoList.setProperty("/busy", false);
          },
          error: function (oError)
          {
            MessageBox.error("Error fetching user data: " + oError.message);
            oUserInfoList.setProperty("/busy", false);
          }
        });

        // MessageToast.show("Value Help for User ID - To be implemented");
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
              that._callBoundAction("release", oContext);
            }
          },
        });
      },

      onSuspendAction: function ()
      {
        var oView = this.getView();

        if (!this._pSuspendDialog)
        {
          this._pSuspendDialog = Fragment.load({
            id: oView.getId(),
            name: "z.wf.zwfmanagement.view.fragments.SuspendDialog",
            controller: this
          }).then(function (oDialog)
          {
            oView.addDependent(oDialog);
            return oDialog;
          });
        }

        this._pSuspendDialog.then(function (oDialog)
        {
          oDialog.open();
        });
      },

      onConfirmSuspend: function ()
      {
        var oView = this.getView();
        var oDatePicker = this.byId("suspendDatePicker");
        var oTimePicker = this.byId("suspendTimePicker");
        var oResourceBundle = oView.getModel("i18n").getResourceBundle();

        var sDate = oDatePicker.getValue();
        var sTime = oTimePicker.getValue();

        if (!sDate || !sTime)
        {
          MessageBox.error(oResourceBundle.getText("errorSuspendDateTime") || "Please select both date and time");
          return;
        }

        // Format date as YYYY-MM-DD for Edm.Date
        var oDate = oDatePicker.getDateValue();
        var sFormattedDate = oDate.getFullYear() + "-" +
          String(oDate.getMonth() + 1).padStart(2, "0") + "-" +
          String(oDate.getDate()).padStart(2, "0");

        // Ensure time is in HH:mm:ss format for Edm.TimeOfDay
        var sFormattedTime = sTime;
        if (sTime.split(":").length === 2)
        {
          sFormattedTime = sTime + ":00";
        }

        var oContext = oView.getBindingContext();
        var oParameters = {
          resubmission_date: sFormattedDate,
          resubmission_time: sFormattedTime
        };

        this._callBoundAction("suspend", oContext, oParameters);

        this._pSuspendDialog.then(function (oDialog)
        {
          oDialog.close();
          oDatePicker.setValue("");
          oTimePicker.setValue("");
        });
      },

      onCancelSuspend: function ()
      {
        var oDatePicker = this.byId("suspendDatePicker");
        var oTimePicker = this.byId("suspendTimePicker");

        this._pSuspendDialog.then(function (oDialog)
        {
          oDialog.close();
          oDatePicker.setValue("");
          oTimePicker.setValue("");
        });
      },

      onSelectForwardUser: function (oEvent)
      {
        var oSelectedItem = oEvent.getSource();
        if (oSelectedItem)
        {
          var oContext = oSelectedItem.getBindingContext("userInfoList");

          var sSelectedUserId = oContext.getProperty("UniqueName");
          console.log(sSelectedUserId);
          var oUserInput = this.byId("forwardUserInput");
          oUserInput.setValue(sSelectedUserId);
        }
      },

      _callBoundAction: function (sActionName, oContext, oParameters)
      {
        var oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();

        if (!oContext)
        {
          MessageBox.error(oResourceBundle.getText("errorNoContext"));
          return;
        }

        var sNamespace = "com.sap.gateway.srvd.zsd_gsp26sap02_wf_task.v0001.";
        var sPath = sNamespace + sActionName + "(...)";

        var oModel = this.getView().getModel();

        var oOperation = oModel.bindContext(sPath, oContext);

        if (oParameters)
        {
          Object.keys(oParameters).forEach(function (sKey)
          {
            oOperation.setParameter(sKey, oParameters[sKey]);
            console.log(">>>>", sKey, oParameters[sKey]);
          });
        }

        this.getView().setBusy(true);

        oOperation
          .execute()
          .then(
            function ()
            {
              this.getView().setBusy(false);
              MessageToast.show(oResourceBundle.getText("successMessage"));

              oModel.refresh();
            }.bind(this),
          )
          .catch(
            function (oError)
            {
              this.getView().setBusy(false);
              MessageBox.error("Error: " + oError.message);
            }.bind(this),
          );
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
