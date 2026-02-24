sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/core/Fragment"
], function (JSONModel, ODataV2Model, Fragment)
{
    "use strict";

    /**
     * @typedef {Object} OConfig
     * @property {string} serviceUrl
     * @property {string} entitySet
     * @property {string} key
     * @property {string[]} [expands]
     */

    return {
        // Cache for loaded fragments to avoid redundant loading
        _oFragmentCache: {},

        /**
         * Calls the OData service to bind the detail view based on the provided parameters.
         * @param oView
         * @param {OConfig} oConfig - { serviceUrl, entitySet, key, expands: [] }
         */
        callODataService: function (oView, oConfig)
        {
            console.log(oConfig);

            // Get existing model
            var oCurrentModel = oView.getModel("businessModel");

            if (!oCurrentModel || oCurrentModel.sServiceUrl !== oConfig.serviceUrl)
            {
                // Create new OData V2 Model
                var oNewModel = new ODataV2Model(oConfig.serviceUrl, {
                    json: true,
                    useBatch: false, // Turn off batch
                    defaultBindingMode: "OneWay",
                });

                oView.setModel(oNewModel, "businessModel");
            }

            switch (oConfig.entitySet)
            {
                case "C_PurchaseOrderFs":
                case "C_RequestForQuotationEnhWD":
                    this._callPurchaseOrderOrRFQService(oView, oConfig);
                    break;
                case "C_PurRequisitionItemFs":
                    this._callPurchaseRequisitionService(oView, oConfig);
                    break;
                default:
                    break;
            }
        },

        /**
         * Call Purchase Order service and bind the view
         * @param oView 
         * @param {OConfig} oConfig 
         */
        _callPurchaseOrderOrRFQService: function (oView, oConfig)
        {
            var that = this;

            var oViewModel = oView.getModel("detailView");
            var oBusinessContainer = oView.byId("DetailObjectPageLayout");

            // Create binding path
            var sPath =
                oConfig.entitySet === "C_PurchaseOrderFs" ?
                    `/${oConfig.entitySet}('${oConfig.key}')` :
                    `/${oConfig.entitySet}(RequestForQuotation='${oConfig.key}',DraftUUID=guid'00000000-0000-0000-0000-000000000000',IsActiveEntity=true)`;
            ;
            var sExpandStr = oConfig.expands ? oConfig.expands.join(",") : "";

            // 4. Bind Element
            oBusinessContainer.bindElement({
                path: sPath,
                model: "businessModel",
                parameters: sExpandStr ?
                    {
                        expand: sExpandStr
                    }
                    :
                    {},
                events: {
                    dataReceived: function ()
                    {
                        console.log("Business Object Loaded: " + sPath);
                        oViewModel.setProperty("/bodyBusy", false);
                        that._setHeaderTitleValues(oView, oConfig.entitySet);
                    },
                    dataRequested: function ()
                    {
                        oViewModel.setProperty("/bodyBusy", true);
                        console.log("Requesting Business Object Data: " + sPath);
                    }
                }
            });
        },

        /**
         * Call Purchase Requisition service and bind the view (handles composite key)
         * @param oView 
         * @param {OConfig} oConfig 
         */
        _callPurchaseRequisitionService: function (oView, oConfig)
        {
            var that = this;

            var oViewModel = oView.getModel("detailView");
            var oBusinessContainer = oView.byId("DetailObjectPageLayout");

            var sPurchaseRequisitionNumber = oConfig.key.substring(0, oConfig.key.length - 5);
            var sPurchaseRequisitionItem = oConfig.key.substring(oConfig.key.length - 5);

            // Create binding path
            var sPath =
                `/${oConfig.entitySet}(PurchaseRequisition='${sPurchaseRequisitionNumber}',PurchaseRequisitionItem='${sPurchaseRequisitionItem}')`;

            // 4. Bind Element
            oBusinessContainer.bindElement({
                path: sPath,
                model: "businessModel",
                events: {
                    dataReceived: function ()
                    {
                        console.log("Business Object Loaded: " + sPath);
                        oViewModel.setProperty("/bodyBusy", false);
                        that._setHeaderTitleValues(oView, oConfig.entitySet);

                        // Separate call for account assignment
                        that._loadExpandParams(oView, sPath, oConfig.expands);
                    },
                    dataRequested: function ()
                    {
                        oViewModel.setProperty("/bodyBusy", true);

                        console.log("Requesting Business Object Data: " + sPath);
                    }
                }
            });
        },

        /**
         * Load expand parameters for a given parent path
         * @param oView 
         * @param {String} sParentPath 
         * @param {String[]} aExpandParams 
         * @returns
         */
        _loadExpandParams: function (oView, sParentPath, aExpandParams)
        {
            var oBusinessModel = oView.getModel("businessModel");
            var sNavPath = sParentPath + "/";

            if (!aExpandParams || aExpandParams.length === 0) return;

            // If there are multiple expand parameters, we need to handle them separately
            aExpandParams.forEach(function (sExpandParam)
            {
                if (!sExpandParam || sExpandParam === "") return;

                var sNavPathWithExpand = sNavPath + sExpandParam;

                oBusinessModel.read(sNavPathWithExpand, {
                    success: function (oData)
                    {
                        var oModel;
                        if (oData.results)
                        {
                            // Collection (feed) response
                            oModel = new JSONModel({
                                results: oData.results
                            });
                        } else
                        {
                            // Single entry response
                            oModel = new JSONModel(oData);
                        }
                        oView.setModel(oModel, sExpandParam);
                        console.log(sExpandParam + " loaded successfully");
                    }.bind(this),

                    error: function (oError)
                    {
                        console.error("Error loading " + sExpandParam + ":", oError);
                        oView.setModel(
                            new JSONModel({
                                results: []
                            }),
                            sExpandParam
                        );
                    }.bind(this)
                });
            }.bind(this));
        },

        loadFragmentsForEntitySet: function (oView, sEntitySet)
        {
            var oObjectPageLayout = oView.byId("DetailObjectPageLayout");

            // Clear existing dynamic header content and sections
            oObjectPageLayout.removeAllHeaderContent();
            oObjectPageLayout.removeAllSections();

            var sHeaderFragment, sBodyFragment;

            switch (sEntitySet)
            {
                case "C_PurchaseOrderFs":
                    sHeaderFragment = "z.wf.zwfmanagement.view.fragments.detail.PurOrderHeader";
                    sBodyFragment = "z.wf.zwfmanagement.view.fragments.detail.PurOrderBody";
                    break;
                case "C_PurRequisitionItemFs":
                    sHeaderFragment = "z.wf.zwfmanagement.view.fragments.detail.PurReqHeader";
                    sBodyFragment = "z.wf.zwfmanagement.view.fragments.detail.PurReqBody";
                    break;
                case "C_RequestForQuotationEnhWD":
                    sHeaderFragment = "z.wf.zwfmanagement.view.fragments.detail.RFQHeader";
                    sBodyFragment = "z.wf.zwfmanagement.view.fragments.detail.RFQBody";
                    break;
                default:
                    return;
            }

            this._getFragment(oView, sHeaderFragment).then(function (oHeader)
            {
                oObjectPageLayout.addHeaderContent(oHeader);
            });

            this._getFragment(oView, sBodyFragment).then(function (oBody)
            {
                if (Array.isArray(oBody))
                {
                    oBody.forEach(function (oSec) { oObjectPageLayout.addSection(oSec); });
                } else
                {
                    oObjectPageLayout.addSection(oBody);
                }
            });

            // Update header title bindings based on entity set
            this._updateHeaderTitleForEntitySet(oView, sEntitySet);
        },

        _getFragment: function (oView, sFragmentName)
        {
            // If fragment is already loaded, return it from cache
            if (this._oFragmentCache[sFragmentName])
            {
                return Promise.resolve(this._oFragmentCache[sFragmentName]);
            }

            this._fragmentCounter = (this._fragmentCounter || 0) + 1;
            var sFragmentId = oView.getId() + "--Fragment" + this._fragmentCounter;


            // If not loaded, load the fragment and store it in cache
            return Fragment.load({
                id: sFragmentId, // Unique ID for the fragment instance
                name: sFragmentName,
                controller: oView.getController()
            }).then(function (oContent)
            {
                // Store in cache
                this._oFragmentCache[sFragmentName] = oContent;
                if (Array.isArray(oContent))
                {
                    oContent.forEach(function (oItem) { oView.addDependent(oItem); });
                } else
                {
                    oView.addDependent(oContent);
                }
                return oContent;
            }.bind(this));
        },

        /**
         * Update header title and subtitle based on the entity set and bound context
         * @param oView 
         * @param {String} sEntitySet
         * @returns 
         */
        _updateHeaderTitleForEntitySet: function (oView, sEntitySet)
        {
            var oObjectPageLayout = oView.byId("DetailObjectPageLayout");
            var oContext = oObjectPageLayout.getBindingContext("businessModel");

            if (!oContext)
            {
                // If context is not yet available, listen for dataReceived
                var oBinding = oObjectPageLayout.getElementBinding("businessModel");
                if (oBinding)
                {
                    oBinding.attachEventOnce("dataReceived", function ()
                    {
                        this._setHeaderTitleValues(oView, sEntitySet);
                    }.bind(this));
                }
                return;
            }

            this._setHeaderTitleValues(oView, sEntitySet);
        },

        _setHeaderTitleValues: function (oView, sEntitySet)
        {
            var oViewModel = oView.getModel("detailView");
            var oObjectPageLayout = oView.byId("DetailObjectPageLayout");
            var oContext = oObjectPageLayout.getBindingContext("businessModel");

            if (!oContext) return;

            switch (sEntitySet)
            {
                case "C_PurchaseOrderFs":
                    oViewModel.setProperty("/headerSubtitle", oContext.getProperty("PurchaseOrderType_Text") || "");
                    oViewModel.setProperty("/snappedTitle", oContext.getProperty("PurchaseOrder") || "");
                    break;
                case "C_PurRequisitionItemFs":
                    oViewModel.setProperty("/headerSubtitle", oContext.getProperty("PurchaseRequisitionType_Text") || "");
                    oViewModel.setProperty("/snappedTitle", oContext.getProperty("FormattedPurRequisitionItem") || "");
                    break;
                case "C_RequestForQuotationEnhWD":
                    oViewModel.setProperty("/headerSubtitle", oContext.getProperty("RequestForQuotation_Text") || "");
                    oViewModel.setProperty("/snappedTitle", oContext.getProperty("RequestForQuotation") || "");
                    break;
                default:
                    oViewModel.setProperty("/headerSubtitle", "");
                    oViewModel.setProperty("/snappedTitle", "");
                    break;
            }
        },
    }
})