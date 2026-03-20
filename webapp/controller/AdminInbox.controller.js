sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], function (BaseController, JSONModel, MessageBox)
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
                    {
                        text: "Users"
                    }
                ],
                countTotal: 0,
                tasks: [],
                users: [],
                traceLogs: [],
                isTasksBusy: false,
                isUsersBusy: false,
                isTasksVisible: false,
                isUsersVisible: true,
                isTraceLogsVisible: false,
                isTraceLogsBusy: false,
                lastSelectedUser: ""
            });

            oView.setModel(oViewModel, "adminInboxViewModel");

            this._oRouter
                .getRoute("RouteAdminInbox")
                .attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function (oEvent)
        {
            var oView = this.getView();
            var oAdminInboxModel = oView.getModel("adminInboxViewModel");

            const oODataModel = oView.getModel("taskProcessing");
            const sEntityPath = "/SearchUsers";

            oAdminInboxModel.setProperty("/isUsersBusy", true);
            oODataModel.callFunction(sEntityPath, {
                method: "GET",
                urlParameters: {
                    "sap-client": "324",
                    "SAP__Origin": "LOCAL_TGW",
                    "SearchPattern": 'DEV-1*'
                },
                success: function (oData)
                {
                    oAdminInboxModel.setProperty("/users", oData.results || []);
                    oAdminInboxModel.setProperty("/countTotal", oData.results.length);
                    oAdminInboxModel.setProperty("/isUsersBusy", false);
                },
                error: function (oError)
                {
                    MessageBox.error("Error fetching user data: " + oError.message);
                    oAdminInboxModel.setProperty("/isUsersBusy", false);
                }
            });
        },

        onUserPress: function (oEvent)
        {
            var oView = this.getView();
            var oCtx = oEvent.getParameter("listItem")?.getBindingContext("adminInboxViewModel");

            if (!oCtx) return;

            var sUniqueName = oCtx.getProperty("UniqueName");
            var oViewModel = oView.getModel("adminInboxViewModel");
            oViewModel.setProperty("/currentLocation", sUniqueName);

            oViewModel.setProperty("/isUsersVisible", false);
            oViewModel.setProperty("/isTasksVisible", true);
            oViewModel.setProperty("/isTraceLogsVisible", false);

            var oTasksTable = oView.byId("adminInboxTasksTable");
            var oBinding = oTasksTable.getBinding("items");

            console.log(oBinding);

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
                    var aContexts = oData.getSource().getCurrentContexts();
                    oViewModel.setProperty("/isTasksBusy", false);
                    oViewModel.setProperty("/countTotal", aContexts ? aContexts.length : 0);
                });
                this._bTaskEventsAttached = true;
            }

            var sLastUser = oViewModel.getProperty("/lastSelectedUser");

            if (sLastUser === sUniqueName)
            {
                // If same user, changeParameters might skip fetching. Force refresh to trigger events.
                oViewModel.setProperty("/isTasksBusy", true);
                oBinding.refresh();
            } else
            {
                oViewModel.setProperty("/lastSelectedUser", sUniqueName);
                // apply expand and filter
                oBinding.changeParameters({
                    $expand: "_TraceLogs",
                    $filter: "SampleResponsibleUser eq '" + sUniqueName + "'"
                });
            }
        },

        onLinkPress: function (oEvent)
        {
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

        onTaskPress: function (oEvent)
        {
            var oView = this.getView();
            var oCtx = oEvent.getParameter("listItem")?.getBindingContext("adminInbox");

            console.log(oCtx);

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
                    icon: this._getIconForStatus(oLog.StepStatus),
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
                    state: this._getStateForStatus(oLog.StepStatus),
                    stateText: oLog.StatusText,
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

        _getStateForStatus: function (sStatus)
        {
            switch (sStatus)
            {
                case "COMPLETED":
                    return "Positive";
                case "READY":
                case "IN_PROGRESS":
                case "STARTED":
                case "SELECTED":
                case "WAITING":
                    return "Neutral";
                case "ERROR":
                    return "Negative";
                default:
                    return "Neutral";
            }
        },

        _getIconForStatus: function (sStatus)
        {
            switch (sStatus)
            {
                case "COMPLETED":
                    return "sap-icon://accept";
                case "READY":
                case "IN_PROGRESS":
                case "STARTED":
                case "SELECTED":
                case "WAITING":
                    return "sap-icon://in-progress";
                case "ERROR":
                    return "sap-icon://error";
                default:
                    return "sap-icon://sys-help";
            }
        }
    });

});