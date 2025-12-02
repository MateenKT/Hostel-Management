sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function(Controller, JSONModel, MessageToast) {
    "use strict";
    return Controller.extend("sap.ui.com.project1.controller.TilePage", {
        onInit: function() {
            this.getOwnerComponent().getRouter().getRoute("TilePage").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function() {
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel");
            // if (oExistingModel) {
            //     const oData = oExistingModel.getData();
            //     oData.url = "https://rest.kalpavrikshatechnologies.com/";
            //     oData.headers = {
            //         name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
            //         password:"$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
            //         "Content-Type": "application/json",
            //     },
            //     oData.isRadioVisible = false;
            //     oExistingModel.setData(oData);
            //     this.getView().setModel(oExistingModel, "LoginModel");
            // }
            this.getView().getModel("LoginModel");
        },
        TileV_onpressInbox: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteAdmin");
        },
        Tile_onLogPress: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },
        TileV_onpressroomdetails: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteRoomDetails");
        },
        TileV_onpressbeddetails: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteBedDetails");
        },
        TileV_onpressextrafacilities: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteFacilitis");
        },
        TileV_onpressBedImages: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteRoomImages");
        },
        TileV_onpressfacilities: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteFacilitiesDetails");
        },
          TileV_onpressmaintaindata:function(){
                var oRouter = this.getOwnerComponent().getRouter();
               oRouter.navTo("RouteMaintainData");
        },
        TileV_onpressBranchdata:function(){
            var oRouter = this.getOwnerComponent().getRouter();
           oRouter.navTo("RouteBranchData");
        },
        TileV_onpresshostelfeatures:function(){
            var oRouter = this.getOwnerComponent().getRouter();
           oRouter.navTo("RouteHostelFeatures");
        },
        TileV_onpressManageInvoice:function(){
            var oRouter = this.getOwnerComponent().getRouter();
           oRouter.navTo("RouteManageInvoice");
        }, 
            TileV_onpressCouponDetails: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteCouponDetails");
        },	
    })
})