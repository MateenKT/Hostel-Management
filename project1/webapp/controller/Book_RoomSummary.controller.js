sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "../utils/validation",
], (Controller, JSONModel, Formatter, utils) => {
    "use strict";
    return Controller.extend("sap.ui.com.project1.controller.Book_RoomSummary", {
        Formatter: Formatter,
        onInit() {
              var oBtn = this.byId("couponApplyBtn");
              oBtn.setText("Apply Now")
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
            if (!oContext) {
                sap.m.MessageToast.show("Selection has no binding context");
                return;
            }

            const oSelectedData = oContext.getObject();
            this._oSelectedFacility = oSelectedData;
            this._sSelectedPath = oContext.getPath();

            //  Get BranchCode of the selected facility
            const sBranch = oSelectedData.Branch || "";
            console.log("Selected Facility BranchCode:", sBranch);

            // Parse index from path
            let idx = -1;
            try {
                const parts = this._sSelectedPath.split("/");
                idx = parseInt(parts[parts.length - 1], 10);
                if (isNaN(idx)) idx = -1;
            } catch (e) {
                idx = -1;
            }

            this._oSelectedIndex = idx;
        },

        // --- Open edit dialog for selected facility ---
        onEditFacilityDetails: function () {
            if (!this._oSelectedFacility) {
                sap.m.MessageToast.show("Please select a row to edit.");
                return;
            }
            const sBranchCode = this._oSelectedFacility.Branch || "";
            // Create safe shallow copy for editing
            const oFacilityData = this._oSelectedFacility || {};
            const oSafeCopy = Object.assign({}, oFacilityData, {
                FacilityID: oFacilityData.FacilityID || (Date.now() + "_" + Math.random()),
                PersonName: oFacilityData.PersonName || oFacilityData.PersonName || "",
                BranchCode: sBranchCode
            });
            // Booking Start Date from main model (dd/MM/yyyy)

            // Create / set edit model
            this._oEditModel = new JSONModel(oSafeCopy);
            this.getView().setModel(this._oEditModel, "edit");
            this.getView().getModel("edit").setProperty("/NewStartDate", new Date(this.getView().getModel("HostelModel").getProperty("/StartDate").split("/").reverse().join("-")));
            this.getView().getModel("edit").setProperty("/NewEndDate", new Date(this.getView().getModel("HostelModel").getProperty("/EndDate").split("/").reverse().join("-")));
            // Lazy load fragment (use view id as prefix)
            if (!this._oEditDialog) {
                this._oEditDialog = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "sap.ui.com.project1.fragment.FacilitiTableUpdate",
                    this
                );
                this.getView().addDependent(this._oEditDialog);
            }

            // open dialog
            this._oEditDialog.open();

            // Set minDate on datepickers to not allow earlier than existing start (if any)
            const sStart = oFacilityData.StartDate || oFacilityData.StartDateText || "";
            const oMinDate = this._parsePossibleDateString(sStart);
            if (sStart) {
                var date = this._parseDate(sStart);
                let oStart = new Date(date);

                // Add 1 day in LOCAL timezone
                oStart.setDate(oStart.getDate() + 1);

                // Convert to yyyy-MM-dd WITHOUT timezone conversion
                const sMinEndDate = [
                    oStart.getFullYear(),
                    String(oStart.getMonth() + 1).padStart(2, "0"),
                    String(oStart.getDate()).padStart(2, "0")
                ].join("-");

                //oEndDatePicker.setMinDate(new Date(sMinEndDate));
                const oEndPicker = sap.ui.core.Fragment.byId(this.getView().getId(), "FT_id_editEndDate");
                oEndPicker.setMinDate(new Date(sMinEndDate));
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
            const oView = this.getView();
            const oTable = this._oSelectedTable || oView.byId("idFacilitySummaryTable");
            if (oTable) {
                // remove selection
                try {
                    oTable.removeSelections(true);
                } catch (e) {
                    /* ignore */
                }
                const oBinding = oTable.getBinding("items");
                if (oBinding) oBinding.refresh();
            }

            // Clear selection cache
            this._oSelectedTable = null;
            this._oSelectedFacility = null;
            this._oSelectedIndex = null;
            this._sSelectedPath = null;
            this._oEditDialog.close();
        },

      onMonthSelectionChange: function (oEvent) {
    const oView = this.getView();
    const oHostelModel = oView.getModel("edit");

    const sUnit = oHostelModel.getProperty("/UnitText");
    const sStartDate = oHostelModel.getProperty("/StartDate") || "";

    const iSelectedNumber = parseInt(oEvent.getSource().getSelectedKey() || "1", 10);

    if (!sStartDate) {
        sap.m.MessageToast.show("Please select Start Date first.");
        return;
    }

    const oStart = this._parseDate(sStartDate);
    if (!(oStart instanceof Date) || isNaN(oStart)) {
        sap.m.MessageToast.show("Invalid Start Date.");
        return;
    }

    let iTotalDays = 0;
    let oEnd = new Date(oStart);

    // Use fixed days: 30 days per month, 365 per year
    if (sUnit === "Per Month") {
        iTotalDays = iSelectedNumber * 30;
        oEnd.setDate(oEnd.getDate() + iTotalDays);
        oHostelModel.setProperty("/TotalMonths", iSelectedNumber);
        oHostelModel.setProperty("/TotalYears", 0);
    } else if (sUnit === "Per Year") {
        iTotalDays = iSelectedNumber * 365;
        oEnd.setDate(oEnd.getDate() + iTotalDays);
        oHostelModel.setProperty("/TotalYears", iSelectedNumber);
        oHostelModel.setProperty("/TotalMonths", 0);
    } else {
        return;
    }

    const sEndDate = this._formatDateToDDMMYYYY(oEnd);

    oHostelModel.setProperty("/EndDate", sEndDate);
    oHostelModel.setProperty("/TotalDays", iTotalDays);
},

        onEditDateChange: function (oEvent) {
    const oView = this.getView();
    const oModel = oView.getModel("edit");

    const sUnit = oModel.getProperty("/UnitText"); // Per Day / Per Month / Per Year
    const sStart = oModel.getProperty("/StartDate");

    if (!sStart) return;

    // Convert DD/MM/YYYY → JS Date
    const toJSDate = (s) => {
        if (typeof s !== "string") return new Date(s);
        if (s.includes("/")) {
            const [d, m, y] = s.split("/");
            return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
        }
        return new Date(s);
    };

    const oStart = toJSDate(sStart);
    if (!(oStart instanceof Date) || isNaN(oStart)) return;

    let oEnd = new Date(oStart);

    /** GET NUMBER OF MONTHS/YEAR SELECTED */
    let iCount = 1;
    if (sUnit === "Per Month") {
        iCount = parseInt(oModel.getProperty("/TotalMonths") || "1", 10);
        // Use fixed days per month (30)
        const iDaysToAdd = iCount * 30;
        oEnd.setDate(oEnd.getDate() + iDaysToAdd);
        oModel.setProperty("/TotalDays", iDaysToAdd);
    } else if (sUnit === "Per Year") {
        iCount = parseInt(oModel.getProperty("/TotalYears") || "1", 10);
        const iDaysToAdd = iCount * 365;
        oEnd.setDate(oEnd.getDate() + iDaysToAdd);
        oModel.setProperty("/TotalDays", iDaysToAdd);
    } else {
        // For Per Day / Per Hour / custom -> keep existing EndDate if present, otherwise no-op
        const sEnd = oModel.getProperty("/EndDate");
        if (sEnd) {
            oEnd = toJSDate(sEnd);
        }
        // Compute total days by difference (no extra +1)
        const msPerDay = 1000 * 60 * 60 * 24;
        const iDays = Math.ceil((oEnd - oStart) / msPerDay);
        oModel.setProperty("/TotalDays", iDays >= 0 ? iDays : 0);
    }

    /** FORMAT DATE: JS Date -> DD/MM/YYYY */
    const sNewEndDate = this._formatDateToDDMMYYYY(oEnd);
    oModel.setProperty("/EndDate", sNewEndDate);

    /** UPDATE MINIMUM END DATE IN UI */
    const oEndDP = sap.ui.getCore().byId(oView.getId() + "--FT_id_editEndDate");
    if (oEndDP) {
        let oMin = new Date(oStart);
        oMin.setDate(oMin.getDate() + 1);
        oEndDP.setMinDate(oMin);
    }

    utils._LCvalidateDate(oEvent);
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

            if (!oHostelModel || !oEditModel)
                return sap.m.MessageToast.show("Missing models");

            const sUnitText = oEditModel.getProperty("/UnitText");
            const iTotalDays = Number(oEditModel.getProperty("/TotalDays") || 0);

       if (sUnitText === "Per Day" && iTotalDays < 1) {
    sap.m.MessageBox.error("Total Days must be at least 1 for Per Day booking.");
    return;
      }

            let sViewId = this.getView().getId();
            const oStartDate = sap.ui.core.Fragment.byId(sViewId, "FT_id_editStartDate")
            if (!utils._LCvalidateDate(oStartDate, "ID") && (sUnitText === "Per Day" || sUnitText === "Per Month" || sUnitText === "Per Year")) {
                sap.m.MessageToast.show("Please Select Start Date");
                return;
            }

            const oEndDate = sap.ui.core.Fragment.byId(sViewId, "FT_id_editEndDate")
            if (!utils._LCvalidateDate(oEndDate, "ID") && (sUnitText === "Per Day" || sUnitText === "Per Month" || sUnitText === "Per Year")) {
                sap.m.MessageToast.show("Please Select End Date");
                return;
            }

            if (sUnitText === "Per Hour") {
                const sViewId = this.getView().getId();
                const oStartTime = sap.ui.core.Fragment.byId(sViewId, "FT_id_editStartTime");
                const oEndTime = sap.ui.core.Fragment.byId(sViewId, "FT_id_editEndTime");
                const oTotalTime = sap.ui.core.Fragment.byId(sViewId, "editTotalTime");

                if (!oStartTime.getValue()) {
                    oStartTime.setValueState("Error");
                    sap.m.MessageToast.show("Start Time is required");
                    return;
                }

                if (!oEndTime.getValue()) {
                    oEndTime.setValueState("Error");
                    sap.m.MessageToast.show("End Time is required");
                    return;
                }

                if (!oTotalTime.getValue()) {
                    sap.m.MessageToast.show("Total Time is required");
                    return;
                }

                // Validate time sequence
                if (oStartTime.getValue() >= oEndTime.getValue()) {
                    sap.m.MessageToast.show("End Time must be later than Start Time");
                    return;
                }

                var StartDate = sap.ui.core.Fragment.byId(sViewId, "FT_id_editStartDate")
                if (!utils._LCvalidateDate(StartDate, "ID")) {
                    sap.m.MessageToast.show("Please Select Start Date");
                    return;
                }

                var EndDate = sap.ui.core.Fragment.byId(sViewId, "FT_id_editEndDate")
                if (!utils._LCvalidateDate(EndDate, "ID")) {
                    sap.m.MessageToast.show("Please Select End Date");
                    return;
                }
            }

            const oUpdatedData = Object.assign({}, oEditModel.getData()); // shallow copy
            let aFacilities = oHostelModel.getProperty("/AllSelectedFacilities") || [];

            // Fallback: if /AllSelectedFacilities is empty, build it from persons
            if (!Array.isArray(aFacilities) || aFacilities.length === 0) {
                const aPersons = oHostelModel.getProperty("/Persons") || [];
                aFacilities = aPersons.flatMap((p, pi) => {
                    const arr = (p.AllSelectedFacilities || p.Facilities?.SelectedFacilities || []);
                    // ensure PersonName present
                    return (arr || []).map(f => Object.assign({}, f, {
                        PersonName: p.FullName || (`Person ${pi + 1}`)
                    }));
                });
                // set it back so future ops are consistent
                oHostelModel.setProperty("/AllSelectedFacilities", aFacilities);
            }

            // Attempt 1: use stored index (if it looks valid)
            let iIndex = this._oSelectedIndex;

            // Attempt 2: if index invalid, find by identity (FacilityID + PersonName + StartDate + EndDate)
            if (iIndex === -1 && this._oSelectedFacility) {
                const sel = this._oSelectedFacility;
                iIndex = aFacilities.findIndex(f => {
                    // Prefer unique key FacilityID if present
                    if (f.FacilityID && sel.FacilityID) return String(f.FacilityID) === String(sel.FacilityID);
                    // else fallback to composite match
                    return (
                        String(f.FacilityName || "") === String(sel.FacilityName || "") &&
                        String(f.PersonName || "") === String(sel.PersonName || "") &&
                        String(f.StartDate || "") === String(sel.StartDate || "") &&
                        String(f.EndDate || "") === String(sel.EndDate || "")
                    );
                });
            }

            // If still not found, show helpful debug message and try best-effort: abort
            if (iIndex === -1) {
                console.warn("Could not find selected facility in /AllSelectedFacilities", {
                    all: aFacilities,
                    selected: this._oSelectedFacility
                });
                sap.m.MessageToast.show("Could not find selected facility in global list. Please re-select the row and try again.");
                return;
            }

            // Replace the facility entry at the found index
            //aFacilities[iIndex] = oUpdatedData;
            // After updating aFacilities and setting it globally:
            const aPersons = oHostelModel.getProperty("/Persons") || [];
            // aPersons[oUpdatedData.ID].AllSelectedFacilities[iIndex] = oUpdatedData; // Example of updating // 1. Update person's facility list
            aPersons[oUpdatedData.ID].AllSelectedFacilities[iIndex] = oUpdatedData;

            // 2. Update global list so table refreshes
            aFacilities[iIndex] = oUpdatedData;
            oHostelModel.setProperty("/AllSelectedFacilities", aFacilities);
            // --- FIX FOR PER HOUR FACILITY (ensures TotalTime goes to payload) ---
if (oUpdatedData.UnitText === "Per Hour") {

    // Update global list
    aFacilities[iIndex].TotalTime = oUpdatedData.TotalTime || "";

    // Update person-wise list
    if (aPersons[oUpdatedData.ID] &&
        aPersons[oUpdatedData.ID].AllSelectedFacilities &&
        aPersons[oUpdatedData.ID].AllSelectedFacilities[iIndex]) {

        aPersons[oUpdatedData.ID].AllSelectedFacilities[iIndex].TotalTime =
            oUpdatedData.TotalTime || "";
    }
}
            // 3. Apply model refresh
            oHostelModel.refresh(true);

            // 4. Refresh table UI
            var sTable = this.getView().byId("idFacilitySummaryTable");
            if (sTable) {
                const oBinding = sTable.getBinding("items");
                if (oBinding) oBinding.refresh(true);
            }

            const perPersonRent = parseFloat(oHostelModel.getProperty("/FinalPrice")) || parseFloat(oHostelModel.getProperty("/Price")) || 0;

            const totals = this.calculateTotals(aPersons, perPersonRent);
            if (totals) {
                //oHostelModel.setProperty("/TotalDays", totals.TotalDays);
                oHostelModel.setProperty("/TotalFacilityPrice", totals.TotalFacilityPrice);
                oHostelModel.setProperty("/GrandTotal", totals.GrandTotal);
                // GST based on HostelModel Country (NOT person country)
oHostelModel.setProperty("/CGST", totals.CGST || 0);
oHostelModel.setProperty("/SGST", totals.SGST || 0);
oHostelModel.setProperty("/FinalTotalCost", totals.FinalTotal || totals.GrandTotal);

            }

            var overAllTotal = 0;
            // Per-person recalculation
           aPersons.forEach((oPerson, idx) => {
    const facs = oPerson.AllSelectedFacilities || [];
    const totalAmount = facs.reduce((sum, facility) => {
        return sum + (facility.TotalAmount || 0);
    }, 0);

    // Update only facility price
    oHostelModel.setProperty(`/Persons/${idx}/TotalFacilityPrice`, totalAmount);

    // DO NOT override room rent
    const oldRoomRent = oPerson.RoomRentPerPerson || 0;

    // Recalculate grand total
    oHostelModel.setProperty(`/Persons/${idx}/GrandTotal`, totalAmount + oldRoomRent);
    overAllTotal += totalAmount + oldRoomRent;
});

            oHostelModel.setProperty("/OverallTotalCost", overAllTotal);

            // 5 Re-apply coupon & tax after facility edit
const discountApplied = Number(oHostelModel.getProperty("/AppliedDiscount") || 0);
const couponCode = oHostelModel.getProperty("/CouponCode");
let updatedSubtotal = overAllTotal;

// If coupon already applied -> recalc discount
if (couponCode && discountApplied > 0) {

    // Discount can be PERCENT or FLAT, so read saved info
    const discountType = oHostelModel.getProperty("/AppliedDiscountType");  // "percentage" or "flat"
    const discountValue = Number(oHostelModel.getProperty("/AppliedDiscountValue") || 0);

    let newDiscountAmount = 0;

    // Recalculate discount based on UPDATED subtotal
    if (discountType === "percentage") {
        newDiscountAmount = updatedSubtotal * (discountValue / 100);
    } else {
        newDiscountAmount = discountValue;
    }

    // Apply discount
    updatedSubtotal = updatedSubtotal - newDiscountAmount;

    // Save updated discount value
    oHostelModel.setProperty("/AppliedDiscount", newDiscountAmount);
}

// 6️⃣ Re-apply taxes (India → CGST+SGST)
const isIndia = oHostelModel.getProperty("/IsIndia");
let cgst = 0, sgst = 0, finalTotal = updatedSubtotal;

if (isIndia) {
    cgst = updatedSubtotal * 0.09;
    sgst = updatedSubtotal * 0.09;
    finalTotal = updatedSubtotal + cgst + sgst;
}

// Save updated tax + final total
oHostelModel.setProperty("/OverallTotalCost", updatedSubtotal);
oHostelModel.setProperty("/CGST", cgst);
oHostelModel.setProperty("/SGST", sgst);
oHostelModel.setProperty("/FinalTotalCost", finalTotal);

            let aSummary = oHostelModel.getProperty("/PersonFacilitiesSummary") || [];

            const iSummaryIndex = aSummary.findIndex(f => {
                return String(f.FacilityID) === String(oUpdatedData.FacilityID);
            });

            if (iSummaryIndex !== -1) {
                aSummary[iSummaryIndex] = Object.assign({}, aSummary[iSummaryIndex], oUpdatedData);
                oHostelModel.setProperty("/PersonFacilitiesSummary", aSummary);
            }
            // Refresh bindings (table)
            const oTable = this._oSelectedTable || oView.byId("idFacilitySummaryTable");
            if (oTable) {
                // remove selection
                try {
                    oTable.removeSelections(true);
                } catch (e) {
                    /* ignore */
                }
                const oBinding = oTable.getBinding("items");
                if (oBinding) oBinding.refresh();
            }

            // Clear selection cache
            this._oSelectedTable = null;
            this._oSelectedFacility = null;
            this._oSelectedIndex = null;
            this._sSelectedPath = null;

            this.onEditDialogClose();
            var Table = this._oSelectedTable || oView.byId("idFacilitySummaryTable");
            if (Table) {
                // remove selection
                try {
                    Table.removeSelections(true);
                } catch (e) {
                    /* ignore */
                }
                const oBinding = Table.getBinding("items");
                if (oBinding) oBinding.refresh();
            }
            this._oSelectedTable = null;
            this._oSelectedFacility = null;
            this._oSelectedIndex = null;
            this._sSelectedPath = null;
            sap.m.MessageToast.show("Facility updated successfully!");
        },

      _formatDateToDDMMYYYY: function (dt) {
    if (!dt || !(dt instanceof Date)) return "";
    const dd = String(dt.getDate()).padStart(2, "0");
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const yyyy = dt.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
},

        calculateTotals: function (aPersons, roomRentPrice) {
            const msPerDay = 1000 * 60 * 60 * 24;
            // helper: parse a date string (supports dd/MM/yyyy, yyyy-MM-dd or Date object)
            const parseDateSafe = (v) => {
                if (!v) return null;
                if (v instanceof Date) return new Date(v.getFullYear(), v.getMonth(), v.getDate());
                // if format is dd/MM/yyyy
                if (typeof v === "string" && v.indexOf("/") !== -1) {
                    const parts = v.split("/");
                    // dd/MM/yyyy
                    if (parts.length === 3) {
                        return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                    }
                }
                // if ISO yyyy-MM-dd or full ISO
                if (typeof v === "string") {
                    const d = new Date(v);
                    if (!isNaN(d)) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
                }
                // fallback
                try {
                    const d = new Date(v);
                    if (!isNaN(d)) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
                } catch (e) { }
                return null;
            };

            // helper: parse TotalTime which may be "HH:MM", "H", "H.MM" or numeric string -> returns hours as number (decimal)
            const parseTotalTimeToHours = (val) => {
                if (val == null || val === "") return 0;
                if (typeof val === "number") return val;
                const s = String(val).trim();
                // HH:MM
                if (s.indexOf(":") > -1) {
                    const parts = s.split(":").map(p => Number(p || 0));
                    const hh = isNaN(parts[0]) ? 0 : parts[0];
                    const mm = isNaN(parts[1]) ? 0 : parts[1];
                    return hh + (mm / 60);
                }
                // decimal with comma
                if (s.indexOf(",") > -1) {
                    const n = Number(s.replace(",", "."));
                    return isNaN(n) ? 0 : n;
                }
                // plain numeric string
                const n = Number(s);
                return isNaN(n) ? 0 : n;
            };

            let totalFacilityPrice = 0;
            let aAllFacilities = [];

            aPersons.forEach((oPerson, iIndex) => {
                const aFacilities = oPerson.AllSelectedFacilities || [];
                const personFacilities = [];

                aFacilities.forEach((f) => {
                    // parse start/end as date-only (midnight) to compute inclusive days
                    const fStartDate = parseDateSafe(f.StartDate);
                    const fEndDate = parseDateSafe(f.EndDate);

                    if (!fStartDate || !fEndDate) {
                        // Skip invalid dates
                        sap.m.MessageToast.show("Invalid facility start/end date for " + (f.FacilityName || ""));
                        return;
                    }
                    // USE the user-calculated dialog value directly
                    const fDays = Number(f.TotalDays || 0);


                    if (fDays <= 0) {
                        sap.m.MessageToast.show("Facility End Date must be same or after Start Date for " + (f.FacilityName || ""));
                        return;
                    }

                    // Price
                    const fPrice = parseFloat(f.Price || 0) || 0;
                    let fTotal = 0;

                    // For per-hour calculation: use the user-provided TotalTime (hours per day)
                    // Prefer f.TotalTime (string like "02:00" or "2") or fallback to f.TotalHours if set
                    const hoursPerDayFromTotalTime = parseTotalTimeToHours(f.TotalTime);
                    const hoursPerDayFallback = Number(f.TotalHours || 0); // older field maybe exist
                    const hoursPerDay = hoursPerDayFromTotalTime > 0 ? hoursPerDayFromTotalTime : (hoursPerDayFallback > 0 ? hoursPerDayFallback : 0);

                    // months/years calculation helper
                    const fMonths = (fEndDate.getFullYear() - fStartDate.getFullYear()) * 12 + (fEndDate.getMonth() - fStartDate.getMonth());
                    const normalizedMonths = (typeof fMonths === "number" && fMonths > 0) ? fMonths : 1;
                    const fYears = Math.max(1, fEndDate.getFullYear() - fStartDate.getFullYear());

                    switch ((f.UnitText || "").toString().toLowerCase()) {

                        case "per hour":
                        case "hour": {
                            // total hours = hours per day * number of days
                            const totalHours = hoursPerDay * fDays;
                            fTotal = fPrice * totalHours;
                            break;
                        }

                        case "per day":
                        case "day": {
                            fTotal = fPrice * fDays;
                            break;
                        }

                        case "per month":
                        case "month": {
                            fTotal = fPrice * (normalizedMonths <= 0 ? 1 : normalizedMonths);
                            break;
                        }

                        case "per year":
                        case "year": {
                            fTotal = fPrice * (fYears <= 0 ? 1 : fYears);
                            break;
                        }

                        default: {
                            // fallback -> per day
                            fTotal = fPrice * fDays;
                            break;
                        }
                    }

                    // accumulate
                    totalFacilityPrice += fTotal;

                    // build facility summary object (note: TotalHours here is hoursPerDay; if you want totalHours overall, you can compute hoursPerDay * fDays)
                    const data = {
                        ID: iIndex,
                        PersonName: oPerson.FullName || `Person ${iIndex + 1}`,
                        FacilityName: f.FacilityName,
                        Price: fPrice,
                        StartDate: f.StartDate,
                        EndDate: f.EndDate,
                        // hoursPerDay (user provided) and overallHours
                        HoursPerDay: hoursPerDay,
                        TotalHours: +(hoursPerDay * fDays).toFixed(2),
                        TotalDays: fDays,
                        TotalMonths: normalizedMonths,
                        TotalYears: fYears,
                        TotalAmount: +fTotal.toFixed(2),
                        Image: f.Image,
                        Currency: f.Currency || oPerson.Currency || oHostelModel?.getProperty?.("/Currency") || "",
                        UnitText: f.UnitText,
                        // keep original TotalTime string so UI can display it if needed
                        TotalTime: f.TotalTime
                    };

                    aAllFacilities.push(data);
                    personFacilities.push(data);
                });

                // assign back per person
                oPerson.AllSelectedFacilities = personFacilities;
            });

            const grandTotal = totalFacilityPrice + Number(roomRentPrice || 0);

            //-------------------------------------------------------------
// GST Based Only on HostelModel Country
//-------------------------------------------------------------
const sCountry = this.getView().getModel("HostelModel").getProperty("/Country") || "";
let cgst = 0, sgst = 0, finalTotal = grandTotal;

if (sCountry === "India") {
    cgst = grandTotal * 0.09;
    sgst = grandTotal * 0.09;
    finalTotal = grandTotal + cgst + sgst;
}

return {
    TotalFacilityPrice: +totalFacilityPrice.toFixed(2),
    GrandTotal: +grandTotal.toFixed(2),
    CGST: +cgst.toFixed(2),
    SGST: +sgst.toFixed(2),
    FinalTotal: +finalTotal.toFixed(2),
    AllSelectedFacilities: aAllFacilities
};


            // return {
            //     TotalFacilityPrice: +totalFacilityPrice.toFixed(2),
            //     GrandTotal: +grandTotal.toFixed(2),
            //     AllSelectedFacilities: aAllFacilities
            // };
        },

       _parseDate: function (s) {
    if (!s) return null;
    if (typeof s !== "string") return new Date(s);
    const parts = s.split("/");
    if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        return new Date(y, m, d);
    }
    return new Date(s);
},

        onUnitTextChange: function (oEvent) {
            const oEditModel = this.getView().getModel("edit");
            const oFacilityModel = this.getView().getModel("FacilityModel");

            const sSelectedUnit = oEvent.getSource().getSelectedItem().getText();
            const sFacilityName = oEditModel.getProperty("/FacilityName");
            const sBranch = this.getView().getModel("HostelModel").getProperty("/BranchCode");

            // Update unit type
            oEditModel.setProperty("/UnitText", sSelectedUnit);

            //  CLEAR START & END DATE & DAYS WHEN UNIT TYPE CHANGES
            oEditModel.setProperty("/StartDate", "");
            oEditModel.setProperty("/EndDate", "");
            oEditModel.setProperty("/TotalDays", "");
            oEditModel.refresh(true);

            // Get facilities list
            const aFacilities = oFacilityModel.getProperty("/Facilities") || [];

            const oMatched = aFacilities.find(f =>
                f.FacilityName === sFacilityName &&
                f.BranchCode === sBranch
            );

            if (!oMatched) {
                sap.m.MessageToast.show("Price not found for selected Unit Type.");
                return;
            }

            // Pick correct price based on Unit Type
            let price = 0;

            if (sSelectedUnit === "Per Day") price = oMatched.PricePerDay;
            if (sSelectedUnit === "Per Month") price = oMatched.PricePerMonth;
            if (sSelectedUnit === "Per Year") price = oMatched.PricePerYear;
            if (sSelectedUnit === "Per Hour") price = oMatched.PricePerHour;

            // Reset Month/Year count to 1 when unit changes
            if (sSelectedUnit === "Per Month") {
                oEditModel.setProperty("/TotalMonths", "1");
                oEditModel.setProperty("/TotalYears", ""); // clear year
                oEditModel.setProperty("/StartTime", ""); 
                oEditModel.setProperty("/EndTime", ""); 
                oEditModel.setProperty("/TotalTime", ""); 
            }

            if (sSelectedUnit === "Per Year") {
                oEditModel.setProperty("/TotalYears", "1");
                oEditModel.setProperty("/TotalMonths", ""); 
                oEditModel.setProperty("/StartTime", ""); 
                oEditModel.setProperty("/EndTime", ""); 
                oEditModel.setProperty("/TotalTime", ""); 
            }

            // Update price in dialog
            oEditModel.setProperty("/Price", price);
        },

        onOpenDocumentPreview: function (oEvent) {
            const oCtx = oEvent.getSource().getBindingContext("HostelModel");
            const oDoc = oCtx && oCtx.getObject();

            if (!oDoc || !oDoc.Document) {
                sap.m.MessageToast.show("No document to preview.");
                return;
            }

            let sData = oDoc.Document;

            if (!sData.startsWith("data:")) {
                const sType = oDoc.FileType || "application/octet-stream";
                sData = `data:${sType};base64,${sData}`;
            }

            const sTitle = oDoc.FileName || "Document Preview";

            /** DESTROY OLD DIALOG IF EXISTS */
            if (this._oImageDialog) {
                this._oImageDialog.destroy();
                this._oImageDialog = null;
            }

            let oContent;

            if (oDoc.FileType.includes("image")) {

                const oFlex = new sap.m.FlexBox({
                    width: "100%",
                    height: "100%",
                    renderType: "Div",
                    justifyContent: "Center",
                    alignItems: "Center",
                    items: [
                        new sap.m.Image({
                            id: this.createId("previewImage"),
                            src: sData,
                            densityAware: false,
                            width: "100%",
                            height: "100%",
                            style: "object-fit:cover;display:block;margin:0;padding:0;"
                        })
                    ]
                });

                oContent = oFlex;
            }

            /** ============================
             *  PDF PREVIEW 
             * ============================ */
            else if (oDoc.FileType.includes("pdf")) {

                const oHtml = new sap.ui.core.HTML({
                    content: `<iframe src="${sData}" style="width:100%;height:100%;border:0;"></iframe>`
                });

                oContent = oHtml;
            }

            /** ============================
             *  UNSUPPORTED FILE
             * ============================ */
            else {
                oContent = new sap.m.VBox({
                    items: [
                        new sap.m.Text({
                            text: "Preview not supported."
                        }),
                        new sap.m.Link({
                            text: "Download File",
                            href: sData,
                            download: oDoc.FileName
                        })
                    ],
                    width: "100%",
                    height: "100%",
                    justifyContent: "Center",
                    alignItems: "Center"
                });
            }

            /** ============================
             *  CREATE DIALOG
             * ============================ */
            this._oImageDialog = new sap.m.Dialog({
                title: sTitle,
                contentWidth: "50%",
                contentHeight: "60%",
                draggable: true,
                resizable: true,
                horizontalScrolling: false,
                verticalScrolling: false,
                contentPadding: "0px",
                content: [oContent],

                beginButton: new sap.m.Button({
                    text: "Close",
                    press: function () {
                        this._oImageDialog.close();
                    }.bind(this)
                }),

                afterClose: function () {
                    this._oImageDialog.destroy();
                    this._oImageDialog = null;
                }.bind(this)
            });

            this.getView().addDependent(this._oImageDialog);

            this._oImageDialog.open();
        },

        // Close preview
        onClosePreview: function () {
            if (this._oDocPreviewDialog) {
                this._oDocPreviewDialog.close();
            }
        },
onTimeChange: function () {
    const oEditModel = this.getView().getModel("edit");

    const sStart = oEditModel.getProperty("/StartTime"); // example: "09"
    const sEnd = oEditModel.getProperty("/EndTime");     // example: "12"

    if (!sStart || !sEnd) {
        oEditModel.setProperty("/TotalTime", "");
        return;
    }

    const startHour = parseInt(sStart, 10);
    const endHour = parseInt(sEnd, 10);

    if (endHour < startHour) {
        sap.m.MessageToast.show("End Time cannot be earlier than Start Time.");
        oEditModel.setProperty("/TotalTime", "");
        return;
    }

    const totalHours = endHour - startHour;

    oEditModel.setProperty("/TotalTime", totalHours.toString());
},



        _getTimePeriod: function (sTime) {
            if (!sTime) return "";
            const [hour] = sTime.split(":").map(Number);
            return hour < 12 ? "Morning" : "Evening";
        },
        _sumGrandTotalOfPersons: function () {
    const oHostelModel = this.getView().getModel("HostelModel");
    const aPersons = oHostelModel.getProperty("/Persons") || [];

    let sum = 0;

    aPersons.forEach(person => {
        sum += Number(person.GrandTotal || 0);
    });

    return sum;
},

        onChangeCouponCode: async function (oEvent) {
    var oHostelModel = this.getView().getModel("HostelModel");
     var oBtn = this.byId("couponApplyBtn");
    //  sap.ui.getCore().byId(this.createId("couponApplyBtn"))
    var sEnteredCode = oHostelModel.getProperty("/CouponCode")?.trim();
    var sBranchCode = oHostelModel.getProperty("/BranchCode");

     if( sEnteredCode === ""){
       sap.m.MessageToast.show("Enter Coupon for Discount");
    return;
    }

   if (oBtn.getText() === "Cancel") {

    oHostelModel.setProperty("/CouponCode", "");
    oHostelModel.setProperty("/AppliedDiscount", "");

    // 1️⃣ Re-sum GrandTotal of all persons
    const subTotal = this._sumGrandTotalOfPersons();
    oHostelModel.setProperty("/OverallTotalCost", subTotal);

    // 2️⃣ Re-apply tax logic
    const isIndia = oHostelModel.getProperty("/IsIndia");
    let cgst = 0, sgst = 0, finalTotal = subTotal;

    if (isIndia) {
        cgst = subTotal * 0.09;
        sgst = subTotal * 0.09;
        finalTotal = subTotal + cgst + sgst;
    }

    // 3️⃣ Update fields
    oHostelModel.setProperty("/CGST", cgst);
    oHostelModel.setProperty("/SGST", sgst);
    oHostelModel.setProperty("/FinalTotalCost", finalTotal);
    oHostelModel.setProperty("/AppliedDiscount", 0);

    // 4️⃣ Change button back to Apply
    oBtn.setText("Apply Now");

    sap.m.MessageToast.show("Coupon removed. Prices restored.");
    return;
}


     if (!sEnteredCode) {

        const originalTotal  = oHostelModel.getProperty("/OverallTotalCost");
        const originalCGST   = oHostelModel.getProperty("/CGST");
        const originalSGST   = oHostelModel.getProperty("/SGST");
        const originalFinal  = oHostelModel.getProperty("/FinalTotalCost");

        oHostelModel.setProperty("/AppliedDiscount", 0);
        oHostelModel.setProperty("/OverallTotalCost", originalTotal);
        oHostelModel.setProperty("/CGST", originalCGST);
        oHostelModel.setProperty("/SGST", originalSGST);
        oHostelModel.setProperty("/FinalTotalCost", originalFinal);

        sap.m.MessageToast.show("Coupon removed. Prices restored.");
        return;
    }

    if (!sEnteredCode) {
        sap.m.MessageToast.show("Please enter coupon");
        return;
    }

    try {
        sap.ui.core.BusyIndicator.show(0);

        // Fetch coupons
        const response = await this.ajaxReadWithJQuery("HM_Coupon", {});
        const aCoupons = response?.data || [];

        if (!aCoupons.length) {
            sap.m.MessageToast.show("No coupons found");
            return;
        }

        // Match coupon
        const oMatched = aCoupons.find(c =>
            String(c.CouponCode).toUpperCase() === sEnteredCode.toUpperCase()
        );

         if (String(oMatched.Status).toLowerCase() !== "active") {
            sap.m.MessageToast.show("This coupon is inactive or expired.");
            return;
        }

        if (!oMatched) {
            sap.m.MessageToast.show("Invalid Coupon Code");
            return;
        }
        const couponBranch = String(oMatched.BranchCode || "").trim();
const selectedBranch = String(sBranchCode || "").trim();

if (couponBranch && couponBranch !== selectedBranch) {
    sap.m.MessageToast.show(
        `This coupon is not valid for the selected Branch Room.`
    );
    return;
}

        // Extract coupon details
        const discountValue = Number(oMatched.DiscountValue || 0);
        const discountType = (oMatched.DiscountType || "").toLowerCase();
        const minOrderValue = Number(oMatched.MinOrderValue || 0);
          oHostelModel.setProperty("/AppliedDiscountType",discountType)
          oHostelModel.setProperty("/AppliedDiscountValue",discountValue)
          oHostelModel.setProperty("/MinOrdervlaue",minOrderValue)
        // Read Subtotal and country
        const isIndia = oHostelModel.getProperty("/IsIndia");
        let subTotal = Number(oHostelModel.getProperty("/OverallTotalCost") || 0);

        if (subTotal <= 0) {
            sap.m.MessageToast.show("Subtotal is zero. Cannot apply coupon.");
            return;
        }
          if (subTotal < minOrderValue) {
            sap.m.MessageToast.show(
                `Minimum order value ₹${minOrderValue} required to apply this coupon.`
            );
            return;
        }
            // ---------------------------------------------
// 3️⃣ Validate Coupon Date Validity
// ---------------------------------------------
// const bookingStart = new Date(oHostelModel.getProperty("/StartDate"));
// const bookingEnd   = new Date(oHostelModel.getProperty("/EndDate"));

// const couponStart  = new Date(oMatched.StartDate);
// const couponEnd    = new Date(oMatched.EndDate);

// // If booking dates fall outside the coupon validity range
// if (bookingStart < couponStart || bookingEnd > couponEnd) {
//     sap.m.MessageToast.show(
//         `This coupon is valid only between ${oMatched.StartDate} and ${oMatched.EndDate}`
//     );
//     return;
// }


        let discountedSubtotal = subTotal;
         let discountAmount = 0;
        // ------------------------------------------
        //  APPLY DISCOUNT LOGIC
        // ------------------------------------------
        if (discountType === "percentage") {
            // Example: 10% OFF
            discountedSubtotal = subTotal - (subTotal * (discountValue / 100));
                discountAmount = subTotal * (discountValue / 100);
        }
        else {
            // Flat amount
            discountedSubtotal = subTotal - discountValue;
            discountAmount = discountValue;
        }

        // Prevent negative totals
        discountedSubtotal = Math.max(0, discountedSubtotal);

        // Store the discounted subtotal
        oHostelModel.setProperty("/OverallTotalCost", discountedSubtotal);
        oHostelModel.setProperty("/AppliedDiscount", discountAmount);

        // ------------------------------------------
        // ⭐ APPLY TAX CALCULATIONS AGAIN
        // ------------------------------------------
        let finalTotal = discountedSubtotal;
        let cgst = 0, sgst = 0;

        if (isIndia) {
            cgst = discountedSubtotal * 0.09;
            sgst = discountedSubtotal * 0.09;
            finalTotal = discountedSubtotal + cgst + sgst;
        }

        // Update model
        oHostelModel.setProperty("/CGST", cgst);
        oHostelModel.setProperty("/SGST", sgst);
        oHostelModel.setProperty("/FinalTotalCost", finalTotal);

        oHostelModel.refresh(true);
         oBtn.setText("Cancel");
        sap.m.MessageToast.show(
            `Coupon Applied Successfully`
        );

    } catch (err) {
        console.error(err);
        sap.m.MessageToast.show("Error applying coupon");
    } finally {
        sap.ui.core.BusyIndicator.hide();
    }
},
    });
});