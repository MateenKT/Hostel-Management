sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "sap/ui/export/Spreadsheet",
    "sap/m/MessageToast",
    "../utils/validation"
], function (BaseController, MessageBox, Spreadsheet, MessageToast, utils) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.Branch", {
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteBranchData").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            // const omodel = new sap.ui.model.json.JSONModel({
            //     url: "https://rest.kalpavrikshatechnologies.com/",
            //     headers: {
            //         name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
            //         password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
            //         "Content-Type": "application/json",
            //     }
            // });
            // this.getOwnerComponent().setModel(omodel, "LoginModel");
            const oMDmodel = new sap.ui.model.json.JSONModel({
                BranchID: "",
                Name: "",
                Address: "",
                Pincode: "",
                Contact: "",
                stdCode: "",
                country: "",
                state: "",
                City: "",
            });
            this.getView().setModel(oMDmodel, "MDmodel");
            var oeditable = new sap.ui.model.json.JSONModel({
                isEdit: false
            });
            this.getView().setModel(oeditable, "editableModel");
            this.Onsearch();
        },

        Onsearch: function () {
            sap.ui.core.BusyIndicator.show(0);
            this.ajaxReadWithJQuery("HM_Branch", "").then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                var model = new sap.ui.model.json.JSONModel(oFCIAerData);
                this.getView().setModel(model, "mainModel")
                sap.ui.core.BusyIndicator.hide();
            })
        },

        MD_onPressClear: function () {
            this.getView().byId("MD_id_BranchCode").setSelectedKey("")
            this.getView().byId("MD_id_Pincode").setSelectedKey("")
        },

        MD_onSearch: function () {
            var oView = this.getView();
            var oTable = oView.byId("id_MD_Table");
            var oBinding = oTable.getBinding("items");

            var sCustomerName = oView.byId("MD_id_BranchCode").getSelectedKey() || oView.byId("MD_id_BranchCode").getValue();
            var sCustomerID = oView.byId("MD_id_Pincode").getSelectedKey() || oView.byId("MD_id_Pincode").getValue();

            var aFilters = [];
            if (sCustomerName) {
                aFilters.push(new sap.ui.model.Filter("BranchID", sap.ui.model.FilterOperator.Contains, sCustomerName));
            }

            if (sCustomerID) {
                aFilters.push(new sap.ui.model.Filter("Pincode", sap.ui.model.FilterOperator.Contains, sCustomerID));
            }

            var oCombinedFilter = new sap.ui.model.Filter({
                filters: aFilters,
                and: true
            });

            oBinding.filter(oCombinedFilter);
        },

        createTableSheet: function () {
            return [{
                label: "Branch Code",
                property: "BranchID",
                type: "string"
            },
            {
                label: "Branch Name",
                property: "Name",
                type: "string"
            },
            {
                label: "Address",
                property: "Address",
                type: "string"
            },
            {
                label: "Pincode",
                property: "Pincode",
                type: "string"
            },
            {
                label: "Contact Number",
                property: "Contact",
                type: "string"
            }
            ]
        },

        MD_onDownload: function () {
            const oModel = this.byId("id_MD_Table").getModel("mainModel").getData();
            if (!oModel || oModel.length === 0) {
                MessageToast.show("No data available to download.");
                return;
            }
            const adjustedData = oModel.map(item => ({
                ...item,
                Pincode: item.Pincode ? String(item.Pincode) : "",
                Contact: item.Contact ? String(item.Contact) : ""
            }));
            const aCols = this.createTableSheet();
            const oSettings = {
                workbook: {
                    columns: aCols,
                    hierarchyLevel: "Level"
                },
                dataSource: adjustedData,
                fileName: "Branch_Details.xlsx",
                worker: false
            };
            MessageToast.show("Downloading Branch Details");
            const oSheet = new sap.ui.export.Spreadsheet(oSettings);

            oSheet.build().then(() => {
                MessageToast.show("Download complete!");
            }).finally(() => {
                oSheet.destroy();
            });
        },

        MD_AddButtonPress: function () {
            this.byId("id_MD_Table").removeSelections();
            var oView = this.getView();
            oView.getModel("editableModel").setProperty("/isEdit", false);
            if (!this.oDialog) {
                this.oDialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.BranchData", this);
                oView.addDependent(this.oDialog);
            }
            const oBranch = sap.ui.getCore().byId(oView.createId("BD_idBranch"));
            const oName = sap.ui.getCore().byId(oView.createId("BD_idBName"));
            const oAddress = sap.ui.getCore().byId(oView.createId("BD_idAddress"));
            const oPin = sap.ui.getCore().byId(oView.createId("BD_idPin"));
            const oCountry = sap.ui.getCore().byId(oView.createId("MC_id_Country"));
            const oState = sap.ui.getCore().byId(oView.createId("MC_id_State"));
            const oCity = sap.ui.getCore().byId(oView.createId("MC_id_City"));
            const oPhone = sap.ui.getCore().byId(oView.createId("BD_idPhone"));

            oCountry.getBinding("items").filter([]);
            const stateBinding = oState.getBinding("items");
            if (stateBinding) stateBinding.filter([]);

            const cityBinding = oCity.getBinding("items");
            if (cityBinding) cityBinding.filter([]);
            oBranch.setSelectedKey("");
            oName.setSelectedKey("");
            oAddress.setSelectedKey("");
            oPin.setSelectedKey("");
            oCountry.setSelectedKey("");
            oState.setSelectedKey("");
            oCity.setSelectedKey("");
            oPhone.setValue("");
            oBranch.setValueState("None"); oBranch.setValueStateText("");
            oName.setValueState("None"); oName.setValueStateText("");
            oAddress.setValueState("None"); oAddress.setValueStateText("");
            oPin.setValueState("None"); oPin.setValueStateText("");
            oCountry.setValueState("None"); oCountry.setValueStateText("");
            oState.setValueState("None"); oState.setValueStateText("");
            oCity.setValueState("None"); oCity.setValueStateText("");
            oPhone.setValueState("None"); oPhone.setValueStateText("");
            oBranch.setValueStateText("Enter Branch Code");
            oName.setValueStateText("Enter Branch Name");
            oAddress.setValueStateText("Enter Address");
            oPin.setValueStateText("Enter Pincode");
            oCountry.setValueStateText("Select Country");
            oState.setValueStateText("Select State");
            oCity.setValueStateText("Select City");
            oPhone.setValueStateText("Enter Contact Number");
            this._resetFacilityValueStates();
            oView.getModel("MDmodel").setData({
                BranchID: "",
                Name: "",
                Address: "",
                Pincode: "",
                Contact: "",
                stdCode: "",
                country: "",
                state: "",
                baseLocation: ""
            });
            this.isEdit = false;
            this.oDialog.open();
        },

        MD_onSaveButtonPress: async function () {
            var oView = this.getView();
            var oFacilitiesModel = oView.getModel("MDmodel");
            var Payload = oFacilitiesModel.getData();
            var isMandatoryValid = (
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("BD_idBranch")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("BD_idBName")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("BD_idAddress")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("BD_idPin")), "ID") &&
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("MC_id_Country")), "ID") &&
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("MC_id_State")), "ID") &&
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("MC_id_City")), "ID"));

            if (!isMandatoryValid) {
                sap.m.MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }

            let phone = sap.ui.getCore().byId(oView.createId("BD_idPhone")).getValue();

            if (!phone || phone.length !== 10) {
                sap.ui.getCore().byId(oView.createId("BD_idPhone")).setValueState("Error");
                MessageToast.show("Enter a valid 10-digit Contact Number");
                return;
            }
            const aCountries = this.getOwnerComponent().getModel("CountryModel").getData();
            const aStates = this.getOwnerComponent().getModel("StateModel").getData();
            const aCities = this.getOwnerComponent().getModel("CityModel").getData();
            let validState = aStates.some(s =>
                s.stateName === Payload.state &&
                s.countryCode === aCountries.find(c => c.countryName === Payload.country)?.code
            );

            if (!validState) {
                MessageToast.show("Selected State does not belong to the chosen Country");
                sap.ui.getCore().byId(oView.createId("MC_id_State")).setValueState("Error");
                return;
            }
            let validCity = aCities.some(c =>
                c.cityName === Payload.baseLocation &&
                c.stateName === Payload.state &&
                c.countryCode === aCountries.find(c => c.countryName === Payload.country)?.code
            );

            if (!validCity) {
                MessageToast.show("Selected City does not belong to selected State & Country");
                sap.ui.getCore().byId(oView.createId("MC_id_City")).setValueState("Error");
                return;
            }

            var oData = {
                BranchID: Payload.BranchID,
                Name: Payload.Name,
                Address: Payload.Address,
                Pincode: Payload.Pincode,
                Contact: Payload.Contact,
                STD: Payload.stdCode,
                Country: Payload.country,
                State: Payload.state,
                City: Payload.baseLocation
            };
            sap.ui.core.BusyIndicator.show(0);
            try {
                const aMainData = oView.getModel("mainModel").getData() || [];
                if (!this.isEdit) {
                    const isDuplicate = aMainData.some(item =>
                        item.BranchID === oData.BranchID && item.Pincode === oData.Pincode
                    );

                    if (isDuplicate) {
                        sap.ui.core.BusyIndicator.hide();
                        sap.m.MessageBox.error(
                            "A branch with the same Branch ID and Pincode already exists. Please use unique values."
                        );
                        return;
                    }
                }
                if (this.isEdit && Payload.BranchID) {
                    await this.ajaxUpdateWithJQuery("HM_Branch", {
                        data: oData,
                        filters: {
                            BranchID: oData.BranchID
                        }
                    });
                    sap.m.MessageToast.show("Branch updated successfully!");
                } else {
                    await this.ajaxCreateWithJQuery("HM_Branch", {
                        data: oData
                    });
                    sap.m.MessageToast.show("Branch added successfully!");
                }

                await this.Onsearch();
                this.oDialog.close();
            } catch (err) {
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
        },
        onHome: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },

        MD_onCancelButtonPress: function () {
            var oView = this.getView();

            if (oView.getModel("MDmodel")) {
                oView.getModel("MDmodel").setData({
                    BranchID: "",
                    Name: "",
                    Address: "",
                    Pincode: "",
                    Contact: "",
                });
            }

            this._resetFacilityValueStates();
            var oTable = this.byId("id_MD_Table");
            oTable.removeSelections();
            this.oDialog.close();
        },

        _resetFacilityValueStates: function () {
            var oView = this.getView();
            var aFields = [
                "idBranch",
                "idBName",
                "idAddress",
                "idPin",
                "idPhone"
            ];

            aFields.forEach(function (sId) {
                var oField = sap.ui.getCore().byId(oView.createId(sId));
                if (oField && oField.setValueState) {
                    oField.setValueState("None");
                }
            });
        },

        onPhoneInputLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var value = oInput.getValue();

            // Allow only numbers
            value = value.replace(/\D/g, "");
            oInput.setValue(value);

            // Block more than 10 digits
            if (value.length > 10) {
                oInput.setValue(value.substring(0, 10));
                return;
            }

            // If empty → no error
            if (value === "") {
                oInput.setValueState("None");
                return;
            }

            // If less than 10 digits → error
            if (value.length < 10) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Phone number must be exactly 10 digits");
                return;
            }

            // If exactly 10 digits → valid
            if (value.length === 10) {
                oInput.setValueState("None");
            }
        },

        onPinInputLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidatePinCode(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        onAddressInputLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        onNameInputLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateName(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        onBNameInputLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        MD_DeleteRow: function () {
            var oTable = this.byId("id_MD_Table");
            var aSelectedItems = oTable.getSelectedItems();

            if (aSelectedItems.length === 0) {
                sap.m.MessageToast.show("Please select at least one record to delete.");
                return;
            }

            sap.m.MessageBox.confirm(
                `Are you sure you want to delete ${aSelectedItems.length} selected record(s)?`,
                {
                    icon: sap.m.MessageBox.Icon.WARNING,
                    title: "Confirm Deletion",
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                    emphasizedAction: sap.m.MessageBox.Action.NO,

                    onClose: async (sAction) => {
                        if (sAction === sap.m.MessageBox.Action.YES) {

                            sap.ui.core.BusyIndicator.show(0);

                            try {
                                for (let oItem of aSelectedItems) {
                                    let oContext = oItem.getBindingContext("mainModel");
                                    let oData = oContext.getObject();

                                    await this.ajaxDeleteWithJQuery("HM_Branch", {
                                        filters: { BranchID: oData.BranchID }
                                    });
                                }

                                sap.m.MessageToast.show("Selected records deleted successfully!");
                                await this.Onsearch();

                            } catch (err) {
                                console.error("Delete failed:", err);
                                sap.m.MessageBox.error("Error while deleting records. Please try again.");
                            } finally {
                                sap.ui.core.BusyIndicator.hide();
                                oTable.removeSelections(true);
                            }
                        }
                    }
                }
            );
        },

        MD_UpdateTableRow: function () {
            var oView = this.getView();
            var oTable = this.byId("id_MD_Table");
            var oSelected = oTable.getSelectedItem();
            oView.getModel("editableModel").setProperty("/isEdit", true);
            if (!oSelected) {
                sap.m.MessageToast.show("Please select a record to edit.");
                return;
            }

            var oContext = oSelected.getBindingContext("mainModel");
            var oData = oContext.getObject();
            const aAllStates = this.getOwnerComponent().getModel("StateModel").getData();
            const aFilteredStates = aAllStates.filter(s => s.countryCode === oData.countryCode);
            this.getView().setModel(new sap.ui.model.json.JSONModel(aFilteredStates), "FilteredStateModel");

            const aAllCities = this.getOwnerComponent().getModel("CityModel").getData();
            const aFilteredCities = aAllCities.filter(c =>
                c.stateName === oData.state && c.countryCode === oData.countryCode
            );
            this.getView().setModel(new sap.ui.model.json.JSONModel(aFilteredCities), "FilteredCityModel");

            if (!this.oDialog) {
                this.oDialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.BranchData", this);
                oView.addDependent(this.oDialog);
            }
            var oMDmodel = oView.getModel("MDmodel");
            oMDmodel.setData({
                BranchID: oData.BranchID,
                Name: oData.Name,
                Address: oData.Address,
                Pincode: oData.Pincode,
                Contact: oData.Contact,
                stdCode: oData.STD,
                country: oData.Country,
                state: oData.State,
                baseLocation: oData.City
            });
            this.isEdit = true;
            this._resetFacilityValueStates();
            this._applyCountryStateCityFilters();
            this.oDialog.open();
        },

        _applyCountryStateCityFilters: function () {
                const oModel = this.getView().getModel("MDmodel");
                const oCountryCB = this.byId("MC_id_Country");
                const oStateCB = this.byId("MC_id_State");
                const oSourceCB = this.byId("MC_id_City");;

                const sCountry = oModel.getProperty("/country");     // e.g. "Australia"
                const sState = oModel.getProperty("/state");       // e.g. "Queensland"
                const sSource = oModel.getProperty("/baseLocation");      // e.g. "Bongaree"

                // Reset all filters
                oStateCB.getBinding("items")?.filter([]);
                oSourceCB.getBinding("items")?.filter([]);

                if (sCountry) {
                    // Find countryCode by name
                    const aCountryData = this.getView().getModel("CountryModel").getData();
                    const oCountryObj = aCountryData.find(c => c.countryName === sCountry);

                    if (oCountryObj) {
                        const sCountryCode = oCountryObj.code;

                        // Filter States by Country
                        oStateCB.getBinding("items")?.filter([
                            new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
                        ]);

                        if (sState) {
                            // Filter Cities by State + Country
                            const aFilters = [
                                new sap.ui.model.Filter("stateName", sap.ui.model.FilterOperator.EQ, sState),
                                new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
                            ];
                            oSourceCB.getBinding("items")?.filter(aFilters);
                        }
                    }
                }

                // Ensure values are set back in UI
                oCountryCB.setValue(sCountry || "");
                oStateCB.setValue(sState || "");
                oSourceCB.setValue(sSource || "");
            },

        MC_onChangeCountry: function (oEvent) {
            const oView = this.getView();
            const oModel = oView.getModel("MDmodel");
            const oItem = oEvent.getSource().getSelectedItem();
            oEvent.getSource().setValueState("None");
            const oStateCB = sap.ui.getCore().byId(oView.createId("MC_id_State"));
            const oCityCB = sap.ui.getCore().byId(oView.createId("MC_id_City"));
            const oStd = sap.ui.getCore().byId(oView.createId("MC_id_codeModel"));

            oModel.setProperty("/state", "");
            oModel.setProperty("/baseLocation", "");
            oStateCB?.getBinding("items")?.filter([]);
            oCityCB?.getBinding("items")?.filter([]);
            oStd?.setValue("");

            if (!oItem) return;

            const sCountryName = oItem.getText();
            const sCountryCode = oItem.getAdditionalText();
            oModel.setProperty("/country", sCountryName);

            const aCountryData = this.getOwnerComponent().getModel("CountryModel").getData();
            const oCountryObj = aCountryData.find(c => c.countryName === sCountryName);
            oModel.setProperty("/stdCode", oCountryObj?.stdCode || "");
            oStd?.setValue(oCountryObj?.stdCode || "");

            oStateCB.getBinding("items")?.filter([
                new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
            ]);
        },

        MC_onChangeState: function (oEvent) {
            const oView = this.getView();
            const oModel = oView.getModel("MDmodel");
            const oItem = oEvent.getSource().getSelectedItem();
            oEvent.getSource().setValueState("None");
            const oCityCB = sap.ui.getCore().byId(oView.createId("MC_id_City"));
            const oCountryCB = sap.ui.getCore().byId(oView.createId("MC_id_Country"));

            oModel.setProperty("/baseLocation", "");
            oCityCB?.getBinding("items")?.filter([]);

            if (!oItem) {
                oModel.setProperty("/state", "");
                return;
            }

            const sStateName = oItem.getKey();
            const sCountryCode = oCountryCB.getSelectedItem()?.getAdditionalText();

            oModel.setProperty("/state", sStateName);

            oCityCB.getBinding("items")?.filter([
                new sap.ui.model.Filter("stateName", sap.ui.model.FilterOperator.EQ, sStateName),
                new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
            ]);
        },

        MC_onChangeCity: function (oEvent) {
            const oView = this.getView();
            const oModel = oView.getModel("MDmodel");
            const oItem = oEvent.getSource().getSelectedItem();
            oEvent.getSource().setValueState("None");
            if (!oItem) {
                oModel.setProperty("/city", "");
                return;
            }
            const sCityName = oItem.getKey();
            oModel.setProperty("/baseLocation", sCityName);
        },
    })
});