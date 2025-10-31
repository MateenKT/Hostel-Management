sap.ui.define([
        "./BaseController",
    "sap/ui/core/mvc/Controller"
], function (
  BaseController
) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Facilitis", {


        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteFacilitis").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function () {
            var model = new sap.ui.model.json.JSONModel({
                BranchCode: "",
                Type: "",
                Price: "",
                FacilityName: ""
            });
            this.getView().setModel(model, "FacilitiesModel")
            this.Onsearch()
        },
        FD_RoomDetails: function (oEvent) {
            var oView = this.getView();

            if (!this.ARD_Dialog) {
                this.ARD_Dialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.Facilities", this);
                oView.addDependent(this.ARD_Dialog);
            }
            // oView.byId("idRoomNumber").setVisible(false);
            // oView.byId("idActype").setVisible(false);

            this.ARD_Dialog.open();
        },
        FD_onCancelButtonPress: function () {
            this.ARD_Dialog.close();
        },
        FD_onsavebuttonpress: function () {
            var Payload=this.getView().getModel("FacilitiesModel").getData();
            Payload.Price=parseFloat(Payload.Price);
            this.ajaxCreateWithJQuery("HM_ExtraFacilities", { data: Payload });
            this.Onsearch();
            this.ARD_Dialog.close();

        },
        Onsearch:function(){
            
                this.ajaxReadWithJQuery("HM_ExtraFacilities","").then((oData) => {
                    var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                      var model = new sap.ui.model.json.JSONModel(oFCIAerData);
               this.getView().setModel(model, "Facilities")
               })
        },
         onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
        },
           onHome: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },
    });
});