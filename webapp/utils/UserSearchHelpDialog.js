sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
], function (Fragment, JSONModel, MessageBox)
{
    "use strict";

    return {
        _oView: null,
        _oUserSearchHelpDialog: null,

        onOpen: function (oView, oUserInput)
        {
            this._oView = oView;
            var sUserId = oUserInput.getValue();

            // Initialize model to store temporary data for Dialog
            const oUserInfoList = new JSONModel({
                userId: sUserId,
                inputId: oUserInput,
                busy: false,
                users: [],
            });
            oView.setModel(oUserInfoList, "userInfoList");

            if (!this._oUserSearchHelpDialog)
            {
                this._oUserSearchHelpDialog = Fragment.load({
                    id: oView.getId(),
                    name: "z.wf.zwfmanagement.view.fragments.dialog.UserSearchHelpDialog",
                    controller: this,
                }).then(function (oDialog)
                {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._oUserSearchHelpDialog.then(function (oDialog)
            {
                oDialog.open();
            });
        },

        onAfterOpenUserSearchHelp: function ()
        {
            var oView = this._oView;
            var oUserInfoList = oView.getModel("userInfoList");
            var sUserId = oUserInfoList.getProperty("/userId");

            const oODataModel = oView.getModel("taskProcessing");
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
                    oUserInfoList.setProperty("/busy", false);
                },
                error: function (oError)
                {
                    MessageBox.error("Error fetching user data: " + oError.message);
                    oUserInfoList.setProperty("/busy", false);
                }
            });
        },

        /**
         * Close User Search Help Dialog
         */
        onCloseUserSearchHelp: function ()
        {
            this._oUserSearchHelpDialog.then(function (oDialog)
            {
                oDialog.close();
            });
        },

        onSelectUser: function (oEvent)
        {
            var oView = this._oView;

            var oSelectedItem = oEvent.getSource();
            if (oSelectedItem)
            {
                var oContext = oSelectedItem.getBindingContext("userInfoList");

                var sSelectedUserId = oContext.getProperty("UniqueName");
                var oUserInput = oView.getModel("userInfoList").getProperty("/inputId");

                oUserInput.setValue(sSelectedUserId);
            }

            this.onCloseUserSearchHelp();
        }
    };
});