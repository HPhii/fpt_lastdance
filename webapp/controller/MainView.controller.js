sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/ViewSettingsDialog",
  "sap/m/ViewSettingsItem",
  "sap/m/ViewSettingsFilterItem",
  "sap/ui/model/Sorter",
  "../utils/ColumnSettingsDialog",
  "../utils/BulkDelegateDialog",
  "../utils/TasksFilterDialog"
], function (
  BaseController,
  JSONModel,
  Filter,
  FilterOperator,
  ViewSettingsDialog,
  ViewSettingsItem,
  ViewSettingsFilterItem,
  Sorter,
  ColumnSettingsDialogHelper,
  BulkDelegateDialogHelper,
  TasksFilterDialogHelper
)
{
  "use strict";

  return BaseController.extend("z.wf.zwfmanagement.controller.MainView", {
    onInit: function ()
    {
      BaseController.prototype.onInit.apply(this, arguments);

      // Initialize router
      this.oRouter = this.getOwnerComponent().getRouter();

      let oViewModel,
        oList = this.byId("idTasksList");

      this._oList = oList;

      //keeps the search state
      this._aTableSearchState = [];

      var oStatusFilterCounter = new JSONModel({
        readyCount: 0,
        selectedCount: 0,
        startedCount: 0,
        committedCount: 0,
        waitingCount: 0,
        checkedCount: 0,
        completedCount: 0,
        cancelledCount: 0,
        errorCount: 0,
        isHasOverdue: false,
        isHasDueOn: false
      });

      this.getView().setModel(oStatusFilterCounter, "statusFilterCounter");

      // Model used to manipulate control states
      oViewModel = new JSONModel({
        tableTitle: "",
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
          assignedUserName: false,
          actualDeadlineDate: false,
          technicalStatusText: false,
          userSubstitutedBy: true
        }
      });

      this.getView().setModel(oViewModel, "worklistView");

      //Create an object of filters for filtering tasks based on their technical status
      this._mFilters = {
        all: [],
        ready: [new Filter("TechnicalStatus", FilterOperator.EQ, "READY")],
        selected: [new Filter("TechnicalStatus", FilterOperator.EQ, "SELECTED")],
        started: [new Filter("TechnicalStatus", FilterOperator.EQ, "STARTED")],
        committed: [new Filter("TechnicalStatus", FilterOperator.EQ, "COMMITTED")],
        waiting: [new Filter("TechnicalStatus", FilterOperator.EQ, "WAITING")],
        checked: [new Filter("TechnicalStatus", FilterOperator.EQ, "CHECKED")],
        completed: [new Filter("TechnicalStatus", FilterOperator.EQ, "COMPLETED")],
        cancelled: [new Filter("TechnicalStatus", FilterOperator.EQ, "CANCELLED")],
        error: [new Filter("TechnicalStatus", FilterOperator.EQ, "ERROR")],
        overdue: [new Filter("IsOverdue", FilterOperator.EQ, "X")],
        ondue: [new Filter("IsDueOn", FilterOperator.EQ, "X")]
      };

      this.oRouter.getRoute("RouteMainView").attachPatternMatched(this._onMainViewMatched, this);
      this.oRouter.getRoute("RouteDetail").attachPatternMatched(this._onDetailMatched, this);
      this._loadStatusFilterCounter();

      // Subscribe to global event to refresh the filter bar manually when tasks are changed in detail view
      sap.ui.getCore().getEventBus().subscribe("wf", "taskActionCompleted", this._loadStatusFilterCounter, this);
    },

    _loadStatusFilterCounter: function ()
    {

      var oView = this.getView();
      var oStatusFilterCounter = oView.getModel("statusFilterCounter");
      // Fallback to Component model if View model is not yet propagated in onInit
      var oODataModel = oView.getModel() || this.getOwnerComponent().getModel();

      if (!oODataModel)
      {
        console.error("Default model is undefined.");
        return;
      }

      var oListBinding = oODataModel.bindList("/TaskBase");

      oListBinding.requestContexts(0, 1).then(function (aContexts)
      {
        if (aContexts && aContexts.length > 0)
        {
          var oData = aContexts[0].getObject();
          oStatusFilterCounter.setData({
            readyCount: oData.readyCount || 0,
            selectedCount: oData.reservedCount || 0,
            startedCount: oData.inProcessCount || 0,
            committedCount: oData.executedCount || 0,
            waitingCount: oData.waitingCount || 0,
            checkedCount: oData.checkedCount || 0,
            completedCount: oData.completedCount || 0,
            cancelledCount: oData.deletedCount || 0,
            errorCount: oData.errorCount || 0
          });
        }
      }).catch(function (oError)
      {
        console.error("Failed to map TaskBase counts:", oError);
      });

      var oDueOnBinding = oODataModel.bindList("/WfTasks", undefined, undefined, [new Filter("IsDueOn", FilterOperator.EQ, "X")]);
      oDueOnBinding.requestContexts(0, 0).then(function ()
      {
        var iCount = oDueOnBinding.getLength();
        oStatusFilterCounter.setProperty("/isHasDueOn", iCount > 0);
      });

      var oOverdueBinding = oODataModel.bindList("/WfTasks", undefined, undefined, [new Filter("IsOverdue", FilterOperator.EQ, "X")]);
      oOverdueBinding.requestContexts(0, 0).then(function ()
      {
        var iCount = oOverdueBinding.getLength();
        oStatusFilterCounter.setProperty("/isHasOverdue", iCount > 0);
      });
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
      TasksFilterDialogHelper.onOpen(this.getView(), this._oList);
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
              key: "PriorityText",
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
        return;
      }

      var oNextUIState = oHelper.getNextUIState(1);
      var id = oContext.getPath().split("'")[1];

      oViewModel.setProperty("/detailVisible", true);

      this.oRouter.navTo("RouteDetail", {
        layout: oNextUIState.layout,
        propertyPath: id
      });
    },

    onTaskPress: function (oEvent)
    {
      var oView = this.getView(),
        oList = this.byId("idTasksList"),
        oListItem = oEvent.getSource(),
        oViewModel = oView.getModel("worklistView"),
        oResourceBundle = oView.getModel("i18n").getResourceBundle(),
        sCurrentMode = oViewModel.getProperty("/listMode");

      if (sCurrentMode === "MultiSelect")
      {
        oList.setSelectedItem(oListItem, !oListItem.getSelected());
        oViewModel.setProperty("/tableTitle", oResourceBundle.getText("selectedItemsTitle", [oList.getSelectedItems().length]));
      }

      return;
    },

    onToggleMultiSelect: function ()
    {
      var oView = this.getView(),
        oViewModel = oView.getModel("worklistView"),
        oResourceBundle = oView.getModel("i18n").getResourceBundle(),
        sCurrentMode = oViewModel.getProperty("/listMode");

      if (sCurrentMode === "MultiSelect")
      {
        // Switch to single select
        oViewModel.setProperty("/listMode", "SingleSelectMaster");
        oViewModel.setProperty("/tableTitle", "");
      } else
      {
        // Switch to multi select and hide detail
        oViewModel.setProperty("/listMode", "MultiSelect");
        oViewModel.setProperty("/detailVisible", false);
        oViewModel.setProperty("/tableTitle", oResourceBundle.getText("selectedItemsTitle", [0]));
      }
      this._oList.removeSelections(true);
    },

    onFilterStatus: function (oEvent)
    {
      var oBinding = this._oList.getBinding("items"),
        sKey = oEvent.getParameter("selectedKey"),
        oItem = oEvent.getParameter("item");

      if (sKey === "more")
      {
        oItem._expandButtonPress();
        return;
      }

      this._sPreviousFilterKey = sKey;

      if (!this._mFilters[sKey])
      {
        return;
      }
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
      var oView = this.getView(),
        oList = this.byId("idTasksList"),
        aItems = oList.getItems(),
        oResourceBundle = oView.getModel("i18n").getResourceBundle(),
        oViewModel = oView.getModel("worklistView");

      aItems.forEach(function (oItem)
      {
        oList.setSelectedItem(oItem, true)
      });

      oViewModel.setProperty("/tableTitle", oResourceBundle.getText("selectedItemsTitle", [oList.getSelectedItems().length]));
    },

    onDeselectAll: function ()
    {
      var oView = this.getView(),
        oList = this.byId("idTasksList"),
        oViewModel = oView.getModel("worklistView"),
        oResourceBundle = oView.getModel("i18n").getResourceBundle();

      oViewModel.setProperty("/tableTitle", oResourceBundle.getText("selectedItemsTitle", [0]));

      oList.removeSelections(true);
    },

    onNavBackToDashboard: function ()
    {
      this.byId("searchTaskField").setValue("");
      this._oList.getBinding("items").filter([]);

      BaseController.prototype.onNavBackToDashboard.apply(this, arguments);
    },

    onCustomColumn: function ()
    {
      var oView = this.getView();

      ColumnSettingsDialogHelper.onCustomColumnOpen(oView);
    },

    _onMainViewMatched: function ()
    {
      if (this._oList) this._oList.removeSelections(true);
      this.getView().getModel("worklistView").setProperty("/detailVisible", false);
    },

    _onDetailMatched: function ()
    {
      this.getView().getModel("worklistView").setProperty("/detailVisible", true);
    },

    onBulkDelegatePress: function ()
    {
      var oView = this.getView();

      BulkDelegateDialogHelper.onOpen(oView);
    },
  });
},
);
