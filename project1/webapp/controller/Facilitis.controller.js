sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "../utils/validation",
      "sap/ui/model/json/JSONModel",
	"sap/ui/model/odata/type/Currency",
], function(BaseController,
	MessageBox,
    utils,
    JSONModel,
	Currency) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.Facilitis", {
        onInit: function() {
            this.getOwnerComponent().getRouter().getRoute("RouteFacilitis").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function() {
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

            var oUploadModel = new sap.ui.model.json.JSONModel({
                File: "",
                FileName: "",
                FileType: ""
            });
            this.getView().setModel(oUploadModel, "UploadModel");

            var oTokenModel = new sap.ui.model.json.JSONModel({
                tokens: []
            });
            this.getView().setModel(oTokenModel, "tokenModel");

            this.Onsearch()
               this.ajaxReadWithJQuery("Currency", "").then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                var model = new JSONModel(oFCIAerData);
                this.getView().setModel(model, "CurrencyModel");
            })
        },
        FD_RoomDetails: function(oEvent) {
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
                    File: "",
                    FileType: "",
                    FileName: "",
                    FicilityImage: ""
                });
            }

            // Clear tokens and upload data for new record
            oView.getModel("tokenModel").setData({
                tokens: []
            });
            oView.getModel("UploadModel").setData({
                File: "",
                FileName: "",
                FileType: ""
            });

            // Reset input value states
            this._resetFacilityValueStates();

            this.ARD_Dialog.open();
        },

        FD_EditDetails: function() {
            var oView = this.getView();
            var oTable = this.byId("id_facilityTable");
            var oSelected = oTable.getSelectedItem();
            if (!oSelected) {
                sap.m.MessageToast.show("Please select a record to edit.");
                return;
            }

            var oContext = oSelected.getBindingContext("Facilities");
            var oData = oContext.getObject();

            if (!this.ARD_Dialog) {
                this.ARD_Dialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.Facilities", this);
                oView.addDependent(this.ARD_Dialog);
            }

            // Bind data to Facilities model
            oView.getModel("FacilitiesModel").setData(oData);

            // Prepopulate token if file exists
            var aTokens = [];
            if (oData.FileName && oData.FicilityImage) {
                aTokens.push({
                    key: oData.FileName,
                    text: oData.FileName
                });
            } else {
                // No file in existing record
                oView.getModel("UploadModel").setData({
                    File: "",
                    FileName: "",
                    FileType: ""
                });
            }

            // Update token model
            oView.getModel("tokenModel").setProperty("/tokens", aTokens);

            // Reset input value states
            this._resetFacilityValueStates();

            this.ARD_Dialog.open();
        },

        FD_onCancelButtonPress: function() {
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
                    File: "",
                    FileType: "",
                    FileName: ""
                });
            }

            // Clear file uploader and reset value states
            this._resetFacilityValueStates();
            var oTable = this.byId("id_facilityTable");
            oTable.removeSelections();
            this.ARD_Dialog.close();
        },
        FD_onsavebuttonpress: async function() {
            var oView = this.getView();
            var oFacilitiesModel = oView.getModel("FacilitiesModel");
            var Payload = oFacilitiesModel.getData();
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
            var bDuplicate = aFacilitiesData.some(function(facility) {
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

            // Prepare payload and handle file logic
            var that = this;
            var oUploadModel = oView.getModel("UploadModel").getData();

            // Handle file data
            if (oUploadModel && oUploadModel.File && oUploadModel.FileName) {
                Payload.FicilityImage = oUploadModel.File;
                Payload.FileName = oUploadModel.FileName;
                Payload.FileType = oUploadModel.FileType;
            } else if (Payload.ID) {
                // Use old file if editing
                var foundItem = this.getView().getModel("Testing").getData().find(item => item.ID === Payload.ID);
                if (foundItem) {
                    Payload.FicilityImage = foundItem.FicilityImage;
                    Payload.FileName = foundItem.FileName;
                    Payload.FileType = foundItem.FileType;
                }
            }

            // Final payload format for both Create and Update
            var oData = {
                BranchCode: Payload.BranchCode,
                FacilityName: Payload.FacilityName,
                Type: Payload.Type,
                Price: Payload.Price,
                Currency:Payload.Currency,
                UnitText: Payload.UnitText,
                FicilityImage: Payload.FicilityImage,
                FileName: Payload.FileName,
                FileType: Payload.FileType
            };
            sap.ui.core.BusyIndicator.show(0);
            try {
                if (Payload.ID) {
                    // Update record
                    await that.ajaxUpdateWithJQuery("HM_ExtraFacilities", {
                        data: oData,
                        filters: {
                            ID: Payload.ID
                        }
                    });
                    sap.m.MessageToast.show("Facility updated successfully!");
                } else {
                    //  Create record
                    await that.ajaxCreateWithJQuery("HM_ExtraFacilities", {
                        data: oData
                    });
                    sap.m.MessageToast.show("Facility added successfully!");
                }

                // Clear upload and token models
                oView.getModel("UploadModel")?.setData({
                    File: "",
                    FileName: "",
                    FileType: ""
                });
                oView.getModel("tokenModel")?.setData({
                    tokens: []
                });

                sap.ui.core.BusyIndicator.hide();
                await that.Onsearch();
                that.ARD_Dialog.close();
            } catch (err) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show(err.message || err.responseText);
            }
        },

        _resetFacilityValueStates: function() {
            var oView = this.getView();
            var aFields = [
                "idRoomType123",
                "idFacilityName",
                "idFacilityName1",
                "FO_id_Price",
                "FL_id_Currency",
                "FO_id_Rate"
            ];

            aFields.forEach(function(sId) {
                var oField = sap.ui.getCore().byId(oView.createId(sId));
                if (oField && oField.setValueState) {
                    oField.setValueState("None");
                }
            });
        },
        onFacilitybranchChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCstrictValidationComboBox(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },
        onFacilityNameChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },
        onFacilityTypeChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },
        onFacilityRateChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCstrictValidationComboBox(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },
        onFacilityPriceChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateAmount(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },
        onFileSizeExceeds: function() {
            sap.m.MessageToast.show(this.i18nModel.getText("fileSizeExceeds"));
        },
        onTokenDelete: function(oEvent) {
            // Get the model
            var oModel = this.getView().getModel("tokenModel");
            var aTokens = oModel.getProperty("/tokens") || [];

            // Get deleted tokens from event
            var aTokensToDelete = oEvent.getParameter("tokens");

            // Filter out deleted tokens
            aTokensToDelete.forEach(function(oDeletedToken) {
                var sKey = oDeletedToken.getKey();
                aTokens = aTokens.filter(function(token) {
                    return token.key !== sKey;
                });
            });

            // Update model
            oModel.setProperty("/tokens", aTokens);

            // Clear upload model if all tokens are deleted
            if (aTokens.length === 0) {
                var oUploadModel = this.getView().getModel("UploadModel");
                oUploadModel.setProperty("/File", "");
                oUploadModel.setProperty("/FileName", "");
                oUploadModel.setProperty("/FileType", "");
            }
        },
        onFacilityFileChange: function(oEvent) {
            const oFile = oEvent.getParameter("files")[0];
            if (!oFile) return;

            const oReader = new FileReader();
            oReader.onload = (e) => {
                const sBase64 = e.target.result.split(",")[1]; // remove prefix
                const oUploadModel = this.getView().getModel("UploadModel");
                oUploadModel.setData({
                    File: sBase64,
                    FileType: oFile.type,
                    FileName: oFile.name
                });

                // Update tokenModel
                const oTokenModel = this.getView().getModel("tokenModel");
                oTokenModel.setProperty("/tokens", [{
                    key: oFile.name,
                    text: oFile.name
                }]);
            };
            oReader.readAsDataURL(oFile);
        },
        Onsearch: function() {
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
        _populateUniqueFilterValues: function(data) {
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
        FC_onSearch: function() {
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
        FC_onPressClear: function() {
            this.getView().byId("FN_id_FacilityName").setSelectedKey("")
            this.getView().byId("FN_id_BranchCode").setSelectedKey("")
        },
        onNavBack: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
        },
        onHome: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },
        FC_viewroom: function(oEvent) {
            var oContext = oEvent.getSource().getBindingContext("Facilities");
            var oData = oContext.getObject();

            if (!oData.FicilityImage || !oData.FicilityImage.length) {
                sap.m.MessageBox.error("No document found for this room!");
                return;
            }

            var sBase64 = oData.FicilityImage;

            if (!sBase64) {
                sap.m.MessageBox.error("No document found for this room!");
                return;
            }

            sBase64 = sBase64.replace(/\s/g, "");

            try {
                if (!sBase64.startsWith("iVB") && !sBase64.startsWith("data:image")) {
                    var decoded = atob(sBase64);
                    if (decoded.startsWith("iVB")) {
                        sBase64 = decoded;
                    }
                }
            } catch (e) {
                console.error("Base64 decode failed:", e);
            }

            if (!sBase64.startsWith("data:image")) {
                sBase64 = "data:image/jpeg;base64," + sBase64;
            }

            var oImage = new sap.m.Image({
                src: sBase64,
                width: "100%",
                height: "auto"
            });

            var oDialog = new sap.m.Dialog({
                title: "View Document",
                contentWidth: "400px",
                contentHeight: "500px",
                verticalScrolling: true,
                content: [oImage],
                endButton: new sap.m.Button({
                    text: "Close",
                    press: function() {
                        oDialog.close();
                    }
                }),
                afterClose: function() {
                    oDialog.destroy();
                }
            });

            oDialog.open();
        },
        HM_DeleteDetails: async function() {
            var oTable = this.byId("id_facilityTable");
            var oSelectedItem = oTable.getSelectedItem();

            if (!oSelectedItem) {
                sap.m.MessageToast.show("Please select a record to delete.");
                return;
            }

            var oContext = oSelectedItem.getBindingContext("Facilities");
            var oData = oContext.getObject();
            var that = this;

            sap.m.MessageBox.confirm(
                `Are you sure you want to delete the facility ${oData.FacilityName}?`, {
                    icon: sap.m.MessageBox.Icon.WARNING,
                    title: "Confirm Deletion",
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                    emphasizedAction: sap.m.MessageBox.Action.NO,
                    onClose: async function(sAction) {
                        if (sAction === sap.m.MessageBox.Action.YES) {
                            try {
                                sap.ui.core.BusyIndicator.show(0);
                                await that.ajaxDeleteWithJQuery("HM_ExtraFacilities", {
                                    filters: {
                                        ID: oData.ID
                                    }
                                });
                                sap.m.MessageToast.show("Facility deleted successfully!");
                                await that.Onsearch(); // refresh table data
                            } catch (err) {
                                console.error("Delete failed:", err);
                                sap.m.MessageBox.error("Error while deleting Facility. Please try again.");
                            } finally {
                                sap.ui.core.BusyIndicator.hide();
                                oTable.removeSelections(true);
                            }
                        } else if (sAction === sap.m.MessageBox.Action.NO) {
                            oTable.removeSelections(true);
                        }
                    }
                }
            );
        },
        
    });
});