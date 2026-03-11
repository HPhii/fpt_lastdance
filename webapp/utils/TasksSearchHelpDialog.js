sap.ui.define([
    "sap/ui/core/Fragment",
    'sap/m/Token',
], function (Fragment, Token)
{
    "use strict";

    return {
        _oView: null,
        _oTasksSearchHelpDialog: null,

        onOpen: function (oView)
        {
            this._oView = oView;

            if (!this._oTasksSearchHelpDialog)
            {
                this._oTasksSearchHelpDialog = Fragment.load({
                    id: oView.getId(),
                    name: "z.wf.zwfmanagement.view.fragments.dialog.TasksSearchHelpDialog",
                    controller: this,
                }).then(function (oDialog)
                {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._oTasksSearchHelpDialog.then(function (oDialog)
            {
                oDialog.open();
            });
        },

        onCloseTaskSearchHelp: function (evt)
        {
            var aSelectedItems = evt.getParameter("selectedItems"),
                oMultiInput = this._oView.byId("multiTaskInput");

            if (aSelectedItems && aSelectedItems.length > 0)
            {
                var aExistingKeys = oMultiInput.getTokens().map(function (oToken)
                {
                    console.log(oToken.getKey());

                    return oToken.getKey();
                });

                aSelectedItems.forEach(function (oItem)
                {
                    var oContext = oItem.getBindingContext();
                    var sKey = oContext.getProperty("WorkItemID");

                    if (aExistingKeys.indexOf(sKey) === -1)
                    {
                        oMultiInput.addToken(new Token({
                            key: sKey,
                            text: oContext.getProperty("WorkItemText"),
                        }));
                    }
                });
            }
        }
    };
});