sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "../model/formatter",
], function (Controller, JSONModel, MessageBox, MessageToast, formatter)
{
    "use strict";

    return Controller.extend("z.wf.zwfmanagement.controller.BaseController", {
        formatter: formatter,

        onInit: function ()
        {
            let sCurrentLanguage = sap.ui.getCore().getConfiguration().getLanguage();
            let sLanguageKey = sCurrentLanguage.split("-")[0];

            let oViewModel = new JSONModel({
                selectedLanguage: sLanguageKey
            });

            this.getView().setModel(oViewModel, "viewModel");

            let oUserRolesModel = new JSONModel({
                roles: [],
                highestRole: 0,
                isAdmin: false,
                userName: ""
            });

            this.getView().setModel(oUserRolesModel, "userRole");

            this._fetchUserRoles();
        },

        _fetchUserRoles: function ()
        {
            var oView = this.getView();
            var oModel = this.getOwnerComponent().getModel();
            var oUserRolesModel = oView.getModel("userRole");

            var oContextBinding = oModel.bindContext("/CurrentUserRole");

            oContextBinding.getBoundContext().requestObject("value").then(function (oData)
            {

                var aRoles = oData || [];
                var sUserName = oData[0] ? oData[0].UserName : "";
                var iHighestRole = 0;
                var bIsAdmin = false;

                aRoles.forEach(function (oRole)
                {
                    if (oRole.RoleID === "ZGSP26_WF_ADMIN" || oRole.RoleName === "Admin")
                    {
                        bIsAdmin = true;
                    }
                    if (iHighestRole === 0 || parseInt(oRole.RoleLevel) < iHighestRole)
                    {
                        iHighestRole = parseInt(oRole.RoleLevel);
                    }
                });
                oUserRolesModel.setData({
                    roles: aRoles,
                    highestRole: iHighestRole,
                    isAdmin: bIsAdmin,
                    userName: sUserName
                });
            }).catch(function (oError)
            {
                console.error("Failed to fetch user roles:", oError);
            });

        },

        onLanguageChange: function (oEvent)
        {
            var sSelectedKey = oEvent.getSource().getSelectedKey();

            //Set selected language to core
            sap.ui.getCore().getConfiguration().setLanguage(sSelectedKey);
        },

        callBoundAction: function (sActionName, oContext, oParameters)
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
    });
});