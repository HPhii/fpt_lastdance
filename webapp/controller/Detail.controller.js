sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
  ],
  function (Controller, History, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("z.wf.zwfmanagement.controller.Detail", {
      onInit: function () {
        var oRouter = this.getOwnerComponent().getRouter();
        oRouter
          .getRoute("RouteDetail")
          .attachPatternMatched(this._onObjectMatched, this);
      },

      _onObjectMatched: function (oEvent) {
        var sPath =
          "/" +
          window.decodeURIComponent(
            oEvent.getParameter("arguments").propertyPath,
          );

        // Bind view to that data row
        this.getView().bindElement({
          path: sPath,
          parameters: {
            $expand: "_DecisionOptions",
          },
          events: {
            dataReceived: function (oData) {
              // Debug để xem dữ liệu có về không
              var oContext = oData.getSource().getBoundContext();
              if (oContext) {
                console.log("Current Data:", oContext.getObject());
                console.log(
                  "Operation Control:",
                  oContext.getProperty("__OperationControl"),
                );
              }
            },
          },
        });
      },

      onNavBack: function () {
        var oHistory = History.getInstance();
        var sPreviousHash = oHistory.getPreviousHash();

        if (sPreviousHash !== undefined) {
          window.history.go(-1);
        } else {
          var oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo("RouteMainView", {}, true);
        }
      },

      onDecisionPress: function (oEvent) {
        var oButton = oEvent.getSource();
        var oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();
        // get data attributes
        var sDecisionKey = oButton.data("DecisionKey");
        var sWorkItemID = oButton.data("WorkItemID");
        var sText = oButton.getText();

        if (sDecisionKey) {
          sDecisionKey = sDecisionKey.toString().padStart(4, "0");
        }

        console.log("Key FE", sDecisionKey);
        console.log("Data type:", typeof sDecisionKey);

        var that = this;
        var sConfirmMessage = oResourceBundle.getText("confirmDecision", [
          sText,
        ]);

        MessageBox.confirm(sConfirmMessage, {
          onClose: function (oAction) {
            if (oAction === MessageBox.Action.OK) {
              that._callODataV4Action(sWorkItemID, sDecisionKey);
            }
          },
        });
      },

      onApproveAction: function () {
        var oContext = this.getView().getBindingContext();
        var oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();
        var sConfirmMessage = oResourceBundle.getText("confirmApprove");

        var that = this;
        MessageBox.confirm(sConfirmMessage, {
          onClose: function (oAction) {
            if (oAction === MessageBox.Action.OK) {
              that._callBoundAction("approve", oContext);
            }
          },
        });
      },

      onRejectAction: function () {
        var oContext = this.getView().getBindingContext();
        var oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();
        var sConfirmMessage = oResourceBundle.getText("confirmReject");

        var that = this;
        MessageBox.confirm(sConfirmMessage, {
          onClose: function (oAction) {
            if (oAction === MessageBox.Action.OK) {
              that._callBoundAction("reject", oContext);
            }
          },
        });
      },

      onClaimAction: function () {
        var oContext = this.getView().getBindingContext();
        var oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();
        var sConfirmMessage = oResourceBundle.getText("confirmClaim");

        var that = this;
        MessageBox.confirm(sConfirmMessage, {
          onClose: function (oAction) {
            if (oAction === MessageBox.Action.OK) {
              that._callBoundAction("claim", oContext);
            }
          },
        });
      },

      onForwardAction: function () {
        var oContext = this.getView().getBindingContext();
        var oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();
        var sConfirmMessage = oResourceBundle.getText("confirmForward");

        var that = this;
        MessageBox.confirm(sConfirmMessage, {
          onClose: function (oAction) {
            if (oAction === MessageBox.Action.OK) {
              that._callBoundAction("forward", oContext);
            }
          },
        });
      },

      onReleaseAction: function () {
        var oContext = this.getView().getBindingContext();
        var oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();
        var sConfirmMessage = oResourceBundle.getText("confirmRelease");

        var that = this;
        MessageBox.confirm(sConfirmMessage, {
          onClose: function (oAction) {
            if (oAction === MessageBox.Action.OK) {
              that._callBoundAction("release", oContext);
            }
          },
        });
      },

      onSuspendAction: function () {
        var oContext = this.getView().getBindingContext();
        var oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();
        var sConfirmMessage = oResourceBundle.getText("confirmSuspend");

        var that = this;
        MessageBox.confirm(sConfirmMessage, {
          onClose: function (oAction) {
            if (oAction === MessageBox.Action.OK) {
              that._callBoundAction("suspend", oContext);
            }
          },
        });
      },

      _callBoundAction: function (sActionName, oContext) {
        var oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();

        if (!oContext) {
          MessageBox.error(oResourceBundle.getText("errorNoContext"));
          return;
        }

        var sPath =
          "com.sap.gateway.srvd.zsd_gsp26sap02_wf_task.v0001." +
          sActionName +
          "(...)";
        var oModel = this.getView().getModel();

        var oOperation = oModel.bindContext(sPath, oContext);

        this.getView().setBusy(true);

        oOperation
          .execute()
          .then(
            function () {
              this.getView().setBusy(false);
              MessageToast.show(oResourceBundle.getText("successMessage"));

              oModel.refresh();
            }.bind(this),
          )
          .catch(
            function (oError) {
              this.getView().setBusy(false);
              MessageBox.error("Error: " + oError.message);
            }.bind(this),
          );
      },

      _callODataV4Action: function (sWorkItemID, sDecisionKey) {
        var oModel = this.getView().getModel();
        var oView = this.getView();
        var oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();

        var oContext = oView.getBindingContext();

        if (!oContext) {
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
            function () {
              MessageToast.show(oResourceBundle.getText("successMessage"));

              oModel.refresh();

              var oRouter = this.getOwnerComponent().getRouter();
            }.bind(this),
          )
          .catch(function (oError) {
            MessageBox.error("Error: " + oError.message);
          });
      },
    });
  },
);
