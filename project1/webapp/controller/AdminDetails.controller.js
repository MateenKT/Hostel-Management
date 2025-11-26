sap.ui.define([
    "./BaseController",
    "../model/formatter",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "../utils/validation"
], function (BaseController, Formatter, JSONModel, MessageBox, utils) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.AdminDetails", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteAdminDetails").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: async function (oEvent) {
            // const omodel = new sap.ui.model.json.JSONModel({
            //     // for Database connection
            //     url: "https://rest.kalpavrikshatechnologies.com/",
            //     headers: {
            //         name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
            //         password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
            //         "Content-Type": "application/json",
            //     },
            //     isRadioVisible: false,
            // });
            // this.getOwnerComponent().setModel(omodel, "LoginModel");

            var model = new JSONModel({
                FacilityName: "",
                UnitText: "",
                Price: "",
                Currency: "",
                StartDate: "",
                EndDate: "",
                TotalDays: ""

            });
            this.getView().setModel(model, "edit")

            var model = new JSONModel({
                StartDate: "",
                EndDate: "",
                UnitText: "daily",   // daily | monthly | yearly
                TotalMonths: 1,
                TotalYears: 1,
                BedTypeName: ""
            });
            this.getView().setModel(model, "Bookingmodel");


            var model = new JSONModel({
                visible: false

            });
            this.getView().setModel(model, "VisibleModel")





            this.getView().setModel(new sap.ui.model.json.JSONModel({
                editable: true,
            }), "visiablityPlay");

            var sPath = oEvent.getParameter("arguments").sPath;
            this.decodedPath = decodeURIComponent(decodeURIComponent(sPath));
            await this.AD_onSearch()
            this.Facilitysearch()

        },
        Facilitysearch: function () {
            var data = this.getView().getModel("CustomerData").getData()
            var sBranchCode = data.BranchCode
            this.ajaxReadWithJQuery("HM_Facilities", { BranchCode: sBranchCode }).then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                var model = new sap.ui.model.json.JSONModel(oFCIAerData);
                this.getView().setModel(model, "Facilities")
            })
        },
        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteAdmin");
        },
        AD_onSearch: async function () {
            try {
                sap.ui.core.BusyIndicator.show(0);
                const filter = {
                    CustomerID: this.decodedPath
                };
                const response = await this.ajaxReadWithJQuery("HM_Customer", filter);
                const oCustomer = response?.Customers || response?.value?.[0] || {};



                const oCustomerData = {
                    CustomerName: oCustomer.CustomerName,
                    CustomerID: oCustomer.CustomerID,
                    Gender: oCustomer.Gender,
                    MobileNo: oCustomer.MobileNo,
                    DateOfBirth: this.Formatter.DateFormat(oCustomer.DateOfBirth),
                    UserID: oCustomer.UserID,
                    CustomerEmail: oCustomer.CustomerEmail,
                    Country: oCustomer.Country,
                    State: oCustomer.State,
                    City: oCustomer.City,
                    STDCode: oCustomer.STDCode || "",
                    Salutation: oCustomer.Salutation || "Mr.",
                    RentPrice: oCustomer.Bookings?.[0]?.RentPrice || 0,
                    OrginalRentPrice: oCustomer.Bookings?.[0]?.RentPrice || 0,
                    BedType: oCustomer.Bookings?.[0]?.BedType || "",
                    BookingID: oCustomer.Bookings?.[0]?.BookingID || "",
                    BranchCode: oCustomer.Bookings?.[0]?.BranchCode || "",
                    BookingDate: oCustomer.Bookings?.[0]?.BookingDate || "",
                    NoOfPersons: oCustomer.Bookings?.[0]?.NoOfPersons || "",
                    PaymentType: oCustomer.Bookings?.[0]?.PaymentType || "",
                    Status: oCustomer.Bookings?.[0]?.Status || "",
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



                const roomRentPrice = oCustomer.Bookings?.[0]?.RentPrice || 0;

                let Duration = 0;
                let DurationUnit = "";

                const sStartDateRaw = oCustomer.Bookings?.[0]?.StartDate;
                const sEndDateRaw = oCustomer.Bookings?.[0]?.EndDate;

                if (sStartDateRaw && sEndDateRaw) {

                    const start = new Date(sStartDateRaw);
                    const end = new Date(sEndDateRaw);

                    const paymentType = (oCustomer.Bookings?.[0]?.PaymentType || "").toLowerCase();

                    // Difference in milliseconds
                    const diffMs = end - start;

                    if (paymentType === "per day") {
                        Duration = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                        DurationUnit = "days";

                    } else if (paymentType === "per month") {
                        const years = end.getFullYear() - start.getFullYear();
                        const months = end.getMonth() - start.getMonth();
                        Duration = years * 12 + months;
                        DurationUnit = "months";

                    } else if (paymentType === "per year") {
                        Duration = end.getFullYear() - start.getFullYear();
                        DurationUnit = "years";
                    }
                }

                // Add duration to model
                oCustomerData.Duration = Duration;
                oCustomerData.DurationUnit = DurationUnit;

                // Calculate totals
                const totals = this.calculateTotals(aPersons, roomRentPrice);

                if (totals) {
                    Object.assign(oCustomerData, totals);
                }

                const oCustomerModel = new sap.ui.model.json.JSONModel(oCustomerData);
                this.getView().setModel(oCustomerModel, "CustomerData");
                // Set model


            } catch (err) {
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        calculateTotals: function (aPersons, roomRentPrice) {

            let totalFacilityPricePerDay = 0;
            let otherFacilitiesTotal = 0;
            let aAllFacilities = [];

            aPersons.forEach((oPerson, iIndex) => {

                const aFacilities = oPerson.Facilities?.SelectedFacilities || [];

                aFacilities.forEach((f) => {

                    const fPrice = parseFloat(f.FacilitiPrice || 0);
                    const unit = f.UnitText;

                    let fTotal = 0;

                    // -------------------------------
                    // Facility specific dates
                    // -------------------------------
                    const facStart = new Date(f.StartDate);
                    const facEnd = new Date(f.EndDate);

                    if (!facStart || !facEnd) {
                        console.warn("Missing dates for facility:", f);
                        return;
                    }

                    // -------------------------------
                    // Calculate Days
                    // -------------------------------
                    const dayDiff = facEnd - facStart;
                    const days = Math.ceil(dayDiff / (1000 * 3600 * 24));

                    if (days <= 0) {
                        console.warn("Invalid facility date range:", f);
                        return;
                    }

                    // -------------------------------
                    // Calculate Months
                    // -------------------------------
                    const months =
                        (facEnd.getFullYear() - facStart.getFullYear()) * 12 +
                        (facEnd.getMonth() - facStart.getMonth()) +
                        (facEnd.getDate() >= facStart.getDate() ? 0 : -1);

                    const totalMonths = Math.max(months, 1);

                    // -------------------------------
                    // Calculate Years
                    // -------------------------------
                    const years = Math.floor(months / 12);
                    const totalYears = Math.max(years, 1);

                    // -------------------------------
                    // Apply Billing Logic
                    // -------------------------------
                    if (unit === "Per Day") {
                        fTotal = fPrice * days;
                        totalFacilityPricePerDay += fPrice;

                    } else if (unit === "Per Month") {
                        f.TotalMonths = totalMonths;
                        fTotal = fPrice * totalMonths;
                        otherFacilitiesTotal += fTotal;

                    } else if (unit === "Per Year") {
                        f.TotalYears = totalYears;
                        fTotal = fPrice * totalYears;
                        otherFacilitiesTotal += fTotal;
                    } else if (unit === "Per Hour") {
                        const totalHours = f.TotalHour || 0;
                        fTotal = fPrice * totalHours;
                        otherFacilitiesTotal += fTotal;
                    }

                    // -------------------------------
                    // Store final facility record
                    // -------------------------------
                    aAllFacilities.push({
                        PersonName: oPerson.FullName || `Person ${iIndex + 1}`,
                        FacilityName: f.FacilityName,
                        FacilityID: f.FacilityID,
                        UnitText: unit,
                        Price: fPrice,
                        StartDate: this.Formatter.DateFormat(f.StartDate),
                        EndDate: this.Formatter.DateFormat(f.EndDate),
                        TotalDays: days,
                        TotalMonths: totalMonths,
                        TotalYears: totalYears,
                        TotalAmount: fTotal,
                        TotalHour: f.TotalHour,
                        Image: f.Image,
                        Currency: f.Currency,
                        EndTime: f.EndTime,
                        StartTime: f.StartTime
                    });

                });
            });

            // -------------------------------
            // Final Price Calculation
            // -------------------------------
            const FacilityPrice = totalFacilityPricePerDay + otherFacilitiesTotal;
            const grandTotal = FacilityPrice + Number(roomRentPrice || 0);

            // Attach facility price to each entry
            aAllFacilities = aAllFacilities.map(item => ({
                ...item,
                FacilityPrice: FacilityPrice
            }));

            return {
                FacilityPrice: FacilityPrice,
                TotalFacilityPrice: FacilityPrice,
                GrandTotal: grandTotal,
                AllSelectedFacilities: aAllFacilities
            };
        },




        _parseDate: function (sDate) {
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
        onAddFacilityDetails: function () {
            this.byId("Ad_id_idFacilityRoomTableDetails").removeSelections()
            if (!this.HM_Dialog) {
                var oView = this.getView();
                this.HM_Dialog = sap.ui.xmlfragment("sap.ui.com.project1.fragment.Admin_Edit", this);
                oView.addDependent(this.HM_Dialog);
            }
            this.HM_Dialog.open();
            this.getView().getModel("edit").setData({
                FacilityName: "",
                UnitText: "",
                Price: "",
                Currency: "",
                StartDate: "",
                EndDate: "",
                TotalDays: "",
                TotalMonths: "",
                TotalYears: "",
                NewStartDate: "",
                NewEndDate: ""
            });
            sap.ui.getCore().byId("idUnitType").setVisible(false)
            sap.ui.getCore().byId("editStartTime").setVisible(false)
            sap.ui.getCore().byId("editEndTime").setVisible(false)
            sap.ui.getCore().byId("editHours").setVisible(false)

        },
        onEditDialogClose: function () {
            this.HM_Dialog.close();
        },
        onFacilityChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
            var oUnitType = sap.ui.getCore().byId("idUnitType");
            sap.ui.getCore().byId("editPrice").setValue("");
            sap.ui.getCore().byId("FU_id_Currency").setSelectedKey("");


            oUnitType.setSelectedKey("").setVisible(true);
        },
        onUnitTextChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
            var editdata = this.getView().getModel("edit")
            var data = this.getView().getModel("Facilities").getData()
            var Sfacilityname = sap.ui.getCore().byId("editFacilityName").getSelectedKey()
            var Duration = sap.ui.getCore().byId("idUnitType").getSelectedKey();



            var FPrice = data.find((item) => {
                return item.FacilityName === Sfacilityname
            })
            editdata.setProperty("/Currency", FPrice.Currency)

            if (Duration === "Per Day") {
                editdata.setProperty("/Price", FPrice.PerDayPrice)
            }
            if (Duration === "Per Hour") {
                editdata.setProperty("/Price", FPrice.PerHourPrice)
                // sap.ui.getCore().byId("editStartTime").setVisible(true)
                // sap.ui.getCore().byId("editEndTime").setVisible(true)
                // sap.ui.getCore().byId("editHours").setVisible(true)
                editdata.setProperty("/UnitText", Duration)

            }
            if (Duration === "Per Month") {
                editdata.setProperty("/Price", FPrice.PerMonthPrice)
            }
            if (Duration === "Per Year") {
                editdata.setProperty("/Price", FPrice.PerYearPrice)
            }
            editdata.setProperty("/StartDate", "")
            editdata.setProperty("/EndDate", "")

            editdata.setProperty("/TotalDays", "")
            sap.ui.getCore().byId("idMonthYearSelect").setSelectedKey("1")

        },
        onEditDateChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent)
            const oModel = this.getView().getModel("edit");
            const sUnit = oModel.getProperty("/UnitText");
            const sStartDate = oModel.getProperty("/StartDate");
            let sEndDate = oModel.getProperty("/EndDate"); // for manual edit

            if (!sUnit || !sStartDate) return;

            const oSelect =
                this.byId("idMonthYearSelect") ||
                sap.ui.getCore().byId(this.getView().createId("idMonthYearSelect"));

            let iCount = 1;
            if (oSelect) {
                const sKey = oSelect.getSelectedKey();
                iCount = sKey ? Number(sKey) : 1;
            } else {
                iCount = this.iCount || 1;
            }

            if (!iCount || iCount <= 0) return;

            let oStart = new Date(sStartDate);
            let oEnd = sEndDate ? new Date(sEndDate) : null;
            let iDays = 0;

            if (sUnit === "Per Month") {
                oEnd = new Date(oStart);
                oEnd.setMonth(oEnd.getMonth() + iCount);
                iDays = iCount * 30;
            } else if (sUnit === "Per Year") {
                oEnd = new Date(oStart);
                oEnd.setFullYear(oEnd.getFullYear() + iCount);
                iDays = iCount * 365;
            } else if (sUnit === "Per Day") {
                if (!oEnd) {
                    // First time end date empty → default days = 1
                    iDays = 1;
                } else if (oStart <= oEnd) {
                    // Start date <= end date → calculate days
                    iDays = Math.ceil((oEnd - oStart) / (1000 * 60 * 60 * 24)) + 1; // include start day
                } else {
                    // Start date > end date → clear end date
                    oEnd = null;
                    iDays = 0;
                }
            } else if (sUnit === "Per Hour") {
                if (!oEnd) {
                    // First time end date empty → default days = 1
                    iDays = 1;
                } else if (oStart <= oEnd) {
                    // Start date <= end date → calculate days
                    iDays = Math.ceil((oEnd - oStart) / (1000 * 60 * 60 * 24)) + 1; // include start day
                } else {
                    // Start date > end date → clear end date
                    oEnd = null;
                    iDays = 0;
                }
            }

            // Update model
            oModel.setProperty("/EndDate", oEnd ? oEnd.toISOString().split("T")[0] : "");
            oModel.setProperty("/TotalDays", iDays);
        }
        ,

        onMonthYearChange: function (oEvent) {
            const oModel = this.getView().getModel("edit");
            const iCount = Number(oEvent.getSource().getSelectedKey());

            this.iCount = iCount
            const sUnit = oModel.getProperty("/UnitText");
            const sStartDate = oModel.getProperty("/StartDate");

            if (!sStartDate) {
                sap.m.MessageToast.show("Please select Start Date first.");
                return;
            }

            // Convert start date
             let oStart;
    if (sStartDate.includes("/")) {
        const parts = sStartDate.split("/").reverse().join("-");
    
        oStart = new Date(parts);
    } else {
        // Already yyyy-mm-dd
        oStart = new Date(sStartDate);
    }
            let oEnd = new Date(oStart);
            let iDays = 0;

            if (sUnit === "Per Month") {
                oEnd.setDate(oEnd.getDate() + iCount * 30);
                iDays = iCount * 30; // Add Months as 30 days
            } else if (sUnit === "Per Year") {
                oEnd.setDate(oEnd.getDate() + iCount * 365);
                iDays = iCount * 365;// Add Years as 365 days
            }

            // Format yyyy-MM-dd for DatePicker
            const sFormatted = oEnd.toISOString().split("T")[0];

            oModel.setProperty("/EndDate", sFormatted);
            oModel.setProperty("/TotalDays", iDays);

        },
        onEditFacilitySave: function () {

            var oCustomerModel = this.getView().getModel("CustomerData");
            var oCustomerData = oCustomerModel.getData();
            var oPayload = this.getView().getModel("edit").getData();

            if (
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId("editFacilityName"), "ID") &&
                // utils._LCstrictValidationComboBox(oView.byId("idBedType"), "ID") &&
                (utils._LCstrictValidationComboBox(sap.ui.getCore().byId("idUnitType"), "ID")) &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("editStartDate"), "ID") &&
                // utils._LCvalidateMandatoryField(oView.byId("idRoomNumber13"), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("editEndDate"), "ID")


            ) {
                if (oPayload.UnitText === "Per Hour") {
                    // Validate Start Time first
                    if (!utils._LCvalidateMandatoryField(sap.ui.getCore().byId("editStartTime"), "ID")) {
                        sap.m.MessageToast.show("Please enter Start Time");
                        return; // Stop execution, only Start Time shows error
                    }

                    // Validate End Time next
                    if (!utils._LCvalidateMandatoryField(sap.ui.getCore().byId("editEndTime"), "ID")) {
                        sap.m.MessageToast.show("Please enter End Time");
                        return; // Stop execution, now End Time shows error
                    }
                }
                // Format Dates
                if(oPayload.StartDate.includes("-")){
                oPayload.StartDate = this.Formatter.DateFormat(oPayload.StartDate);
                oPayload.EndDate = this.Formatter.DateFormat(oPayload.EndDate);
                }else{  
                oPayload.StartDate = oPayload.StartDate;
                oPayload.EndDate = oPayload.EndDate;
                }


                // BASE PRICE
                var basePrice = Number(oPayload.Price) || 0;
                var iDays = Number(oPayload.TotalDays) || 0;
                var iHours = Number(oPayload.TotalHour) || 0;   // ← NEW for Per Hour
                var finalPrice = 0;
                const iCount = this.iCount || 1;

                // CALCULATE PRICE BASED ON UNIT
                if (oPayload.UnitText === "Per Day") {
                    finalPrice = basePrice * iDays;
                }
                else if (oPayload.UnitText === "Per Month") {
                    finalPrice = basePrice * iCount;
                }
                else if (oPayload.UnitText === "Per Year") {
                    finalPrice = basePrice * iCount;
                }
                else if (oPayload.UnitText === "Per Hour") {
                    // ✅ Newly Added Hour Calculation
                    finalPrice = basePrice * iHours;
                }

                oPayload.TotalAmount = finalPrice;

                // Remove unwanted fields

                // Ensure array exists
                if (!oCustomerData.AllSelectedFacilities) {
                    oCustomerData.AllSelectedFacilities = [];
                }

                // UPDATE existing OR ADD new
                if (this._editIndex !== undefined) {
                    oCustomerData.AllSelectedFacilities[this._editIndex] =
                        JSON.parse(JSON.stringify(oPayload));
                } else {
                    oCustomerData.AllSelectedFacilities.push(
                        JSON.parse(JSON.stringify(oPayload))
                    );
                }

                // Recalculate totals
                var total = 0;
                oCustomerData.AllSelectedFacilities.forEach(function (fac) {
                    total += Number(fac.TotalAmount) || 0;
                });

                oCustomerData.TotalFacilityPrice = total;
                oCustomerData.GrandTotal = total + (oCustomerData.RentPrice || 0);

                // Update model
                oCustomerModel.setData(oCustomerData);
                oCustomerModel.refresh();

                this.HM_Dialog.close();
                sap.m.MessageToast.show("Facility updated successfully!");

                this._editIndex = undefined;

            } else {
                sap.m.MessageToast.show("Make sure all the mandatory fields are filled and validate the entered value")
            }
        },
        onEditBooking: function () {
            this.getView().getModel("VisibleModel").setProperty("/visible", true)
            var data = this.getView().getModel("CustomerData").getData()
            var model = this.getView().getModel("Bookingmodel")
            model.setProperty("/BedTypeName", data.BedType)

            model.setProperty("/StartDate", data.StartDate)
            model.setProperty("/EndDate", data.EndDate)
            model.setProperty("/CustomerName", data.CustomerName)

            model.setProperty("/DateOfBirth", data.DateOfBirth)

            model.setProperty("/Gender", data.Gender)

            model.setProperty("/CustomerEmail", data.CustomerEmail)

            model.setProperty("/Country", data.Country)
            model.setProperty("/State", data.State)

            model.setProperty("/City", data.City)
            model.setProperty("/STDCode", data.STDCode)
            model.setProperty("/MobileNo", data.MobileNo)
            model.setProperty("/Salutation", data.Salutation)






            if (data.PaymentType === "Per Month") {
                model.setProperty("/UnitText", "monthly")
            } else if (data.PaymentType === "Per Day") {
                model.setProperty("/UnitText", "daily")
            } else if (data.PaymentType === "Per Year") {
                model.setProperty("/UnitText", "yearly")
            }



            if (data.PaymentType !== "daily" || data.PaymentType !== "Per Day") {
                this.byId("idMonthYearSelect").setVisible(false)
            }

            // Set Duration for XML binding
            if (data.PaymentType === "monthly" || data.PaymentType === "Per Month") {
                model.setProperty("/DurationUnit", data.Duration);
                this.byId("idMonthYearSelect").setVisible(true)

            } else if (data.PaymentType === "yearly" || data.PaymentType === "Per Year") {
                model.setProperty("/DurationUnit", data.Duration);
                this.byId("idMonthYearSelect").setVisible(true)

            }
            var sBranchCode = data.BranchCode

            this.ajaxReadWithJQuery("HM_Rooms", "").then((oData) => {
                var aRooms = Array.isArray(oData.commentData) ? oData.commentData : [oData.commentData];

                var aFilteredRooms = aRooms.filter(function (room) {
                    return room.BranchCode === sBranchCode;
                });

                // set only filtered data to the model
                var model = new sap.ui.model.json.JSONModel(aFilteredRooms);
                this.getView().setModel(model, "Availablebeds");

            })
        },
        onBookingEditDateChange: function () {
            var oBookingModel = this.getView().getModel("Bookingmodel");
            var oCustomerModel = this.getView().getModel("CustomerData");
            var oData = oBookingModel.getData();

            var sStart = oData.StartDate;
            var sEnd = oData.EndDate;
            var sUnit = oData.UnitText; // daily / monthly / yearly
            // var rentPrice = oCustomerModel.getProperty("/OriginalRentPrice") || oCustomerModel.getProperty("/RentPrice") || 0;

            let originalRent = oCustomerModel.getProperty("/OriginalRentPrice");
            if (!originalRent) {
                originalRent = oCustomerModel.getProperty("/RentPrice") || 0;
                oCustomerModel.setProperty("/OriginalRentPrice", originalRent);
            }

            if (!sStart || !sUnit) {
                return;
            }

            // Convert dates (handle dd/mm/yyyy)
            if (sStart.includes("/")) {
                sStart = sStart.split("/").reverse().join("-");
            }
            if (sEnd && sEnd.includes("/")) {
                sEnd = sEnd.split("/").reverse().join("-");
            }

            var oStart = new Date(sStart);
            var oEnd = sEnd ? new Date(sEnd) : new Date(sStart);

            if (sUnit === "daily") {
                if (!sEnd) {
                    sap.m.MessageToast.show("Please select End Date for daily calculation.");
                    return;
                }

                // Calculate days difference
                var diffTime = oEnd - oStart; // milliseconds
                var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; // at least 1 day

                // Set RentPrice in CustomerData
                oCustomerModel.setProperty("/RentPrice", diffDays * originalRent);

                // Optionally store the duration
                oCustomerModel.setProperty("/Duration", diffDays);
            }
            else if (sUnit === "monthly") {
                var months = oData.TotalMonths || 1;
                oEnd.setMonth(oEnd.getMonth() + parseInt(months));
            }
            else if (sUnit === "yearly") {
                var years = oData.TotalYears || 1;
                oEnd.setFullYear(oEnd.getFullYear() + parseInt(years));
            }

            // Set calculated end date in yyyy-MM-dd
            oData.EndDate = this._formatDate(oEnd);

            oBookingModel.refresh();
        },

        _formatDate: function (oDate) {
            var yyyy = oDate.getFullYear();
            var mm = String(oDate.getMonth() + 1).padStart(2, '0');
            var dd = String(oDate.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        },
        onBookMonthYearChange: function (oEvent) {
            const oModel = this.getView().getModel("Bookingmodel");
            const oCustomerData = this.getView().getModel("CustomerData");

            // Store original RentPrice once if not already stored
            let originalRent = oCustomerData.getProperty("/OriginalRentPrice1");
            if (!originalRent) {
                originalRent = oCustomerData.getProperty("/OrginalRentPrice") || 0;
                oCustomerData.setProperty("/OriginalRentPrice1", originalRent);
            }

            const iCount = Number(oEvent.getSource().getSelectedKey()) || 1;
            const sUnit = oModel.getProperty("/UnitText");
            let sStartDate = oModel.getProperty("/StartDate"); // e.g., "24/11/2025"

            if (!sStartDate) {
                sap.m.MessageToast.show("Please select Start Date first.");
                return;
            }

            if (sStartDate.includes("/")) {
                sStartDate = sStartDate
                    .split("/")
                    .reverse()
                    .join("-");
            }

            const oStart = new Date(sStartDate);
            let oEnd = new Date(oStart);

            if (sUnit === "monthly") {
                oEnd.setDate(oEnd.getDate() + iCount * 30);
                oCustomerData.setProperty("/RentPrice", iCount * originalRent); // use originalRent
            } else if (sUnit === "yearly") {
                oEnd.setDate(oEnd.getDate() + iCount * 365);
                oCustomerData.setProperty("/RentPrice", iCount * originalRent); // use originalRent
            }

            // Format yyyy-MM-dd for DatePicker
            const sFormatted = oEnd.toISOString().split("T")[0];
            oModel.setProperty("/EndDate", sFormatted);
        }

        ,
        onCancelBooking: function () {
            this.getView().getModel("VisibleModel").setProperty("/visible", false)
            this.byId("idMonthYearSelect").setVisible(false)
        },
        onEditFacilityDetails: function () {
            var oTable = this.byId("Ad_id_idFacilityRoomTableDetails");
            var oSelectedItem = oTable.getSelectedItem();

            if (!oSelectedItem) {
                sap.m.MessageToast.show("Please select a facility to edit.");
                return;
            }

            var oContext = oSelectedItem.getBindingContext("CustomerData");
            var oSelectedData = oContext.getObject();

            // 👉 STORE INDEX for update later
            this._editIndex = Number(oContext.getPath().split("/").pop());

            // Load data into edit model
            this.getView().getModel("edit").setData(Object.assign({}, oSelectedData));

            // Open dialog
            if (!this.HM_Dialog) {
                var oView = this.getView();
                this.HM_Dialog = sap.ui.xmlfragment("sap.ui.com.project1.fragment.Admin_Edit", this);
                oView.addDependent(this.HM_Dialog);
            }
            sap.ui.getCore().byId("idUnitType").setVisible(true)
            this.HM_Dialog.open();

        },
        onDeleteFacilityDetails: function () {
            var oTable = this.byId("Ad_id_idFacilityRoomTableDetails");
            var oSelectedItem = oTable.getSelectedItem();

            if (!oSelectedItem) {
                sap.m.MessageToast.show("Please select a facility to delete.");
                return;
            }

            var oCustomerModel = this.getView().getModel("CustomerData");
            var oCustomerData = oCustomerModel.getData();

            var oContext = oSelectedItem.getBindingContext("CustomerData");
            var oSelectedData = oContext.getObject();

            var sFacilityID = oSelectedData.FacilityID;
            var aFacilities = oCustomerData.AllSelectedFacilities;

            // Determine delete index
            var deleteIndex = -1;

            if (sFacilityID) {
                deleteIndex = aFacilities.findIndex(f => f.FacilityID === sFacilityID);
            }

            // fallback by index if FacilityID not found
            if (deleteIndex === -1) {
                deleteIndex = parseInt(oContext.getPath().split("/").pop());
            }

            var that = this;

            if (sFacilityID) {
                sap.m.MessageBox.confirm(
                    "Are you sure you want to delete this Facility?",
                    {
                        title: "Confirm Delete",
                        actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
                        onClose: function (oAction) {
                            if (oAction === sap.m.MessageBox.Action.OK) {

                                // Backend call
                                that.ajaxDeleteWithJQuery("HM_BookingFacilityItems", {
                                    filters: { FacilityID: sFacilityID }
                                })
                                    .then(function () {
                                        // Remove from model
                                        if (deleteIndex > -1) {
                                            aFacilities.splice(deleteIndex, 1);
                                        }

                                        that._recalculateFacilityTotals(oCustomerData);

                                        // Force UI update
                                        oCustomerModel.refresh(true);
                                        oTable.removeSelections(true);

                                        sap.m.MessageToast.show("Facility deleted successfully!");
                                    })
                                    .catch(function () {
                                        sap.m.MessageToast.show("Failed to delete facility from server.");
                                    });

                            }
                        }
                    }
                );

                return;
            }


            if (deleteIndex > -1) {
                aFacilities.splice(deleteIndex, 1);
            }

            this._recalculateFacilityTotals(oCustomerData);

            oCustomerModel.refresh(true);
            oTable.removeSelections(true);

            sap.m.MessageToast.show("Facility removed successfully!");
        },


        // Helper: Total Calculation
        _recalculateFacilityTotals: function (oCustomerData) {
            var total = 0;

            (oCustomerData.AllSelectedFacilities || []).forEach(function (fac) {
                total += Number(fac.TotalAmount) || 0;
            });

            oCustomerData.TotalFacilityPrice = total;
            oCustomerData.GrandTotal = total + (oCustomerData.RentPrice || 0);
        }
        ,
        onRoomDurationChange: function (oEvent) {
            var sUnit = oEvent.getParameter("selectedItem").getKey(); // daily / monthly / yearly
            var oBookingModel = this.getView().getModel("Bookingmodel");
            var oCustomerModel = this.getView().getModel("CustomerData");

            var sBedType = oBookingModel.getProperty("/BedTypeName"); // currently selected bed type
            var aAvailableBeds = this.getView().getModel("Availablebeds").getData(); // all available beds

            // Find the bed object
            var oSelectedBed = aAvailableBeds.find(bed => bed.BedTypeName === sBedType);

            if (oSelectedBed) {
                // Get the correct price based on duration
                var fPrice = 0;
                if (sUnit === "daily") {
                    fPrice = parseFloat(oSelectedBed.Price || 0)
                    oBookingModel.setProperty("/StartDate", "")
                    oBookingModel.setProperty("/EndDate", "")

                }
                else if (sUnit === "monthly") {
                    fPrice = parseFloat(oSelectedBed.MonthPrice || 0)
                    oBookingModel.setProperty("/StartDate", "")
                    oBookingModel.setProperty("/EndDate", "")
                    oBookingModel.setProperty("/DurationUnit", "1")
                }
                else if (sUnit === "yearly") {
                    fPrice = parseFloat(oSelectedBed.YearPrice || 0)
                    oBookingModel.setProperty("/StartDate", "")
                    oBookingModel.setProperty("/EndDate", "")
                    oBookingModel.setProperty("/DurationUnit", "1")
                };

                // Update RentPrice
                oCustomerModel.setProperty("/RentPrice", fPrice);
                oCustomerModel.setProperty("/OrginalRentPrice", fPrice);


                // Update GrandTotal
                var fFacilityPrice = parseFloat(oCustomerModel.getProperty("/TotalFacilityPrice") || 0);
                oCustomerModel.setProperty("/GrandTotal", fPrice + fFacilityPrice);
            }
        },
        onRoomBedChange: function (oEvent) {
            var sBedType = oEvent.getParameter("selectedItem").getKey(); // Selected bed type
            var oBookingModel = this.getView().getModel("Bookingmodel");
            var oCustomerModel = this.getView().getModel("CustomerData");

            // Update selected bed in Bookingmodel
            oBookingModel.setProperty("/BedTypeName", sBedType);

            var aAvailableBeds = this.getView().getModel("Availablebeds").getData(); // all available beds
            var sUnit = oCustomerModel.getProperty("/PaymentType"); // daily / monthly / yearly

            // Find the bed object
            var oSelectedBed = aAvailableBeds.find(bed => bed.BedTypeName === sBedType);

            if (oSelectedBed) {
                // Determine price based on unit
                var fPrice = 0;
                if (sUnit === "daily") fPrice = parseFloat(oSelectedBed.Price || 0);
                else if (sUnit === "monthly") fPrice = parseFloat(oSelectedBed.MonthPrice || 0);
                else if (sUnit === "yearly") fPrice = parseFloat(oSelectedBed.YearPrice || 0);

                // Update RentPrice
                oCustomerModel.setProperty("/RentPrice", fPrice);
                oCustomerModel.setProperty("/OrginalRentPrice", fPrice);


                // Recalculate GrandTotal
                var fFacilityPrice = parseFloat(oCustomerModel.getProperty("/TotalFacilityPrice") || 0);
                oCustomerModel.setProperty("/GrandTotal", fPrice + fFacilityPrice);
            }
        },
        onEditTimeChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent)
            var oModel = this.getView().getModel("edit");
            var oData = oModel.getData();

            var sStart = oData.StartTime; // "HH:mm:ss"
            var sEnd = oData.EndTime;     // "HH:mm:ss"

            if (!sStart || !sEnd) {
                return;
            }

            // Split HH:mm:ss
            var startParts = sStart.split(":");
            var endParts = sEnd.split(":");

            var start = {
                h: parseInt(startParts[0], 10),
                m: parseInt(startParts[1], 10),
            };

            var end = {
                h: parseInt(endParts[0], 10),
                m: parseInt(endParts[1], 10),
            };

            // Convert to minutes
            var startMinutes = start.h * 60 + start.m;
            var endMinutes = end.h * 60 + end.m;

            // Validate
            if (endMinutes < startMinutes) {
                sap.m.MessageToast.show("End Time should be greater than Start Time");
                oModel.setProperty("/TotalHour", "");
                return;
            }

            // Difference in minutes
            var diffMin = endMinutes - startMinutes;

            // Convert to hours (decimal)
            var diffHours = diffMin / 60;

            // Format to 2 decimal places
            var formatted = diffHours.toFixed(2);

            oModel.setProperty("/TotalHour", formatted);
        },
        onCountrySelectionChange: function (oEvent) {
            const oView = this.getView();
            const oModel = oView.getModel("Bookingmodel");

            const oStateCB = oView.byId("CC_id_State");
            const oCityCB = oView.byId("CC_id_City");
            const oSTD = oView.byId("CC_id_STDCode");

            const oItem = oEvent.getSource().getSelectedItem();
            if (!oItem) return;

            // Clear state + city
            oModel.setProperty("/State", "");
            oModel.setProperty("/City", "");

            oStateCB.setSelectedKey("");
            oCityCB.setSelectedKey("");
            oCityCB.setValue("");

            oStateCB.getBinding("items")?.filter([]);
            oCityCB.getBinding("items")?.filter([]);
            oSTD.setValue("");

            const sCountryName = oItem.getText();
            const sCountryCode = oItem.getAdditionalText();

            oModel.setProperty("/country", sCountryName);

            // Fetch country STD code
            const aCountryData = this.getOwnerComponent().getModel("CountryModel").getData();
            const oCountryObj = aCountryData.find(c => c.countryName === sCountryName);
            oModel.setProperty("/STDCode", oCountryObj?.stdCode || "");
            oSTD.setValue(oCountryObj?.stdCode || "");

            // Filter state list
            oStateCB.getBinding("items")?.filter([
                new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
            ]);
        },
        CC_onChangeState: function (oEvent) {
            const oView = this.getView();
            const oModel = oView.getModel("Bookingmodel");
            const oItem = oEvent.getSource().getSelectedItem();
            const oCityCB = oView.byId("CC_id_City");
            const oCountryCB = oView.byId("CC_id_Country");

            // Reset
            oModel.setProperty("/City", "");
            oCityCB.setSelectedKey("");
            oCityCB.setValue("");

            oCityCB.getBinding("items")?.filter([]);

            if (!oItem) {
                oModel.setProperty("/State", "");
                return;
            }

            const sStateName = oItem.getKey();
            const sCountryCode = oCountryCB.getSelectedItem()?.getAdditionalText();

            oModel.setProperty("/State", sStateName);

            // Apply city filter
            oCityCB.getBinding("items")?.filter([
                new sap.ui.model.Filter("stateName", sap.ui.model.FilterOperator.EQ, sStateName),
                new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
            ]);
        },
        onSaveBooking: function () {
            var Bookingdata = this.getView().getModel("Bookingmodel").getData();
            var CustomerData = this.getView().getModel("CustomerData").getData();

            // Map UnitText to desired PaymentType
            var paymentMap = {
                "monthly": "Per Month",
                "yearly": "Per Year",
                "daily": "Per Day"
            };

            // Normalize UnitText: trim and lowercase
            var unit = Bookingdata.UnitText ? Bookingdata.UnitText.trim().toLowerCase() : "";

            var Payload = {
                "CustomerName": Bookingdata.CustomerName,
                "UserID": CustomerData.UserID,
                "MobileNo": Bookingdata.MobileNo,
                "Gender": Bookingdata.Gender,
                "DateOfBirth": Bookingdata.DateOfBirth.split('/').reverse().join('-'),
                "CustomerEmail": Bookingdata.CustomerEmail,
                "Country": Bookingdata.Country,
                "State": Bookingdata.State,
                "City": Bookingdata.City,
                "STDCode": Bookingdata.STDCode,
                "Salutation": CustomerData.Salutation || "Mr.",
                "Booking": [
                    {
                        "BookingDate": this.Formatter.DateFormat(CustomerData.BookingDate).split('/').reverse().join('-'),
                        "RentPrice": CustomerData.RentPrice,
                        "NoOfPersons": CustomerData.NoOfPersons,
                        "StartDate": Bookingdata.StartDate.split('/').reverse().join('-'),
                        "EndDate": Bookingdata.EndDate.split('/').reverse().join('-'),
                        "PaymentType": paymentMap[unit] || Bookingdata.UnitText, // fallback
                        "BedType": Bookingdata.BedTypeName
                    }
                ],
                "FacilityItems": CustomerData.AllSelectedFacilities.map(item => {
                    // Normalize UnitText for facility as well
                    var itemUnit = item.UnitText ? item.UnitText.trim().toLowerCase() : "";
                    return {
                        FacilityID: item.FacilityID,
                        FacilityName: item.FacilityName,
                        FacilitiPrice: item.Price,
                        StartDate: item.StartDate.split('/').reverse().join('-'),
                        EndDate: item.EndDate.split('/').reverse().join('-'),
                        UnitText: paymentMap[itemUnit] || item.UnitText, // convert to Per Month/Day/Year
                        TotalHour: item.TotalHour,
                        BookingID: CustomerData.BookingID,
                        CustomerID: CustomerData.CustomerID,
                        Currency: item.Currency,
                        StartTime: item.StartTime,
                        EndTime: item.EndTime
                      
                    };
                })
            };

            // Send payload
            this.ajaxUpdateWithJQuery("HM_Customer", {
                data: [Payload],
                filters: { CustomerID: CustomerData.CustomerID }
            })
                .then(() => {
                    sap.m.MessageToast.show("Booking saved successfully!");

                    // Refresh models
                    this.AD_onSearch();
                    this.getView().getModel("VisibleModel").setProperty("/visible", false);
                    this.byId("idMonthYearSelect").setVisible(false);
                })
                .catch(err => {
                    sap.m.MessageToast.show("Error saving booking!");
                    console.error(err);
                });
        }

    });
});