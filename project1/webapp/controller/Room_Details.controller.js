sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
], function (
    Controller,
    JSONModel
) {
    "use strict";

    return Controller.extend("sap.ui.com.project1.controller.Room_Details", {
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

        },
        HM_AddRoom: function (oEvent) {
            var oView = this.getView();

            if (!this.AR_Dialog) {
                this.AR_Dialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.Add_Room_Details", this);
                oView.addDependent(this.AR_Dialog);
            }

            oView.byId("idFileUploader12").setVisible(false);
            oView.byId("idDescription").setVisible(false);
            oView.byId("idCity").setVisible(false);


            // Open the dialog
            this.AR_Dialog.open();
        },
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
            this.getView().getModel("RoomModel").setData(data);

            oView.byId("idFileUploader12").setVisible(false);
            oView.byId("idDescription").setVisible(false);
            oView.byId("idCity").setVisible(false);


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
            var Payload = oView.getModel("RoomModel").getData();
            Payload.Price = parseInt(Payload.Price);

            var sUrl = "https://rest.kalpavrikshatechnologies.com/HM_Rooms";
            var sMethod = "POST";
            var oBody = { data: Payload };

            if (Payload.ID) {
                sUrl = sUrl;
                sMethod = "PUT";

                oBody.filters = {
                    ID: Payload.ID
                };
            }

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
                    if (sMethod === "POST") {
                        sap.m.MessageToast.show("Room added successfully!");
                    } else {
                        sap.m.MessageToast.show("Room updated successfully!");
                    }
                    this.Onsearch(); // Refresh table
                    this.AR_Dialog.close();

                }.bind(this),
                error: function (err) {
                    sap.m.MessageBox.error("Error saving data (Add/Update).");
                    console.error(err);
                }
            });
        },
        HM_DeleteRoom:function(){
            var table = this.byId("id_ARD_Table");
            var selected = table.getSelectedItem();
            if (!selected) {
                sap.m.MessageToast.show("Please select a record to Delete room.");
                return;
            }
            var Model = selected.getBindingContext("RoomDetailsModel");
            var data = Model.getObject();

            var oBody = {};
             oBody.filters = {
                    ID: data.ID
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
                    sap.m.MessageToast.show("Record DELETE successfully!");
                     this.Onsearch()
                }.bind(this),
                error: function (xhr) {
                    sap.m.MessageToast.show("Error: " + xhr.statusText);
                }
            });
        },
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
                    sap.ui.core.BusyIndicator.hide();


                }.bind(this),
                error: function (err) {
                    sap.m.MessageBox.error("Error uploading data or file.");
                }
            });
        },
        RD_onSearch:function(){
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
                aFilters.push(new sap.ui.model.Filter("BedType", sap.ui.model.FilterOperator.Contains, sCustomerID));
            }

            var oCombinedFilter = new sap.ui.model.Filter({
                filters: aFilters,
                and: true
            });

            oBinding.filter(oCombinedFilter); 
        },
        RD_onPressClear:function(){
            this.getView().byId("RD_id_CustomerName1").setSelectedKey("")
             this.getView().byId("RD_id_CompanyName1").setSelectedKey("")
        }
    });
});