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
  "../model/formatter",
  "sap/ui/model/odata/v2/ODataModel"
], function (BaseController, JSONModel, Filter, FilterOperator, MessageBox, ViewSettingsDialog, ViewSettingsItem, Sorter, MessageToast, formatter, ODataV2Model)
{
  "use strict";

  return BaseController.extend("z.wf.zwfmanagement.controller.MainView", {
    formatter: formatter,
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

      this.oRouter.navTo("RouteMainView", {
        layout: "OneColumn"
      });

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

    onCloseDetail: function ()
    {
      var oViewModel = this.getView().getModel("worklistView");
      oViewModel.setProperty("/detailVisible", false);
      this._oList.removeSelections(true);
    },

    onSelectionChange: function (oEvent)
    {
      var oSelectedItem = oEvent.getParameter("listItem");
      var oContext = oSelectedItem ? oSelectedItem.getBindingContext() : null;
      var oViewModel = this.getView().getModel("worklistView");
      console.log("Hello");

      if (!oContext)
      {
        return;
      }

      console.log(oSelectedItem, oContext.getPath().split("'")[1]);

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

    _callODataService: function (sServiceUrl, sEntitySet, sKey, sExpand)
    {
      var oModel = new JSONModel({
        isLoading: true
      });

      this.getView().setModel(oModel, "purchaseOrderItem");

      var oBusinessContainer = this.byId("businessObjectContainer");
      if (!oBusinessContainer)
      {
        oBusinessContainer = this.byId("detailPanel");
      }

      // Get existing model
      var oCurrentModel = this.getView().getModel("businessModel");

      if (!oCurrentModel || oCurrentModel.sServiceUrl !== sServiceUrl)
      {
        // Create new OData V2 Model
        var oNewModel = new ODataV2Model(sServiceUrl, {
          json: true,
          useBatch: false, // Turn off batch
          defaultBindingMode: "OneWay",
        });

        this.getView().setModel(oNewModel, "businessModel");
      }

      // Create binding path
      var sPath = "/" + sEntitySet + "('" + sKey + "')";

      // 4. Bind Element
      oBusinessContainer.bindElement({
        path: sPath,
        model: "businessModel",
        parameters: {
          expand: sExpand
        },
        events: {
          dataReceived: function ()
          {
            console.log("Business Object Loaded: " + sPath);
            oModel.setProperty("/isLoading", false);
          },
          change: function ()
          {
            // Todo: Handle data change if needed

          },
          dataRequested: function ()
          {
            console.log("Requesting Business Object Data: " + sPath);
          }
        }
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

    onCustomColumn: function ()
    {
      var oView = this.getView();

      if (!this._oColumnSettingsDialog)
      {
        sap.ui.core.Fragment.load({
          id: oView.getId(),
          name: "z.wf.zwfmanagement.view.fragments.ColumnSettingsDialog",
          controller: this
        }).then(function (oDialog)
        {
          this._oColumnSettingsDialog = oDialog;
          oView.addDependent(oDialog);
          oDialog.open();
        }.bind(this));
      } else
      {
        this._oColumnSettingsDialog.open();
      }
    },

    onCloseColumnSettings: function ()
    {
      this._oColumnSettingsDialog.close();
    },

    onResetColumns: function ()
    {
      var oViewModel = this.getView().getModel("worklistView");
      oViewModel.setProperty("/columns", {
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
      });
      MessageToast.show("Columns reset to default");
    },

  });
},
);
