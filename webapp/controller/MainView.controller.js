sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/core/BusyIndicator",
  "sap/m/MessageBox",
  "../model/formatter"
], function (Controller, JSONModel, Filter, FilterOperator, BusyIndicator, MessageBox, formatter)
{
  "use strict";

  return Controller.extend("z.wf.zwfmanagement.controller.MainView", {
    formatter: formatter,
    onInit: function ()
    {
      let oViewModel,
        oList = this.byId("idTasksList");

      this._oList = oList;

      //keeps the search state
      this._aTableSearchState = [];

      // Model used to manipulate control states
      oViewModel = new JSONModel({
        worklistTableTitle: this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("tableHeaderTitle"),
        tableBusyDelay: 0,
        ready: 0,
        selected: 0,
        started: 0,
        committed: 0,
        waiting: 0,
        checked: 0,
        completed: 0,
        cancelled: 0,
        error: 0,
        detailVisible: false,
        detailBusy: false,
        listMode: "SingleSelectMaster"
      });

      this.getView().setModel(oViewModel, "worklistView");

      //Create an object of filters for filtering tasks based on their technical status
      this._mFilters = {
        "all": [],
        "ready": [new Filter("TechnicalStatus", FilterOperator.EQ, "READY")],
        "selected": [new Filter("TechnicalStatus", FilterOperator.EQ, "SELECTED")],
        "started": [new Filter("TechnicalStatus", FilterOperator.EQ, "STARTED")],
        "committed": [new Filter("TechnicalStatus", FilterOperator.EQ, "COMMITTED")],
        "waiting": [new Filter("TechnicalStatus", FilterOperator.EQ, "WAITING")],
        "checked": [new Filter("TechnicalStatus", FilterOperator.EQ, "CHECKED")],
        "completed": [new Filter("TechnicalStatus", FilterOperator.EQ, "COMPLETED")],
        "cancelled": [new Filter("TechnicalStatus", FilterOperator.EQ, "CANCELLED")],
        "error": [new Filter("TechnicalStatus", FilterOperator.EQ, "ERROR")],
      }

      // Attach event to update counts when list data is loaded/changed
      oList.attachEventOnce("updateFinished", function ()
      {
        // Update counts after list is loaded
        this._updateCounts();

        // Attach to future data changes
        var oBinding = oList.getBinding("items");
        if (oBinding)
        {
          oBinding.attachDataReceived(this._updateCounts.bind(this));
          oBinding.attachChange(this._updateCounts.bind(this));
        }
      }.bind(this));
    },

    /**
     * Update the counts for each technical status
     * @private
     */
    _updateCounts: function ()
    {
      var oModel = this.getView().getModel();
      var oViewModel = this.getView().getModel("worklistView");

      if (!oModel)
      {
        return;
      }

      //Use bindList to read all tasks and count by status
      var oBinding = oModel.bindList("/WfTasks", null, null, null, {
        $select: "TechnicalStatus"
      });

      oBinding.requestContexts(0, Infinity).then(function (aContexts)
      {
        var oCounts = {
          ready: 0,
          selected: 0,
          started: 0,
          committed: 0,
          waiting: 0,
          checked: 0,
          completed: 0,
          cancelled: 0,
          error: 0
        };

        // Count tasks by TechnicalStatus
        aContexts.forEach(function (oContext)
        {
          var sStatus = oContext.getProperty("TechnicalStatus");
          if (sStatus)
          {
            var sKey = sStatus.toLowerCase();
            if (oCounts.hasOwnProperty(sKey))
            {
              oCounts[sKey]++;
            }
          }
        });

        // Update view model with counts
        oViewModel.setProperty("/ready", oCounts.ready);
        oViewModel.setProperty("/selected", oCounts.selected);
        oViewModel.setProperty("/started", oCounts.started);
        oViewModel.setProperty("/committed", oCounts.committed);
        oViewModel.setProperty("/waiting", oCounts.waiting);
        oViewModel.setProperty("/checked", oCounts.checked);
        oViewModel.setProperty("/completed", oCounts.completed);
        oViewModel.setProperty("/cancelled", oCounts.cancelled);
        oViewModel.setProperty("/error", oCounts.error);
      }.bind(this)).catch(function (oError)
      {
        console.error("Error reading tasks for count:", oError);
      });
    },

    onSelectionChange: function (oEvent)
    {
      var oList = oEvent.getSource();
      var oSelectedItem = oEvent.getParameter("listItem");
      var oContext = oSelectedItem ? oSelectedItem.getBindingContext() : null;
      var oViewModel = this.getView().getModel("worklistView");

      // Check if in multi-select mode
      var sMode = oViewModel.getProperty("/listMode");
      if (sMode === "MultiSelect")
      {

        // Don't show detail in multi-select mode
        return;
      }

      if (oContext)
      {
        var oDetailPanel = this.byId("detailPanel");

        // Show loading indicator
        oViewModel.setProperty("/detailBusy", true);
        oViewModel.setProperty("/detailVisible", true);

        // Bind the detail panel to the selected item with expanded decision options
        oDetailPanel.bindElement({
          path: oContext.getPath(),
          parameters: {
            $expand: "_DecisionOptions"
          },
          events: {
            dataReceived: function ()
            {
              // Hide loading indicator when data is received
              oViewModel.setProperty("/detailBusy", false);
            },
            dataRequested: function ()
            {
              // Show loading indicator when data is requested
              oViewModel.setProperty("/detailBusy", true);
            }
          }
        });
      }
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
        this._oList.removeSelections(true);
      } else
      {
        // Switch to multi select and hide detail
        oViewModel.setProperty("/listMode", "MultiSelect");
        oViewModel.setProperty("/detailVisible", false);
        this._oList.removeSelections(true);
      }
    },

    onFilterStatus: function (oEvent)
    {
      let oBinding = this._oList.getBinding("items"),
        sKey = oEvent.getParameter("selectedKey");

      oBinding.filter(this._mFilters[sKey]);
    },

    onLanguageChange: function (oEvent)
    {
      var sSelectedKey = oEvent.getSource().getSelectedKey();

      //Set selected language to core
      sap.ui.getCore().getConfiguration().setLanguage(sSelectedKey);
    },

    onSearch: function (oEvent)
    {
      var sQuery = oEvent.getParameter("query");
      var oList = this.byId("idTasksList");
      var oBinding = oList.getBinding("items");

      if (sQuery)
      {
        var aFilters = [
          new Filter({
            filters: [
              new Filter("TaskText", FilterOperator.Contains, sQuery),
              new Filter("WorkItemText", FilterOperator.Contains, sQuery),
              new Filter("WorkItemID", FilterOperator.Contains, sQuery),
              new Filter("UserID", FilterOperator.Contains, sQuery)
            ],
            and: false
          })
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

    onDecisionPress: function (oEvent)
    {
      var oButton = oEvent.getSource();
      var sDecisionKey = oButton.data("DecisionKey");
      var sWorkItemID = oButton.data("WorkItemID");
      var sText = oButton.getText();

      if (sDecisionKey)
      {
        sDecisionKey = sDecisionKey.toString().padStart(4, "0");
      }

      var that = this;

      MessageBox.confirm("Do you want to perform action: " + sText + "?", {
        onClose: function (oAction)
        {
          if (oAction === MessageBox.Action.OK)
          {
            that._callODataV4Action(sWorkItemID, sDecisionKey);
          }
        }
      });
    },

    _callODataV4Action: function (sWorkItemID, sDecisionKey)
    {
      var oModel = this.getView().getModel();
      var oDetailPanel = this.byId("detailPanel");
      var oContext = oDetailPanel.getBindingContext();
      var oViewModel = this.getView().getModel("worklistView");

      if (!oContext)
      {
        MessageBox.error("Context not found.");
        return;
      }

      // Show busy indicator
      oViewModel.setProperty("/detailBusy", true);

      var oOperation = oModel.bindContext(
        "com.sap.gateway.srvd.zsd_gsp26sap02_wf_task.v0001.executionDecision(...)",
        oContext
      );

      oOperation.setParameter("DecisionKey", sDecisionKey);
      oOperation.setParameter("WorkItemID", sWorkItemID);
      oOperation.setParameter("DecisionComment", "");

      oOperation
        .execute()
        .then(function ()
        {
          MessageBox.success("Action executed successfully!");

          // Refresh the list and counts
          this._oList.getBinding("items").refresh();
          this._updateCounts();

          // Hide detail panel and clear selection
          oViewModel.setProperty("/detailVisible", false);
          oViewModel.setProperty("/detailBusy", false);
          this._oList.removeSelections(true);
        }.bind(this))
        .catch(function (oError)
        {
          oViewModel.setProperty("/detailBusy", false);
          MessageBox.error("Error executing action: " + oError.message);
        });
    }
  });
});
