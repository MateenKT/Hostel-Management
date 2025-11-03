sap.ui.define([
    "./BaseController"
], (Controller) => {
    "use strict";

    return Controller.extend("sap.ui.com.project1.controller.Book_RoomSummary", {
        onInit() {
            return sap.ui.core.UIComponent.getRouterFor(this);
        },

        attachPatternMatched: function (oEvent) {
            // this.oResourceModel = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            // this.oModel = this.getView().getModel("oPoModel");
            // this.oModel.setProperty("/isNavBackVisible", true);
            // sap.ui.core.BusyIndicator.hide();
        },
        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHomePage");
        }

    });
});