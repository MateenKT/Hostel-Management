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
    var oView = this.getView()
    const oTable = oView.byId("idFacilityRoomTable");
    if (oTable) {
        oTable.removeSelections();
    }
this._oEditDialog.close();
},
onEditDateChange: function (oEvent) {
    const oEditModel = this.getView().getModel("edit");

    const sStartDateRaw = oEditModel.getProperty("/StartDate");
    const sEndDateRaw = oEditModel.getProperty("/EndDate");

    if (!sStartDateRaw || !sEndDateRaw) {
        oEditModel.setProperty("/TotalDays", 0);
        return;
    }

    // Parse and format dates to dd/MM/yyyy
    const oStart = new Date(sStartDateRaw.split("T")[0]);
    const oEnd = new Date(sEndDateRaw.split("T")[0]);

    // Validate dates
    if (isNaN(oStart.getTime()) || isNaN(oEnd.getTime())) {
        oEditModel.setProperty("/TotalDays", 0);
     
        return;
    }

    if (oEnd < oStart) {
        oEditModel.setProperty("/TotalDays", 0);
        sap.m.MessageToast.show("End Date must be after Start Date");
        return;
    }

    // Update StartDate and EndDate in formatted form
    oEditModel.setProperty("/StartDate", this._formatDateToDDMMYYYY(oStart));
    oEditModel.setProperty("/EndDate", this._formatDateToDDMMYYYY(oEnd));

    // Calculate days difference
    const iDiffDays = Math.ceil((oEnd - oStart) / (1000 * 60 * 60 * 24));
    oEditModel.setProperty("/TotalDays", iDiffDays);
}


,
onEditFacilitySave: function () {
    const oView = this.getView();
    const oHostelModel = oView.getModel("HostelModel");
    const oEditModel = oView.getModel("edit");
    const oUpdatedData = oEditModel.getData();
    const oSelected = this._oSelectedFacility;

    let aFacilities = oHostelModel.getProperty("/AllSelectedFacilities") || [];
    const iIndex = aFacilities.findIndex(facility => facility === oSelected);

    if (iIndex === -1) {
        sap.m.MessageToast.show("No selected facility found.");
        return;
    }

    // Update the global facility with edited data
    aFacilities[iIndex] = oUpdatedData;
    oHostelModel.setProperty("/AllSelectedFacilities", aFacilities);

    // Update the overall start and end dates based on all facilities
    // Extract all start/end dates in "dd/MM/yyyy", convert to Date for comparison
    let aStartDates = aFacilities.map(fac => fac.StartDate).filter(Boolean);
    let aEndDates = aFacilities.map(fac => fac.EndDate).filter(Boolean);

    const formatDateForCompare = (sDate) => new Date(sDate.split("/").reverse().join("-")); // "dd/MM/yyyy" to Date

    const minStartDateObj = aStartDates.length > 0 ? new Date(Math.min(...aStartDates.map(formatDateForCompare))) : null;
    const maxEndDateObj = aEndDates.length > 0 ? new Date(Math.max(...aEndDates.map(formatDateForCompare))) : null;

    if (minStartDateObj) {
        oHostelModel.setProperty("/StartDate", this._formatDateToDDMMYYYY(minStartDateObj));
    }
    if (maxEndDateObj) {
        oHostelModel.setProperty("/EndDate", this._formatDateToDDMMYYYY(maxEndDateObj));
    }

    // Now update corresponding PersonFacilitiesSummary per person
    const aPersons = oHostelModel.getProperty("/Persons") || [];
    aPersons.forEach((oPerson, iIndex) => {
        // Filter facilities in global list by person name
        const aPersonFacilitiesSummary = aFacilities.filter(
            item => item.PersonName === (oPerson.FullName || `Person ${iIndex + 1}`)
        );
        oHostelModel.setProperty(`/Persons/${iIndex}/PersonFacilitiesSummary`, aPersonFacilitiesSummary);
    });

    // Recalculate totals based on updated AllSelectedFacilities and updated dates, rent price
    const sStartDate = oHostelModel.getProperty("/StartDate");
    const sEndDate = oHostelModel.getProperty("/EndDate");
    const roomRentPrice = oHostelModel.getProperty("/Price");

    const totals = this.calculateTotals(aPersons, sStartDate, sEndDate, roomRentPrice);
    if (totals) {
        oHostelModel.setProperty("/TotalDays", totals.TotalDays);
        oHostelModel.setProperty("/TotalFacilityPrice", totals.TotalFacilityPrice);
        oHostelModel.setProperty("/GrandTotal", totals.GrandTotal);
    }

    oHostelModel.refresh(true);
    const oTable = oView.byId("idFacilityRoomTable");
    if (oTable) {
        oTable.removeSelections();
    }

    this.onEditDialogClose();
    sap.m.MessageToast.show("Facility updated successfully!");
},

_formatDateToDDMMYYYY: function(oDate) {
    if (!(oDate instanceof Date)) {
        oDate = new Date(oDate);
    }
    const day = String(oDate.getDate()).padStart(2, "0");
    const month = String(oDate.getMonth() + 1).padStart(2, "0");
    const year = oDate.getFullYear();
    return `${day}/${month}/${year}`;
},



calculateTotals: function (aPersons, sStartDate, sEndDate, roomRentPrice) {
    const oStartDate = this._parseDate(sStartDate);
    const oEndDate = this._parseDate(sEndDate);
    const diffTime = oEndDate - oStartDate;
    const iDays = Math.ceil(diffTime / (1000 * 3600 * 24));
    
    if (iDays <= 0) {
        sap.m.MessageToast.show("End Date must be after Start Date");
        return null;
    }

    let totalFacilityPricePerDay = 0;
    let aAllFacilities = [];

    aPersons.forEach((oPerson, iIndex) => {
        const aFacilities = oPerson.Facilities?.SelectedFacilities || [];
        aFacilities.forEach((f) => {
            const fPrice = parseFloat(f.Price || 0);
            totalFacilityPricePerDay += fPrice;
            const fTotal = fPrice * iDays;

           aAllFacilities.push({
    PersonName: oPerson.FullName || `Person ${iIndex + 1}`,
    FacilityName: f.FacilityName,
    Price: fPrice,
    StartDate: this._formatDateToDDMMYYYY(sStartDate),
    EndDate: this._formatDateToDDMMYYYY(sEndDate),
    TotalDays: iDays,
    TotalAmount: fTotal,
    Image: f.Image
});

        });
    });

    const totalFacilityPrice = totalFacilityPricePerDay * iDays;
    const grandTotal = totalFacilityPrice + Number(roomRentPrice || 0);

    return {
        TotalDays: iDays,
        TotalFacilityPrice: totalFacilityPrice,
        GrandTotal: grandTotal,
        AllSelectedFacilities: aAllFacilities
    };
}


,
_parseDate: function(sDate) {
    const aParts = sDate.split("/");
    return new Date(aParts[2], aParts[1] - 1, aParts[0]);
},









    });
});