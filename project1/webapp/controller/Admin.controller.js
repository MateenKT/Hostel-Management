sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "../model/formatter",
    "sap/ui/model/json/JSONModel",

], function (
    Controller,
    Formatter,
    JSONModel
) {
    "use strict";

    return Controller.extend("sap.ui.com.project1.controller.Admin", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteAdmin").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function () {

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
                }.bind(this),
            })
            var model = new JSONModel({
                BranchCode: "",
                BedType: "",
                Price: "",
                Description: "",

            });
            this.getView().setModel(model, "RoomModel")
        },
        HM_AssignRoom: function (oEvent) {
            var table = this.byId("idPOTable");
            var selected = table.getSelectedItem();
            if (!selected) {
                sap.m.MessageToast.show("Please select a record to assign room.");
                return;
            }
            var Model = selected.getBindingContext("HostelModel");
            var data = Model.getObject();

            if (!this.HM_Dialog) {
                var oView = this.getView();
                this.HM_Dialog = sap.ui.xmlfragment("sap.ui.com.project1.fragment.Assign_Room", this);
                oView.addDependent(this.HM_Dialog);

                sap.ui.getCore().byId("idCustomerNameText").setText(data.CustomerName);
                this.HM_Dialog.open();
            } else {
                sap.ui.getCore().byId("idCustomerNameText").setText(data.CustomerName);
                this.HM_Dialog.open();
            }
        },
        HM_RoomDetails: function (oEvent) {
            //  var table = this.byId("idPOTable");
            // var selected = table.getSelectedItem();
            // if(!selected){
            //     sap.m.MessageToast.show("Please select a record to assign room.");
            //     return;
            // }
            //       var Model = selected.getBindingContext("HostelModel");
            // var data = Model.getObject();

            if (!this.AR_Dialog) {
                var oView = this.getView();
                this.AR_Dialog = sap.ui.xmlfragment("sap.ui.com.project1.fragment.Add_Room_Details", this);
                oView.addDependent(this.AR_Dialog);

                // sap.ui.getCore().byId("idCustomerNameText").setText(data.CustomerName);
                this.AR_Dialog.open();
            } else {
                //  sap.ui.getCore().byId("idCustomerNameText").setText(data.CustomerName);
                this.AR_Dialog.open();
            }
        },
    AR_onsavebuttonpress: function () {
    var oView = this.getView();
    var Payload = oView.getModel("RoomModel").getData();
    Payload.Price=parseInt(Payload.Price);
    var oFileUploader = sap.ui.getCore().byId("idFileUploader1");
    var aFiles = oFileUploader.oFileUpload.files;

    if (!aFiles.length) {
        sap.m.MessageBox.error("Please select a file to upload.");
        return;
    }

    var oFile = aFiles[0]; 
    var reader = new FileReader();

    reader.onload = function (e) {
        var sBase64 = e.target.result.split(",")[1];
        Payload.File = sBase64;
        Payload.FileName = oFile.name;

        // Perform AJAX call only after file is fully read
        $.ajax({
            url: "https://rest.kalpavrikshatechnologies.com/HM_Master_Data",
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
            }.bind(this),
            error: function (err) {
                sap.m.MessageBox.error("Error uploading data or file.");
            }
        });
    }.bind(this);

    reader.readAsDataURL(oFile);
},
        AR_onCancelButtonPress: function () {
            this.AR_Dialog.close();
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

            var oFilterBar = oView.byId("PO_id_FilterbarEmployee");

            var oTable = oView.byId("idPOTable");
            var oBinding = oTable.getBinding("items");

            var sCustomerName = oView.byId("PO_id_CustomerName").getSelectedKey() || oView.byId("PO_id_CustomerName").getValue();
            var sCustomerID = oView.byId("PO_id_CompanyName").getSelectedKey() || oView.byId("PO_id_CompanyName").getValue();

            var aFilters = [];

            if (sCustomerName) {
                aFilters.push(new sap.ui.model.Filter("CustomerName", sap.ui.model.FilterOperator.Contains, sCustomerName));
            }

            if (sCustomerID) {
                aFilters.push(new sap.ui.model.Filter("companyCode", sap.ui.model.FilterOperator.Contains, sCustomerID));
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
        }


    });
});