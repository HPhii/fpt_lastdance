sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel"
], function (Controller, UIComponent, JSONModel)
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
        }

    });
});