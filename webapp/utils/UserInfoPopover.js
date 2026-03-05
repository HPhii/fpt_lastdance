sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (Fragment, JSONModel, MessageBox, MessageToast)
{
    "use strict";

    return {
        _oView: null,
        _oSource: null,
        _oUserInfoPopover: null,

        /**
       * Show user information popover when clicking on owner name
       */
        onOpen: function (oView, oSource, sUserId)
        {
            this._oView = oView;
            this._oSource = oSource;

            if (!sUserId)
            {
                MessageToast.show("User ID not found");
                return;
            }

            // Fetch user info and open popover
            this._fetchAndShowUserInfo(sUserId);
        },

        /**
         * Fetch user information from TASKPROCESSING service
         */
        _fetchAndShowUserInfo: function (sUserId)
        {
            const oView = this._oView;

            // Create user info model if not exists
            if (!this._oUserInfoModel)
            {
                this._oUserInfoModel = new JSONModel();
                oView.setModel(this._oUserInfoModel, "userInfo");
            }

            // Set loading state
            oView.setBusy(true);

            const oODataModel = oView.getModel("taskProcessing");

            // Build the entity path
            const sEntityPath =
                "/UserInfoCollection(SAP__Origin='LOCAL_TGW',UniqueName='" +
                sUserId +
                "')";

            // Read user info
            oODataModel.read(sEntityPath, {
                success: function (oData)
                {
                    oView.setBusy(false);

                    // Set user info data to model
                    this._oUserInfoModel.setData(oData.d || oData);

                    // Open popover
                    this._openUserInfoPopover(this._oSource);
                }.bind(this),
                error: function (oError)
                {
                    oView.setBusy(false);
                    MessageBox.error(
                        "Failed to load user information: " +
                        (oError.responseText || oError.message || "Unknown error"),
                    );
                },
            });
        },

        /**
         * Open user info popover
         */
        _openUserInfoPopover: function ()
        {
            const oView = this._oView;
            const oSource = this._oSource;

            if (!this._oUserInfoPopover)
            {
                Fragment.load({
                    id: oView.getId(),
                    name: "z.wf.zwfmanagement.view.fragments.UserInfoPopover",
                    controller: this,
                }).then(
                    function (oPopover)
                    {
                        this._oUserInfoPopover = oPopover;
                        oView.addDependent(oPopover);
                        oPopover.openBy(oSource);
                    }.bind(this),
                );
            } else
            {
                this._oUserInfoPopover.openBy(oSource);
            }
        },
    }
})