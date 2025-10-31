sap.ui.define([
     "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
],function(Controller,JSONModel,MessageToast){
    "use strict";


    return Controller.extend("sap.ui.com.project1.controller.TilePage",{
        onInit:function(){
            
        },
        TileV_onpressInbox:function(){
              var oRouter = this.getOwnerComponent().getRouter();
               oRouter.navTo("RouteAdmin");
        },
        Tile_onLogPress:function(){
              var oRouter = this.getOwnerComponent().getRouter();
               oRouter.navTo("RouteHostel");
        },
        TileV_onpressroomdetails:function(){
             var oRouter = this.getOwnerComponent().getRouter();
               oRouter.navTo("RouteRoomDetails");
        },
        TileV_onpressbeddetails:function(){
                  var oRouter = this.getOwnerComponent().getRouter();
               oRouter.navTo("RouteBedDetails");
        },
        TileV_onpressextrafacilities:function(){
                var oRouter = this.getOwnerComponent().getRouter();
               oRouter.navTo("RouteFacilitis");
        }
    })
})