sap.ui.define([
	"sap/ui/core/format/DateFormat"
], function(
	DateFormat
) {
	"use strict";
    function parseDDMMYYYY(sDate) {
        if (!sDate) return null;
        // Expected input: "19/11/2025"
        const parts = sDate.split("/");
        if (parts.length !== 3) return null;
        const [day, month, year] = parts.map(Number);
        return new Date(year, month - 1, day); // JS months are 0-based
    }
   return {
       formatDate: function (sDate) {

            if (sDate) {
                var oDateFormat = DateFormat.getDateInstance({ pattern: "dd/MM/yyyy" });
                return oDateFormat.format(new Date(sDate));
            }
            return sDate;
        },

    calculateFacilityTotal: function(fPrice, iDays) {
    if (!fPrice || !iDays) return "₹ 0";
    const fTotal = parseFloat(fPrice) * parseInt(iDays);
    return "₹ " + fTotal.toFixed(2);
},

formatCurrency: function(fValue) {
    if (!fValue) return "₹ 0.00";
    return "₹ " + parseFloat(fValue).toFixed(2);
},

// formatDate: function(sDate) {
//     if (!sDate) return "";
//     return sDate; // Already in dd/MM/yyyy format
// },

calculateDays: function(sStartDate, sEndDate) {
    if (!sStartDate || !sEndDate) return 0;
    
    const aParts1 = sStartDate.split("/");
    const aParts2 = sEndDate.split("/");
    
    const oStart = new Date(aParts1[2], aParts1[1] - 1, aParts1[0]);
    const oEnd = new Date(aParts2[2], aParts2[1] - 1, aParts2[0]);
    
    const diffTime = oEnd - oStart;
    const iDays = Math.ceil(diffTime / (1000 * 3600 * 24));
    
    return iDays > 0 ? iDays : 0;
},

          formatObjectStatus: function (sStatus) {
            switch (sStatus) {
                case "New":
                    return "Indication05";
                case "Assigned":
                    return "Success";
                default:
                    return "Indication01";

            }
        },

        DateFormat: function (sDate) {
            if (sDate) {
                var oDateFormat = DateFormat.getDateInstance({ pattern: "dd/MM/yyyy" });
                return oDateFormat.format(new Date(sDate));
            }
            return sDate;
        }, 

        bytesToMB: function (bytes) {
            if (!bytes || isNaN(bytes)) {
                return "0 MB";
            }

            const mb = bytes / (1024 * 1024);
            return mb.toFixed(2) + " MB";
        },  
        minDate: function (sStartDate) {
    if (!sStartDate) return null;
    const [d, m, y] = sStartDate.split("/");
    return new Date(`${y}-${m}-${d}`);
}

   }
});