sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/ViewSettingsDialog",
  "sap/m/ViewSettingsItem",
  "sap/ui/model/Sorter",
  "../utils/ColumnSettingsDialog",
], function (
  BaseController,
  JSONModel,
  Filter,
  FilterOperator,
  ViewSettingsDialog,
  ViewSettingsItem,
  Sorter,
  ColumnSettingsDialogHelper
)
{
  "use strict";

  return BaseController.extend("z.wf.zwfmanagement.controller.MainView", {
    onInit: function ()
    {
      BaseController.prototype.onInit.apply(this, arguments);

      // Initialize router
      this.oRouter = this.getOwnerComponent().getRouter();

      // Clear selection when navigating back to main view (e.g. browser back button)
      this.oRouter.getRoute("RouteMainView").attachPatternMatched(this._onMainViewMatched, this);

      let oViewModel,
        oList = this.byId("idTasksList");

      this._oList = oList;

      //keeps the search state
      this._aTableSearchState = [];

      // Model used to manipulate control states
      oViewModel = new JSONModel({
        worklistTableTitle: "",
        tableBusyDelay: 0,
        detailVisible: false,
        detailBusy: false,
        listMode: "SingleSelectMaster",
        columns: {
          taskName: true,
          taskID: false,
          workItemID: false,
          creationDate: true,
          endDate: false,
          daysToDeadline: true,
          status: true,
          priority: true,
          assignedUser: false,
          assignedUserName: false
        }
      });

      this.getView().setModel(oViewModel, "worklistView");

      //Create an object of filters for filtering tasks based on their technical status
      this._mFilters = {
        all: [],
        ready: [new Filter("TechnicalStatus", FilterOperator.EQ, "READY")],
        selected: [
          new Filter("TechnicalStatus", FilterOperator.EQ, "SELECTED"),
        ],
        started: [
          new Filter("TechnicalStatus", FilterOperator.EQ, "STARTED"),
        ],
        committed: [
          new Filter("TechnicalStatus", FilterOperator.EQ, "COMMITTED"),
        ],
        waiting: [
          new Filter("TechnicalStatus", FilterOperator.EQ, "WAITING"),
        ],
        checked: [
          new Filter("TechnicalStatus", FilterOperator.EQ, "CHECKED"),
        ],
        completed: [
          new Filter("TechnicalStatus", FilterOperator.EQ, "COMPLETED"),
        ],
        cancelled: [
          new Filter("TechnicalStatus", FilterOperator.EQ, "CANCELLED"),
        ],
        error: [new Filter("TechnicalStatus", FilterOperator.EQ, "ERROR")],
      };
    },

    onSort: function ()
    {
      if (!this._oSortDialog)
      {
        this._oSortDialog = new ViewSettingsDialog({
          sortItems: [
            new ViewSettingsItem({
              text: "Task Name",
              key: "TaskText",
            }),
            new ViewSettingsItem({
              text: "Creation Date",
              key: "CreationDate",
            }),
            new ViewSettingsItem({
              text: "Priority",
              key: "Priority",
            }),
            new ViewSettingsItem({
              text: "Days to Deadline",
              key: "DaysToDeadline",
            }),
            new ViewSettingsItem({
              text: "User ID",
              key: "AssignedUser",
            }),
          ],
          confirm: function (oEvent)
          {
            var oParams = oEvent.getParameters();
            var oBinding = this._oList.getBinding("items");
            var aSorters = [];

            if (oParams.sortItem)
            {
              var sPath = oParams.sortItem.getKey();
              var bDescending = oParams.sortDescending;
              aSorters.push(new Sorter(sPath, bDescending));
            }

            oBinding.sort(aSorters);
          }.bind(this),
        });
      }

      this._oSortDialog.open();
    },

    onFilter: function ()
    {
      if (!this._oFilterDialog)
      {
        this._oFilterDialog = new ViewSettingsDialog({
          filterItems: [
            new ViewSettingsItem({
              text: "Priority",
              key: "Priority",
              items: [
                new ViewSettingsItem({
                  text: "High",
                  key: "Priority___1",
                }),
                new ViewSettingsItem({
                  text: "Medium",
                  key: "Priority___5",
                }),
                new ViewSettingsItem({
                  text: "Low",
                  key: "Priority___9",
                }),
              ],
            }),
            new ViewSettingsItem({
              text: "Status",
              key: "TechnicalStatus",
              items: [
                new ViewSettingsItem({
                  text: "Ready",
                  key: "TechnicalStatus___READY",
                }),
                new ViewSettingsItem({
                  text: "Started",
                  key: "TechnicalStatus___STARTED",
                }),
                new ViewSettingsItem({
                  text: "Completed",
                  key: "TechnicalStatus___COMPLETED",
                }),
              ],
            }),
          ],
          confirm: function (oEvent)
          {
            var oParams = oEvent.getParameters();
            var oBinding = this._oList.getBinding("items");
            var aFilters = [];

            oParams.filterItems.forEach(function (oItem)
            {
              var sPath = oItem.getKey().split("___")[0];
              var sValue = oItem.getKey().split("___")[1];
              var oFilter = new Filter(sPath, FilterOperator.EQ, sValue);
              aFilters.push(oFilter);
            });

            oBinding.filter(aFilters);
          }.bind(this),
        });
      }

      this._oFilterDialog.open();
    },

    onGroup: function ()
    {
      if (!this._oGroupDialog)
      {
        this._oGroupDialog = new ViewSettingsDialog({
          groupItems: [
            new ViewSettingsItem({
              text: "Status",
              key: "TechnicalStatus",
            }),
            new ViewSettingsItem({
              text: "Priority",
              key: "Priority",
            }),
            new ViewSettingsItem({
              text: "User",
              key: "AssignedUser",
            }),
          ],
          confirm: function (oEvent)
          {
            var oParams = oEvent.getParameters();
            var oBinding = this._oList.getBinding("items");
            var aSorters = [];

            if (oParams.groupItem)
            {
              var sPath = oParams.groupItem.getKey();
              var bDescending = oParams.groupDescending;
              var vGroup = function (oContext)
              {
                var name = oContext.getProperty(sPath);
                return {
                  key: name,
                  text: name,
                };
              };
              aSorters.push(new Sorter(sPath, bDescending, vGroup));
            }

            oBinding.sort(aSorters);
          }.bind(this),
        });
      }

      this._oGroupDialog.open();
    },

    onSelectionChange: function (oEvent)
    {
      var oSelectedItem = oEvent.getParameter("listItem");
      var oContext = oSelectedItem ? oSelectedItem.getBindingContext() : null;
      var oViewModel = this.getView().getModel("worklistView");

      if (!oContext)
      {
        return;
      }

      var oHelper = this.getOwnerComponent().getHelper();

      if (!oHelper)
      {
        console.error("FlexibleColumnLayout helper not available");
        return;
      }

      // Check if in multi-select mode
      var sMode = oViewModel.getProperty("/listMode");
      if (sMode === "MultiSelect")
      {
        // Don't show detail in multi-select mode
        console.log("Multi");

        return;
      }

      var oNextUIState = oHelper.getNextUIState(1);
      var id = oContext.getPath().split("'")[1];

      this.oRouter.navTo("RouteDetail", {
        layout: oNextUIState.layout,
        propertyPath: id
      });
    },

    onTaskPress: function (oEvent)
    {
      var oList = this.byId("idTasksList");
      var oListItem = oEvent.getSource();
      var oViewModel = this.getView().getModel("worklistView");
      var sCurrentMode = oViewModel.getProperty("/listMode");

      if (sCurrentMode === "MultiSelect")
      {
        oList.setSelectedItem(oListItem, !oListItem.getSelected());
      }

      return;
    },

    onToggleMultiSelect: function ()
    {
      var oViewModel = this.getView().getModel("worklistView");
      var sCurrentMode = oViewModel.getProperty("/listMode");

      if (sCurrentMode === "MultiSelect")
      {
        // Switch to single select
        oViewModel.setProperty("/listMode", "SingleSelectMaster");
      } else
      {
        // Switch to multi select and hide detail
        oViewModel.setProperty("/listMode", "MultiSelect");
        oViewModel.setProperty("/detailVisible", false);
      }
      this._oList.removeSelections(true);
    },

    onFilterStatus: function (oEvent)
    {
      let oViewModel = this.getView().getModel("worklistView"),
        oBinding = this._oList.getBinding("items"),
        sKey = oEvent.getParameter("selectedKey");

      // Get the count for the selected key
      let iCount = oViewModel.getProperty("/" + sKey);

      if (sKey === "all")
      {
        oViewModel.setProperty("/worklistTableTitle", "");
        return;
      }

      // Update the table title with the count
      oViewModel.setProperty(
        "/worklistTableTitle",
        "(" + (iCount || 0) + ")",
      );

      oBinding.filter(this._mFilters[sKey]);
    },

    onSearch: function (oEvent)
    {
      var sQuery = oEvent.getParameter("query");
      var oList = this.byId("idTasksList");
      var oBinding = oList.getBinding("items");

      if (sQuery)
      {
        var aInnerFilters = [
          new Filter("TaskText", FilterOperator.Contains, sQuery),
          new Filter("WorkItemText", FilterOperator.Contains, sQuery),
        ];

        // Only filter on short fields if query fits within their MaxLength (12)
        if (sQuery.length <= 12)
        {
          aInnerFilters.push(new Filter("WorkItemID", FilterOperator.Contains, sQuery));
          aInnerFilters.push(new Filter("AssignedUser", FilterOperator.Contains, sQuery));
        }

        var aFilters = [
          new Filter({
            filters: aInnerFilters,
            and: false,
          }),
        ];
        oBinding.filter(aFilters);
      } else
      {
        oBinding.filter([]);
      }
    },

    onSelectAll: function ()
    {
      var oList = this.byId("idTasksList");
      var aItems = oList.getItems();

      aItems.forEach(function (oItem)
      {
        oList.setSelectedItem(oItem, true);
      });
    },

    onDeselectAll: function ()
    {
      var oList = this.byId("idTasksList");
      oList.removeSelections(true);
    },

    onNavBackToDashboard: function ()
    {
      this.byId("searchTaskField").setValue("");
      this._oList.getBinding("items").filter([]);
      this.getOwnerComponent().getRouter().navTo("RouteDashboard");
    },

    onCustomColumn: function ()
    {
      var oView = this.getView();

      ColumnSettingsDialogHelper.onCustomColumnOpen(oView);
    },

    _onMainViewMatched: function ()
    {
      // Clear list selection when returning to one-column layout (e.g. browser back)
      // so that clicking the same row again will fire onSelectionChange
      if (this._oList)
      {
        this._oList.removeSelections(true);
      }
    },

  });
},
);
