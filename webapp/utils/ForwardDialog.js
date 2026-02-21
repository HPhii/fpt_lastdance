sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/m/MessageBox"
], function (Fragment, JSONModel, MessageToast, ODataV2Model, MessageBox)
{
    "use strict";

    return {
        _oForwardDialog: null,
        _oView: null,

        onForwardDialogOpen: function (oView)
        {
            this._oView = oView;
            let oUserInfoList = new JSONModel({
                visible: false,
                busy: false,
                users: []
            });

            oView.setModel(oUserInfoList, "userInfoList");

            if (!this._oForwardDialog)
            {
                this._oForwardDialog = Fragment.load({
                    id: oView.getId(),
                    name: "z.wf.zwfmanagement.view.fragments.dialog.ForwardDialog",
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
        },

        onCancelForward: function ()
        {
            var oUserInput = this._oView.byId("forwardUserInput");

            this._oForwardDialog.then(function (oDialog)
            {
                oDialog.close();
                oUserInput.setValue("");
            });
        },

        onConfirmForward: function ()
        {
            var oView = this._oView;
            var oContext = oView.getBindingContext();
            var oUserInput = oView.byId("forwardUserInput");
            var sUserId = oUserInput.getValue();

            if (!sUserId)
            {
                MessageToast.show("Please enter a user ID to forward the task.");
                return;
            }

            const payload = { USER_ID: sUserId };

            oView.getController().callBoundAction("forward", oContext, payload);

            this._oForwardDialog.then(function (oDialog)
            {
                oDialog.close();
                oUserInput.setValue("");
            });
        },

        onValueHelpUserID: function (oEvent)
        {
            var oView = this._oView;

            var oInput = oView.byId("forwardUserInput");
            var sUserId = oInput.getValue();
            var oUserInfoList = oView.getModel("userInfoList");

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
                    "SearchPattern": sUserId
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
        },

        onSelectForwardUser: function (oEvent)
        {
            var oView = this._oView;

            var oSelectedItem = oEvent.getSource();
            if (oSelectedItem)
            {
                var oContext = oSelectedItem.getBindingContext("userInfoList");

                var sSelectedUserId = oContext.getProperty("UniqueName");

                var oUserInput = oView.byId("forwardUserInput");
                oUserInput.setValue(sSelectedUserId);
            }
        },
    }
});