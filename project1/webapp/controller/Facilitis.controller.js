sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/type/Currency",
], function (BaseController, MessageBox, utils, JSONModel, Currency) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.Facilitis", {
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteFacilitis").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: async function () {
            const omodel = new sap.ui.model.json.JSONModel({
                // for Database connection
                url: "https://rest.kalpavrikshatechnologies.com/",
                headers: {
                    name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                    password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
                    "Content-Type": "application/json",
                },
                isRadioVisible: false,
            });
            this.getOwnerComponent().setModel(omodel, "LoginModel");
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle(); // Get i18n model

            var model = new sap.ui.model.json.JSONModel({
                BranchCode: "",
                Type: "",
                Price: "",
                FacilityName: ""
            });
            this.getView().setModel(model, "FacilitiesModel")

            const oTokenModel = new sap.ui.model.json.JSONModel({
                tokens: []
            });
            const oUploaderData = new sap.ui.model.json.JSONModel({
                attachments: []
            });

            this.getView().setModel(oTokenModel, "tokenModel");
            this.getView().setModel(oUploaderData, "UploaderData");
            await this._loadBranchCode()
            this.Onsearch()
            this.ajaxReadWithJQuery("Currency", "").then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                var model = new JSONModel(oFCIAerData);
                this.getView().setModel(model, "CurrencyModel");
            })
        },
        _loadBranchCode: async function () {
            sap.ui.core.BusyIndicator.show(0);
            try {
                const oView = this.getView();

                const oResponse = await this.ajaxReadWithJQuery("HM_Branch", {});

                const aBranches = Array.isArray(oResponse?.data)
                    ? oResponse.data
                    : (oResponse?.data ? [oResponse.data] : []);

                const oBranchModel = new sap.ui.model.json.JSONModel(aBranches);
                oView.setModel(oBranchModel, "BranchModel");

                console.log("oBranchModel:", oBranchModel.getData());
                console.log("Branch data loaded successfully");
            } catch (err) {
                console.error("Error while loading branch data:", err);
            }
        },
        FD_RoomDetails: function (oEvent) {
            this.byId("id_facilityTable").removeSelections();
            var oView = this.getView();

            if (!this.ARD_Dialog) {
                this.ARD_Dialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.Facilities", this);
                oView.addDependent(this.ARD_Dialog);
            }

            // Reset model data
            var oFacilitiesModel = oView.getModel("FacilitiesModel");
            if (oFacilitiesModel) {
                oFacilitiesModel.setData({
                    ID: "",
                    BranchCode: "",
                    FacilityName: "",
                    Type: "",
                    Price: "",
                    UnitText: "Per Day",
                });
            }

            // Clear tokens and upload data for new record
            oView.getModel("tokenModel").setData({
                tokens: []
            });
            oView.getModel("UploaderData").setData({
                attachments: [],
                isFileUploaded: false
            });

            // Reset input value states
            this._resetFacilityValueStates();
            this.ARD_Dialog.open();
        },
        FD_onCancelButtonPress: function () {
            var oView = this.getView();

            // Clear all data on close
            if (oView.getModel("FacilitiesModel")) {
                oView.getModel("FacilitiesModel").setData({
                    ID: "",
                    BranchCode: "",
                    FacilityName: "",
                    Type: "",
                    Price: "",
                    UnitText: "Per Day",
                });
            }

            // Clear file uploader and reset value states
            this._resetFacilityValueStates();
            var oTable = this.byId("id_facilityTable");
            oTable.removeSelections();
            this.ARD_Dialog.close();
        },
        FD_onsavebuttonpress: async function () {
            const oView = this.getView();
            const oFacilitiesModel = oView.getModel("FacilitiesModel");
            const oUploaderData = oView.getModel("UploaderData");
            const attachments = oUploaderData.getProperty("/attachments") || [];
            const Payload = oFacilitiesModel.getData();
            var aFacilitiesData = oView.getModel("Facilities").getData();

            //  Mandatory field validation
            var isMandatoryValid = (
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("idRoomType123")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("idFacilityName")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("idFacilityName1")), "ID") &&
                utils._LCvalidateAmount(sap.ui.getCore().byId(oView.createId("FO_id_Price")), "ID") &&
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("FL_id_Currency")), "ID") &&
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("FO_id_Rate")), "ID")
            );

            if (!isMandatoryValid) {
                sap.m.MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }

            // File validation
            var Attachment = oView.getModel("tokenModel").getData();
            if (!Attachment.tokens || Attachment.tokens.length === 0) {
                return sap.m.MessageBox.error(this.i18nModel.getText("uploadFile"));
            }

            //  Duplicate check
            var bDuplicate = aFacilitiesData.some(function (facility) {
                if (Payload.ID && facility.ID === Payload.ID) return false; // Skip comparing the same record during update
                return (
                    facility.BranchCode === Payload.BranchCode &&
                    facility.FacilityName.trim().toLowerCase() === Payload.FacilityName.trim().toLowerCase() &&
                    facility.UnitText === Payload.UnitText
                );
            });

            if (bDuplicate) {
                sap.m.MessageToast.show("Facility with the same rate type already exists for this branch.");
                return;
            }

            if (attachments.length === 0) {
                sap.m.MessageBox.error("Please upload at least one image.");
                return;
            }
            if (attachments.length > 3) {
                sap.m.MessageBox.error("You can upload a maximum of 3 images only.");
                return;
            }

            const oData = {
                data: {
                    BranchCode: Payload.BranchCode,
                    FacilityName: Payload.FacilityName,
                    Type: Payload.Type,
                    Price: Payload.Price,
                    Currency: Payload.Currency,
                    UnitText: Payload.UnitText
                },
                Attachment: {}
            };

            oData.Attachment.FacilityName = Payload.FacilityName;
            oData.Attachment.BranchCode = Payload.BranchCode;

            attachments.slice(0, 3).forEach((file, index) => {
                const num = index + 1;
                oData.Attachment[`Photo${num}`] = file.content || "";
                oData.Attachment[`Photo${num}Name`] = file.filename || "";
                oData.Attachment[`Photo${num}Type`] = file.fileType || "";
            });

            for (let i = attachments.length + 1; i <= 3; i++) {
                oData.Attachment[`Photo${i}`] = "";
                oData.Attachment[`Photo${i}Name`] = "";
                oData.Attachment[`Photo${i}Type`] = "";
            }

            sap.ui.core.BusyIndicator.show(0);
            try {
                await this.ajaxCreateWithJQuery("HM_ExtraFacilities", {
                    data: oData
                });
                sap.m.MessageToast.show("Facility added successfully!");
                oView.getModel("UploaderData").setData({
                    attachments: []
                });
                oView.getModel("tokenModel").setData({
                    tokens: []
                });
                await this.Onsearch();
                this.ARD_Dialog.close();
            } catch (err) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },
        _resetFacilityValueStates: function () {
            var oView = this.getView();
            var aFields = ["idRoomType123", "idFacilityName", "idFacilityName1",
                "FO_id_Price", "FL_id_Currency", "FO_id_Rate"];
            aFields.forEach(function (sId) {
                var oField = sap.ui.getCore().byId(oView.createId(sId));
                if (oField && oField.setValueState) {
                    oField.setValueState("None");
                }
            });
        },
        onFacilitybranchChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCstrictValidationComboBox(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },
        onFacilityNameChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },
        onFacilityTypeChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },
        onFacilityRateChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCstrictValidationComboBox(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },
        onFacilityPriceChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateAmount(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },
        onFileSizeExceeds: function () {
            sap.m.MessageToast.show(this.i18nModel.getText("fileSizeExceeds"));
        },

        onTokenDelete: function (oEvent) {
            const oView = this.getView();
            const oTokenModel = oView.getModel("tokenModel");
            const oUploaderData = oView.getModel("UploaderData");

            let aTokens = oTokenModel.getProperty("/tokens") || [];
            let aAttachments = oUploaderData.getProperty("/attachments") || [];

            const oListItem = oEvent.getParameter("listItem");
            if (oListItem) {
                const oCtx = oListItem.getBindingContext("UploaderData");
                const sFileName = oCtx.getProperty("filename");

                aAttachments = aAttachments.filter(file => file.filename !== sFileName);
                aTokens = aTokens.filter(token => token.key !== sFileName);
            }
            const aDeletedTokens = oEvent.getParameter("tokens");
            if (aDeletedTokens) {
                aDeletedTokens.forEach((oDeletedToken) => {
                    const sKey = oDeletedToken.getKey();
                    aTokens = aTokens.filter(token => token.key !== sKey);
                    aAttachments = aAttachments.filter(file => file.filename !== sKey);
                });
            }
            oTokenModel.setProperty("/tokens", aTokens);
            oUploaderData.setProperty("/attachments", aAttachments);
        },

        onFacilityFileChange: function (oEvent) {
            const oFiles = oEvent.getParameter("files");
            if (!oFiles || oFiles.length === 0) return;

            const oView = this.getView();
            const oUploaderData = oView.getModel("UploaderData");
            const oTokenModel = oView.getModel("tokenModel");

            let aAttachments = oUploaderData.getProperty("/attachments") || [];
            let aTokens = oTokenModel.getProperty("/tokens") || [];

            //  Block if already 3 files uploaded
            if (aAttachments.length >= 3) {
                sap.m.MessageToast.show("You can upload a maximum of 3 images only.");
                return;
            }

            // Only allow remaining slots
            const iAvailableSlots = 3 - aAttachments.length;
            const aSelectedFiles = Array.from(oFiles).slice(0, iAvailableSlots);

            aSelectedFiles.forEach((oFile) => {
                // Validate file type
                if (!oFile.type.match(/^image\/(jpeg|jpg|png)$/)) {
                    sap.m.MessageToast.show("Only image files (jpg, jpeg, png) are allowed.");
                    return;
                }

                const oReader = new FileReader();
                oReader.onload = (e) => {
                    const sBase64 = e.target.result.split(",")[1];

                    aAttachments.push({
                        content: sBase64,
                        fileType: oFile.type,
                        filename: oFile.name,
                        size: this._formatFileSize(oFile.size)
                    });

                    aTokens.push({
                        key: oFile.name,
                        text: oFile.name
                    });

                    oUploaderData.setProperty("/attachments", aAttachments);
                    oTokenModel.setProperty("/tokens", aTokens);
                };

                oReader.readAsDataURL(oFile);
            });
        },

        _formatFileSize: function (bytes) {
            if (!bytes) return "0 Bytes";
            const sizes = ["Bytes", "KB", "MB", "GB"];
            let i = Math.floor(Math.log(bytes) / Math.log(1024));
            return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
        },

        Onsearch: function () {
            sap.ui.core.BusyIndicator.show(0);
            this.ajaxReadWithJQuery("HM_ExtraFacilities", "").then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                var model = new sap.ui.model.json.JSONModel(oFCIAerData);
                this.getView().setModel(model, "Facilities")
                var model = new sap.ui.model.json.JSONModel(oFCIAerData);
                this.getView().setModel(model, "Testing")
                this._populateUniqueFilterValues(oFCIAerData);
                sap.ui.core.BusyIndicator.hide();
            })
        },

        _populateUniqueFilterValues: function (data) {
            let uniqueValues = {
                FN_id_FacilityName: new Set(),
                FN_id_BranchCode: new Set()
            };

            data.forEach(item => {
                uniqueValues.FN_id_FacilityName.add(item.FacilityName);
                uniqueValues.FN_id_BranchCode.add(item.BranchCode);
            });

            let oView = this.getView();
            ["FN_id_FacilityName", "FN_id_BranchCode"].forEach(field => {
                let oComboBox = oView.byId(field);
                oComboBox.destroyItems();
                Array.from(uniqueValues[field]).sort().forEach(value => {
                    oComboBox.addItem(new sap.ui.core.Item({
                        key: value,
                        text: value
                    }));
                });
            });
        },
        FC_onSearch: function () {
            var oView = this.getView();
            var oFilterBar = oView.byId("FO_id_FilterbarEmployee");

            var oTable = oView.byId("id_facilityTable");
            var oBinding = oTable.getBinding("items");

            var sCustomerName = oView.byId("FN_id_FacilityName").getSelectedKey() || oView.byId("FN_id_FacilityName").getValue();
            var sCustomerID = oView.byId("FN_id_BranchCode").getSelectedKey() || oView.byId("FN_id_BranchCode").getValue();

            var aFilters = [];
            if (sCustomerName) {
                aFilters.push(new sap.ui.model.Filter("FacilityName", sap.ui.model.FilterOperator.Contains, sCustomerName));
            }
            if (sCustomerID) {
                aFilters.push(new sap.ui.model.Filter("BranchCode", sap.ui.model.FilterOperator.Contains, sCustomerID));
            }
            var oCombinedFilter = new sap.ui.model.Filter({
                filters: aFilters,
                and: true
            });
            oBinding.filter(oCombinedFilter);
        },
        FC_onPressClear: function () {
            this.getView().byId("FN_id_FacilityName").setSelectedKey("")
            this.getView().byId("FN_id_BranchCode").setSelectedKey("")
        },
        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
        },
        onHome: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },
        FD_onFacilityRowPress: function (oEvent) {
            var ofacilityID = oEvent.getSource().getBindingContext("Facilities").getObject().ID;
            var onav = this.getOwnerComponent().getRouter()
            onav.navTo("RouteFacilitiesDetails", {
                sPath: ofacilityID
            });
        },

        HM_DeleteDetails: async function () {
            var oTable = this.byId("id_facilityTable");
            var aSelectedItems = oTable.getSelectedItems();

            if (aSelectedItems.length === 0) {
                sap.m.MessageToast.show("Please select at least one record to delete.");
                return;
            }

            var that = this;

            // Build facility names for confirmation message
            var sNames = aSelectedItems.map(item => {
                var oData = item.getBindingContext("Facilities").getObject();
                return oData.FacilityName;
            }).join(", ");

            sap.m.MessageBox.confirm(
                `Are you sure you want to delete the selected facilities: ${sNames}?`, {
                icon: sap.m.MessageBox.Icon.WARNING,
                title: "Confirm Deletion",
                actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                emphasizedAction: sap.m.MessageBox.Action.NO,
                onClose: async function (sAction) {
                    if (sAction === sap.m.MessageBox.Action.YES) {
                        try {
                            sap.ui.core.BusyIndicator.show(0);

                            // Collect all delete promises
                            const aDeletePromises = aSelectedItems.map(async (item) => {
                                var oData = item.getBindingContext("Facilities").getObject();
                                await that.ajaxDeleteWithJQuery("HM_ExtraFacilities", {
                                    filters: { ID: oData.ID }
                                });
                            });

                            // Wait for all deletions to complete
                            await Promise.all(aDeletePromises);

                            sap.m.MessageToast.show("Selected facilities deleted successfully!");
                            await that.Onsearch(); // refresh table
                        } catch (err) {
                            console.error("Delete failed:", err);
                            sap.m.MessageBox.error("Error while deleting facilities. Please try again.");
                        } finally {
                            sap.ui.core.BusyIndicator.hide();
                            oTable.removeSelections(true);
                        }
                    } else {
                        oTable.removeSelections(true);
                    }
                }
            }
            );
        }
    });
});