sap.ui.define([
    "sap/ui/core/format/DateFormat"
], function( DateFormat) {
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
        formatDate: function(sDate) {
            if (sDate) {
                var oDateFormat = DateFormat.getDateInstance({
                    pattern: "dd/MM/yyyy"
                });
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

        DateFormat: function(sDate) {
            if (sDate) {
                var oDateFormat = DateFormat.getDateInstance({
                    pattern: "dd/MM/yyyy"
                });
                return oDateFormat.format(new Date(sDate));
            }
            return sDate;
        },

        bytesToMB: function(bytes) {
            if (!bytes || isNaN(bytes)) {
                return "0 MB";
            }

            const mb = bytes / (1024 * 1024);
            return mb.toFixed(2) + " MB";
        },

        minDate: function(sStartDate) {
            if (!sStartDate) return null;
            const [d, m, y] = sStartDate.split("/");
            return new Date(`${y}-${m}-${d}`);
        },

        formatCurrency: function(value, code) {
            if (value || value === 0) {
                var oCurrencyFormat = sap.ui.core.format.NumberFormat.getCurrencyInstance({
                    currencyCode: false // hides the currency code like "INR"
                });
                var formatted = oCurrencyFormat.format(value);
                return code ? formatted + " " + code : formatted;
            }
            return "";
        },

        formatPrice: function (price, currency) {
        if (!price || price === "" || price === 0) {
            return "";
        }

        var oCurrencyFormat = sap.ui.core.format.NumberFormat.getCurrencyInstance({
            currencyCode: true,    
            minFractionDigits: 2,
            maxFractionDigits: 2
        });

        // Format value
        return oCurrencyFormat.format(Number(price), currency);
    },

    formatStartingPrice: function (currency, price) {

        if (!price || price === "" || price === 0) {
            return "";
        }

        var oCurrencyFormat = sap.ui.core.format.NumberFormat.getCurrencyInstance({
            currencyCode: true,
            minFractionDigits: 2,
            maxFractionDigits: 2
        });

        var formattedValue = oCurrencyFormat.format(Number(price), currency);
        return "Starting At " + formattedValue;
    },
        //   formatCurrency: function (value, code) {
        //             if (value || value === 0) {
        //                 var oCurrencyFormat = sap.ui.core.format.NumberFormat.getCurrencyInstance({
        //                     currencyCode: false // hides the currency code like "INR"
        //                 });
        //                 var formatted = oCurrencyFormat.format(value);
        //                 return code ? formatted + " " + code : formatted;
        //             }
        //             return "";
        //         },

        formatCurrency: function (value, code) {
            var n = parseFloat(value);
            var fmt = sap.ui.core.format.NumberFormat.getCurrencyInstance({ currencyCode: false });
            var formatted = fmt.format(n);
            return code ? formatted + " " + code : formatted;
        },

        getImageSrc: function (base64Str) {
            if (base64Str) {
                return "data:image/png;base64," + base64Str;
            }
            return ""; // fallback
        },

         fromatNumber: function (currencyOrValue, totalAmount, amountInINR) {
            var avalue;

            // If only one argument passed, treat it as value to format
            if (totalAmount === undefined && amountInINR === undefined) {
                avalue = currencyOrValue;
            } else {
                // Multiparameter call from multi-part binding
                avalue = currencyOrValue === "INR" ? totalAmount : amountInINR;
            }

            if (avalue === "0" || avalue === 0) {
                return "- -";
            }
            var numericValue = parseFloat(avalue);
            if (isNaN(numericValue)) {
                return "";
            }

            var oFormatOptions = {
                groupingBaseSize: 3,
                groupingSize: 2,
                minIntegerDigits: 1,
                minFractionDigits: 2,
                maxFractionDigits: 4
            };

            var oFloatFormat = sap.ui.core.format.NumberFormat.getFloatInstance(oFormatOptions);
            return oFloatFormat.format(numericValue);
        },

          formatObjectStatus: function (sStatus) {
            switch (sStatus) {
                case "New":
                    return "Indication05";
                case "Assigned":
                    return "Warning";
                case "Completed":
                    return "Success";
                case "Renew":
                    return "Indication03";
                case "Active":
                    return "Success";
                case "Approved":
                    return "Success";
                case "Inactive":
                    return "Error";
                case "Rejected":
                    return "Error";
                case "Submitted":
                    return "Indication03";
                case "Company":
                    return "Indication13";
                case 'Employee':
                    return "Success";
                case 'Draft':
                    return "Indication17";
                case "Onboarded":
                    return "Success";
                case "Rejected":
                    return "Error";
                case "Offer Sent":
                    return "Indication06";
                case "Invoiced":
                    return "Success";
                case "Payment Received":
                    return "Success";
                case "Invoice Sent":
                    return "Indication03";
                case "Send back by account":
                    return "Indication06";
                case "PDF Generated":
                    return "Indication18";
                case "Send back by manager":
                    return "Information";
                case "Paid":
                    return "Success";
                case "Available":
                    return "Success"
                case "Returned":
                    return "Success"
                case "Trashed":
                    return "Error"
                case "Assigned":
                    return "Information"
                case "Transferred":
                    return "Warning"
                case "Saved":
                    return "Indication03";
                default:
                    return "Indication01";

            }
        },
    }
});
