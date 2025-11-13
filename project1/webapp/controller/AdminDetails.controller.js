sap.ui.define([
    "./BaseController",
    "../model/formatter",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "../utils/validation"
], function(BaseController, Formatter, JSONModel, MessageBox, utils) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.AdminDetails", {
        Formatter: Formatter,
        onInit: function() {
            this.getOwnerComponent().getRouter().getRoute("RouteAdminDetails").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: async function(oEvent) {
            const omodel = new sap.ui.model.json.JSONModel({
                // for Database connection
                url: "https://rest.kalpavrikshatechnologies.com/",
                headers: {
                    name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                    password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
                    "Content-Type": "application/json",
                },
                isRadioVisible: false,
            });
            this.getOwnerComponent().setModel(omodel, "LoginModel");

            this.getView().setModel(new sap.ui.model.json.JSONModel({
                    editable: true,
                }), "visiablityPlay");

            var sPath = oEvent.getParameter("arguments").sPath;
            this.decodedPath = decodeURIComponent(decodeURIComponent(sPath));
            this.AD_onSearch()
        },
         onNavBack: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
        },
        AD_onSearch: async function() {
            try {
                sap.ui.core.BusyIndicator.show(0);
                const filter = {
                    CustomerID: this.decodedPath
                };
                const response = await this.ajaxReadWithJQuery("HM_Customer", filter);
                const oCustomer = response?.Customers || response?.value?.[0] || {};

                if (!oCustomer || !oCustomer.CustomerID) {
                    sap.m.MessageToast.show("No customer data found!");
                    return;
                }

                const oCustomerData = {
                    CustomerName: oCustomer.CustomerName,
                    Gender: oCustomer.Gender,
                    MobileNo: oCustomer.MobileNo,
                    CustomerEmail: oCustomer.CustomerEmail,
                    Country: oCustomer.Country,
                    State: oCustomer.State,
                    City: oCustomer.City,
                    RentPrice: oCustomer.Bookings?.[0]?.RentPrice || 0,
                    BedType: oCustomer.Bookings?.[0]?.BedType || "",
                    PaymentType: oCustomer.Bookings?.[0]?.PaymentType || "",
                    Person: oCustomer.Bookings?.[0]?.NoOfPersons || "",
                    StartDate: this.Formatter.DateFormat(oCustomer.Bookings?.[0]?.StartDate || ""),
                    EndDate: this.Formatter.DateFormat(oCustomer.Bookings?.[0]?.EndDate || ""),
                    AllSelectedFacilities: oCustomer.FaciltyItems || [],
                    Documents: oCustomer.Documents || []
                };

                // Prepare for calculation
                const aPersons = [{
                    FullName: oCustomer.CustomerName,
                    Facilities: {
                        SelectedFacilities: oCustomer.FaciltyItems || []
                    }
                }];


                const sStartDate = this.Formatter.DateFormat(oCustomer.Bookings?.[0]?.StartDate || "");
                const sEndDate = this.Formatter.DateFormat(oCustomer.Bookings?.[0]?.EndDate || "");
                const roomRentPrice = oCustomer.Bookings?.[0]?.RentPrice || 0;

                // Calculate totals
                const totals = this.calculateTotals(aPersons, sStartDate, sEndDate, roomRentPrice);

                if (totals) {
                    Object.assign(oCustomerData, totals);
                }

                // Set model
                const oCustomerModel = new sap.ui.model.json.JSONModel(oCustomerData);
                this.getView().setModel(oCustomerModel, "CustomerData");

            } catch (err) {
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        // Separated calculation function
        calculateTotals: function(aPersons, sStartDate, sEndDate, roomRentPrice) {
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
                        StartDate: sStartDate,
                        EndDate: sEndDate,
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
        },

        _parseDate: function(sDate) {
            const aParts = sDate.split("/");
            return new Date(aParts[2], aParts[1] - 1, aParts[0]);
        },


            Ad_onPressEdit: async function () {
    const oView = this.getView();
    const oVisibilityModel = oView.getModel("visiablityPlay");
    const bEditMode = oVisibilityModel.getProperty("/editable");
    const oCustomerData = oView.getModel("CustomerData").getData();

    if (!bEditMode) {
        // Switch to edit mode
        oVisibilityModel.setProperty("/editable", true);
    } else {
        // Save (update)
        try {
            sap.ui.core.BusyIndicator.show(0);

            // Construct payload for update
            const oPayload = {
                CustomerID: this.decodedPath,
                CustomerName: oCustomerData.CustomerName,
                Gender: oCustomerData.Gender,
                MobileNo: oCustomerData.MobileNo,
                CustomerEmail: oCustomerData.CustomerEmail,
                Country: oCustomerData.Country,
                State: oCustomerData.State,
                City: oCustomerData.City,
                Bookings: [
                    {
                        BedType: oCustomerData.BedType,
                        RentPrice: oCustomerData.RentPrice,
                        PaymentType: oCustomerData.PaymentType,
                        NoOfPersons: oCustomerData.Person,
                        StartDate: this._formatDateForAPI(oCustomerData.StartDate),
                        EndDate: this._formatDateForAPI(oCustomerData.EndDate)
                    }  
                ]
            };

            // Use your common AJAX update helper
            await this.ajaxUpdateWithJQuery("HM_Customer", oPayload);

            sap.m.MessageToast.show("Customer details updated successfully!");

            // Switch back to view mode
            oVisibilityModel.setProperty("/editable", false);
        } catch (err) {
            sap.m.MessageBox.error("Failed to update data: " + (err.message || err.responseText));
        } finally {
            sap.ui.core.BusyIndicator.hide();
        }
    }
},

    });
});