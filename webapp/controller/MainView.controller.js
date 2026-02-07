sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/MessageBox",
  "sap/m/ViewSettingsDialog",
  "sap/m/ViewSettingsItem",
  "sap/ui/model/Sorter",
  "sap/m/MessageToast",
  "../model/formatter"
], function (BaseController, JSONModel, Filter, FilterOperator, MessageBox, ViewSettingsDialog, ViewSettingsItem, Sorter, MessageToast, formatter)
{
  "use strict";

  return BaseController.extend("z.wf.zwfmanagement.controller.MainView", {
    formatter: formatter,
    onInit: function ()
    {
      BaseController.prototype.onInit.apply(this, arguments);

      let oViewModel,
        oList = this.byId("idTasksList");

      this._oList = oList;

      //keeps the search state
      this._aTableSearchState = [];

      // Model used to manipulate control states
      oViewModel = new JSONModel({
        worklistTableTitle: "",
        tableBusyDelay: 0,
        countAll: 0,
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
        listMode: "SingleSelectMaster",
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

      // Attach event to update counts when list data is loaded/changed
      oList.attachEventOnce(
        "updateFinished",
        function ()
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
        }.bind(this),
      );
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
        $select: "TechnicalStatus",
      });

      oBinding
        .requestContexts(0, Infinity)
        .then(
          function (aContexts)
          {
            var oCounts = {
              countAll: aContexts.length,
              ready: 0,
              selected: 0,
              started: 0,
              committed: 0,
              waiting: 0,
              checked: 0,
              completed: 0,
              cancelled: 0,
              error: 0,
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
          }.bind(this),
        )
        .catch(function (oError)
        {
          console.error("Error reading tasks for count:", oError);
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

    onCloseDetail: function ()
    {
      var oViewModel = this.getView().getModel("worklistView");
      oViewModel.setProperty("/detailVisible", false);
      this._oList.removeSelections(true);
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
            $select: "*,__OperationControl",
            $expand: "_DecisionOptions",
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
            },
          },
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
        var aFilters = [
          new Filter({
            filters: [
              new Filter("TaskText", FilterOperator.Contains, sQuery),
              new Filter("WorkItemText", FilterOperator.Contains, sQuery),
              new Filter("WorkItemID", FilterOperator.Contains, sQuery),
              new Filter("AssignedUser", FilterOperator.Contains, sQuery),
            ],
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
        },
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
        oContext,
      );

      oOperation.setParameter("DecisionKey", sDecisionKey);
      oOperation.setParameter("WorkItemID", sWorkItemID);
      oOperation.setParameter("DecisionComment", "");

      oOperation
        .execute()
        .then(
          function ()
          {
            MessageBox.success("Action executed successfully!");

            // Refresh the list and counts
            this._oList.getBinding("items").refresh();
            this._updateCounts();

            // Hide detail panel and clear selection
            oViewModel.setProperty("/detailVisible", false);
            oViewModel.setProperty("/detailBusy", false);
            this._oList.removeSelections(true);
          }.bind(this),
        )
        .catch(function (oError)
        {
          oViewModel.setProperty("/detailBusy", false);
          MessageBox.error("Error executing action: " + oError.message);
        });
    },

    onNavBackToDashboard: function ()
    {
      this.getOwnerComponent().getRouter().navTo("RouteDashboard");
    },

    onApproveAction: function ()
    {
      var oDetailPanel = this.byId("detailPanel");
      var oContext = oDetailPanel.getBindingContext();
      var oResourceBundle = this.getView()
        .getModel("i18n")
        .getResourceBundle();
      var sConfirmMessage = oResourceBundle.getText("confirmApprove");

      var that = this;
      MessageBox.confirm(sConfirmMessage, {
        onClose: function (oAction)
        {
          if (oAction === MessageBox.Action.OK)
          {
            that._callBoundAction("approve", oContext);
          }
        },
      });
    },

    onRejectAction: function ()
    {
      var oDetailPanel = this.byId("detailPanel");
      var oContext = oDetailPanel.getBindingContext();
      var oResourceBundle = this.getView()
        .getModel("i18n")
        .getResourceBundle();
      var sConfirmMessage = oResourceBundle.getText("confirmReject");

      var that = this;
      MessageBox.confirm(sConfirmMessage, {
        onClose: function (oAction)
        {
          if (oAction === MessageBox.Action.OK)
          {
            that._callBoundAction("reject", oContext);
          }
        },
      });
    },

    onClaimAction: function ()
    {
      var oDetailPanel = this.byId("detailPanel");
      var oContext = oDetailPanel.getBindingContext();
      var oResourceBundle = this.getView()
        .getModel("i18n")
        .getResourceBundle();
      var sConfirmMessage = oResourceBundle.getText("confirmClaim");

      var that = this;
      MessageBox.confirm(sConfirmMessage, {
        onClose: function (oAction)
        {
          if (oAction === MessageBox.Action.OK)
          {
            that._callBoundAction("claim", oContext);
          }
        },
      });
    },

    onForwardAction: function ()
    {
      var oDetailPanel = this.byId("detailPanel");
      var oContext = oDetailPanel.getBindingContext();
      var oResourceBundle = this.getView()
        .getModel("i18n")
        .getResourceBundle();
      var sConfirmMessage = oResourceBundle.getText("confirmForward");

      var that = this;
      MessageBox.confirm(sConfirmMessage, {
        onClose: function (oAction)
        {
          if (oAction === MessageBox.Action.OK)
          {
            that._callBoundAction("forward", oContext);
          }
        },
      });
    },

    onReleaseAction: function ()
    {
      var oDetailPanel = this.byId("detailPanel");
      var oContext = oDetailPanel.getBindingContext();
      var oResourceBundle = this.getView()
        .getModel("i18n")
        .getResourceBundle();
      var sConfirmMessage = oResourceBundle.getText("confirmRelease");

      var that = this;
      MessageBox.confirm(sConfirmMessage, {
        onClose: function (oAction)
        {
          if (oAction === MessageBox.Action.OK)
          {
            that._callBoundAction("release", oContext);
          }
        },
      });
    },

    onSuspendAction: function ()
    {
      var oDetailPanel = this.byId("detailPanel");
      var oContext = oDetailPanel.getBindingContext();
      var oResourceBundle = this.getView()
        .getModel("i18n")
        .getResourceBundle();
      var sConfirmMessage = oResourceBundle.getText("confirmSuspend");

      var that = this;
      MessageBox.confirm(sConfirmMessage, {
        onClose: function (oAction)
        {
          if (oAction === MessageBox.Action.OK)
          {
            that._callBoundAction("suspend", oContext);
          }
        },
      });
    },

    _callBoundAction: function (sActionName, oContext)
    {
      var oResourceBundle = this.getView()
        .getModel("i18n")
        .getResourceBundle();
      var oViewModel = this.getView().getModel("worklistView");

      if (!oContext)
      {
        MessageBox.error(oResourceBundle.getText("errorNoContext"));
        return;
      }

      var sPath =
        "com.sap.gateway.srvd.zsd_gsp26sap02_wf_task.v0001." +
        sActionName +
        "(...)";
      var oModel = this.getView().getModel();

      var oOperation = oModel.bindContext(sPath, oContext);

      oViewModel.setProperty("/detailBusy", true);

      oOperation
        .execute()
        .then(
          function ()
          {
            oViewModel.setProperty("/detailBusy", false);
            MessageToast.show(oResourceBundle.getText("successMessage"));

            // Refresh the list and counts
            this._oList.getBinding("items").refresh();
            this._updateCounts();

            // Close detail panel
            this.onCloseDetail();
          }.bind(this),
        )
        .catch(
          function (oError)
          {
            oViewModel.setProperty("/detailBusy", false);
            MessageBox.error("Error: " + oError.message);
          }.bind(this),
        );
    },
  });
},
);
