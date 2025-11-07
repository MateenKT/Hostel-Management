sap.ui.define([
    "./BaseController",
   "sap/ui/model/json/JSONModel",
], (Controller,JSONModel) => {
    "use strict";

    return Controller.extend("sap.ui.com.project1.controller.Book_RoomSummary", {
        onInit() {
             const oTable = this.byId("idFacilityRoomTable");

    // Make the whole row selectable, not just the radio button
    oTable.attachItemPress(function (oEvent) {
        oTable.setSelectedItem(oEvent.getParameter("listItem"));
    });
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
        },
 onTableSelection: function (oEvent) {
    const oSelectedItem = oEvent.getParameter("listItem");
    if (!oSelectedItem) {
        sap.m.MessageToast.show("No row selected");
        return;
    }

    const oContext = oSelectedItem.getBindingContext("HostelModel");
    const oSelectedData = oContext.getObject();

    // Save the selected data + path
    this._oSelectedFacility = oSelectedData;
    this._sSelectedPath = oContext.getPath(); // e.g. "/AllSelectedFacilities/2"

    //  Extract index from binding path and store it
    this._oSelectedIndex = parseInt(this._sSelectedPath.split("/").pop(), 10);

    console.log("Selected Row Path:", this._sSelectedPath);
    console.log("Selected Index:", this._oSelectedIndex);

    sap.m.MessageToast.show("Selected: " + oSelectedData.PersonName);
},


    onEditFacilityDetails: function () {
    if (!this._oSelectedFacility) {
        sap.m.MessageToast.show("Please select a row to edit.");
        return;
    }

    const oFacilityData = this._oSelectedFacility;

    // Create a temporary model for dialog
    this._oEditModel = new JSONModel(Object.assign({}, oFacilityData));
    this.getView().setModel(this._oEditModel, "edit");

    if (!this._oEditDialog) {
        this._oEditDialog = sap.ui.xmlfragment(
            this.getView().getId(),
            "sap.ui.com.project1.fragment.FacilitiTableUpdate",
            this
        );
        this.getView().addDependent(this._oEditDialog);
    }

    this._oEditDialog.open();
},
onEditDialogClose:function(){
this._oEditDialog.close();
},
onEditDateChange: function (oEvent) {
    const oEditModel = this.getView().getModel("edit");

    const sStartDate = oEditModel.getProperty("/StartDate");
    const sEndDate = oEditModel.getProperty("/EndDate");

    // 🟡 Ensure both dates are selected
    if (!sStartDate || !sEndDate) {
        oEditModel.setProperty("/TotalDays", 0);
        return;
    }

    // 🟢 Parse in a format-safe way
    const oStart = new Date(sStartDate.split("T")[0]); // remove timezone if any
    const oEnd = new Date(sEndDate.split("T")[0]);

    // 🟠 Validate date range
    if (isNaN(oStart.getTime()) || isNaN(oEnd.getTime())) {
        oEditModel.setProperty("/TotalDays", 0);
        sap.m.MessageToast.show("Invalid date format. Please reselect.");
        return;
    }

    if (oEnd < oStart) {
        oEditModel.setProperty("/TotalDays", 0);
        sap.m.MessageToast.show("End Date must be after Start Date");
        return;
    }

    // 🔵 Calculate difference in days
    const iDiffDays = Math.ceil((oEnd - oStart) / (1000 * 60 * 60 * 24));

    // 🔴 Update model
    oEditModel.setProperty("/TotalDays", iDiffDays);
}

,
onEditFacilitySave: function () {
    const oHostelModel = this.getView().getModel("HostelModel");
    const oEditModel = this.getView().getModel("edit");
    const oUpdatedData = oEditModel.getData();
    const oSelected = this._oSelectedFacility;

    const aFacilities = oHostelModel.getProperty("/AllSelectedFacilities") || [];
    const iIndex = aFacilities.indexOf(oSelected);

    if (iIndex === -1) {
        sap.m.MessageToast.show("No selected facility found.");
        return;
    }

    aFacilities[iIndex] = oUpdatedData;
    oHostelModel.setProperty("/AllSelectedFacilities", aFacilities);

    this.onEditDialogClose();
    sap.m.MessageToast.show("Facility updated successfully!");
}












    });
});