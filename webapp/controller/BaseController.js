sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageBox, MessageToast)
{
    "use strict";

    return Controller.extend("z.wf.zwfmanagement.controller.BaseController", {
        onInit: function ()
        {
            let sCurrentLanguage = sap.ui.getCore().getConfiguration().getLanguage();
            let sLanguageKey = sCurrentLanguage.split("-")[0];

            let oViewModel = new JSONModel({
                selectedLanguage: sLanguageKey
            });
            this.getView().setModel(oViewModel, "viewModel");
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