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
  ) {
    "use strict";

    return BaseController.extend("z.wf.zwfmanagement.controller.Substitution", {
      onInit: function () {
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

      _onRouteMatched: function () {
        this._applyFilters();
      },

      onTabSelect: function (oEvent) {
        const sKey = oEvent.getParameter("key");
        if (sKey === "outgoing") {
          this.getView().getModel("view").setProperty("/substMode", "P");
        }

        this._applyFilters();
      },

      onModeSelect: function (oEvent) {
        const sKey = oEvent.getParameter("item").getKey();
        this.getView().getModel("view").setProperty("/substMode", sKey);

        this._applyFilters();
      },

      _applyFilters: function () {
        const oIconTabBar = this.byId("substitutionTabBar");
        const sSelectedTab = oIconTabBar.getSelectedKey();
        const sMode = this.getView().getModel("view").getProperty("/substMode");

        if (sSelectedTab === "outgoing") {
          // Outgoing tab: Filter by Direction = OUTGOING AND SubstitutionType = P or U
          this._filterOutgoingTables(sMode);
        } else if (sSelectedTab === "incoming") {
          // Incoming tab: Filter by Direction = INCOMING
          this._filterIncomingTable();
        }
      },

      _filterOutgoingTables: function (sMode) {
        const aFilters = [
          new Filter("Direction", FilterOperator.EQ, "OUTGOING"),
          new Filter("SubstitutionType", FilterOperator.EQ, sMode),
        ];

        const oTablePlanned = this.byId("tablePlanned");
        const oTableUnplanned = this.byId("tableUnplanned");

        if (oTablePlanned) {
          const oBinding = oTablePlanned.getBinding("items");
          if (oBinding) {
            oBinding.filter(aFilters);
          }
        }

        if (oTableUnplanned) {
          const oBinding = oTableUnplanned.getBinding("items");
          if (oBinding) {
            oBinding.filter(aFilters);
          }
        }
      },

      /**
       * Filter table in Incoming tab
       */
      _filterIncomingTable: function () {
        const oTable = this.byId("tableIncoming");
        if (oTable) {
          const oBinding = oTable.getBinding("items");
          if (oBinding) {
            const aFilters = [
              new Filter("Direction", FilterOperator.EQ, "INCOMING"),
            ];
            oBinding.filter(aFilters);
          }
        }
      },

      /**
       * Formatter for status text
       * Input: sStatus (String)
       */
      formatStatusText: function (sStatus) {
        return sStatus;
      },

      /**
       * Formatter for status state (ObjectStatus color)
       * Input: sStatus (String)
       */
      formatStatusState: function (sStatus) {
        if (!sStatus) {
          return "None";
        }
        // Check case-insensitive
        if (sStatus.toUpperCase() === "ACTIVE") {
          return "Success";
        }
        if (
          sStatus.toUpperCase() === "INACTIVE" ||
          sStatus.toUpperCase() === "CANCELLED"
        ) {
          return "Error";
        }
        return "None";
      },

      /**
       * Formatter for status icon
       * Input: sStatus (String)
       */
      formatStatusIcon: function (sStatus) {
        if (!sStatus) {
          return "";
        }
        if (sStatus.toUpperCase() === "ACTIVE") {
          return "sap-icon://status-positive";
        }
        return "sap-icon://status-inactive";
      },

      /**
       * Formatter for Active field text (Boolean/String -> String)
       * Used for Unplanned substitutions
       */
      formatActiveText: function (vActive) {
        const bIsActive =
          vActive === true ||
          vActive === "true" ||
          vActive === "X" ||
          vActive === 1;
        const oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();

        return bIsActive
          ? oResourceBundle.getText("statusActive")
          : oResourceBundle.getText("statusInactive");
      },

      /**
       * Formatter for Active field state (ObjectStatus color)
       * Used for Unplanned substitutions
       */
      formatActiveState: function (vActive) {
        const bIsActive =
          vActive === true ||
          vActive === "true" ||
          vActive === "X" ||
          vActive === 1;
        return bIsActive ? "Success" : "Error";
      },

      /**
       * Formatter for Active field icon
       * Used for Unplanned substitutions
       */
      formatActiveIcon: function (vActive) {
        const bIsActive =
          vActive === true ||
          vActive === "true" ||
          vActive === "X" ||
          vActive === 1;
        return bIsActive
          ? "sap-icon://status-positive"
          : "sap-icon://status-inactive";
      },

      formatSubstType: function (sType) {
        const oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();
        return sType === "P"
          ? oResourceBundle.getText("substModePlanned")
          : oResourceBundle.getText("substModeUnplanned");
      },

      formatDaysToStartText: function (sRuleStatus, iDays) {
        if (
          sRuleStatus === "Inactive" &&
          iDays !== null &&
          iDays !== undefined
        ) {
          const oResourceBundle = this.getView()
            .getModel("i18n")
            .getResourceBundle();
          // Hàm getText có hỗ trợ truyền mảng tham số để thế vào {0}, {1}...
          return oResourceBundle.getText("txtStartsInDays", [iDays]);
        }
        return "";
      },

      formatDateOrNA: function (sType, sDate) {
        if (sType === "U" || !sDate) {
          return "N/A";
        }

        // parse date format
        const oInputFormat = sap.ui.core.format.DateFormat.getDateInstance({
          pattern: "yyyy-MM-dd",
        });
        const oDate = oInputFormat.parse(sDate);

        if (!oDate) {
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
      onNavBackToDashboard: function () {
        this.getOwnerComponent().getRouter().navTo("RouteDashboard");
      },

      /**
       * Open Add Substitution Dialog
       */
      onOpenAddDialog: function () {
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

        if (!this.byId("addRuleDialog")) {
          Fragment.load({
            id: oView.getId(),
            name: "z.wf.zwfmanagement.view.fragments.AddSubstitutionDialog",
            controller: this,
          }).then(function (oDialog) {
            oView.addDependent(oDialog);
            oDialog.open();
          });
        } else {
          this.byId("addRuleDialog").open();
        }
      },

      /**
       * Close Add Substitution Dialog
       */
      onCloseAddDialog: function () {
        this.byId("addRuleDialog").close();
      },

      /**
       * Save new Substitution Rule via OData V4 Create
       */
      onSaveRule: function () {
        const oModel = this.getView().getModel();
        const oNewRuleData = this.getView().getModel("newRule").getData();
        const oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();
        const sCurrentUser = "DEV-138";

        // Validate Input
        if (
          !oNewRuleData.substituteId ||
          oNewRuleData.substituteId.trim() === ""
        ) {
          MessageBox.error(oResourceBundle.getText("msgSelectUser"));
          return;
        }

        // Format Dates to yyyy-MM-dd
        const oDateFormat = DateFormat.getDateInstance({
          pattern: "yyyy-MM-dd",
        });
        let sBeginDate = null;
        let sEndDate = null;

        if (oNewRuleData.type === "P") {
          if (!oNewRuleData.beginDate || !oNewRuleData.endDate) {
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

        if (oNewRuleData.type === "P") {
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
          function (oEvent) {
            this.getView().setBusy(false);

            const bSuccess = oEvent.getParameter("success");

            if (bSuccess) {
              // success case
              MessageToast.show(oResourceBundle.getText("msgCreateSuccess"));
              this.onCloseAddDialog();
              this._applyFilters();
            } else {
              // error case
              let sErrorMsg = "An error occurred during creation.";

              const aMessages = sap.ui
                .getCore()
                .getMessageManager()
                .getMessageModel()
                .getData();

              const aErrors = aMessages.filter(function (oMsg) {
                return oMsg.type === "Error";
              });

              if (aErrors.length > 0) {
                sErrorMsg = aErrors[aErrors.length - 1].message;
              }

              MessageBox.error(sErrorMsg);

              oContext.delete();
            }
          }.bind(this),
        );
      },
    });
  },
);
