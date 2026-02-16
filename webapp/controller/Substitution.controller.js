sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/format/DateFormat",
    "sap/ushell/Container",
    "sap/ui/model/odata/v2/ODataModel"
  ],
  function (
    BaseController,
    JSONModel,
    Filter,
    FilterOperator,
    Fragment,
    MessageBox,
    MessageToast,
    DateFormat,
    Container,
    ODataModel
  )
  {
    "use strict";

    return BaseController.extend("z.wf.zwfmanagement.controller.Substitution", {
      onInit: function ()
      {
        BaseController.prototype.onInit.apply(this, arguments);

        // Initialize view model for UI state
        const oViewModel = new JSONModel({
          substMode: "P",
        });
        this.getView().setModel(oViewModel, "view");

        const oRouter = this.getOwnerComponent().getRouter();
        oRouter
          .getRoute("RouteSubstitution")
          .attachPatternMatched(this._onRouteMatched, this);
      },

      _onRouteMatched: function ()
      {
        this._applyFilters();
      },

      /**
       * Show user information popover when clicking on substitute name
       */
      onShowUserInfo: function (oEvent)
      {
        const oSource = oEvent.getSource();
        const oContext = oSource.getBindingContext();

        if (!oContext)
        {
          return;
        }

        // Get the user ID from the context
        const oData = oContext.getObject();
        const sUserId = oData.UserSubstitutedBy || oData.UserSubstitutedFor;

        if (!sUserId)
        {
          MessageToast.show("User ID not found");
          return;
        }

        // Fetch user info and open popover
        this._fetchAndShowUserInfo(sUserId, oSource);
      },

      /**
       * Fetch user information from TASKPROCESSING service
       */
      _fetchAndShowUserInfo: function (sUserId, oSource)
      {
        const oView = this.getView();

        // Create user info model if not exists
        if (!this._oUserInfoModel)
        {
          this._oUserInfoModel = new JSONModel();
          oView.setModel(this._oUserInfoModel, "userInfo");
        }

        // Set loading state
        oView.setBusy(true);

        // Create OData V2 model for TASKPROCESSING service
        const sServiceUrl = "/sap/opu/odata/IWPGW/TASKPROCESSING;mo;v=2/";
        const oODataModel = new ODataModel(sServiceUrl, {
          json: true,
          useBatch: false
        });

        // Build the entity path
        const sEntityPath = "/UserInfoCollection(SAP__Origin='LOCAL_TGW',UniqueName='" + sUserId + "')";

        // Read user info
        oODataModel.read(sEntityPath, {
          success: function (oData)
          {
            oView.setBusy(false);

            // Set user info data to model
            this._oUserInfoModel.setData(oData.d || oData);

            // Open popover
            this._openUserInfoPopover(oSource);
          }.bind(this),
          error: function (oError)
          {
            oView.setBusy(false);
            MessageBox.error("Failed to load user information: " +
              (oError.responseText || oError.message || "Unknown error"));
          }
        });
      },

      /**
       * Open user info popover
       */
      _openUserInfoPopover: function (oSource)
      {
        const oView = this.getView();

        if (!this._oUserInfoPopover)
        {
          Fragment.load({
            id: oView.getId(),
            name: "z.wf.zwfmanagement.view.fragments.UserInfoPopover",
            controller: this
          }).then(function (oPopover)
          {
            this._oUserInfoPopover = oPopover;
            oView.addDependent(oPopover);
            oPopover.openBy(oSource);
          }.bind(this));
        } else
        {
          this._oUserInfoPopover.openBy(oSource);
        }
      },

      onTabSelect: function (oEvent)
      {
        const sKey = oEvent.getParameter("key");
        if (sKey === "outgoing")
        {
          this.getView().getModel("view").setProperty("/substMode", "P");
        }

        this._applyFilters();
      },

      onModeSelect: function (oEvent)
      {
        const sKey = oEvent.getParameter("item").getKey();
        this.getView().getModel("view").setProperty("/substMode", sKey);

        this._applyFilters();
      },

      _applyFilters: function ()
      {
        const oIconTabBar = this.byId("substitutionTabBar");
        const sSelectedTab = oIconTabBar.getSelectedKey();
        const sMode = this.getView().getModel("view").getProperty("/substMode");

        if (sSelectedTab === "outgoing")
        {
          // Outgoing tab: Filter by Direction = OUTGOING AND SubstitutionType = P or U
          this._filterOutgoingTables(sMode);
        } else if (sSelectedTab === "incoming")
        {
          // Incoming tab: Filter by Direction = INCOMING
          this._filterIncomingTable();
        }
      },

      _filterOutgoingTables: function (sMode)
      {
        const aFilters = [
          new Filter("Direction", FilterOperator.EQ, "OUTGOING"),
          new Filter("SubstitutionType", FilterOperator.EQ, sMode),
        ];

        const oTablePlanned = this.byId("tablePlanned");
        const oTableUnplanned = this.byId("tableUnplanned");

        if (oTablePlanned)
        {
          const oBinding = oTablePlanned.getBinding("items");
          if (oBinding)
          {
            oBinding.filter(aFilters);
          }
        }

        if (oTableUnplanned)
        {
          const oBinding = oTableUnplanned.getBinding("items");
          if (oBinding)
          {
            oBinding.filter(aFilters);
          }
        }
      },

      /**
       * Filter table in Incoming tab
       */
      _filterIncomingTable: function ()
      {
        const oTable = this.byId("tableIncoming");
        if (oTable)
        {
          const oBinding = oTable.getBinding("items");
          if (oBinding)
          {
            const aFilters = [
              new Filter("Direction", FilterOperator.EQ, "INCOMING"),
            ];
            oBinding.filter(aFilters);
          }
        }
      },

      /**
       * Factory function to create Group Header with custom styling
       */
      createGroupHeader: function (oGroup)
      {
        return new sap.m.GroupHeaderListItem({
          title: "👤 " + oGroup.key,
          upperCase: false,
        });
      },

      /**
       * Formatter for status text
       * Input: sStatus (String)
       */
      formatStatusText: function (sStatus)
      {
        return sStatus;
      },

      /**
       * Formatter for status state (ObjectStatus color)
       * Input: sStatus (String)
       */
      formatStatusState: function (sStatus)
      {
        if (!sStatus)
        {
          return "None";
        }
        // Check case-insensitive
        if (sStatus.toUpperCase() === "ACTIVE")
        {
          return "Success";
        }
        if (
          sStatus.toUpperCase() === "INACTIVE" ||
          sStatus.toUpperCase() === "CANCELLED"
        )
        {
          return "Error";
        }
        return "None";
      },

      /**
       * Formatter for status icon
       * Input: sStatus (String)
       */
      formatStatusIcon: function (sStatus)
      {
        if (!sStatus)
        {
          return "";
        }
        if (sStatus.toUpperCase() === "ACTIVE")
        {
          return "sap-icon://status-positive";
        }
        return "sap-icon://status-inactive";
      },

      /**
       * Helper to parse active value safely
       */
      _isActive: function (vActive)
      {
        return (
          vActive === true ||
          vActive === "true" ||
          vActive === "X" ||
          vActive === 1
        );
      },

      /**
       * Formatter for Active field text
       */
      formatActiveText: function (vActive)
      {
        const bIsActive = this._isActive(vActive);
        const oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();

        return bIsActive
          ? oResourceBundle.getText("statusActive")
          : oResourceBundle.getText("statusInactive");
      },

      /**
       * Formatter for Active field state
       */
      formatActiveState: function (vActive)
      {
        return this._isActive(vActive) ? "Success" : "Error";
      },

      /**
       * Formatter for Active field icon
       */
      formatActiveIcon: function (vActive)
      {
        return this._isActive(vActive)
          ? "sap-icon://status-positive"
          : "sap-icon://status-inactive";
      },

      formatSubstType: function (sType)
      {
        const oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();
        return sType === "P"
          ? oResourceBundle.getText("substModePlanned")
          : oResourceBundle.getText("substModeUnplanned");
      },

      formatDaysToStartText: function (sRuleStatus, iDays)
      {
        if (
          sRuleStatus === "Inactive" &&
          iDays !== null &&
          iDays !== undefined
        )
        {
          const oResourceBundle = this.getView()
            .getModel("i18n")
            .getResourceBundle();
          // Hàm getText có hỗ trợ truyền mảng tham số để thế vào {0}, {1}...
          return oResourceBundle.getText("txtStartsInDays", [iDays]);
        }
        return "";
      },

      formatDateOrNA: function (sType, sDate)
      {
        if (!sDate)
        {
          return "N/A";
        }

        // parse date format
        const oInputFormat = sap.ui.core.format.DateFormat.getDateInstance({
          pattern: "yyyy-MM-dd",
        });
        const oDate = oInputFormat.parse(sDate);

        if (!oDate)
        {
          return sDate; // Fallback if parse fails
        }

        const oOutputFormat = sap.ui.core.format.DateFormat.getDateInstance({
          pattern: "dd/MM/yyyy",
        });
        return oOutputFormat.format(oDate);
      },

      /**
       * Navigate back to Dashboard
       */
      onNavBackToDashboard: function ()
      {
        this.getOwnerComponent().getRouter().navTo("RouteDashboard");
      },

      /**
       * Open Add Substitution Dialog
       */
      onOpenAddDialog: function ()
      {
        const oView = this.getView();

        // Initialize model to store temporary data for Dialog
        const oNewRuleModel = new JSONModel({
          type: "P",
          substituteId: "",
          profileId: "ALL", // Default fallback
          beginDate: new Date(),
          endDate: new Date(new Date().setDate(new Date().getDate() + 1)), // next day
        });
        oView.setModel(oNewRuleModel, "newRule");

        if (!this.byId("addRuleDialog"))
        {
          Fragment.load({
            id: oView.getId(),
            name: "z.wf.zwfmanagement.view.fragments.AddSubstitutionDialog",
            controller: this,
          }).then(function (oDialog)
          {
            oView.addDependent(oDialog);
            oDialog.open();
          });
        } else
        {
          this.byId("addRuleDialog").open();
        }
      },

      /**
       * Close Add Substitution Dialog
       */
      onCloseAddDialog: function ()
      {
        this.byId("addRuleDialog").close();
      },

      /**
       * Save new Substitution Rule via OData V4 Create
       */
      onSaveRule: async function ()
      {
        const oModel = this.getView().getModel();
        const oNewRuleData = this.getView().getModel("newRule").getData();
        const oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();

        let sCurrentUser = "DEV-137 ";
        try
        {
          if (sap.ushell && Container)
          {
            const oUserInfoService = await Container.getServiceAsync("UserInfo");
            if (oUserInfoService)
            {
              sCurrentUser = oUserInfoService.getId();
            }
          }
        } catch (error)
        {
          console.warn("Could not get UserInfo service. Using default user.", error);
        }
        console.log("Creating substitution for User:", sCurrentUser);

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
          UserSubstitutedFor: sCurrentUser,
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

        this.getView().setBusy(true);

        // Attach to Create Completed event
        oListBinding.attachEventOnce(
          "createCompleted",
          function (oEvent)
          {
            this.getView().setBusy(false);

            const bSuccess = oEvent.getParameter("success");

            if (bSuccess)
            {
              // success case
              MessageToast.show(oResourceBundle.getText("msgCreateSuccess"));
              this.onCloseAddDialog();

              // Refresh the table bindings to show new row
              const oTablePlanned = this.byId("tablePlanned");
              const oTableUnplanned = this.byId("tableUnplanned");
              const oTableIncoming = this.byId("tableIncoming");

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

              this._applyFilters();
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

      // --- DELETE FUNCTION ---
      onDeleteRule: function (oEvent)
      {
        const oContext = oEvent.getSource().getBindingContext();
        const oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();

        MessageBox.confirm(oResourceBundle.getText("msgConfirmDelete"), {
          onClose: function (sAction)
          {
            if (sAction === MessageBox.Action.OK)
            {
              oContext
                .delete()
                .then(function ()
                {
                  MessageToast.show(
                    oResourceBundle.getText("msgDeleteSuccess"),
                  );
                })
                .catch(function (oError)
                {
                  MessageBox.error(oError.message);
                });
            }
          },
        });
      },

      // --- UPDATE END DATE FUNCTION ---
      onOpenUpdateDialog: function (oEvent)
      {
        const oView = this.getView();
        const oContext = oEvent.getSource().getBindingContext();

        // save context of current selected rule to use in confirm handler
        this._oSelectedContext = oContext;

        if (!this.byId("updateRuleDialog"))
        {
          Fragment.load({
            id: oView.getId(),
            name: "z.wf.zwfmanagement.view.fragments.UpdateSubstitutionDialog",
            controller: this,
          }).then(function (oDialog)
          {
            oView.addDependent(oDialog);
            // set current EndDate to input field in dialog
            const sCurrentDate = oContext.getProperty("EndDate");
            oView.byId("inpUpdateEndDate").setValue(sCurrentDate);
            oDialog.open();
          });
        } else
        {
          const sCurrentDate = oContext.getProperty("EndDate");
          this.byId("inpUpdateEndDate").setValue(sCurrentDate);
          this.byId("updateRuleDialog").open();
        }
      },

      onCloseUpdateDialog: function ()
      {
        this.byId("updateRuleDialog").close();
        this._oSelectedContext = null;
      },

      onConfirmUpdateRule: function ()
      {
        const oDatePicker = this.byId("inpUpdateEndDate");
        const sNewDate = oDatePicker.getValue(); // Format yyyy-MM-dd
        const oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();

        if (!sNewDate)
        {
          MessageBox.error(oResourceBundle.getText("msgSelectDates"));
          return;
        }

        if (this._oSelectedContext)
        {
          // update by context
          this._oSelectedContext
            .setProperty("EndDate", sNewDate)
            .then(() =>
            {
              // refresh context -> sync data
              this._oSelectedContext.refresh();

              MessageToast.show(oResourceBundle.getText("msgUpdateSuccess"));
              this.onCloseUpdateDialog();
            })
            .catch((oError) =>
            {
              MessageBox.error(oError.message);
            });
        }
      },

      // --- TOGGLE ACTIVE FUNCTION (Bound Action) ---
      onToggleActive: function (oEvent)
      {
        const oSwitch = oEvent.getSource();
        const bNewState = oSwitch.getState(); // true/false
        const oContext = oSwitch.getBindingContext();
        const oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();
        const oModel = this.getView().getModel();

        // keep UI busy during action execution
        const oTable = oSwitch.getParent().getParent().getParent();
        oTable.setBusy(true);

        // bind context for bound action -> pass parameter in binding context
        const oActionOContext = oModel.bindContext(
          "com.sap.gateway.srvd.zsd_gsp26sap02_wf_task.v0001.toggleActive(...)",
          oContext,
        );

        // Set Parameter
        oActionOContext.setParameter("IsEnabled", bNewState);

        // Execute
        oActionOContext
          .execute()
          .then(() =>
          {
            oTable.setBusy(false);
            MessageToast.show(oResourceBundle.getText("msgActionSuccess"));
            oContext.refresh();
          })
          .catch((oError) =>
          {
            oTable.setBusy(false);
            oSwitch.setState(!bNewState);
            MessageBox.error(oError.message);
          });
      },
    });
  },
);
