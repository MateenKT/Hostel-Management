sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../utils/validation",
     "sap/m/MessageToast",
    "sap/ui/export/Spreadsheet"
], function (
    BaseController,
    JSONModel,
    utils,
      MessageToast,
    Spreadsheet
) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Room_Details", {
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteRoomDetails").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched:async function () {
            var model = new JSONModel({
                BranchCode: "",
                RoomNo: "",
                Price: "",

            });
            this.getView().setModel(model, "RoomModel")

            this.Onsearch()
            this.BedTypedetails()
 await  this.ajaxReadWithJQuery("Currency", "").then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                var model = new JSONModel(oFCIAerData);
                this.getView().setModel(model, "CurrencyModel");
            })

        },

         RD_onDownload: function () {
            const oModel = this.byId("id_ARD_Table").getModel("RoomDetailsModel").getData();
            if (!oModel || oModel.length === 0) {
                MessageToast.show("No data available to download.");
                return;
            }
            const adjustedData = oModel.map(item => ({
                ...item,
                Price: item.Price ? String(item.Price) : "",
                MonthPrice: item.MonthPrice ? String(item.MonthPrice) : "",
                YearPrice: item.YearPrice ? String(item.YearPrice) : "",
            }));
            const aCols = this.createTableSheet();
            const oSettings = {
                workbook: {
                    columns: aCols,
                    hierarchyLevel: "Level"
                },
                dataSource: adjustedData,
                fileName: "Room_Details.xlsx",
                worker: false,
            };
            MessageToast.show("Downloading Room Details");
            const oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(function () {
                oSheet.destroy();
            });
        },

        createTableSheet: function () {
            return [{
                label: "Branch Code",
                property: "BranchCode",
                type: "string"
            },
            {
                label: "Room Number",
                property: "RoomNo",
                type: "string"
            },
            {
                label: "Bed Type",
                property: "BedTypeName",
                type: "string"
            },
            {
                label: "Extra Bed",
                property: "ExtraBed",
                type: "string"
            },
            {
                label: "Daily Price",
                property: "Price",
                type: "string"
            },
            {
                label: "Monthly Price",
                property: "MonthPrice",
                type: "string"
            },
            {
                label: "Yearly Price",
                property: "YearPrice",
                type: "string"
            }]
        },
        
        BedTypedetails: function () {
            this.ajaxReadWithJQuery("HM_BedType", "").then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                var model = new JSONModel(oFCIAerData);
                this.getView().setModel(model, "BedTypeModel");
            })
        },
        _populateUniqueFilterValues: function (data) {
            let uniqueValues = {
                RD_id_CustomerName1: new Set(),
                RD_id_CompanyName1: new Set(),

            };

            data.forEach(item => {
                uniqueValues.RD_id_CustomerName1.add(item.RoomNo);
                uniqueValues.RD_id_CompanyName1.add(item.BedTypeName);
            });

            let oView = this.getView();
            ["RD_id_CustomerName1", "RD_id_CompanyName1"].forEach(field => {
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
        HM_AddRoom: function (oEvent) {
            var oView = this.getView();
            this.byId("id_ARD_Table").removeSelections();

            // Load dialog fragment (only once)
            if (!this.AR_Dialog) {
                this.AR_Dialog = sap.ui.xmlfragment(
                    oView.getId(),
                    "sap.ui.com.project1.fragment.Add_Room_Details",
                    this
                );
                oView.addDependent(this.AR_Dialog);
            }

            // Reset RoomModel fields
            var oRoomModel = oView.getModel("RoomModel");
            if (oRoomModel) {
                oRoomModel.setData({
                    BranchCode: "",
                    BedTypeName: "",
                    NoofPerson: "",
                    RoomNo: "",
                    Price: "",
                    _isEditing: false
                });
            }

            // Hide optional fields
            oView.byId("idBedType").setVisible(false);
            // oView.byId("idAcType").setVisible(false);

            // Reset ValueState for inputs
            var aInputIds = [
                "idRoomType12",
                "idBedType",
                "idRoomNumber",
                "idRoomNumber13",
                "idPrice"
            ];

            aInputIds.forEach(function (sId) {
                var oInput = oView.byId(sId);
                if (oInput && oInput.setValueState) {
                    oInput.setValueState("None");
                }
            });

            // --- Models ---
            var oBedTypeModel = oView.getModel("BedTypeModel");
            var oRoomDetailsModel = oView.getModel("RoomDetailsModel");

            var aBedTypes = oBedTypeModel.getProperty("/");
            // this._aAllBedTypes=oBedTypeModel.getProperty("/")
            var aRoomDetails = oRoomDetailsModel.getProperty("/");

            // --- Backup BedTypeModel if not already done ---
            if (this._aOriginalBedTypes && this._aOriginalBedTypes.length) {
                oBedTypeModel.setProperty("/", JSON.parse(JSON.stringify(this._aOriginalBedTypes)));
                aBedTypes = oBedTypeModel.getProperty("/");
            } else {
                // Backup original only once
                this._aOriginalBedTypes = JSON.parse(JSON.stringify(aBedTypes));
            }

            // --- Filter Logic ---
            var aFiltered = aBedTypes.filter(function (bed) {
                // Bed side person capacity
                var iBedNoOfPerson =  bed.MaxBeds || 0;

                // Sum all NoofPerson for rooms with same BranchCode & BedTypeName
                var iRoomNoOfPerson = aRoomDetails
                    .filter(function (room) {
                        return (
                            room.BranchCode === bed.BranchCode &&
                            room.BedTypeName === bed.Name +" - "+ bed.ACType
                        );
                    })
                    .reduce(function (sum, room) {
                        return sum + (parseInt("1") || 0);
                    }, 0);

                // Only include bed types that haven't reached capacity
                return iBedNoOfPerson > iRoomNoOfPerson;
            });

            // Update filtered data for dropdown
            oBedTypeModel.setProperty("/", aFiltered);

            // --- Open Dialog ---
            this.AR_Dialog.open();
        },

        onBranchChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
            var oView = this.getView();
            var sBranchCode = oEvent.getParameter("selectedItem").getKey();

            // Models
            var oBedTypeModel = oView.getModel("BedTypeModel");
            var oRoomDetailsModel = oView.getModel("RoomDetailsModel");

            // Get all bed types (from a backup copy)
            var aAllBedTypes = this._aAllBedTypes || oBedTypeModel.getProperty("/");
            this._aAllBedTypes = aAllBedTypes; // store once

            var aRoomDetails = oRoomDetailsModel.getProperty("/");

            // Filter only the bed types for the selected branch
            var aFiltered = aAllBedTypes.filter(function (bed) {
                if (bed.BranchCode !== sBranchCode) {
                    return false;
                }

                // Sum NoofPerson for all existing rooms of this bed type in this branch
                var iCreatedCount = aRoomDetails
                    .filter(function (room) {
                        return room.BranchCode === sBranchCode &&
                            room.BedTypeName === bed.Name +" - "+ bed.ACType;
                    })
                    .reduce(function (sum, room) {
                        return sum + parseInt(1)|| 0;
                    }, 0);

                // Compare sum with bed capacity (NoOfPerson * 2)
                return iCreatedCount <  bed.MaxBeds ;
            });

            // Set filtered data (for dropdown binding)
            oBedTypeModel.setProperty("/", aFiltered);

            // Reset UI selections
            var oBedTypeCombo = oView.byId("idBedType");
            oBedTypeCombo.setSelectedKey("").setVisible(true);
        },


        onBedTypeChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");

            // var sSelectedBedType = oEvent.getParameter("selectedItem").getKey();
            // var oView = this.getView();

            // // var oAcComboBox = oView.byId("idAcType");

            // // if (sSelectedBedType) {
            // //     oAcComboBox.setVisible(true);
            // // } else {
            // //     oAcComboBox.setVisible(false);
            // //     return;
            // // }

            // var oBedTypeModel = oView.getModel("BedTypeModel");
            // var aData = oBedTypeModel.getProperty("/");
            // var sBranchCode = oView.byId("idRoomType12").getSelectedKey();

            // var oSelected = aData.find(function (item) {
            //     return item.Name === sSelectedBedType;
            // });

            // if (oSelected) {
            //     var aFilteredAC = aData.filter(function (item) {
            //         return item.Name === sSelectedBedType;
            //     });

            //     // Bind this filtered data directly to AC ComboBox (no model overwrite)
            //     oAcComboBox.bindItems({
            //         path: "/",
            //         template: new sap.ui.core.Item({
            //             key: "{ACType}",
            //             text: "{ACType}"
            //         }),
            //         templateShareable: false
            //     });
            //     oAcComboBox.setModel(new sap.ui.model.json.JSONModel(aFilteredAC));
            //     oAcComboBox.setSelectedKey("");
            // }
        }
        ,

        HM_EditRoom: function (oEvent) {
            var oView = this.getView();
            var oTable = this.byId("id_ARD_Table");
            var oSelected = oTable.getSelectedItem();

            if (!oSelected) {
                sap.m.MessageToast.show("Please select a record to edit the room.");
                return;
            }

            var oContext = oSelected.getBindingContext("RoomDetailsModel");
            var oData = oContext.getObject();

            // Create dialog if not already initialized
            if (!this.AR_Dialog) {
                this.AR_Dialog = sap.ui.xmlfragment(
                    oView.getId(),
                    "sap.ui.com.project1.fragment.Add_Room_Details",
                    this
                );
                oView.addDependent(this.AR_Dialog);
            }

            // Prepare RoomModel with selected data
            var oRoomModel = oView.getModel("RoomModel");
            oRoomModel.setData({
                ...oData,
                _isEditing: true
            });
            this.RoomNo=oData.RoomNo
            var sBranchCode = oData.BranchCode;

            // --- Models ---
            var oBedTypeModel = oView.getModel("BedTypeModel");
            var oRoomDetailsModel = oView.getModel("RoomDetailsModel");

            // Get all bed types (use backup if available)
            var aAllBedTypes = this._aAllBedTypes || oBedTypeModel.getProperty("/");
            this._aAllBedTypes = aAllBedTypes;

            var aRoomDetails = oRoomDetailsModel.getProperty("/");

            // --- Filter Logic with SUM of NoofPerson ---
            var aFiltered = aAllBedTypes.filter(function (bed) {
                if (bed.BranchCode !== sBranchCode) {
                    return false;
                }

                // Bed capacity
                var iBedNoOfPerson =  bed.MaxBeds || 0;

                // Sum NoofPerson for all matching rooms
                var iRoomNoOfPerson = aRoomDetails
                    .filter(function (room) {
                        return (
                            room.BranchCode === sBranchCode &&
                            room.BedTypeName === bed.Name + " - " + bed.ACType
                        );
                    })
                    .reduce(function (sum, room) {
                        return sum + (parseInt("1") || 0);
                    }, 0);

                // Check if this is the current room’s bed
                var bIsCurrentBed =
                    oData.BedTypeName === bed.Name + " - " + bed.ACType &&
                    oData.BranchCode === bed.BranchCode;

                // Include if capacity not reached or if it's the current bed
                return bIsCurrentBed || iBedNoOfPerson > iRoomNoOfPerson;
            });

            // --- If BedType is full, lock dropdown to current one ---
            var oCurrentBedType = aFiltered.find(function (bed) {
                return (
                    bed.Name + " - " + bed.ACType === oData.BedTypeName &&
                    bed.BranchCode === oData.BranchCode
                );
            });

            var oDropdown = oView.byId("idBedType");

            if (aFiltered.length === 1 && oCurrentBedType) {
                // Already full — lock dropdown to this one
                oBedTypeModel.setProperty("/", [oCurrentBedType]);
                if (oDropdown) {
                    oDropdown.setSelectedKey(oData.BedTypeName);
                    // oDropdown.setEnabled(false);
                }
            } else {
                // Otherwise allow selection normally
                oBedTypeModel.setProperty("/", aFiltered);
                if (oDropdown) {
                    // oDropdown.setEnabled(true);
                    oDropdown.setSelectedKey(oData.BedTypeName);
                }
            }

            // Show BedType field
            oView.byId("idBedType").setVisible(true);

            // Reset input ValueState
            var aInputIds = [
                "idRoomType12",
                "idBedType",
                "idRoomNumber",
                "idRoomNumber13",
                "idPrice",
                "id_MonthlyPrice",
                "id_YearlyPrice",
                "FO_id_Currency"
            ];
            aInputIds.forEach(function (sId) {
                var oInput = oView.byId(sId);
                if (oInput && oInput.setValueState) {
                    oInput.setValueState("None");
                }
            });

            // --- Open Dialog ---
            this.AR_Dialog.open();
        }

        ,

        AR_onCancelButtonPress: function () {
            this.AR_Dialog.close();
        },
        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
        },
        AR_onsavebuttonpress: function () {
            var oView = this.getView();
            var oRoomModel = oView.getModel("RoomModel");
            var oRoomDetailsModel = oView.getModel("RoomDetailsModel");
            var oBedTypeModel = oView.getModel("BedTypeModel");

            var Payload = oRoomModel.getData();

            // Remove unnecessary fields
            delete Payload.AcType;
            delete Payload.File;
            delete Payload.Description;

            var aRoomDetails = oRoomDetailsModel.getData();
            var aBedTypes = oBedTypeModel.getData();


              var Noofper = aBedTypes.find(function (bed) {
                    return bed.BranchCode === Payload.BranchCode && bed.Name === Payload.BedTypeName.split("-")[0].trim()
                     &&  bed.ACType === Payload.BedTypeName.split("-").slice(1).join("-").trim();
                     
                });
          

            // Field validations
            if (
                utils._LCstrictValidationComboBox(oView.byId("idRoomType12"), "ID") &&
                // utils._LCstrictValidationComboBox(oView.byId("idBedType"), "ID") &&
                (utils._LCstrictValidationComboBox(oView.byId("idBedType"), "ID") || Payload.BedTypeName) &&
                utils._LCvalidateMandatoryField(oView.byId("idRoomNumber"), "ID") &&
                // utils._LCvalidateMandatoryField(oView.byId("idRoomNumber13"), "ID") &&
                utils._LCvalidateAmount(oView.byId("idPrice"), "ID") &&
                utils._LCvalidateAmount(oView.byId("id_MonthlyPrice"), "ID") &&

                utils._LCvalidateAmount(oView.byId("id_YearlyPrice"), "ID") &&

                utils._LCstrictValidationComboBox(oView.byId("FO_id_Currency"), "ID")

            ) {
 
                 Payload.NoofPerson = parseInt(Noofper.NoOfPerson) || 0;
                 Payload.ExtraBed = parseInt(Payload.ExtraBed) || 0;

                // Check if RoomNo already exists
                var oExistingRoom = aRoomDetails.find(function (room) {
                    return room.RoomNo === Payload.RoomNo;
                });

                if (oExistingRoom && !Payload._isEditing && oExistingRoom.RoomNo === Payload.RoomNo) {
                    sap.m.MessageToast.show("Room No '" + Payload.RoomNo + "' already exists");
                    return;
                }
                if (Payload._isEditing) {
                    // Editing case
                    var sOriginalRoomNo = this.RoomNo; // We'll store this when opening dialog

                    if (oExistingRoom && Payload.RoomNo !== sOriginalRoomNo) {
                        sap.m.MessageToast.show("Room No '" + Payload.RoomNo + "' already exists");
                        return;
                    }
                }

                // Find selected BedType
                // var oBedType = aBedTypes.find(function (bed) {
                //     return bed.BranchCode === Payload.BranchCode &&
                //         (bed.Name + " - " + bed.ACType === Payload.BedTypeName);
                // });

                // if (oBedType) {
                //     var iTotalAllowed =  bed.MaxBeds  || 0;

                //     // Calculate total already created excluding current room in edit mode
                //     var iAlreadyCreated = aRoomDetails.reduce(function (sum, room) {
                //         if (Payload._isEditing && room.RoomNo === Payload.RoomNo) {
                //             return sum; // Skip current room in edit mode
                //         }
                //         if (room.BranchCode === Payload.BranchCode &&
                //             room.BedTypeName === Payload.BedTypeName) {
                //             return sum + (parseInt("1") || 0);
                //         }
                //         return sum;
                //     }, 0);

                //     var iAvailable = iTotalAllowed - iAlreadyCreated;

                //     if (iAlreadyCreated > iAvailable) {
                //         sap.m.MessageToast.show(
                //             "Only " + iAvailable + " slot(s) are available for this bed type!"
                //         );
                //         return;
                //     }
                // }

                // Determine POST or PUT
                var sUrl = "https://rest.kalpavrikshatechnologies.com/HM_Rooms";
                var sMethod = "POST";
                var oBody = { data: Payload };

                if (aRoomDetails.some(r => r.RoomNo === Payload.RoomNo)) {
                    sMethod = "PUT";
                    oBody.filters = { RoomNo: Payload.RoomNo };
                }

                delete Payload._isEditing;

                $.ajax({
                    url: sUrl,
                    method: sMethod,
                    contentType: "application/json",
                    headers: {
                        name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                        password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
                    },
                    data: JSON.stringify(oBody),
                    success: function (response) {
                        sap.m.MessageToast.show(
                            sMethod === "POST"
                                ? "Room added successfully!"
                                : "Room updated successfully!"
                        );
                        this.Onsearch();
                        this.BedTypedetails()

                        if (this.AR_Dialog) this.AR_Dialog.close();
                    }.bind(this),
                    error: function (err) {
                        sap.m.MessageBox.error("Error saving room data (Add/Update).");
                        console.error(err);
                    }
                });
            } else {
                sap.m.MessageToast.show("Please fill all required fields correctly before saving.");
                return;
            }
        }


        ,
        HM_DeleteRoom: function () {
            var table = this.byId("id_ARD_Table");
            var selected = table.getSelectedItem();

            if (!selected) {
                sap.m.MessageToast.show("Please select a record to delete.");
                return;
            }

            var Model = selected.getBindingContext("RoomDetailsModel");
            var data = Model.getObject();

            // Confirmation popup
            sap.m.MessageBox.confirm(
                "Are you sure you want to delete Room No: " + data.RoomNo + "?",
                {
                    title: "Confirm Deletion",
                    actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
                    onClose: function (sAction) {
                        if (sAction === sap.m.MessageBox.Action.OK) {
                            var oBody = {
                                filters: {
                                    RoomNo: data.RoomNo
                                }
                            };

                            $.ajax({
                                url: "https://rest.kalpavrikshatechnologies.com/HM_Rooms",
                                method: "DELETE",
                                contentType: "application/json",
                                data: JSON.stringify(oBody),
                                headers: {
                                    name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                                    password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
                                },
                                success: function (response) {
                                    sap.m.MessageToast.show("Room deleted successfully!");
                                    // this.Onsearch();
                                    // this.BedTypedetails();
                                    this.Onsearch().then(() => {
                                        // Now BedTypedetails will have the correct RoomDetails
                                        this.BedTypedetails();
                                    });
                                    table.removeSelections();

                                }.bind(this),
                                error: function (xhr) {
                                    sap.m.MessageToast.show("Error: " + xhr.statusText);
                                }
                            });
                        }
                    }.bind(this)
                }
            );
        }
        ,
        Onsearch: function () {
            sap.ui.core.BusyIndicator.show(0);

            $.ajax({
                url: "https://rest.kalpavrikshatechnologies.com/HM_Rooms",
                method: "GET",
                contentType: "application/json",
                headers: {
                    name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                    password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
                },
                success: function (response) {
                    var model = new JSONModel(response.commentData);
                    this.getView().setModel(model, "RoomDetailsModel");
                    this._populateUniqueFilterValues(response.commentData);
                    sap.ui.core.BusyIndicator.hide();


                }.bind(this),
                error: function (err) {
                    sap.m.MessageBox.error("Error uploading data or file.");
                }
            });
        },
        RD_onSearch: function () {
            var oView = this.getView();

            var oFilterBar = oView.byId("RD_id_FilterbarEmployee");

            var oTable = oView.byId("id_ARD_Table");
            var oBinding = oTable.getBinding("items");

            var sCustomerName = oView.byId("RD_id_CustomerName1").getSelectedKey() || oView.byId("RD_id_CustomerName1").getValue();
            var sCustomerID = oView.byId("RD_id_CompanyName1").getSelectedKey() || oView.byId("RD_id_CompanyName1").getValue();

            var aFilters = [];

            if (sCustomerName) {
                aFilters.push(new sap.ui.model.Filter("RoomNo", sap.ui.model.FilterOperator.Contains, sCustomerName));
            }

            if (sCustomerID) {
                aFilters.push(new sap.ui.model.Filter("BedTypeName", sap.ui.model.FilterOperator.Contains, sCustomerID));
            }

            var oCombinedFilter = new sap.ui.model.Filter({
                filters: aFilters,
                and: true
            });

            oBinding.filter(oCombinedFilter);
        },
        RD_onPressClear: function () {
            this.getView().byId("RD_id_CustomerName1").setSelectedKey("")
            this.getView().byId("RD_id_CompanyName1").setSelectedKey("")
        },
        onRoomNoInputLiveChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent.getSource(), "ID");
        },
        onPriceInputLiveChange: function (oEvent) {
            utils._LCvalidateAmount(oEvent.getSource(), "ID");
        },
        onACtypeChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
        }
    });
});