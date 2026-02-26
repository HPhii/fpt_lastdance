sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "../utils/UpdateSubstitutionDialog",
    "../utils/AddSubstitutionDialog",
    "../utils/UserInfoPopover",
  ],
  function (
    BaseController,
    JSONModel,
    Filter,
    FilterOperator,
    MessageBox,
    MessageToast,
    UpdateSubstitutionDialogHelper,
    AddSubstitutionDialogHelper,
    UserInfoPopoverHelper
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
        const oView = this.getView();
        const oSource = oEvent.getSource();
        const oContext = oSource.getBindingContext();

        if (!oContext) return;

        // Get the substitute user ID from the context
        const oData = oContext.getObject();
        const sUserId = oData.UserSubstitutedBy;

        // Fetch user info and open popover
        UserInfoPopoverHelper.onOpen(oView, oSource, sUserId);
      },

      /**
       * Show owner information popover when clicking on owner name
       */
      onShowOwnerInfo: function (oEvent)
      {
        const oView = this.getView();
        const oSource = oEvent.getSource();
        const oContext = oSource.getBindingContext();

        if (!oContext) return;

        // Get the owner user ID from the context
        const oData = oContext.getObject();
        const sUserId = oData.UserSubstitutedFor;

        // Fetch user info and open popover
        UserInfoPopoverHelper.onOpen(oView, oSource, sUserId);
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
        const oView = this.getView();
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
            var oSource = oEvent.getSource();

            if (sUserId)
            {
              UserInfoPopoverHelper.onOpen(oView, oSource, sUserId);
            }
          }
        });
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
