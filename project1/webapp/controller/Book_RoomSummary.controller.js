sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
], (Controller, JSONModel, Formatter) => {
    "use strict";

    return Controller.extend("sap.ui.com.project1.controller.Book_RoomSummary", {
        Formatter: Formatter,
        onInit() {
            //          const oTable = this.byId("idFacilityRoomTable");

            // // Make the whole row selectable, not just the radio button
            // oTable.attachItemPress(function (oEvent) {
            //     oTable.setSelectedItem(oEvent.getParameter("listItem"));
            // });
            //         return sap.ui.core.UIComponent.getRouterFor(this);

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
    this._oSelectedTable = oEvent.getSource();
            const oContext = oSelectedItem.getBindingContext("HostelModel");
            const oSelectedData = oContext.getObject();

            // Save the selected data + path
        
            this._oSelectedFacility = oSelectedData;
            this._sSelectedPath = oContext.getPath(); // e.g. "/AllSelectedFacilities/2"

            //  Extract index from binding path and store it
            this._oSelectedIndex = parseInt(this._sSelectedPath.split("/").pop(), 10);

            // console.log("Selected Row Path:", this._sSelectedPath);
            // console.log("Selected Index:", this._oSelectedIndex);

            // sap.m.MessageToast.show("Selected: " + oSelectedData.PersonName);
        },
        onEditFacilityDetails: function () {
            if (!this._oSelectedFacility) {
                sap.m.MessageToast.show("Please select a row to edit.");
                return;
            }

            const oFacilityData = this._oSelectedFacility || {};

            // Preserve important fields
            const oSafeCopy = Object.assign({}, oFacilityData, {
                FacilityID: oFacilityData.FacilityID || (Date.now() + "_" + Math.random()),
                PersonName: oFacilityData.PersonName || oFacilityData.PersonName || ""
            });

            // Create a temporary model for dialog
            this._oEditModel = new sap.ui.model.json.JSONModel(oSafeCopy);
            this.getView().setModel(this._oEditModel, "edit");

            // Lazy-load fragment/dialog
            if (!this._oEditDialog) {
                this._oEditDialog = sap.ui.xmlfragment(
                    this.getView().getId(), // id prefix so controls are addressable
                    "sap.ui.com.project1.fragment.FacilitiTableUpdate",
                    this
                );
                this.getView().addDependent(this._oEditDialog);
            }

            // Open dialog
            this._oEditDialog.open();


            const sStart = oFacilityData.StartDate || oFacilityData.StartDateText || "";

            const oMinDate = this._parsePossibleDateString(sStart);
            if (oMinDate && !isNaN(oMinDate.getTime())) {
                // Fragment controls are created with view id prefix; use Fragment.byId(viewId, controlId)
                const oStartPicker = sap.ui.core.Fragment.byId(this.getView().getId(), "editStartDate");
                if (oStartPicker) {
                    oStartPicker.setMinDate(oMinDate);
                }
                // Also set minDate on endDate if needed (optional)
                const oEndPicker = sap.ui.core.Fragment.byId(this.getView().getId(), "editEndDate");
                if (oEndPicker) {
                    // Keep endDate >= startDate
                    oEndPicker.setMinDate(oMinDate);
                }
            }
        },
        _parsePossibleDateString: function (s) {
            if (!s) return null;
            // If already a Date
            if (s instanceof Date) return s;
            // If format is yyyy-MM-dd (common when valueFormat used)
            if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
                const parts = s.split("-");
                return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            }
            // If format dd/MM/yyyy
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
                const parts = s.split("/");
                return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            }
            // Fallback: try Date.parse
            const d = new Date(s);
            return isNaN(d.getTime()) ? null : d;
        },

        onEditDialogClose: function () {
            var oView = this.getView()
            const oTable = oView.byId("idFacilityRoomTable");
            if (oTable) {
                oTable.removeSelections();
            }
            this._oEditDialog.close();
        },
        onEditDateChange: function (oEvent) {
            const oView = this.getView();
            const oEditModel = oView.getModel("edit");

            if (!oEditModel) return;

            // Get raw values from model
            let sStart = oEditModel.getProperty("/StartDate") || "";
            let sEnd = oEditModel.getProperty("/EndDate") || "";

            // Convert to yyyy-MM-dd for Date()
            const normalize = (s) => {
                if (!s) return null;
                return s.includes("/") ? s.split("/").reverse().join("-") : s;
            };

            const sStartISO = normalize(sStart);
            const sEndISO = normalize(sEnd);

            const oStart = sStartISO ? new Date(sStartISO) : null;
            const oEnd = sEndISO ? new Date(sEndISO) : null;

            // --- BLOCK START DATE EARLIER THAN ORIGINAL ---
            const sOriginalStart = this._oSelectedFacility.StartDate; // from selected facility
            const oOriginalStart = normalize(sOriginalStart) ? new Date(normalize(sOriginalStart)) : null;

            if (oStart && oOriginalStart && oStart < oOriginalStart) {
                sap.m.MessageToast.show("Start Date cannot be earlier than original Start Date.");

                // Reset back to original
                oEditModel.setProperty("/StartDate", this._formatDateToDDMMYYYY(oOriginalStart));

                // Reset DatePicker UI also
                const oStartDP = sap.ui.core.Fragment.byId(oView.getId(), "editStartDate");
                if (oStartDP) oStartDP.setDateValue(oOriginalStart);

                return;
            }

            // Validate normal date logic
            if (!oStart || !oEnd || isNaN(oStart) || isNaN(oEnd)) {
                oEditModel.setProperty("/TotalDays", 0);
                return;
            }

            if (oEnd < oStart) {
                sap.m.MessageToast.show("End Date must be after Start Date");
                oEditModel.setProperty("/TotalDays", 0);
                return;
            }

            // --- Auto-format both dates to dd/MM/yyyy ---
            oEditModel.setProperty("/StartDate", this._formatDateToDDMMYYYY(oStart));
            oEditModel.setProperty("/EndDate", this._formatDateToDDMMYYYY(oEnd));

            // --- Calculate days ---
            const iDays = Math.ceil((oEnd - oStart) / (1000 * 60 * 60 * 24)) + 1;  // inclusive
            oEditModel.setProperty("/TotalDays", iDays);
        },

        // Utility function to format date
        _formatDateToDDMMYYYY: function (oDate) {
            const dd = String(oDate.getDate()).padStart(2, '0');
            const mm = String(oDate.getMonth() + 1).padStart(2, '0'); // Months start at 0
            const yyyy = oDate.getFullYear();
            return dd + "/" + mm + "/" + yyyy;
        },
        onEditFacilitySave: function () {
            const oView = this.getView();
            const oHostelModel = oView.getModel("HostelModel");
            const oEditModel = oView.getModel("edit");
            const oUpdatedData = { ...oEditModel.getData() }; // shallow copy
            const oSelected = this._oSelectedFacility;

            let aFacilities = this.getView().getModel("HostelModel").getData().Persons[oSelected.ID].AllSelectedFacilities
            const iIndex = aFacilities.findIndex(facility => facility === oSelected);

            if (iIndex === -1) {
                sap.m.MessageToast.show("No selected facility found.");
                return;
            }

            //  Update the selected facility in global list (replace with copy)
            aFacilities[iIndex] = oUpdatedData;
            oHostelModel.setProperty("/AllSelectedFacilities", aFacilities);

            // Update each person's facility summary
            const aPersons = oHostelModel.getProperty("/Persons") || [];
            aPersons.forEach((oPerson, iIndex) => {
                const personName = oPerson.FullName || `Person ${iIndex + 1}`;
                const aPersonFacilities = aFacilities.filter(f => f.PersonName === personName);
                oHostelModel.setProperty(`/Persons/${iIndex}/PersonFacilitiesSummary`, aPersonFacilities);
                oHostelModel.setProperty(`/Persons/${iIndex}/AllSelectedFacilities`, aPersonFacilities);
            });

            // //  Recalculate start/end range across all facilities
            // const parseDDMMYYYY = sDate => new Date(sDate.split("/").reverse().join("-"));
            // const allStartDates = aFacilities.map(f => parseDDMMYYYY(f.StartDate));
            // const allEndDates = aFacilities.map(f => parseDDMMYYYY(f.EndDate));

       
            // const roomRentPrice = parseFloat(oHostelModel.getProperty("/FinalPrice")) || 0;

            // const totals = this.calculateTotals(aPersons, allStartDates, allEndDates, roomRentPrice);
            // if (totals) {// Recalculate start/end range across all facilities
const parseDDMMYYYY = sDate => new Date(sDate.split("/").reverse().join("-"));
const allStartDates = aFacilities.map(f => parseDDMMYYYY(f.StartDate));
const allEndDates = aFacilities.map(f => parseDDMMYYYY(f.EndDate));

const minStart = this._formatDateToDDMMYYYY(new Date(Math.min(...allStartDates)));
const maxEnd = this._formatDateToDDMMYYYY(new Date(Math.max(...allEndDates)));

oHostelModel.setProperty("/StartDate", minStart);
oHostelModel.setProperty("/EndDate", maxEnd);

// Correct rent values
const fullRoomRent = parseFloat(oHostelModel.getProperty("/FinalPriceTotal")) || 0;
const perPersonRent = parseFloat(oHostelModel.getProperty("/FinalPrice")) || 0;

// Recalculate totals globally
const totals = this.calculateTotals(aPersons, minStart, maxEnd, perPersonRent);
if (totals) {
    oHostelModel.setProperty("/TotalDays", totals.TotalDays);
    oHostelModel.setProperty("/TotalFacilityPrice", totals.TotalFacilityPrice);
    oHostelModel.setProperty("/GrandTotal", totals.GrandTotal);
}

// Recalculate per-person totals
aPersons.forEach((oPerson, iIndex) => {
    const aFac = oPerson.AllSelectedFacilities || [];
    const iFacilityTotal = aFac.reduce((sum, f) => {
        return sum + (parseFloat(f.Price) || 0) * (parseFloat(f.TotalDays) || 0);
    }, 0);

    oHostelModel.setProperty(`/Persons/${iIndex}/TotalFacilityPrice`, iFacilityTotal);
    oHostelModel.setProperty(`/Persons/${iIndex}/RoomRentPerPerson`, perPersonRent);
    oHostelModel.setProperty(`/Persons/${iIndex}/GrandTotal`, iFacilityTotal + perPersonRent);
});
            

            //  Instead of refresh(true) — rebind items properly
            const oTable = oView.byId("idFacilityRoomTable");
            if (oTable) {
                const oBinding = oTable.getBinding("items");
                if (oBinding) {
                    oBinding.refresh(); // triggers re-render with new data
                }
            }
      

            this.onEditDialogClose();
            sap.m.MessageToast.show("Facility updated successfully!");


                
if (this._oSelectedTable) {
    this._oSelectedTable.removeSelections();
}
this._oSelectedTable = null;
this._oSelectedFacility = null;
this._oSelectedIndex = null;
this._sSelectedPath = null;

        },

        _formatDateToDDMMYYYY: function (oDate) {
            if (!(oDate instanceof Date)) {
                oDate = new Date(oDate);
            }
            const day = String(oDate.getDate()).padStart(2, "0");
            const month = String(oDate.getMonth() + 1).padStart(2, "0");
            const year = oDate.getFullYear();
            return `${day}/${month}/${year}`;
        },

        calculateTotals: function (aPersons, minStart, maxEnd, perPersonRent) {
            const oStartDate = this._parseDate(minStart);
            const oEndDate = this._parseDate(maxEnd);
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
                        StartDate: minStart,
                        EndDate: maxEnd,
                        TotalDays: iDays,
                        TotalAmount: fTotal,
                        Image: f.Image
                    });

                });
            });

            const totalFacilityPrice = totalFacilityPricePerDay * iDays;
            const grandTotal = totalFacilityPrice + Number(perPersonRent || 0);

            return {
                TotalDays: iDays,
                TotalFacilityPrice: totalFacilityPrice,
                GrandTotal: grandTotal,
                AllSelectedFacilities: aAllFacilities
            };
        }
        ,
       _parseDate: function (sDate) {

    // If already a Date object → return as-is
    if (sDate instanceof Date) {
        return sDate;
    }

    // If empty or invalid → return null
    if (!sDate || typeof sDate !== "string") {
        return null;
    }

    // Expecting dd/MM/yyyy
    const aParts = sDate.split("/");
    if (aParts.length !== 3) {
        return null;
    }

    return new Date(aParts[2], aParts[1] - 1, aParts[0]);
},










    });
});