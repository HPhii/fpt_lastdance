sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/format/DateFormat",
    "../utils/UserSearchHelpDialog"
], function (Fragment, JSONModel, MessageBox, MessageToast, DateFormat, UserSearchHelpDialogHelper)
{
    "use strict";

    return {
        _oView: null,
        _oAddSubstitutionDialog: null,

        onOpen: function (oView)
        {
            this._oView = oView;

            // Initialize model to store temporary data for Dialog
            const oNewRuleModel = new JSONModel({
                type: "P",
                substituteId: "",
                profileId: "ALL", // Default fallback
                beginDate: new Date(),
                endDate: new Date(new Date().setDate(new Date().getDate() + 1)), // next day
            });

            oView.setModel(oNewRuleModel, "newRule");

            if (!this._oAddSubstitutionDialog)
            {
                this._oAddSubstitutionDialog = Fragment.load({
                    id: oView.getId(),
                    name: "z.wf.zwfmanagement.view.fragments.dialog.AddSubstitutionDialog",
                    controller: this,
                }).then(function (oDialog)
                {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._oAddSubstitutionDialog.then(function (oDialog)
            {
                oDialog.open();
            });
        },

        /**
         * Close Add Substitution Dialog
         */
        onCloseAddDialog: function ()
        {
            this._oAddSubstitutionDialog.then(function (oDialog)
            {
                oDialog.close();
            });
        },

        /**
         * Save new Substitution Rule via OData V4 Create
         */
        onSaveRule: function ()
        {
            var oView = this._oView;

            const oModel = oView.getModel();
            const oNewRuleData = oView.getModel("newRule").getData();
            const oResourceBundle = oView.getModel("i18n").getResourceBundle();

            // Validate Input
            if (
                !oNewRuleData.substituteId ||
                oNewRuleData.substituteId.trim() === ""
            )
            {
                MessageBox.error(oResourceBundle.getText("msgSelectUser"));
                return;
            }

            // Format Dates to yyyy-MM-dd
            const oDateFormat = DateFormat.getDateInstance({
                pattern: "yyyy-MM-dd",
            });
            let sBeginDate = null;
            let sEndDate = null;

            if (oNewRuleData.type === "P")
            {
                if (!oNewRuleData.beginDate || !oNewRuleData.endDate)
                {
                    MessageBox.error(oResourceBundle.getText("msgSelectDates"));
                    return;
                }
                sBeginDate = oDateFormat.format(oNewRuleData.beginDate);
                sEndDate = oDateFormat.format(oNewRuleData.endDate);
            }

            // Build Payload
            const oPayload = {
                UserSubstitutedBy: oNewRuleData.substituteId.trim(),
                SubstitutionType: oNewRuleData.type,
                SubstitutionProfile: oNewRuleData.profileId,
            };

            if (oNewRuleData.type === "P")
            {
                oPayload.BeginDate = sBeginDate;
                oPayload.EndDate = sEndDate;
            }

            // OData V4 Create via ListBinding
            const oListBinding = oModel.bindList("/Substitutions");
            const oContext = oListBinding.create(oPayload);

            oView.setBusy(true);

            // Attach to Create Completed event
            oListBinding.attachEventOnce(
                "createCompleted",
                function (oEvent)
                {
                    oView.setBusy(false);

                    const bSuccess = oEvent.getParameter("success");

                    if (bSuccess)
                    {
                        // success case
                        MessageToast.show(oResourceBundle.getText("msgCreateSuccess"));
                        this.onCloseAddDialog();

                        // Refresh the table bindings to show new row
                        const oTablePlanned = oView.byId("tablePlanned");
                        const oTableUnplanned = oView.byId("tableUnplanned");
                        const oTableIncoming = oView.byId("tableIncoming");

                        if (oTablePlanned && oTablePlanned.getBinding("items"))
                        {
                            oTablePlanned.getBinding("items").refresh();
                        }
                        if (oTableUnplanned && oTableUnplanned.getBinding("items"))
                        {
                            oTableUnplanned.getBinding("items").refresh();
                        }
                        if (oTableIncoming && oTableIncoming.getBinding("items"))
                        {
                            oTableIncoming.getBinding("items").refresh();
                        }
                    } else
                    {
                        // error case
                        let sErrorMsg = "An error occurred during creation.";

                        const aMessages = sap.ui
                            .getCore()
                            .getMessageManager()
                            .getMessageModel()
                            .getData();

                        const aErrors = aMessages.filter(function (oMsg)
                        {
                            return oMsg.type === "Error";
                        });

                        if (aErrors.length > 0)
                        {
                            sErrorMsg = aErrors[aErrors.length - 1].message;
                        }

                        MessageBox.error(sErrorMsg);

                        oContext.delete();
                    }
                }.bind(this),
            );
        },

        onOpenUserSearchHelp: function ()
        {
            var oView = this._oView;
            var oUserInput = oView.byId("substituteUserInput");

            UserSearchHelpDialogHelper.onOpen(oView, oUserInput);
        }
    };
})