sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/odata/v2/ODataModel",
    "../utils/UpdateSubstitutionDialog",
    "../utils/AddSubstitutionDialog"
  ],
  function (
    BaseController,
    JSONModel,
    Filter,
    FilterOperator,
    Fragment,
    MessageBox,
    MessageToast,
    ODataModel,
    UpdateSubstitutionDialogHelper,
    AddSubstitutionDialogHelper
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

        // Get the substitute user ID from the context
        const oData = oContext.getObject();
        const sUserId = oData.UserSubstitutedBy;

        if (!sUserId)
        {
          MessageToast.show("User ID not found");
          return;
        }

        // Fetch user info and open popover
        this._fetchAndShowUserInfo(sUserId, oSource);
      },

      /**
       * Show owner information popover when clicking on owner name
       */
      onShowOwnerInfo: function (oEvent)
      {
        const oSource = oEvent.getSource();
        const oContext = oSource.getBindingContext();

        if (!oContext)
        {
          return;
        }

        // Get the owner user ID from the context
        const oData = oContext.getObject();
        const sUserId = oData.UserSubstitutedFor;

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
          useBatch: false,
        });

        console.log(sUserId);

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
            this._openUserInfoPopover(oSource);
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
      _openUserInfoPopover: function (oSource)
      {
        const oView = this.getView();

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

      onTabSelect: function (oEvent)
      {
        const sKey = oEvent.getParameter("key");
        // Set default mode based on selected tab
        if (sKey === "outgoing")
        {
          this.getView().getModel("view").setProperty("/substMode", "P");
        } else if (sKey === "incoming")
        {
          this.getView().getModel("view").setProperty("/substMode", "U");
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
          // Incoming tab: Filter by Direction = INCOMING AND SubstitutionType = P or U
          this._filterIncomingTable(sMode);
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
       * Filter tables in Incoming tab based on Mode (Planned/Unplanned)
       */
      _filterIncomingTable: function (sMode)
      {
        const aFilters = [
          new Filter("Direction", FilterOperator.EQ, "INCOMING"),
          new Filter("SubstitutionType", FilterOperator.EQ, sMode),
        ];

        const oTablePlanned = this.byId("tableIncomingPlanned");
        const oTableUnplanned = this.byId("tableIncomingUnplanned");

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
       * Factory function to create Group Header with custom styling
       */
      createGroupHeader: function (oGroup)
      {
        const that = this;
        let sUserId = "";

        const oTable = this.byId("tableUnplanned");
        if (oTable)
        {
          const oBinding = oTable.getBinding("items");
          if (oBinding)
          {
            const aContexts = oBinding.getCurrentContexts();
            for (let i = 0; i < aContexts.length; i++)
            {
              const oData = aContexts[i].getObject();

              if (oData.SubstituteFullName === oGroup.key)
              {
                sUserId = oData.UserSubstitutedBy;
                break;
              }
            }
          }
        }

        return new sap.m.GroupHeaderListItem({
          title: "👤 " + oGroup.key,
          upperCase: false,
          type: sap.m.ListType.Active,
          press: function (oEvent)
          {
            if (sUserId)
            {
              that._fetchAndShowUserInfo(sUserId, oEvent.getSource());
            }
          }
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
        var oView = this.getView();

        AddSubstitutionDialogHelper.onOpen(oView);
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
        var oView = this.getView();
        UpdateSubstitutionDialogHelper.onOpen(oView, oEvent);
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
