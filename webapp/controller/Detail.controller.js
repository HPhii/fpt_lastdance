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
        // Get ID from URL (e.g., /WfTasks(12345))
        var sPath =
          "/" +
          window.decodeURIComponent(
            oEvent.getParameter("arguments").propertyPath
          );

        // Bind view to that data row
        this.getView().bindElement({
          path: sPath,
          parameters: {
            // Important: Must expand _DecisionOptions to get data for buttons
            $expand: "_DecisionOptions",
          },
          events: {
            dataReceived: function (oData) {
              // Handle if needed when data is received
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

        MessageBox.confirm("Bạn muốn thực hiện hành động: " + sText + "?", {
          onClose: function (oAction) {
            if (oAction === MessageBox.Action.OK) {
              that._callODataV4Action(sWorkItemID, sDecisionKey);
            }
          },
        });
      },

      _callODataV4Action: function (sWorkItemID, sDecisionKey) {
        var oModel = this.getView().getModel();
        var oView = this.getView();

        var oContext = oView.getBindingContext();

        if (!oContext) {
          sap.m.MessageBox.error("Không tìm thấy ngữ cảnh dữ liệu (Context).");
          return;
        }

        var oOperation = oModel.bindContext(
          "com.sap.gateway.srvd.zsd_gsp26sap02_wf_task.v0001.executionDecision(...)",
          oContext
        );
        oOperation.setParameter("DecisionKey", sDecisionKey);
        oOperation.setParameter("WorkItemID", sWorkItemID);
        oOperation.setParameter("DecisionComment", "");

        oOperation
          .execute()
          .then(
            function () {
              sap.m.MessageToast.show("Xử lý thành công!");

              oModel.refresh();

              var oRouter = this.getOwnerComponent().getRouter();
            }.bind(this)
          )
          .catch(function (oError) {
            sap.m.MessageBox.error("Lỗi: " + oError.message);
          });
      },
    });
  }
);
