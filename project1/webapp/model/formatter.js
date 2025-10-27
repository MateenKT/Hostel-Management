sap.ui.define([
	"sap/ui/core/format/DateFormat"
], function(
	DateFormat
) {
	"use strict";
   return {
       formatDate: function (sDate) {

            if (sDate) {
                var oDateFormat = DateFormat.getDateInstance({ pattern: "dd/MM/yyyy" });
                return oDateFormat.format(new Date(sDate));
            }
            return sDate;
        },
   }

});