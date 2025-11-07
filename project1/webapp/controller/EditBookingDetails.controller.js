sap.ui.define([
 "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../utils/validation"

],function(BaseController,JSONModel,MessageToast,MessageBox,validation){
 "use strict";
 return BaseController.extend("sap.ui.com.project1.controller.EditBookingDetails",{
    onInit:function(){
         this.getOwnerComponent().getRouter().getRoute("EditBookingDetails").attachMatched(this._onRouteMatched, this);
    },
     _onRouteMatched: function () {
       
        },
 })
})