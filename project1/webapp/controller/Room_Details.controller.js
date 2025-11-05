sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../utils/validation"
], function (
    BaseController,
    JSONModel,
    utils
) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Room_Details", {
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteRoomDetails").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function () {
            var model = new JSONModel({
                BranchCode: "",
                RoomNo: "",
                Price: "",

            });
            this.getView().setModel(model, "RoomModel")

            this.Onsearch()
            this.BedTypedetails()


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
            if (!this.AR_Dialog) {
                this.AR_Dialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.Add_Room_Details", this);
                oView.addDependent(this.AR_Dialog);
            }

            // Hide optional fields
            var oRoomModel = oView.getModel("RoomModel");
            if (oRoomModel) {
                oRoomModel.setData({
                    BranchCode: "",
                    BedTypeName:"",
                    NoofPerson: "",
                    RoomNo:"",
                    Price:"",
                   _isEditing: false
                }); 
            }
            oView.byId("idBedType").setVisible(false);
            // oView.byId("idAcType").setVisible(false);

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
            var aRoomDetails = oRoomDetailsModel.getProperty("/");

            // Backup original if not stored
            if (this._aOriginalBedTypes && this._aOriginalBedTypes.length) {
                oBedTypeModel.setProperty("/", JSON.parse(JSON.stringify(this._aOriginalBedTypes)));
                aBedTypes = oBedTypeModel.getProperty("/");
            } else {
                // Backup original only once when first time loaded
                this._aOriginalBedTypes = JSON.parse(JSON.stringify(aBedTypes));
            }

            // --- Filter logic ---
            var aFiltered = aBedTypes.filter(function (bed) {

                // Count how many rooms are already created for this BedType + Branch
                var iCreatedCount = aRoomDetails.filter(function (room) {
                    return room.BranchCode === bed.BranchCode &&
                        room.BedTypeName === bed.Name;
                }).length;

                // Bed side person limit
                var iBedNoOfPerson = bed.NoOfPerson || 0;

                // Find corresponding room record
                var oRoomMatch = aRoomDetails.find(function (room) {
                    return room.BranchCode === bed.BranchCode &&
                        room.BedTypeName === bed.Name;
                });
                var iRoomNoOfPerson = oRoomMatch ? oRoomMatch.NoofPerson || 0 : 0;

                // return iCreatedCount < iBedNoOfPerson && iCreatedCount < iRoomNoOfPerson;
                return iBedNoOfPerson > iRoomNoOfPerson;

            });

            // Update model for dropdown binding
            oBedTypeModel.setProperty("/", aFiltered);

            // Open the dialog
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

                var iCreatedCount = aRoomDetails.filter(function (room) {
                    return room.BranchCode === sBranchCode && room.BedTypeName === bed.Name + " - " + bed.ACType;
                });

               if (iCreatedCount.length > 0) {
    return iCreatedCount[0].NoofPerson < bed.NoOfPerson;
} else {
    return true;
}
            });

            // Set filtered data (for dropdown binding)
            oBedTypeModel.setProperty("/", aFiltered);

            // Reset UI selections
            var oBedTypeCombo = oView.byId("idBedType");
            // var oAcCombo = oView.byId("idAcType");

            oBedTypeCombo.setSelectedKey("").setVisible(true);
            // oAcCombo.setSelectedKey("").setVisible(false);
        }

        ,


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
            var table = this.byId("id_ARD_Table");
            var selected = table.getSelectedItem();
            if (!selected) {
                sap.m.MessageToast.show("Please select a record to Edit room.");
                return;
            }
            var Model = selected.getBindingContext("RoomDetailsModel");
            var data = Model.getObject();
            var oView = this.getView();

            if (!this.AR_Dialog) {
                this.AR_Dialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.Add_Room_Details", this);
                oView.addDependent(this.AR_Dialog);
            }
            // oView.byId("idAcType").setVisible(true);
            var oRoomModel = oView.getModel("RoomModel");

            // Copy data of selected room into RoomModel for editing
            oRoomModel.setData({
                ...data,
                _isEditing: true
            });
            var sBranchCode = data.BranchCode;

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

                var iCreatedCount = aRoomDetails.filter(function (room) {
                    return room.BranchCode === sBranchCode && room.BedTypeName === bed.Name+ " - " + bed.ACType;
                }).length;

                return iCreatedCount < bed.NoOfPerson;
            });

            // Set filtered data (for dropdown binding)
            oBedTypeModel.setProperty("/", aFiltered);

            // oView.byId("idCity").setVisible(false);
            oView.byId("idBedType").setVisible(true);
            // oView.byId("idAcType").setVisible(true)

            // Open the dialog
            this.AR_Dialog.open();
        },

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

    Payload.Price = parseInt(Payload.Price) || 0;
    Payload.NoofPerson = parseInt(Payload.NoofPerson) || 0;

    // Field validations
    if (
        utils._LCstrictValidationComboBox(oView.byId("idRoomType12"), "ID") &&
        utils._LCstrictValidationComboBox(oView.byId("idBedType"), "ID") &&
        utils._LCvalidateMandatoryField(oView.byId("idRoomNumber"), "ID") &&
        utils._LCvalidateMandatoryField(oView.byId("idRoomNumber13"), "ID") &&
        utils._LCvalidateAmount(oView.byId("idPrice"), "ID")
    ) {
        // Check if RoomNo already exists
        var oExistingRoom = aRoomDetails.find(function (room) {
            return room.RoomNo === Payload.RoomNo;
        });

        if (oExistingRoom && !Payload._isEditing) {
            sap.m.MessageToast.show("Room No '" + Payload.RoomNo + "' already exists");
            return;
        }

        // Find selected BedType
        var oBedType = aBedTypes.find(function (bed) {
            return bed.BranchCode === Payload.BranchCode &&
                   (bed.Name + " - " + bed.ACType === Payload.BedTypeName);
        });

        if (oBedType) {
            var iTotalAllowed = oBedType.NoOfPerson || 0;

            // Calculate total already created excluding current room in edit mode
            var iAlreadyCreated = aRoomDetails.reduce(function (sum, room) {
                if (Payload._isEditing && room.RoomNo === Payload.RoomNo) {
                    return sum; // Skip current room in edit mode
                }
                if (room.BranchCode === Payload.BranchCode &&
                    room.BedTypeName === Payload.BedTypeName) {
                    return sum + (parseInt(room.NoofPerson) || 0);
                }
                return sum;
            }, 0);

            var iAvailable = iTotalAllowed - iAlreadyCreated;

            if (Payload.NoofPerson > iAvailable) {
                sap.m.MessageToast.show(
                    "Only " + iAvailable + " slot(s) are available for this bed type!"
                );
                return;
            }
        }

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
                                    this.Onsearch();
                                    this.BedTypedetails();
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