sap.ui.define([
	"sap/ui/core/mvc/Controller", 
     "../model/formatter"

], function(
	Controller,
    Formatter
) {
	"use strict";

	return Controller.extend("sap.ui.com.project1.controller.Admin", {
         Formatter: Formatter,
        onInit: function() {
                this.getOwnerComponent().getRouter().getRoute("RouteAdmin").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched:function(){
                $.ajax({
        url: "https://rest.kalpavrikshatechnologies.com/HM_Customer",
        method: "GET",
        contentType: "application/json",
         headers: {
          name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
          password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
         },
        success: function(response) {
            var oModel = new sap.ui.model.json.JSONModel(response.commentData);
            this.getView().setModel(oModel, "HostelModel");
        }.bind(this),
        })
        },
          HM_AssignRoom: function (oEvent) {
                 var table = this.byId("idPOTable");
                var selected = table.getSelectedItem();
                if(!selected){
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
        HM_onCancelButtonPress:function(){
                     var table = this.byId("idPOTable");
                     table.removeSelections();
            this.HM_Dialog.close();

        },
        onNavBack:function(){
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
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



	});
});