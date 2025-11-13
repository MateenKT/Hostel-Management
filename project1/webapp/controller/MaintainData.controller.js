sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "sap/ui/export/Spreadsheet",
    "sap/m/MessageToast",
    "../utils/validation"
], function (BaseController, MessageBox, Spreadsheet, MessageToast, utils) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.MaintainData", {
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteMaintainData").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
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
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

            const oMDmodel = new sap.ui.model.json.JSONModel({
                BranchID: "",
                Name: "",
                Address: "",
                Pincode: "",
                Contact: ""
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
            }]
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
                this.oDialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.MaintainData", this);
                oView.addDependent(this.oDialog);
            }
            const oModel = oView.getModel("MDmodel");
            if (oModel) {
                oModel.setData({
                    BranchID: "",
                    Name: "",
                    Address: "",
                    Pincode: "",
                    Contact: ""
                });
                this.isEdit = false;
                this.oDialog.open();
            }
        },

        MD_onSaveButtonPress: async function () {
            var oView = this.getView();
            var oFacilitiesModel = oView.getModel("MDmodel");
            var Payload = oFacilitiesModel.getData();
            // var aFacilitiesData = oView.getModel("mainModel").getData();
            //  Mandatory field validation
            var isMandatoryValid = (
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("idBranch")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("idBName")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("idAddress")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("idPin")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("idPhone")), "ID")

            );

            if (!isMandatoryValid) {
                sap.m.MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }

            // var bDuplicate = aFacilitiesData.some(function (facility) {
            //     if (Payload.ID && facility.ID === Payload.ID) return false; // Skip comparing the same record during update
            //     return (
            //         facility.BranchID === Payload.BranchID &&
            //         facility.Name.trim().toLowerCase() === Payload.Name.trim().toLowerCase()
            //     );
            // });

            // if (bDuplicate) {
            //     sap.m.MessageToast.show("Facility with the same rate type already exists for this branch.");
            //     return;
            // }
            // Final payload format for both Create and Update
            var oData = {
                BranchID: Payload.BranchID,
                Name: Payload.Name,
                Address: Payload.Address,
                Pincode: Payload.Pincode,
                Contact: Payload.Contact

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
                    // Update record using ID in URL
                    await this.ajaxUpdateWithJQuery("HM_Branch", {
                        data: oData,
                        filters: {
                            BranchID: oData.BranchID
                        }
                    });
                    sap.m.MessageToast.show("Facility updated successfully!");
                } else {
                    // Create record
                    await this.ajaxCreateWithJQuery("HM_Branch", {
                        data: oData
                    });
                    sap.m.MessageToast.show("Facility added successfully!");
                }

                await this.Onsearch();
                this.oDialog.close();
            } catch (err) {
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
            // if (this.isEdit && !Payload.ID) {
            //     var oSelected = this.byId("id_MD_Table").getSelectedItem();
            //     if (oSelected) {
            //         var oContext = oSelected.getBindingContext("mainModel");
            //         var oData = oContext.getObject();
            //         Payload.ID = oData.ID; // ensure ID is set
            //     }
            // }
            // sap.ui.core.BusyIndicator.show(0);
            // try {
            //     if (Payload.ID) {
            //         // Update record
            //         await this.ajaxUpdateWithJQuery("HM_Branch", {
            //             data: oData,
            //             filters: {
            //                 ID: Payload.ID
            //             }
            //         });
            //         sap.m.MessageToast.show("Facility updated successfully!");
            //     } else {
            //         //  Create record
            //         await this.ajaxCreateWithJQuery("HM_Branch", {
            //             data: oData
            //         });
            //         sap.m.MessageToast.show("Facility added successfully!");
            //     }
            //     sap.ui.core.BusyIndicator.hide();
            //     await this.Onsearch();
            //     this.oDialog.close();
            // } catch (err) {
            //     sap.ui.core.BusyIndicator.hide();
            //     sap.m.MessageToast.show(err.message || err.responseText);
            // }
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

            // Clear all data on close
            if (oView.getModel("MDmodel")) {
                oView.getModel("MDmodel").setData({
                    BranchID: "",
                    Name: "",
                    Address: "",
                    Pincode: "",
                    Contact: ""
                });
            }

            // Clear file uploader and reset value states
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
            utils._LCvalidateMobileNumber(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
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
            var oSelectedItem = oTable.getSelectedItem();

            if (!oSelectedItem) {
                sap.m.MessageToast.show("Please select a record to delete.");
                return;
            }

            var oContext = oSelectedItem.getBindingContext("mainModel");
            var oData = oContext.getObject();
            var that = this;

            sap.m.MessageBox.confirm(
                `Are you sure you want to delete the facility ${oData.Name}?`, {
                icon: sap.m.MessageBox.Icon.WARNING,
                title: "Confirm Deletion",
                actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                emphasizedAction: sap.m.MessageBox.Action.NO,
                onClose: async function (sAction) {
                    if (sAction === sap.m.MessageBox.Action.YES) {
                        try {
                            sap.ui.core.BusyIndicator.show(0);
                            await that.ajaxDeleteWithJQuery("HM_Branch", {
                                filters: {
                                    BranchID: oData.BranchID
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

            if (!this.oDialog) {
                this.oDialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.MaintainData", this);
                oView.addDependent(this.oDialog);
            }
            var oMDmodel = oView.getModel("MDmodel");
            oMDmodel.setData(Object.assign({}, oData));
            this.isEdit = true;
            this._resetFacilityValueStates();
            this.oDialog.open();
        },
    })
});