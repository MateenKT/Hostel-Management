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

    // store table ref so we can remove selections later
    this._oSelectedTable = oEvent.getSource();

    const oContext = oSelectedItem.getBindingContext("HostelModel");
    if (!oContext) {
        sap.m.MessageToast.show("Selection has no binding context");
        return;
    }

    const oSelectedData = oContext.getObject();
    this._oSelectedFacility = oSelectedData;
    this._sSelectedPath = oContext.getPath(); // e.g. "/AllSelectedFacilities/2"

    // Try to parse index from path when possible
    let idx = -1;
    try {
        const parts = this._sSelectedPath.split("/");
        idx = parseInt(parts[parts.length - 1], 10);
        if (isNaN(idx)) idx = -1;
    } catch (e) {
        idx = -1;
    }
    this._oSelectedIndex = idx;

    // keep a small debug log (optional)
    // console.log("Selected facility:", this._oSelectedFacility, "index:", this._oSelectedIndex);
},

// --- Open edit dialog for selected facility ---
onEditFacilityDetails: function () {
    if (!this._oSelectedFacility) {
        sap.m.MessageToast.show("Please select a row to edit.");
        return;
    }

    // Create safe shallow copy for editing
    const oFacilityData = this._oSelectedFacility || {};
    const oSafeCopy = Object.assign({}, oFacilityData, {
        FacilityID: oFacilityData.FacilityID || (Date.now() + "_" + Math.random()),
        PersonName: oFacilityData.PersonName || oFacilityData.PersonName || ""
    });

    // Create / set edit model
    this._oEditModel = new sap.ui.model.json.JSONModel(oSafeCopy);
    this.getView().setModel(this._oEditModel, "edit");

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
    if (oMinDate && !isNaN(oMinDate.getTime())) {
        const oStartPicker = sap.ui.core.Fragment.byId(this.getView().getId(), "editStartDate");
        const oEndPicker = sap.ui.core.Fragment.byId(this.getView().getId(), "editEndDate");
        if (oStartPicker) oStartPicker.setMinDate(oMinDate);
        if (oEndPicker) oEndPicker.setMinDate(oMinDate);
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
    if (!oHostelModel || !oEditModel) {
        sap.m.MessageToast.show("Missing models");
        return;
    }

    const oUpdatedData = Object.assign({}, oEditModel.getData()); // shallow copy
    let aFacilities = oHostelModel.getProperty("/AllSelectedFacilities") || [];

    // Fallback: if /AllSelectedFacilities is empty, build it from persons
    if (!Array.isArray(aFacilities) || aFacilities.length === 0) {
        const aPersons = oHostelModel.getProperty("/Persons") || [];
        aFacilities = aPersons.flatMap((p, pi) => {
            const arr = (p.AllSelectedFacilities || p.Facilities?.SelectedFacilities || []);
            // ensure PersonName present
            return (arr || []).map(f => Object.assign({}, f, { PersonName: p.FullName || (`Person ${pi+1}`) }));
        });
        // set it back so future ops are consistent
        oHostelModel.setProperty("/AllSelectedFacilities", aFacilities);
    }

    // Attempt 1: use stored index (if it looks valid)
    let iIndex = (typeof this._oSelectedIndex === "number" && this._oSelectedIndex >= 0 && this._oSelectedIndex < aFacilities.length)
        ? this._oSelectedIndex
        : -1;

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
    aFacilities[iIndex] = oUpdatedData;
   // After updating aFacilities and setting it globally:
oHostelModel.setProperty("/AllSelectedFacilities", aFacilities);

// For each person, assign ONLY their facilities by deep-copying filtered entries:
const aPersons = oHostelModel.getProperty("/Persons") || [];
aPersons.forEach((oPerson, iPerson) => {
    const personName = oPerson.FullName || `Person ${iPerson + 1}`;
    // Deep-copy ONLY the facility objects for THIS person
    const aPersonFacilities = aFacilities.filter(f => f.PersonName === personName).map(f => ({ ...f }));
    oHostelModel.setProperty(`/Persons/${iPerson}/PersonFacilitiesSummary`, aPersonFacilities);
    oHostelModel.setProperty(`/Persons/${iPerson}/AllSelectedFacilities`, aPersonFacilities);
    // Optionally: assign a fresh array to Facilities.SelectedFacilities too if used elsewhere
    oPerson.Facilities.SelectedFacilities = aPersonFacilities;
});


    // Recalculate start/end from global facility dates (safe parse)
    const parseDDMMYYYY = s => {
        if (!s) return null;
        if (typeof s !== "string") return new Date(s);
        if (s.indexOf("/") > -1) {
            const p = s.split("/");
            return new Date(p[2], p[1] - 1, p[0]);
        }
        // fallback to Date
        return new Date(s);
    };
    const startDates = aFacilities.map(f => parseDDMMYYYY(f.StartDate)).filter(Boolean);
    const endDates = aFacilities.map(f => parseDDMMYYYY(f.EndDate)).filter(Boolean);
    if (startDates.length) {
        const minStart = new Date(Math.min(...startDates.map(d => d.getTime())));
        oHostelModel.setProperty("/StartDate", this._formatDateToDDMMYYYY(minStart));
    }
    if (endDates.length) {
        const maxEnd = new Date(Math.max(...endDates.map(d => d.getTime())));
        oHostelModel.setProperty("/EndDate", this._formatDateToDDMMYYYY(maxEnd));
    }

    // Recalculate totals using your helper — pass model date strings
    const sStart = oHostelModel.getProperty("/StartDate");
    const sEnd = oHostelModel.getProperty("/EndDate");

    // room rent: use per-person rent stored in /FinalPrice (per person) OR /FinalPriceTotal as needed
    const perPersonRent = parseFloat(oHostelModel.getProperty("/FinalPrice")) || parseFloat(oHostelModel.getProperty("/Price")) || 0;

    const totals = this.calculateTotals(aPersons, sStart, sEnd, perPersonRent);
    if (totals) {
        oHostelModel.setProperty("/TotalDays", totals.TotalDays);
        oHostelModel.setProperty("/TotalFacilityPrice", totals.TotalFacilityPrice);
        oHostelModel.setProperty("/GrandTotal", totals.GrandTotal);
    }

    // Per-person recalculation
    aPersons.forEach((oPerson, idx) => {
        const facs = oPerson.AllSelectedFacilities || [];
        const facTotal = facs.reduce((sum, f) => {
            const price = parseFloat(f.Price) || 0;
            const days = parseFloat(f.TotalDays) || 0;
            return sum + (price * days);
        }, 0);
        oHostelModel.setProperty(`/Persons/${idx}/TotalFacilityPrice`, facTotal);
        oHostelModel.setProperty(`/Persons/${idx}/RoomRentPerPerson`, perPersonRent);
        oHostelModel.setProperty(`/Persons/${idx}/GrandTotal`, facTotal + perPersonRent);
    });

    // Refresh bindings (table)
    const oTable = this._oSelectedTable || oView.byId("idFacilitySummaryTable");
    if (oTable) {
        // remove selection
        try { oTable.removeSelections(true); } catch (e) { /* ignore */ }
        const oBinding = oTable.getBinding("items");
        if (oBinding) oBinding.refresh();
    }

    // Clear selection cache
    this._oSelectedTable = null;
    this._oSelectedFacility = null;
    this._oSelectedIndex = null;
    this._sSelectedPath = null;

    this.onEditDialogClose();
    sap.m.MessageToast.show("Facility updated successfully!");
}

,

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

onUnitTextChange: function (oEvent) {
    const oEditModel = this.getView().getModel("edit");
    const oFacilityModel = this.getView().getModel("FacilityModel");

    const sSelectedUnit = oEvent.getSource().getSelectedItem().getText(); // Per Day / Per Month
    const sFacilityName = oEditModel.getProperty("/FacilityName");

    // Update unit type in edit model
    oEditModel.setProperty("/UnitText", sSelectedUnit);

    // Get ALL facilities from FacilityModel
    const aFacilities = oFacilityModel.getProperty("/Facilities") || [];

    // Find row matching both facility name + selected unit
    const oMatched = aFacilities.find(f =>
        f.FacilityName === sFacilityName &&
        f.UnitText === sSelectedUnit
    );

    if (!oMatched) {
        sap.m.MessageToast.show("Price not found for selected Unit Type.");
        return;
    }

    // Update the correct price in dialog
    oEditModel.setProperty("/Price", oMatched.Price);
}
,
// Open preview dialog and set content
onOpenDocumentPreview: function (oEvent) {
  const oSource = oEvent.getSource();
  const oCtx = oSource.getBindingContext("HostelModel");
  const oDoc = oCtx && oCtx.getObject();
  if (!oDoc || !oDoc.Document) {
    sap.m.MessageToast.show("No document to preview.");
    return;
  }

  const oView = this.getView();

  // Create fragment dialog (use this.createId to scope internal IDs)
  if (!this._oDocPreviewDialog) {
    this._oDocPreviewDialog = sap.ui.xmlfragment(
      this.createId("DocumentPreviewDialog"), // prefix for fragment internal IDs
      "sap.ui.com.project1.fragment.DocumentPreview",
      this
    );
    oView.addDependent(this._oDocPreviewDialog);
  }

  // Get the HTML control inside the fragment
  const oHtml = sap.ui.core.Fragment.byId(this.createId("DocumentPreviewDialog"), "pdfViewer");

  // Ensure the stored Document is a full data URL:
  // If you stored only the base64 payload earlier, create prefix here:
  let sData = oDoc.Document || "";
  if (!sData.startsWith("data:")) {
    // if oDoc.FileType exists, prefix accordingly (preferred to store full data URI on upload)
    const sType = oDoc.FileType || "application/octet-stream";
    sData = `data:${sType};base64,${sData}`;
  }

  // Set HTML content depending on file type
  if ((oDoc.FileType || "").indexOf("pdf") !== -1) {
    // embed iframe for PDF
    oHtml.setContent(`<iframe src="${sData}" width="100%" height="100%" style="border:0"></iframe>`);
  } else if ((oDoc.FileType || "").indexOf("image") !== -1) {
    // show image tag
    oHtml.setContent(`<img src="${sData}" style="max-width:100%;height:auto;display:block;margin:auto" />`);
  } else {
    // fallback: show download link
    oHtml.setContent(`<div style="padding:16px;">
                        <p>Preview not supported for this file type.</p>
                        <a href="${sData}" download="${oDoc.FileName}">Download ${oDoc.FileName}</a>
                      </div>`);
  }

  this._oDocPreviewDialog.open();
},

// Close preview
onClosePreview: function () {
  if (this._oDocPreviewDialog) {
    this._oDocPreviewDialog.close();
  }
},












    });
});