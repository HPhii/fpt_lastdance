sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/ViewSettingsDialog",
    "sap/m/ViewSettingsItem",
    "sap/ui/model/Sorter"
], function (BaseController, JSONModel, MessageBox, Filter, FilterOperator, ViewSettingsDialog, ViewSettingsItem, Sorter)
{
    "use strict";

    return BaseController.extend("z.wf.zwfmanagement.controller.AdminInbox", {
        onInit: function ()
        {
            BaseController.prototype.onInit.apply(this, arguments);

            var oView = this.getView();
            this._oRouter = this.getOwnerComponent().getRouter();

            var oViewModel = new JSONModel({
                currentLocation: "",
                links: [
                    { text: "Users" }
                ],
                countTotal: 0,
                countTotalTableHeader: 0,
                tasks: [],
                users: [],
                traceLogs: [],
                isTasksBusy: false,
                isUsersBusy: false,
                isTasksVisible: false,
                isUsersVisible: true,
                isTraceLogsVisible: false,
                isTraceLogsBusy: false,
                lastSelectedUser: "",
                isClaimedByUsersLoaded: false,
                countSelectedStatus: 0,
                countStartedStatus: 0,
                countWaitingStatus: 0
            });

            oView.setModel(oViewModel, "adminInboxViewModel");

            this._oRouter
                .getRoute("RouteAdminInbox")
                .attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function ()
        {
            this.onSearchUsers();
        },

        onUserPress: function (oEvent)
        {
            var oView = this.getView();
            var oCtx = oEvent.getParameter("listItem")?.getBindingContext("adminInboxViewModel");

            if (!oCtx) return;

            var sUniqueName = oCtx.getProperty("UserID");
            var oViewModel = oView.getModel("adminInboxViewModel");
            oViewModel.setProperty("/currentLocation", sUniqueName);

            oViewModel.setProperty("/isUsersVisible", false);
            oViewModel.setProperty("/isTasksVisible", true);
            oViewModel.setProperty("/isTraceLogsVisible", false);

            var oTasksTable = oView.byId("adminInboxTasksTable");
            var oBinding = oTasksTable.getBinding("items");

            if (!oBinding) return;

            // Attach listeners permanently just once to avoid leaks
            if (!this._bTaskEventsAttached)
            {
                oBinding.attachEvent("dataRequested", function ()
                {
                    oViewModel.setProperty("/isTasksBusy", true);
                });
                oBinding.attachEvent("dataReceived", function (oData)
                {
                    var aSelectedStatusCount = 0,
                        aStartedStatusCount = 0,
                        aWaitingStatusCount = 0,
                        aClaimedByUser = [],
                        isClaimedByUsersLoaded = oViewModel.getProperty("/isClaimedByUsersLoaded");

                    var aContexts = oData.getSource().getCurrentContexts();
                    oViewModel.setProperty("/isTasksBusy", false);

                    aContexts.map(function (oContext)
                    {
                        var sStatus = oContext.getProperty("TechnicalStatus");
                        var sClaimedByUser = oContext.getProperty("ClaimedByUser");

                        if (sStatus === "SELECTED")
                        {
                            aSelectedStatusCount++;
                        }
                        else if (sStatus === "WAITING")
                        {
                            aWaitingStatusCount++;
                        } else if (sStatus === "STARTED")
                        {
                            aStartedStatusCount++;
                        }

                        if (!isClaimedByUsersLoaded) 
                        {
                            if (sClaimedByUser && !aClaimedByUser.includes(sClaimedByUser))
                            {
                                aClaimedByUser.push(sClaimedByUser);
                            }
                        }
                    });

                    if (!isClaimedByUsersLoaded) 
                    {
                        oViewModel.setProperty("/claimedByUsers", aClaimedByUser);
                        oViewModel.setProperty("/isClaimedByUsersLoaded", true);
                        oViewModel.setProperty("/countTotal", aContexts ? aContexts.length : 0);
                        oViewModel.setProperty("/countSelectedStatus", aSelectedStatusCount);
                        oViewModel.setProperty("/countWaitingStatus", aWaitingStatusCount);
                        oViewModel.setProperty("/countStartedStatus", aStartedStatusCount);
                    }

                    oViewModel.setProperty("/countTotalTableHeader", aContexts ? aContexts.length : 0);
                });
                this._bTaskEventsAttached = true;
            }

            var sLastUser = oViewModel.getProperty("/lastSelectedUser");

            if (sLastUser === sUniqueName)
            {
                // If same user, filter might skip fetching. Force refresh to trigger events.
                oViewModel.setProperty("/isTasksBusy", true);
                oBinding.refresh();
            } else
            {
                oViewModel.setProperty("/lastSelectedUser", sUniqueName);
                oViewModel.setProperty("/isClaimedByUsersLoaded", false);
                // apply filter
                var aFilters = [new Filter("SampleResponsibleUser", FilterOperator.EQ, sUniqueName)];
                oBinding.filter(aFilters, "Application");
            }
        },

        onLinkPress: function (oEvent)
        {
            this._resetSearchAndFilters();

            var oSource = oEvent.getSource();
            var sText = oSource.getText();
            var oView = this.getView();
            var oViewModel = oView.getModel("adminInboxViewModel");
            var aLinks = oViewModel.getProperty("/links");

            if (sText === "Users")
            {
                var iUsersCount = oViewModel.getProperty("/users").length;
                oViewModel.setProperty("/links", [{ text: "Users" }]);
                oViewModel.setProperty("/currentLocation", "");
                oViewModel.setProperty("/isTraceLogsVisible", false);
                oViewModel.setProperty("/isTasksVisible", false);
                oViewModel.setProperty("/isUsersVisible", true);
                oViewModel.setProperty("/countTotal", iUsersCount);
            }
            else
            {
                var iIndex = aLinks.findIndex(function (link)
                {
                    return link.text === sText;
                });

                if (iIndex > -1)
                {
                    oViewModel.setProperty("/links", aLinks.slice(0, iIndex));
                }

                oViewModel.setProperty("/currentLocation", sText);
                oViewModel.setProperty("/isTraceLogsVisible", false);
                oViewModel.setProperty("/isUsersVisible", false);
                oViewModel.setProperty("/isTasksVisible", true);

                var oTasksTable = oView.byId("adminInboxTasksTable");
                if (oTasksTable)
                {
                    var oBinding = oTasksTable.getBinding("items");
                    if (oBinding)
                    {
                        var aContexts = oBinding.getCurrentContexts();
                        oViewModel.setProperty("/countTotal", aContexts ? aContexts.length : 0);
                    } else
                    {
                        oViewModel.setProperty("/countTotal", 0);
                    }
                }
            }
        },

        onNavBackToUsers: function () 
        {
            var oViewModel = this.getView().getModel('adminInboxViewModel');
            oViewModel.setProperty('/isTasksVisible', false);
            oViewModel.setProperty('/isUsersVisible', true);
            oViewModel.setProperty('/isTraceLogsVisible', false);
            oViewModel.setProperty('/currentLocation', '');
        },

        onNavBackToTasks: function ()
        {
            var oViewModel = this.getView().getModel('adminInboxViewModel');
            var sLastSelectedUser = oViewModel.getProperty("/lastSelectedUser");
            oViewModel.setProperty('/isTasksVisible', true);
            oViewModel.setProperty('/isTraceLogsVisible', false);
            oViewModel.setProperty('/currentLocation', sLastSelectedUser);
            oViewModel.setProperty('/links', [{ text: 'Users' }]);
        },

        onTaskStatusFilterSelect: function (oEvent)
        {
            var sKey = oEvent.getParameter('key');
            var oTable = this.byId('adminInboxTasksTable');

            if (!oTable) return;

            var oBinding = oTable.getBinding('items');
            var sUniqueName = this.getView().getModel('adminInboxViewModel').getProperty('/lastSelectedUser');

            var aFilters = [];

            if (sUniqueName)
            {
                aFilters.push(new Filter('SampleResponsibleUser', FilterOperator.EQ, sUniqueName));
            }

            if (sKey.startsWith("claimedByUser-")) 
            {
                var sClaimedBy = sKey.replace("claimedByUser-", "");
                aFilters.push(new Filter('ClaimedByUser', FilterOperator.EQ, sClaimedBy));
            }
            else if (sKey !== 'all' && sKey !== 'claimedBy')
            {
                aFilters.push(new Filter('TechnicalStatus', FilterOperator.EQ, sKey));
            }

            oBinding.filter(aFilters, 'Application');
        },

        onTaskPress: function (oEvent)
        {
            var oView = this.getView();
            var oCtx = oEvent.getParameter("listItem")?.getBindingContext("adminInbox");

            if (!oCtx) return;

            var sWorkItemId = oCtx.getProperty("WorkItemID");
            var oViewModel = oView.getModel("adminInboxViewModel");

            var sCurrentLocation = oViewModel.getProperty("/currentLocation");

            oViewModel.setProperty("/currentLocation", sWorkItemId);
            var aLinks = oViewModel.getProperty("/links")

            aLinks.push({
                text: sCurrentLocation
            });

            var oData = oCtx.getObject();
            var aTraceLogs = [];
            if (oData && oData._TraceLogs)
            {
                aTraceLogs = oData._TraceLogs.results ? oData._TraceLogs.results : oData._TraceLogs;
            }

            var aLanes = [];
            var aNodes = [];

            // Build ProcessFlow Lanes and Nodes
            aTraceLogs.forEach(function (oLog, iIndex)
            {
                var sLaneId = "lane" + iIndex;
                aLanes.push({
                    id: sLaneId,
                    icon: this.formatter.formatTraceLogIcon(oLog.StepStatus),
                    label: oLog.StatusText || oLog.StepDescription,
                    position: iIndex
                });

                var aChildren = [];
                if (iIndex < aTraceLogs.length - 1)
                {
                    aChildren.push("node" + (iIndex + 1));
                }

                var sDateTime = oLog.LogDate ? (oLog.LogDate + (oLog.LogTime ? " " + oLog.LogTime : "")) : "";

                aNodes.push({
                    id: "node" + iIndex,
                    lane: sLaneId,
                    title: oLog.StepDescription,
                    titleAbbreviation: oLog.StepDescription ? oLog.StepDescription.substring(0, 2) : "",
                    children: aChildren,
                    state: this.formatter.formatTraceLogState(oLog.StepStatus),
                    stateText: oLog.StepStatus,
                    focused: iIndex === aTraceLogs.length - 1,
                    texts: [
                        oLog.ActualAgent,
                        sDateTime
                    ]
                });
            }.bind(this));

            oViewModel.setProperty("/traceLogsLanes", aLanes);
            oViewModel.setProperty("/traceLogsNodes", aNodes);

            oViewModel.setProperty("/links", aLinks);
            oViewModel.setProperty("/isTasksVisible", false);
            oViewModel.setProperty("/isTraceLogsVisible", true);
        },

        onSearchUsers: function (oEvent)
        {
            var sQuery = oEvent?.getParameter("query");

            var oView = this.getView();
            var oAdminInboxModel = oView.getModel("adminInboxViewModel");

            const oODataModel = oView.getModel();

            oAdminInboxModel.setProperty("/isUsersBusy", true);

            var oListBinding = oODataModel.bindList("/ActiveUsers");

            oListBinding.requestContexts(0, 1000).then(function (aContexts)
            {
                var aUsers = aContexts.map(function (oContext)
                {
                    return oContext.getObject();
                });

                if (sQuery)
                {
                    // Simple local filtering if there's a search query
                    aUsers = aUsers.filter(function (user)
                    {
                        var { UserID, PersonFullName } = user;
                        return (UserID && UserID.toLowerCase().includes(sQuery.toLowerCase())) ||
                            (PersonFullName && PersonFullName.toLowerCase().includes(sQuery.toLowerCase()));
                    });
                }

                oAdminInboxModel.setProperty("/users", aUsers);
                oAdminInboxModel.setProperty("/countTotal", aUsers.length);
                oAdminInboxModel.setProperty("/isUsersBusy", false);
            }).catch(function (oError)
            {
                var sErrorMsg = oError.message || "Unknown error";
                MessageBox.error("Error fetching user data: " + sErrorMsg);
                oAdminInboxModel.setProperty("/isUsersBusy", false);
            });
        },

        onNavBackToDashboard: function ()
        {
            this._resetSearchAndFilters();
            this.getView().getModel("adminInboxViewModel").setData({
                currentLocation: "",
                links: [
                    { text: "Users" }
                ],
                countTotal: 0,
                countTotalTableHeader: 0,
                tasks: [],
                users: [],
                traceLogs: [],
                isTasksBusy: false,
                isUsersBusy: false,
                isTasksVisible: false,
                isUsersVisible: true,
                isTraceLogsVisible: false,
                isTraceLogsBusy: false,
                lastSelectedUser: "",
                isClaimedByUsersLoaded: false,
                countSelectedStatus: 0,
                countStartedStatus: 0,
                countWaitingStatus: 0
            });
            BaseController.prototype.onNavBackToDashboard.apply(this, arguments);
        },

        _resetSearchAndFilters: function ()
        {
            // Reset Tasks Search Field & Filters
            var oTasksTable = this.byId("adminInboxTasksTable");
            if (oTasksTable)
            {
                var oTasksHeader = oTasksTable.getHeaderToolbar();
                if (oTasksHeader)
                {
                    var aTasksContent = oTasksHeader.getContent();
                    aTasksContent.forEach(function (oControl)
                    {
                        if (oControl.isA && oControl.isA("sap.m.SearchField"))
                        {
                            oControl.setValue("");
                        }
                    });
                }

                var oBinding = oTasksTable.getBinding("items");
                if (oBinding)
                {
                    var sUniqueName = this.getView().getModel("adminInboxViewModel").getProperty("/lastSelectedUser");
                    var aTasksFilters = [];
                    if (sUniqueName)
                    {
                        aTasksFilters.push(new Filter("SampleResponsibleUser", FilterOperator.EQ, sUniqueName));
                    }
                    oBinding.filter(aTasksFilters);
                }
            }

            // Reset Tasks IconTabBar
            var oTaskTabBar = this.byId("adminInboxTasksIconTabBar");
            if (oTaskTabBar)
            {
                oTaskTabBar.setSelectedKey("all");
            }

            // Reset Users Search Field & Filters
            var oUsersTable = this.byId("adminInboxUsersTable");
            var bShouldSearchUsersAgain = false;
            if (oUsersTable)
            {
                var oUsersHeader = oUsersTable.getHeaderToolbar();
                if (oUsersHeader)
                {
                    var aUsersContent = oUsersHeader.getContent();
                    aUsersContent.forEach(function (oControl)
                    {
                        if (oControl.isA && oControl.isA("sap.m.SearchField"))
                        {
                            if (oControl.getValue())
                            {
                                oControl.setValue("");
                                bShouldSearchUsersAgain = true;
                            }
                        }
                    });
                }

                var oUsersBinding = oUsersTable.getBinding("items");
                if (oUsersBinding)
                {
                    oUsersBinding.filter([]);
                }
            }

            if (bShouldSearchUsersAgain)
            {
                this.onSearchUsers();
            }
        },

        onSortUsers: function (oEvent)
        {
            if (!this._oSortUsersDialog)
            {
                this._oSortUsersDialog = new ViewSettingsDialog({
                    sortItems: [
                        new ViewSettingsItem({ text: "Unique Name", key: "UniqueName" }),
                        new ViewSettingsItem({ text: "Display Name", key: "DisplayName" }),
                        new ViewSettingsItem({ text: "Company", key: "Company" }),
                        new ViewSettingsItem({ text: "Department", key: "Department" }),
                        new ViewSettingsItem({ text: "Email", key: "Email" })
                    ],
                    confirm: function (oEvent)
                    {
                        var oParams = oEvent.getParameters();
                        var oBinding = this.byId("adminInboxUsersTable").getBinding("items");
                        var aSorters = [];

                        if (oParams.sortItem)
                        {
                            var sPath = oParams.sortItem.getKey();
                            var bDescending = oParams.sortDescending;
                            aSorters.push(new Sorter(sPath, bDescending));
                        }

                        oBinding.sort(aSorters);
                    }.bind(this)
                });
            }

            this._oSortUsersDialog.open();
        },

        onFilterUsers: function (oEvent)
        {
            // Simple placeholder configuration, update per real requirements
            if (!this._oFilterUsersDialog)
            {
                this._oFilterUsersDialog = new ViewSettingsDialog({
                    confirm: function (oEvent)
                    {
                        var oParams = oEvent.getParameters();
                        var oBinding = this.byId("adminInboxUsersTable").getBinding("items");
                        var aFilters = [];

                        oParams.filterItems.forEach(function (oItem)
                        {
                            var aSplit = oItem.getKey().split("___");
                            var sPath = aSplit[0];
                            var sValue = aSplit[1];
                            aFilters.push(new Filter(sPath, FilterOperator.EQ, sValue));
                        });

                        oBinding.filter(aFilters);
                    }.bind(this)
                });
            }

            this._oFilterUsersDialog.open();
        },

        onSearchTasks: function (oEvent)
        {
            var oView = this.getView(),
                sQuery = oEvent.getParameter("query"),
                oTable = this.byId("adminInboxTasksTable"),
                oBinding = oTable.getBinding("items"),
                sUniqueName = oView.getModel("adminInboxViewModel").getProperty("/lastSelectedUser"),
                aFilters = [];

            if (sUniqueName)
            {
                aFilters.push(new Filter("SampleResponsibleUser", FilterOperator.EQ, sUniqueName));
            }

            if (sQuery)
            {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("WorkItemText", FilterOperator.Contains, sQuery),
                        new Filter("WorkItemID", FilterOperator.Contains, sQuery),
                        new Filter("TechnicalStatus", FilterOperator.Contains, sQuery),
                        new Filter("Priority", FilterOperator.Contains, sQuery)
                    ],
                    and: false
                }));
            }

            oBinding.filter(aFilters);
        },

        onSortTasks: function (oEvent)
        {
            if (!this._oSortTasksDialog)
            {
                this._oSortTasksDialog = new ViewSettingsDialog({
                    sortItems: [
                        new ViewSettingsItem({ text: "Creation Date", key: "CreationDate" }),
                        new ViewSettingsItem({ text: "Priority", key: "Priority" }),
                        new ViewSettingsItem({ text: "Status", key: "TechnicalStatus" }),
                        new ViewSettingsItem({ text: "Task Name", key: "WorkItemText" })
                    ],
                    confirm: function (oEvent)
                    {
                        var oParams = oEvent.getParameters();
                        var oBinding = this.byId("adminInboxTasksTable").getBinding("items");
                        var aSorters = [];

                        if (oParams.sortItem)
                        {
                            var sPath = oParams.sortItem.getKey();
                            var bDescending = oParams.sortDescending;
                            aSorters.push(new Sorter(sPath, bDescending));
                        }

                        oBinding.sort(aSorters);
                    }.bind(this)
                });
            }

            this._oSortTasksDialog.open();
        },

        onFilterTasks: function (oEvent)
        {
            if (!this._oFilterTasksDialog)
            {
                this._oFilterTasksDialog = new ViewSettingsDialog({
                    filterItems: [
                        new ViewSettingsItem({
                            text: "Priority",
                            key: "Priority",
                            items: [
                                new ViewSettingsItem({ text: "High", key: "Priority___1" }),
                                new ViewSettingsItem({ text: "Medium", key: "Priority___5" }),
                                new ViewSettingsItem({ text: "Low", key: "Priority___9" })
                            ]
                        }),
                        new ViewSettingsItem({
                            text: "Status",
                            key: "TechnicalStatus",
                            items: [
                                new ViewSettingsItem({ text: "Ready", key: "TechnicalStatus___READY" }),
                                new ViewSettingsItem({ text: "Started", key: "TechnicalStatus___STARTED" }),
                                new ViewSettingsItem({ text: "Completed", key: "TechnicalStatus___COMPLETED" }),
                                new ViewSettingsItem({ text: "Error", key: "TechnicalStatus___ERROR" })
                            ]
                        })
                    ],
                    confirm: function (oEvent)
                    {
                        var oParams = oEvent.getParameters();
                        var oBinding = this.byId("adminInboxTasksTable").getBinding("items");
                        var aFilters = [];

                        oParams.filterItems.forEach(function (oItem)
                        {
                            var aSplit = oItem.getKey().split("___");
                            var sPath = aSplit[0];
                            var sValue = aSplit[1];
                            aFilters.push(new Filter(sPath, FilterOperator.EQ, sValue));
                        });

                        // Preserve existing target filter from onUserPress (SampleResponsibleUser)
                        var oViewModel = this.getView().getModel("adminInboxViewModel");
                        var sUniqueName = oViewModel.getProperty("/lastSelectedUser");
                        if (sUniqueName)
                        {
                            aFilters.push(new Filter("SampleResponsibleUser", FilterOperator.EQ, sUniqueName));
                        }

                        oBinding.filter(aFilters);
                    }.bind(this)
                });
            }

            this._oFilterTasksDialog.open();
        }
    });
});