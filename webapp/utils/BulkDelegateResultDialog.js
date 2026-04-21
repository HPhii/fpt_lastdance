sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel"
], function (Fragment, JSONModel)
{
    "use strict";

    return {
        _oView: null,
        _oBulkDelegateResultDialog: null,
        _fnCloseCallback: null,

        show: function (oView, aMessages, bIsError, sMainMessage, fnCloseCallback)
        {
            this._oView = oView;
            this._fnCloseCallback = fnCloseCallback;
            var that = this;

            var aFormattedMessages = aMessages.map(function (msg)
            {
                var sState = "None";
                var sIcon = "sap-icon://message-information";
                var sCode = msg.code || msg.Code || (msg.getCode ? msg.getCode() : "");
                var sMessage = msg.message || msg.Message || (msg.getMessage ? msg.getMessage() : "");

                var severity = msg.numericSeverity || msg["@SAP__common.numericSeverity"];
                if (severity === undefined && msg.type)
                {
                    severity = msg.type || (msg.getType ? msg.getType() : "");
                }

                if (typeof severity === "string")
                {
                    var sType = severity.toLowerCase();
                    if (sType === "success") { sState = "Success"; sIcon = "sap-icon://sys-enter-2"; }
                    else if (sType === "error") { sState = "Error"; sIcon = "sap-icon://error"; }
                    else if (sType === "warning") { sState = "Warning"; sIcon = "sap-icon://alert"; }
                    else { sState = "Information"; sIcon = "sap-icon://information"; }
                } else
                {
                    if (severity === 1) { sState = "Success"; sIcon = "sap-icon://sys-enter-2"; }
                    else if (severity === 4) { sState = "Error"; sIcon = "sap-icon://error"; }
                    else if (severity === 3) { sState = "Warning"; sIcon = "sap-icon://alert"; }
                    else { sState = "Information"; sIcon = "sap-icon://information"; }
                }

                return {
                    code: sCode,
                    message: sMessage,
                    state: sState,
                    icon: sIcon
                };
            });

            var oModelData = {
                title: bIsError ? "Delegation Error" : "Delegation Result",
                state: bIsError ? "Error" : "Success",
                mainMessage: sMainMessage,
                messages: aFormattedMessages
            };

            if (!this._oBulkDelegateResultDialog)
            {
                this._oBulkDelegateResultDialog = Fragment.load({
                    id: oView.getId(),
                    name: "z.wf.zwfmanagement.view.fragments.dialog.BulkDelegateResultDialog",
                    controller: this
                }).then(function (oDialog)
                {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._oBulkDelegateResultDialog.then(function (oDialog)
            {
                var oModel = new JSONModel(oModelData);
                oDialog.setModel(oModel, "resultModel");
                oDialog.open();
            });
        },

        onCloseBulkDelegateResultDialog: function ()
        {
            var that = this;
            this._oBulkDelegateResultDialog.then(function (oDialog)
            {
                oDialog.close();
                if (that._fnCloseCallback)
                {
                    that._fnCloseCallback();
                }
            });
        }
    };
});
