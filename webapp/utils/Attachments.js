sap.ui.define([
    "sap/m/library",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (MLibrary, MessageBox, MessageToast)
{
    "use strict";
    return {
        onDownloadAttachment: function (oView, oEvent)
        {
            var oContext = oEvent.getSource().getBindingContext();
            if (!oContext) return;

            var sWorkItemID = oContext.getProperty("WorkItemID");
            var sObjectID = oContext.getProperty("ObjectID");

            var oModel = oView.getModel();
            var sServiceUrl = oModel.sServiceUrl;

            var sUrl = sServiceUrl + "Attachments(WorkItemID='" + encodeURIComponent(sWorkItemID) + "',ObjectID='" + encodeURIComponent(sObjectID) + "')/Content";

            MLibrary.URLHelper.redirect(sUrl, true);
        },

        onUploadAttachment: function (oView)
        {
            var oContext = oView.getBindingContext();
            if (!oContext) return;

            var oFileInput = document.createElement("input");
            oFileInput.type = "file";
            oFileInput.style.display = "none";
            document.body.appendChild(oFileInput);

            var that = this;
            oFileInput.addEventListener("change", function (oEvt)
            {
                var oFile = oEvt.target.files[0];
                if (!oFile)
                {
                    document.body.removeChild(oFileInput);
                    return;
                }

                var oReader = new FileReader();
                oReader.onload = function (oLoadEvt)
                {
                    var sBase64 = oLoadEvt.target.result.split(",")[1];

                    var sFileName = oFile.name;
                    var aNameParts = sFileName.split(".");
                    var sExtension = aNameParts.length > 1 ? aNameParts.pop() : "";
                    var sTitle = aNameParts.join(".");
                    var sMimeType = oFile.type || "application/octet-stream";

                    that._postAttachment(oView, oContext, {
                        DocumentTitle: sTitle,
                        FileExtension: sExtension,
                        MimeType: sMimeType,
                        NewFileContent: sBase64
                    });

                    document.body.removeChild(oFileInput);
                };
                oReader.readAsDataURL(oFile);
            });

            oFileInput.click();
        },

        _postAttachment: function (oView, oContext, oPayload)
        {
            var oModel = oView.getModel();
            var oListBinding = oModel.bindList("_Attachments", oContext, undefined, undefined, {
                $$ownRequest: true
            });

            oListBinding.create(oPayload, true);

            var oResourceBundle = oView.getModel("i18n").getResourceBundle();
            oListBinding.attachEventOnce("createCompleted", function (oEvt)
            {
                var bSuccess = oEvt.getParameter("success");
                if (bSuccess)
                {
                    MessageToast.show(oResourceBundle.getText("attachmentUploadSuccess"));
                    var oElementBinding = oView.getElementBinding();
                    if (oElementBinding)
                    {
                        oElementBinding.refresh();
                    }
                } else
                {
                    MessageBox.error(oResourceBundle.getText("attachmentUploadError"));
                }
            });
        },

        onRemoveAttachment: function (oView, oEvent)
        {
            var oBindingContext = oEvent.getSource().getBindingContext();
            if (!oBindingContext) return;

            var oResourceBundle = oView.getModel("i18n").getResourceBundle();

            MessageBox.confirm(oResourceBundle.getText("attachmentMessageRemoveConfirm"), {
                onClose: function (sAction)
                {
                    if (sAction === MessageBox.Action.OK)
                    {
                        oBindingContext.delete().then(function ()
                        {
                            MessageToast.show(oResourceBundle.getText("attachmentMessageRemoveSuccess"));
                        }).catch(function (oError)
                        {
                            MessageBox.error(oResourceBundle.getText("attachmentMessageRemoveError", [oError.message]));
                        });
                    }
                }
            });
        }
    };
});