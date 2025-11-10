sap.ui.define([
 "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../utils/validation",
     "../model/formatter"

],function(BaseController,JSONModel,MessageToast,MessageBox,validation,Formatter){
 "use strict";
 return BaseController.extend("sap.ui.com.project1.controller.EditBookingDetails",{
    Formatter: Formatter,
    onInit:function(){
         this.getOwnerComponent().getRouter().getRoute("EditBookingDetails").attachMatched(this._onRouteMatched, this);
    },
     _onRouteMatched: function () {
       
        },

        onNavBack:function(){
           var oRouter =   this.getOwnerComponent().getRouter();
           oRouter.navTo("RouteHomePage")
        }
 })
})