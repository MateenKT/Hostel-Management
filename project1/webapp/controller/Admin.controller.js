sap.ui.define([
    "./BaseController",
    "../model/formatter",
    "sap/ui/model/json/JSONModel",
       "sap/m/MessageBox",
           "../utils/validation"
], function (
    BaseController,
    Formatter,
    JSONModel,
    MessageBox,
    utils
) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Admin", {
        Formatter: Formatter,

        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteAdmin").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: async function () {

            await this.Cust_read()
            // $.ajax({
            //     url: "https://rest.kalpavrikshatechnologies.com/HM_Rooms",
            //     method: "GET",
            //     contentType: "application/json",
            //     headers: {
            //         name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
            //         password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
            //     },
            //     success: function (response) {
            //         var model = new JSONModel(response.commentData);
            //         this.getView().setModel(model, "RoomDetailsModel");
            //         sap.ui.core.BusyIndicator.hide();


            //     }.bind(this),
            //     error: function (err) {
            //         sap.m.MessageBox.error("Error uploading data or file.");
            //     }
            // });
            this.ajaxReadWithJQuery("HM_Rooms", "").then((oData) => {
                var oFCIAerData = Array.isArray(oData.commentData) ? oData.commentData : [oData.commentData];
                var model = new JSONModel(oFCIAerData);
                this.getView().setModel(model, "RoomDetailsModel");
            })
            var model = new JSONModel({
                BranchCode: "",
                BedType: "",
                Price: "",
                Description: "",

            });
            this.getView().setModel(model, "RoomModel")
        },
        Cust_read: function () {
            sap.ui.core.BusyIndicator.show(0);
            $.ajax({
                url: "https://rest.kalpavrikshatechnologies.com/HM_Customer",
                method: "GET",
                contentType: "application/json",
                headers: {
                    name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                    password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
                },
                success: function (response) {
                    var oModel = new sap.ui.model.json.JSONModel(response.Customers);
                    this.getView().setModel(oModel, "HostelModel");
                    this._populateUniqueFilterValues(response.Customers);
                    sap.ui.core.BusyIndicator.hide();
                }.bind(this),
            })
        },
        _populateUniqueFilterValues: function (data) {
            let uniqueValues = {
                PO_id_CustomerName: new Set(),
                PO_id_CompanyName: new Set(),
                PO_id_Status: new Set(),


            };

           data.forEach(item => {
        // Add customer name
        if (item.CustomerName) {
            uniqueValues.PO_id_CustomerName.add(item.CustomerName);
        }

        // Safely add RoomNo if Bookings exist
        if (item.Bookings && item.Bookings.length > 0 && item.Bookings[0].RoomNo) {
            uniqueValues.PO_id_CompanyName.add(item.Bookings[0].RoomNo);
        }
         if (item.Bookings && item.Bookings.length > 0 && item.Bookings[0].Status) {
            uniqueValues.PO_id_Status.add(item.Bookings[0].Status);
        }
    });

            let oView = this.getView();
            ["PO_id_CustomerName", "PO_id_CompanyName","PO_id_Status"].forEach(field => {
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
        HM_viewroom: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("HostelModel");
            var oData = oContext.getObject();

            if (!oData.Documents || !oData.Documents.length) {
                sap.m.MessageBox.error("No document found for this room!");
                return;
            }

            var sBase64 = oData.Documents[0].File;

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
                    press: function () {
                        oDialog.close();
                    }
                }),
                afterClose: function () {
                    oDialog.destroy();
                }
            });

            oDialog.open();
        },
  HM_AssignRoom: function (oEvent) {
    var table = this.byId("idPOTable");
    var selected = table.getSelectedItem();
    if (!selected) {
        sap.m.MessageToast.show("Please select a record to assign room.");
        return;
    }

    var Model = selected.getBindingContext("HostelModel");
    this.data = Model.getObject(); // Customer data

    if(this.data.Bookings[0].Status==="Closed" || this.data.Bookings[0].Status==="Assigned"){
        sap.m.MessageToast.show("This customer cant be assign")
        return;
    }

    var oRoomDetailsModel = this.getView().getModel("RoomDetailsModel");
    var aRooms = oRoomDetailsModel.getData(); // All room details

    // Get BedTypes from customer's bookings
    var customerBedTypes = [];
    if (this.data.Bookings && this.data.Bookings.length > 0) {
        this.data.Bookings.forEach(function(booking) {
            if (booking.BedType) {
                customerBedTypes.push(booking.BedType);
            }
        });
    }

    if (customerBedTypes.length === 0) {
        sap.m.MessageToast.show("Customer does not have any BedType assigned.");
        return;
    }

    // Get all HostelModel data to check room occupancy
    var oHostelModel = this.getView().getModel("HostelModel");
    var aCustomers = oHostelModel.getData(); // All customer bookings

    // Filter room numbers that match customer's BedType AND are not fully booked
    var availableRoomNos = aRooms.filter(function(room) {
        if (!customerBedTypes.includes(room.BedTypeName)) {
            return false; // Room's bed type doesn't match customer's
        }

        // Count how many customers already have this RoomNo and BedType
        var count = 0;
        aCustomers.forEach(function(customer) {
            if (customer.Bookings && customer.Bookings.length > 0) {
                customer.Bookings.forEach(function(booking) {
                    if (booking.RoomNo === room.RoomNo && booking.BedType === room.BedTypeName && booking.Status !== "Closed") {
                        count++;
                    }
                });
            }
        });

        // Only include room if it is not fully booked
        return count < room.NoofPerson; // Assuming room.Capacity exists in RoomDetailsModel
    }).map(function(room) {
        return { RoomNo: room.RoomNo }; // Only include RoomNo
    });

    // Set AvailableRoomsModel
    var oAvailableRoomsModel = new sap.ui.model.json.JSONModel(availableRoomNos);
    this.getView().setModel(oAvailableRoomsModel, "AvailableRoomsModel");

    // Open dialog
    if (!this.HM_Dialog) {
        var oView = this.getView();
        this.HM_Dialog = sap.ui.xmlfragment("sap.ui.com.project1.fragment.Assign_Room", this);
        oView.addDependent(this.HM_Dialog);
    }

    var oText = sap.ui.getCore().byId("idCustomerNameText");
    oText.setText(this.data.CustomerName + " (" + this.data.CustomerID + ")");
    sap.ui.getCore().byId("idRoomNumber1").setValueState("None").setSelectedKey("");

    this.HM_Dialog.open();
},
        HM_RoomDetails: function (oEvent) {
            var oView = this.getView();

            if (!this.ARD_Dialog) {
                this.ARD_Dialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.Bed_Type", this);
                oView.addDependent(this.ARD_Dialog);
            }
            // oView.byId("idRoomNumber").setVisible(false);
            // oView.byId("idActype").setVisible(false);

            this.ARD_Dialog.open();
        },

        AR_onsavebuttonpress: function () {
            var oView = this.getView();
            var Payload = oView.getModel("BedModel").getData();
            var oFileUploader = this.byId("idFileUploader");
            var aFiles = oFileUploader.oFileUpload.files;

            // if (!aFiles.length) {
            //     sap.m.MessageBox.error("Please select a file to upload.");
            //     return;
            // }

            var oFile = aFiles[0];
            var reader = new FileReader();

            reader.onload = function (e) {
                var sBase64 = e.target.result.split(",")[1];
                Payload.File = sBase64;
                Payload.FileName = oFile.name;
                Payload.FileType = oFile.type;


                // Perform AJAX call only after file is fully read
                $.ajax({
                    url: "https://rest.kalpavrikshatechnologies.com/HM_BedType",
                    method: "POST",
                    contentType: "application/json",
                    headers: {
                        name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                        password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
                    },
                    data: JSON.stringify({ data: Payload }),
                    success: function (response) {
                        sap.m.MessageToast.show("Data and file uploaded successfully!");
                        if (this.FCIA_Dialog) {
                            this.FCIA_Dialog.close();
                        }
                        oFileUploader.setValue("");
                        this.ARD_Dialog.close();
                    }.bind(this),
                    error: function (err) {
                        sap.m.MessageBox.error("Error uploading data or file.");
                    }
                });
            }.bind(this);

            reader.readAsDataURL(oFile);
        },
        // RoomNo: function () {
        //       this.ajaxReadWithJQuery("HM_Booking", "").then((oData) => {
        //         var oFCIAerData = Array.isArray(oData.commentData) ? oData.commentData : [oData.commentData];
        //                 var model = new JSONModel(oFCIAerData);
        //         this.getView().setModel(model, "HostelModel");
        //     })
            
        // },
        ARNO_onsavebuttonpress: function (oEvent) {
            // var ID = this.data
            var oView=this.getView()
             var table = this.byId("idPOTable");
    var selected = table.getSelectedItem();
    if (!selected) {
        sap.m.MessageToast.show("Please select a record to assign room.");
        return;
    }

    var Model = selected.getBindingContext("HostelModel");
     var ID = Model.getObject()
       
            var data = sap.ui.getCore().byId("idRoomNumber1").getSelectedKey();

      if( ID.Bookings[0].RoomNo || utils._LCstrictValidationComboBox(sap.ui.getCore().byId("idRoomNumber1"), "ID")){
            if(data==="" ){
               var data=ID.Bookings[0].RoomNo
            }

            var Payload = {
                RoomNo: data,
                Status: "Assigned"

            }
            var oBody = { data: Payload };

            oBody.filters = {
                CustomerID: ID.CustomerID
            };

            

            $.ajax({
                url: "https://rest.kalpavrikshatechnologies.com/HM_Booking",
                method: "PUT",
                contentType: "application/json",
                data: JSON.stringify(oBody),
                headers: {
                    name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                    password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
                },
                success:async function (response) {
                    sap.m.MessageToast.show("Record updated successfully!");
                  await  this.Cust_read()
                    // this.RoomNo()
                    this.HM_Dialog.close();
                }.bind(this),
                error: function (xhr) {
                    sap.m.MessageToast.show("Error: " + xhr.statusText);
                }
            });
        }else{
             sap.m.MessageToast.show("Please fill all required fields correctly before saving.");
                return;
        }
           
        },
      HM_EditRoom: async function (oEvent) {
    var table = this.byId("idPOTable");
    var selected = table.getSelectedItem();
    if (!selected) {
        sap.m.MessageToast.show("Please select a record to checkout.");
        return;
    }

    var Model = selected.getBindingContext("HostelModel");
    var data = Model.getObject();

 

    var Payload = {
        Status: "Closed"
    };

    var that = this;

    sap.m.MessageBox.confirm(
        "Are you sure you want to Check out: " + data.CustomerName + " (" + data.CustomerID + ")?",
        {
            title: "Confirm Checkout",
            actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
            onClose: async function (sAction) {
                if (sAction === sap.m.MessageBox.Action.OK) {
                    try {
                        await that.ajaxUpdateWithJQuery("HM_Booking", {
                            data: Payload,
                            filters: { CustomerID: data.CustomerID }
                        });

                        await that.Cust_read();
                        sap.m.MessageToast.show("Checkout successful.");
                    } catch (err) {
                        console.error("Checkout failed:", err);
                        sap.m.MessageBox.error("Failed to checkout. Please try again.");
                    }
                }
            }
        }
    );
},
HM_ChangeRoom:function(){
      var table = this.byId("idPOTable");
    var selected = table.getSelectedItem();
    if (!selected) {
        sap.m.MessageToast.show("Please select a record to checkout.");
        return;
    }

    var Model = selected.getBindingContext("HostelModel");
    var data = Model.getObject();
     this.RoomNo=data.RoomNo

     var oRoomDetailsModel = this.getView().getModel("RoomDetailsModel");
    var aRooms = oRoomDetailsModel.getData(); // All room details

    // Get BedTypes from customer's bookings
    var customerBedTypes = [];
    if (data.Bookings && data.Bookings.length > 0) {
        data.Bookings.forEach(function(booking) {
            if (booking.BedType) {
                customerBedTypes.push(booking.BedType);
            }
        });
    }

    if (customerBedTypes.length === 0) {
        sap.m.MessageToast.show("Customer does not have any BedType assigned.");
        return;
    }

    // Get all HostelModel data to check room occupancy
    var oHostelModel = this.getView().getModel("HostelModel");
    var aCustomers = oHostelModel.getData(); // All customer bookings

    // Filter room numbers that match customer's BedType AND are not fully booked
    var availableRoomNos = aRooms.filter(function(room) {
        if (!customerBedTypes.includes(room.BedTypeName)) {
            return false; // Room's bed type doesn't match customer's
        }

        // Count how many customers already have this RoomNo and BedType
        var count = 0;
        aCustomers.forEach(function(customer) {
            if (customer.Bookings && customer.Bookings.length > 0) {
                customer.Bookings.forEach(function(booking) {
                    if (booking.RoomNo === room.RoomNo && booking.BedType === room.BedTypeName && booking.Status !== "Closed") {
                        count++;
                    }
                });
            }
        });

        // Only include room if it is not fully booked
        return count < room.NoofPerson; // Assuming room.Capacity exists in RoomDetailsModel
    }).map(function(room) {
        return { RoomNo: room.RoomNo }; // Only include RoomNo
    });

    // Set AvailableRoomsModel
    var oAvailableRoomsModel = new sap.ui.model.json.JSONModel(availableRoomNos);
    this.getView().setModel(oAvailableRoomsModel, "AvailableRoomsModel");

    if (!this.HM_Dialog) {
        var oView = this.getView();
        this.HM_Dialog = sap.ui.xmlfragment("sap.ui.com.project1.fragment.Assign_Room", this);
        oView.addDependent(this.HM_Dialog);
    }
    sap.ui.getCore().byId("idCustomerNameText").setText(data.CustomerName)
    sap.ui.getCore().byId("idRoomNumber1").setValue(data.Bookings[0].RoomNo).setValueState("None");

    this.getView().getModel("")
    this.HM_Dialog.open();
},
        AR_onCancelButtonPress: function () {
            this.ARD_Dialog.close();
        },
        HM_onCancelButtonPress: function () {
            var table = this.byId("idPOTable");
            table.removeSelections();
            this.HM_Dialog.close();

        },
        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
        },
        HM_id_saveButton: function (oEvent) {
            var oModel = this.getView().getModel("HostelModel");
            var oData = oModel.getData();

            var sId = oData.ID;

            $.ajax({
                url: "https://rest.kalpavrikshatechnologies.com/HM_Customer/" + sId,
                method: "PUT",
                contentType: "application/json",
                data: JSON.stringify(oData),
                headers: {
                    name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                    password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
                },
                success: function (response) {
                    sap.m.MessageToast.show("Record updated successfully!");
                },
                error: function (xhr) {
                    sap.m.MessageToast.show("Error: " + xhr.statusText);
                }
            });
        },
    HM_onSearch: function (oEvent) {
    var oView = this.getView();
    var oTable = oView.byId("idPOTable");
    var oBinding = oTable.getBinding("items");

    var sCustomerName = oView.byId("PO_id_CustomerName").getSelectedKey() || oView.byId("PO_id_CustomerName").getValue();
    var sRoomNo = oView.byId("PO_id_CompanyName").getSelectedKey() || oView.byId("PO_id_CompanyName").getValue();
    var status = oView.byId("PO_id_Status").getSelectedKey() || oView.byId("PO_id_Status").getValue();

    var aFilters = [];

    if (sCustomerName) {
        aFilters.push(new sap.ui.model.Filter("CustomerName", sap.ui.model.FilterOperator.Contains, sCustomerName));
    }

    if (sRoomNo) {
        var roomFilter = new sap.ui.model.Filter({
            path: "Bookings",
            test: function (aBookings) {
                if (Array.isArray(aBookings)) {
                    return aBookings.some(function (booking) {
                        return booking.RoomNo && booking.RoomNo.toString().toLowerCase().includes(sRoomNo.toLowerCase().trim());
                    });
                }
                return false;
            }
        });
        aFilters.push(roomFilter);
    }

    if (status) {
        var statusFilter = new sap.ui.model.Filter({
            path: "Bookings",
            test: function (aBookings) {
                if (Array.isArray(aBookings)) {
                    return aBookings.some(function (booking) {
                        return booking.Status && booking.Status.toString().toLowerCase().includes(status.toLowerCase().trim());
                    });
                }
                return false;
            }
        });
        aFilters.push(statusFilter);
    }

    var oCombinedFilter = new sap.ui.model.Filter({
        filters: aFilters,
        and: true
    });

    oBinding.filter(oCombinedFilter);
},
        onHome: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },
        PO_onPressClear: function () {
            this.getView().byId("PO_id_CustomerName").setSelectedKey("")
            this.getView().byId("PO_id_CompanyName").setSelectedKey("")
            this.getView().byId("PO_id_Status").setSelectedKey("")


        },
        onRoomNoChange:function(oEvent){
              utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
        }


    });
});