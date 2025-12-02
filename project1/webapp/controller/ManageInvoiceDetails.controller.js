sap.ui.define([
        "./BaseController", //call base controller
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageToast",
        "../utils/validation",
        "sap/ui/model/odata/type/Currency",
        "../model/formatter",
    ],
    function(BaseController, JSONModel, MessageToast, utils, Currency, Formatter) {
        "use strict";
        return BaseController.extend("sap.ui.com.project1.controller.ManageInvoiceDetails", {
            Formatter: Formatter,
            onInit: function() {
                this.getOwnerComponent().getRouter().getRoute("RouteManageInvoiceDetails").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: async function(oEvent) {
                var sArg = oEvent.getParameter("arguments").sPath;
                var sSource = oEvent.getParameter("arguments").dash; // Get the source parameter
                this.sourceView = sSource || "ManageInvoice";
                this.onSearch();

                this.scrollToSection("CID_id_CmpInvObjectPageLayout", "CID_id_CmpInvGoals");
                // if (!this.getView().getModel("CCMailModel")) this._fetchCommonData("EmailContent", "CCMailModel", { Type: "ManageInvoice", Action: "CC" });
                this._makeDatePickersReadOnly(["CID_id_Invoice", "CID_id_Payby", "CID_id_NavInvoice", "CID_id_NavPayby", "CI_Id_Status"]);

                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.loginModel = this.getView().getModel("LoginModel");

                var loginModel = this.getOwnerComponent().getModel("LoginModel");
                this.BranchCode = loginModel.getProperty("/BranchCode");
                this.decodedPath = decodeURIComponent(decodeURIComponent(sArg));
                this.Discount = true;
                this.RateUnit = true;
                this.Particulars = true;
                this.mobileNo = true;
                this.ResivedTDSFlag = true;
                this.byId("CID_id_AddCustComboBox").setValueState("None");
                this.byId("CID_id_AddBooking").setValueState("None");
                this.byId("CID_id_InvoiceDesc").setValueState("None");
                this.byId("CID_id_ConversionRate").setValueState("None");
                this.byId("CID_id_InputMailID").setValueState("None");
                // this.byId("CID_id_IncomeTaxPercentage").setValueState("None");
                this.byId("CID_id_CurrencySelect").setEditable(true);
                const oView = this.getView();
                if (this.getView().getModel("ManageInvoiceModel")) {
                    if (this.getView().getModel("ManageInvoiceModel").getData().length === 0) {
                        var LastInvoiceDate = new Date()
                    } else {
                        var LastInvoiceDate = new Date(this.getView().getModel("ManageInvoiceModel").getData()[0].InvoiceDate)
                    }
                }
                oView.setModel(new JSONModel({
                    CustomerID: "",
                    BookingID: "",
                    CustomerName: "",
                    InvNo: "",
                    InvoiceDate: "",
                    Name: "",
                    PAN: "",
                    GST: "",
                    PermanentAddress: "",
                    CustomerEmail: "",
                    MobileNo: "",
                    SOWDetails: "",
                    Type: "",
                    InvoiceDescription: "",
                    Currency: "INR",
                    PayByDate: "",
                    POSOW: "",
                    Status: "Submitted",
                    SubTotalNotGST: "0",
                    SubTotalInGST: "0",
                    LUT: "",
                    IncomePerc: "10",
                    RoomNo:"",
                    BranchCode:""
                }), "SelectedCustomerModel");

                this.SelectedCustomerModel = oView.getModel("SelectedCustomerModel");


                oView.setModel(new JSONModel({
                    BookingID: "",
                }), "BookingModel");

                oView.setModel(new JSONModel({
                    results: [],
                    InvNo: this.newID,
                    IndexNo: "",
                    ItemID: "",
                    UnitText: "",
                    Particulars: "",
                    SAC: "",
                    Rate: "",
                    Currency: "INR",
                    Total: "",
                    gstAmount: "",
                    TotalAmount: "",
                    subTotal: ""
                }), "FilteredSOWModel");

                oView.setModel(new JSONModel({
                    createVisi: true,
                    editVisi: false,
                    editable: true,
                    igstVisi: false,
                    gstVisiable: false,
                    flexVisiable: false,
                    CInvoice: false,
                    addInvBtn: true,
                    merge: false,
                    GST: true,
                    payByDate: false,
                    Form: true,
                    Table: false,
                    MultiEmail: true,
                    Edit: true,
                    IncomeTax: true,
                    minDate: LastInvoiceDate
                }), "visiablityPlay");

                var SowDataModel = new JSONModel({
                    items: []
                });
                this.getView().setModel(SowDataModel, "CombinedData");
                this.visiablityPlay = oView.getModel("visiablityPlay");
                this.visiablityPlay.setProperty("/Edit", false);
                this.visiablityPlay.setProperty("/MultiEmail", false);
                this.visiablityPlay.setProperty("/merge", false);
                oView.setModel(new JSONModel(), "ManageInvoiceItemModel");
                this.byId("CID_id_TableInvoiceItem").setMode("Delete");
                this.Update = false;
                if (sArg === "X") return;
                this.visiablityPlay.setProperty("/Edit", true);
                this.visiablityPlay.setProperty("/flexVisiable", true);
                this.visiablityPlay.setProperty("/createVisi", false);
                this.visiablityPlay.setProperty("/editVisi", true);
                this.visiablityPlay.setProperty("/editable", false);
                this.visiablityPlay.setProperty("/addInvBtn", false);
                this.visiablityPlay.setProperty("/MultiEmail", false);
                this.byId("CID_id_TableInvoiceItem").setMode("None");
                this.byId("CID_id_CurrencySelect").setEditable(false);
                this.visiablityPlay.setProperty("/merge", true);
                this.visiablityPlay.setProperty("/MultiEmail", true);

                sap.ui.core.BusyIndicator.show(0);
                try {
                    const oData = await this.ajaxReadWithJQuery("HM_ManageInvoiceItem", {
                        InvNo: this.decodedPath
                    });
                    this.Update = true;
                    if (!oData.success) throw new Error("Invalid data structure");

                    var oHeader = oData.data.ManageInvoice?.[0] || {};
                    this.byId("CID_id_Payby").setMinDate(new Date(oHeader.InvoiceDate));
                    this.byId("CID_id_NavPayby").setMinDate(new Date(oHeader.InvoiceDate));
                    oHeader.InvoiceDate = this.Formatter.DateFormat(oHeader.InvoiceDate);
                    var PayByDate = oHeader.PayByDate;
                    oHeader.PayByDate = this.Formatter.DateFormat(oHeader.PayByDate);

                    this.SelectedCustomerModel.setData(oHeader);

                    const aItems = oData.data.ManageInvoiceItem.map((item, index) => ({
                        ...item,
                        IndexNo: index + 1,
                        StartDate: item.StartDate ? this.Formatter.DateFormat(item.StartDate) : "",
                        EndDate: item.EndDate ? this.Formatter.DateFormat(item.EndDate) : ""
                    }));

                    oView.setModel(new JSONModel({
                        ManageInvoiceItem: aItems
                    }), "ManageInvoiceItemModel");

                    const {
                        IGST = "0", SGST = "0", CGST = "0", Value, Currency, Status, InvNo
                    } = oHeader;
                    this.getView().getModel("FilteredSOWModel").setProperty("/Currency", Currency);
                    if (IGST === "0") {
                        this.visiablityPlay.setProperty("/igstVisi", false);
                        this.visiablityPlay.setProperty("/gstVisiable", true);
                    } else {
                        this.visiablityPlay.setProperty("/igstVisi", true);
                        this.visiablityPlay.setProperty("/gstVisiable", false);
                    }

                    if (IGST === "0" && SGST === "0" && CGST === "0") {
                        this.visiablityPlay.setProperty("/igstVisi", false);
                        this.visiablityPlay.setProperty("/gstVisiable", false);
                    }

                    if (Value == null) {
                        this.visiablityPlay.setProperty("/igstVisi", false);
                        this.visiablityPlay.setProperty("/gstVisiable", false);
                    }

                    if (Currency !== "INR") {
                        this.visiablityPlay.setProperty("/GST", false);
                        this.byId("idSAC")?.setVisible(false);
                        this.byId("idGSTCalculation")?.setVisible(false);
                        this.visiablityPlay.setProperty("/TDS", false);
                    } else {
                        this.visiablityPlay.setProperty("/GST", true);
                        this.byId("idSAC")?.setVisible(true);
                        this.byId("idGSTCalculation")?.setVisible(true);
                        this.visiablityPlay.setProperty("/TDS", true);
                    }

                    if (PayByDate) {
                        const payByDate = new Date(PayByDate);
                        const today = new Date();
                        const daysDiff = Math.ceil((payByDate - today) / (1000 * 60 * 60 * 24));
                        const showReminder = daysDiff <= 10;
                        this.visiablityPlay.setProperty("/payByDate", showReminder);
                        this.ReminderEmail = showReminder;
                    }

                    if (Status === "Payment Received") {
                        this.visiablityPlay.setProperty("/payByDate", false);
                        this.visiablityPlay.setProperty("/createVisi", false);
                        this.visiablityPlay.setProperty("/Edit", false);
                        this.visiablityPlay.setProperty("/MultiEmail", false);
                    }
                    this.Status = Status;

                    this.totalAmountCalculation();
                    this.Readcall("InvoicePaymentDetail", {
                        InvNo: this.decodedPath
                    })
                } catch (error) {
                    MessageToast.show(error.responseText || "Failed to load invoice data.");
                } finally {
                    sap.ui.core.BusyIndicator.hide();
                }
            },

            onSearch: function() {
                var filter = {
                    Status: "Assigned",
                    Status: "Completed"
                };
                this.ajaxReadWithJQuery("HM_Booking", filter).then((oData) => {
                    var oFCIAerData = Array.isArray(oData.commentData) ? oData.commentData : [oData.commentData];
                    var model = new sap.ui.model.json.JSONModel(oFCIAerData);
                    this.getView().setModel(model, "ManageCustomerModel")
                    sap.ui.core.BusyIndicator.hide();
                })
            },

            onNavBack: function() {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("RouteManageInvoice");
            },

            onHome: function() {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("RouteHostel");
            },

            onChangeAddCustomer: async function(oEvent) {
                try {
                    utils._LCvalidateMandatoryField(oEvent);

                    this.SelectKey = oEvent.getSource().getSelectedKey();
                    const allData = this.getView().getModel("ManageCustomerModel").getData();

                    // Filter selected customer record
                    const SelectedData = allData.find(item => item.CustomerID === this.SelectKey);
                    if (!SelectedData) return;

                    sap.ui.core.BusyIndicator.show(0);

                    // Filter booking list for selected customer
                    const bookingList = allData.filter(item => item.CustomerID === this.SelectKey).map(i => ({
                        BookingID: i.BookingID
                    }));

                    const bookingModel = new sap.ui.model.json.JSONModel(bookingList);
                    this.getView().setModel(bookingModel, "BookingModel");

                    // Reset booking combo
                    this.byId("CID_id_AddBooking").setSelectedKey("");

                    // Reset invoice model
                    this.getView().getModel("ManageInvoiceItemModel").setProperty("/ManageInvoiceItem", []);
                } catch (err) {
                    sap.m.MessageToast.show(err.message);
                } finally {
                    sap.ui.core.BusyIndicator.hide();
                }
            },

            onChangeBookingID: async function(oEvent) {
                try {
                    const bookingID = oEvent.getSource().getSelectedKey();
                    const customerID = this.SelectKey;

                    if (!bookingID || !customerID) return;

                    sap.ui.core.BusyIndicator.show(0);

                    // 1️⃣ API call
                    const oData = await this.ajaxCreateWithJQuery("HM_getAllInvoiceData", {
                        data: {
                            CustomerID: customerID,
                            BookingID: bookingID
                        }
                    });

                    // 2️⃣ Extract month & year from backend
                    const selectedMonth = oData.data.Month; // example: 12
                    const selectedYear = oData.data.Year; // example: 2025

                    // 3️⃣ Create date objects
                    const invoiceDate = new Date(selectedYear, selectedMonth - 1, 1); // 1st of month
                    const payByDate = new Date(selectedYear, selectedMonth, 5); // 5th of next month

                    // 4️⃣ Bind InvoiceDate
                    const invoicePicker = this.byId("CID_id_Invoice");
                    invoicePicker.setDateValue(invoiceDate);
                    invoicePicker.setMinDate(invoiceDate);

                    // 5️⃣ Bind PayByDate
                    const payByPicker = this.byId("CID_id_Payby");
                    payByPicker.setDateValue(payByDate);
                    payByPicker.setMinDate(payByDate);

                    // 6️⃣ Update Model
                    const oModel = this.getView().getModel("SelectedCustomerModel");
                    oModel.setProperty("/InvoiceDate", invoiceDate);
                    oModel.setProperty("/PayByDate", payByDate);
                    
                    

                    // 7️⃣ Calculate final items (your existing code remains same)
                    // Filter booking data
                    const allBookings = this.getView().getModel("ManageCustomerModel").getData();
                    const bookingDetails = allBookings.find(b => b.BookingID === bookingID);

                    if (!bookingDetails) {
                        sap.m.MessageToast.show("Booking details not found");
                        return;
                    }

                    if (oData.data.ManageCustomer && oData.data.ManageCustomer.length > 0) {
                        let mergedData = Object.assign({}, oData.data.ManageCustomer[0], {
                            RoomNo: oData.data?.BookingData?.[0]?.RoomNo || "",
                            BranchCode: oData.data?.BookingData?.[0]?.BranchCode || "",
                            CustomerID: customerID,
                            BookingID: bookingID
                        });

                        this.getView().getModel("SelectedCustomerModel").setData(mergedData);
                    }

                    // Facility array
                    const facilityArray = Array.isArray(oData.data.BookingFacilityItems) ?
                        oData.data.BookingFacilityItems : [oData.data.BookingFacilityItems];

                    let finalInvoiceItems = [];

                    // Booking row
                    finalInvoiceItems.push({
                        IndexNo: 1,
                        InvNo: this.newID,
                        Particulars: `${bookingDetails.BedType} - Room Rent`,
                        UnitText: bookingDetails.PaymentType,
                        SAC: "998314",
                        GSTCalculation: "YES",
                        Discount: "",
                        Total: parseFloat(bookingDetails.RoomPrice),
                        StartDate: this.Formatter.DateFormat(bookingDetails.StartDate),
                        EndDate: this.Formatter.DateFormat(bookingDetails.EndDate),
                        Currency: bookingDetails.Currency
                    });

                    // Facility Rows
                    facilityArray.forEach((item, index) => {
                        finalInvoiceItems.push({
                            IndexNo: index + 2,
                            InvNo: this.newID,
                            Particulars: `${item.FacilityName} - Facility`,
                            UnitText: item.UnitText,
                            SAC: "998314",
                            GSTCalculation: "YES",
                            Discount: "",
                            Total: parseFloat(item.FacilitiPrice),
                            StartDate: this.Formatter.DateFormat(item.StartDate),
                            EndDate: this.Formatter.DateFormat(item.EndDate),
                            Currency: item.Currency
                        });
                    });

                    // Bind to model
                    this.getView().getModel("ManageInvoiceItemModel").setProperty("/ManageInvoiceItem", finalInvoiceItems);
                    await this.totalAmountCalculation();
                    utils._LCvalidateMandatoryField(oEvent);
                } catch (err) {
                    sap.m.MessageToast.show(err.message);
                } finally {
                    sap.ui.core.BusyIndicator.hide();
                }
            },


            onChangeInvoiceDate: function(oEvent) {
                const selectedDate = oEvent.getSource().getDateValue();
                if (!selectedDate) return;

                // Calculate next month 5th
                const payByDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 5);

                this.byId("CID_id_Payby").setDateValue(payByDate);
                this.byId("CID_id_Payby").setMinDate(payByDate);

                this.getView().getModel("SelectedCustomerModel").setProperty("/PayByDate", payByDate);
                utils._LCvalidateDate(oEvent);
            },

            onPayByDateDatePickerChange: function(oEvent) {
                utils._LCvalidateDate(oEvent);
            },

            CID_onPressAddInvoiceItems: function(oEvent) {
                const oView = this.getView();
                const oItemModel = oView.getModel("ManageInvoiceItemModel");
                let oData = oItemModel.getProperty("/ManageInvoiceItem") || [];
                // Generate new invoice item
                const currency = this.byId("CID_id_CurrencySelect").getValue();
                this.IndexNo = oData.length ? oData[oData.length - 1].IndexNo + 1 : 1;
                const newItem = {
                    IndexNo: this.IndexNo,
                    Particulars: "",
                    SAC: "998314",
                    GSTCalculation: (currency === "INR") ? "YES" : "",
                    StartDate: "",
                    EndDate: "",
                    UnitText: "Per Day",
                    Currency: currency,
                    Discount: "",
                    Total: "",
                };
                if (this.Update) {
                    newItem.flag = "create";
                }
                // Add and update model
                oData.push(newItem);
                oItemModel.setProperty("/ManageInvoiceItem", oData);
            },

            CI_On_ChangeRateType: function(oEvent) {
                var data = oEvent.getSource().getSelectedItem().getBindingContext("ManageInvoiceItemModel").getObject();

                switch (data.UnitText) {
                    case 'Per Day':
                        data.Unit = 20;
                        break;
                    case 'Per Month':
                        data.Unit = 1;
                        break;
                    case 'Per Hour':
                        data.Unit = 168;
                        break;
                    case 'Fixed Bid':
                        data.Unit = 1;
                        break;
                    default:
                        data.Unit = 1;
                }
                // Optionally update the model (if using two-way binding or need manual update)
                this.getView().getModel("ManageInvoiceItemModel").refresh(true);
                this.totalAmountCalculation();
            },

            totalAmountCalculation: function() {
                const oView = this.getView();
                const oSOWModel = oView.getModel("FilteredSOWModel");
                const oInvoiceModel = oView.getModel("ManageInvoiceItemModel");
                const oCustomerModel = oView.getModel("SelectedCustomerModel");
                let aSOWDetails = oInvoiceModel.getProperty("/ManageInvoiceItem") || [];
                let totalWithGST = 0;
                let totalWithoutGST = 0;
                let NetAmount = 0;

                aSOWDetails.forEach((item) => {
                    if (oSOWModel.getProperty("/Currency") === "INR" && !oCustomerModel.getProperty("/GST")) {
                        oCustomerModel.setProperty("/Value", '9');
                        oCustomerModel.setProperty("/Type", 'CGST/SGST');
                        this.visiablityPlay.setProperty("/GST", true);
                    }

                    const baseAmount = parseFloat(item.Total) || 0;
                    let discountAmount = 0;

                    if (typeof item.Discount === "string" && item.Discount.trim().endsWith("%")) {
                        const percent = parseFloat(item.Discount) / 100;
                        discountAmount = baseAmount * percent;
                    } else {
                        discountAmount = parseFloat(item.Discount) || 0;
                    }

                    if (discountAmount > baseAmount) {
                        discountAmount = 0;
                        item.Discount = "0.00";
                    } else {
                        item.Discount = discountAmount.toFixed(2);
                    }

                    let finalAmount = baseAmount - discountAmount;
                    item.Total = finalAmount.toFixed(2);

                    const isGSTApplicable = item.GSTCalculation === "YES" &&
                        oSOWModel.getProperty("/Currency") === "INR";

                    item.SAC = isGSTApplicable ? "998314" : "-";

                    if (isGSTApplicable) {
                        totalWithGST += finalAmount;
                    } else {
                        totalWithoutGST += finalAmount;
                    }
                });

                const subTotalGST = totalWithGST.toFixed(2);
                const subTotalNoGST = totalWithoutGST.toFixed(2);
                const subtotal = (totalWithGST + totalWithoutGST).toFixed(2);

                oCustomerModel.setProperty("/SubTotalInGST", subTotalGST);
                oCustomerModel.setProperty("/SubTotalNotGST", subTotalNoGST);
                oCustomerModel.setProperty("/AmountInINR", subTotalGST);
                oSOWModel.setProperty("/subTotal", subtotal);

                const type = oCustomerModel.getProperty("/Type");
                const taxRate = parseFloat(oCustomerModel.getProperty("/Value")) || 0;
                let gstAmount = 0,
                    finalAmount = totalWithGST + totalWithoutGST;

                if (type === "CGST/SGST") {
                    gstAmount = (totalWithGST * taxRate) / 100;
                    finalAmount += gstAmount * 2;
                    oCustomerModel.setProperty("/CGST", gstAmount.toFixed(2));
                    oCustomerModel.setProperty("/SGST", gstAmount.toFixed(2));
                } else if (type === "IGST") {
                    gstAmount = (totalWithGST * taxRate) / 100;
                    finalAmount += gstAmount;
                    oCustomerModel.setProperty("/IGST", gstAmount.toFixed(2));
                }

                let roundedAmount = Math.round(finalAmount);
                let difference = (roundedAmount - finalAmount).toFixed(2);
                let RoundOf = difference > 0 ? `+${difference}` : difference;
                roundedAmount = roundedAmount - NetAmount;

                oSOWModel.setProperty("/RoundOf", RoundOf);
                oSOWModel.setProperty("/TotalAmount", roundedAmount.toFixed(2));
                oSOWModel.setProperty("/gstAmount", gstAmount.toFixed(2));
                oCustomerModel.setProperty("/TotalAmount", roundedAmount.toFixed(2));
                oInvoiceModel.refresh(true);
                this.onChangeConversionRate();
            },

            Comp_onChangeGSTCalculation: function(oEvent) {
                this.totalAmountCalculation();
            },

            onChangeConversionRate: function(oEvent) {
                if (oEvent) {
                    utils._LCvalidateAmount(oEvent);
                }
                var oModel = this.getView().getModel("FilteredSOWModel").getData().subTotal;
                var value = this.getView().getModel("SelectedCustomerModel");
                var data = parseFloat(value.getData().ConversionRate) * parseFloat(oModel);
                value.setProperty("/AmountInFCurrency", parseFloat(data).toFixed(2));
            },

            onChangeSowDetailsCal: async function(oEvent) {
                this.RateUnit = utils._LCvalidateAmount(oEvent);
                const oInput = oEvent.getSource();
                const oRowContext = oInput.getBindingContext("ManageInvoiceItemModel");
                if (!oRowContext) return;

                const oSOW = oRowContext.getObject();
                const rate = parseFloat(oSOW.Rate) || 0;
                const unit = parseFloat(oSOW.Unit) || 0;
                const discount = parseFloat(oSOW.Discount) || 0;

                let iTotal = unit ? rate * unit : rate;
                iTotal -= discount;

                const sTotalPath = oRowContext.getPath() + "/Total";
                oRowContext.getModel().setProperty(sTotalPath, isNaN(iTotal) ? 0 : iTotal.toFixed(2));

                this.visiablityPlay.setProperty("/flexVisiable", true);

                await this.totalAmountCalculation();

                const oNavigationModel = this.getView().getModel("SelectedCustomerModel");
                const oNavigationData = oNavigationModel.getData();

                if (oNavigationData.Currency === "INR") {
                    const subTotalInGST = parseFloat(oNavigationData.SubTotalInGST) || 0;
                    const subTotalNotGST = parseFloat(oNavigationData.SubTotalNotGST) || 0;
                    const incomePerc = parseFloat(oNavigationData.IncomePerc) || 0;

                    const totalAmount = subTotalInGST + subTotalNotGST;
                    const tds = ((totalAmount * incomePerc) / 100).toFixed(2);

                    oNavigationModel.setProperty("/IncomeTax", Math.round(tds));
                } else {
                    oNavigationModel.setProperty("/IncomeTax", "0.00");
                }
            },

            onParticularsInputLiveChange: function(oEvent) {
                this.Particulars = utils._LCvalidateMandatoryField(oEvent);
            },

            Comp_OnChangeDiscount: async function(oEvent) {
                var sValue = oEvent.getParameter("value").trim();
                var regex = /^[0-9]+(\.[0-9]{1,2})?%?$/;
                var oInput = oEvent.getSource();
                sValue = sValue.replace(/[^0-9.%]/g, "");

                var isPercentage = sValue.indexOf('%') !== -1;
                if (isPercentage) {
                    sValue = sValue.replace('%', '');
                }

                var parts = sValue.split('.');
                if (parts.length > 1) {
                    parts[1] = parts[1].substring(0, 2);
                    sValue = parts.join('.');
                }

                if (isPercentage) {
                    sValue = sValue + '%';
                }
                oInput.setValue(sValue);
                await this.totalAmountCalculation();
                if (!sValue) {
                    oInput.setValueState("None");
                    oInput.setValueStateText("");
                    // this.CI_updateTotalAmount();
                    this.Discount = true;
                } else if (!regex.test(sValue)) {
                    oInput.setValueState("Error");
                    oInput.setValueStateText(this.i18nModel.getText("discountValueText"));
                    this.Discount = false;
                } else {
                    oInput.setValueState("None");
                    oInput.setValueStateText("");
                    this.Discount = true;
                }

                var oNavigationModel = this.getView().getModel("SelectedCustomerModel");
                var oData = oNavigationModel.getData();

                if (oData.Currency === "INR") {
                    var subTotalInGST = parseFloat(oData.SubTotalInGST) || 0;
                    var subTotalNotGST = parseFloat(oData.SubTotalNotGST) || 0;
                    var incomePerc = parseFloat(oData.IncomePerc) || 0;

                    var tds = ((subTotalInGST + subTotalNotGST) * incomePerc / 100).toFixed(2);
                    oNavigationModel.setProperty("/IncomeTax", Math.round(tds));
                }
            },
            CID_onPressAddCustomer: function() {
                this.getView().getModel("LoginModel").setProperty("/RichText", false);
                this.getRouter().navTo("RouteManageCustomer", {
                    value: "Data"
                });
            },

            CID_onPressMSAandSOW: function() {
                this.getView().getModel("LoginModel").setProperty("/RichText", false);
                if (this.SelectKey) {
                    this.getRouter().navTo("RouteMSAEdit", {
                        sPath: this.SelectKey
                    });
                } else {
                    this.getRouter().navTo("RouteMSA");
                }
            },

            CID_onPressback: function() {
                this.getView().getModel("LoginModel").setProperty("/RichText", false);
                if (this.sourceView === "InvoiceDashboard") {
                    this.getRouter().navTo("RouteInvoiceDashboard");
                } else {
                    this.getRouter().navTo("RouteManageInvoice");
                }
            },

            CID_ValidateDate: function(oEvent) {
                utils._LCvalidateDate(oEvent)
            },

            CID_ValidateDatePayByDate: function(oEvent) {
                utils._LCvalidateDate(oEvent)
                var [day, month, year] = oEvent.getSource().getValue().split('/').map(Number);
                var payByDate = new Date(year, month - 1, day);
                var today = new Date();
                var timeDiff = payByDate - today;
                var daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                if (daysDiff <= 10) {
                    this.ReminderEmail = true;
                } else {
                    this.ReminderEmail = false;
                }
            },

            SubmitPayload: async function(sMode) {
                const oView = this.getView();
                const oSelectedCustomerModel = oView.getModel("SelectedCustomerModel").getData();
                const oManageInvoiceItemModel = oView.getModel("ManageInvoiceItemModel").getData();
                var FilterModel = this.getView().getModel("FilteredSOWModel").getData()


                const oModel = {
                    subTotal: oSelectedCustomerModel.SubTotalInGST,
                    gstAmount: oSelectedCustomerModel.gstAmount,
                    TotalAmount: oSelectedCustomerModel.TotalAmount
                };

                const oPayload = {
                    InvoiceDate: (sMode === 'update') ? oSelectedCustomerModel.InvoiceDate.split('/').reverse().join('-') : this.Formatter.formatDate(oSelectedCustomerModel.InvoiceDate).split('/').reverse().join('-') || "",
                    CustomerName: (sMode === 'update') ? oSelectedCustomerModel.CustomerName : oSelectedCustomerModel.CustomerName,
                    GST: oSelectedCustomerModel.GST != null ? String(oSelectedCustomerModel.GST) : '',
                    PermanentAddress: String(oSelectedCustomerModel.PermanentAddress),
                    PAN: String(oSelectedCustomerModel.PAN) || "",
                    MobileNo: oSelectedCustomerModel.MobileNo != null ? String(oSelectedCustomerModel.MobileNo) : '',
                    AmountInFCurrency: FilterModel.Currency === "INR" ?
                        (!isNaN(oSelectedCustomerModel.AmountInFCurrency) ? oSelectedCustomerModel.AmountInFCurrency : "0") : parseFloat(oModel.subTotal) || 0,
                    Currency: FilterModel.Currency,
                    ConversionRate: !isNaN(oSelectedCustomerModel.ConversionRate) ? parseFloat(oSelectedCustomerModel.ConversionRate) : 0,
                    AmountInINR: FilterModel.Currency === "INR" ?
                        parseFloat(oModel.subTotal) || 0 : parseFloat(oSelectedCustomerModel.AmountInFCurrency) || 0,
                    CGST: oSelectedCustomerModel.Type === "CGST/SGST" ? parseFloat(oSelectedCustomerModel.CGST) || 0 : 0,
                    SGST: oSelectedCustomerModel.Type === "CGST/SGST" ? parseFloat(oSelectedCustomerModel.SGST) || 0 : 0,
                    IGST: oSelectedCustomerModel.Type === "IGST" ? parseFloat(oSelectedCustomerModel.IGST) || 0 : 0,
                    TotalAmount: parseFloat(oModel.TotalAmount) || 0,
                    Status: oSelectedCustomerModel.Status || "Submitted",
                    InvoiceDescription: oSelectedCustomerModel.InvoiceDescription || "",
                    IncomeTax: (FilterModel.Currency === "INR") ? oSelectedCustomerModel.IncomeTax : "",
                    CustomerEmail: oSelectedCustomerModel.CustomerEmail,
                    Type: oSelectedCustomerModel.Type || "",
                    Value: (!oSelectedCustomerModel.Value || isNaN(oSelectedCustomerModel.Value)) ? "0" : oSelectedCustomerModel.Value,
                    PayByDate: (sMode === 'update') ? oSelectedCustomerModel.PayByDate.split('/').reverse().join('-') : this.Formatter.formatDate(oSelectedCustomerModel.PayByDate).split('/').reverse().join('-') || "",
                    SubTotalNotGST: parseFloat(oSelectedCustomerModel.SubTotalNotGST) || 0,
                    SubTotalInGST: parseFloat(oSelectedCustomerModel.SubTotalInGST) || 0,
                    LUT: String(oSelectedCustomerModel.LUT) || "",
                    IncomePerc: (FilterModel.Currency === "INR") ? oSelectedCustomerModel.IncomePerc || "10" : "",
                    CustomerID: oSelectedCustomerModel.CustomerID,
                    BookingID: oSelectedCustomerModel.BookingID,
                    BranchCode: oSelectedCustomerModel.BranchCode,
                    RoomNo:oSelectedCustomerModel.RoomNo
                };
                const aItemsRaw = oManageInvoiceItemModel.ManageInvoiceItem || [];
                if (aItemsRaw.length === 0) {
                    sap.ui.core.BusyIndicator.show(0);
                    MessageToast.show(this.i18nModel.getText("companyTableValidation"));
                    return false;
                }
                for (let i = 0; i < aItemsRaw.length; i++) {
                    const item = aItemsRaw[i];
                    if (!item.Particulars) {
                        sap.ui.core.BusyIndicator.show(0);
                        sap.m.MessageBox.error(`Please fill all mandatory fields (Particulars) in item row ${i + 1}`);
                        return false;
                    }
                }
                const aItems = aItemsRaw.map(item => {
                    const itemData = {
                        InvNo: oSelectedCustomerModel.InvNo,
                        SAC: item.SAC,
                        UnitText: item.UnitText,
                        Particulars: item.Particulars,
                        Total: item.Total,
                        Currency: item.Currency,
                        GSTCalculation: item.GSTCalculation,
                        Discount: item.Discount,
                        StartDate: item.StartDate.split('/').reverse().join('-'),
                        EndDate: item.EndDate.split('/').reverse().join('-'),
                    };
                    if (sMode === "update") {
                        let filters;
                        if (item.flag === "create") {
                            filters = {
                                flag: "create"
                            };
                        } else {
                            filters = {
                                InvNo: oSelectedCustomerModel.InvNo,
                                ItemID: item.ItemID
                            };
                        }
                        return {
                            data: itemData,
                            filters: filters
                        };
                    } else {
                        return itemData;
                    }
                });
                const finalPayload = {
                    payload: oPayload
                };
                if (sMode === "update") {
                    finalPayload.filters = {
                        InvNo: oSelectedCustomerModel.InvNo,
                    };
                }
                finalPayload.items = aItems;
                return finalPayload;
            },

            CID_onPressSubmit: async function(oEvent) {
                try {
                    var that = this;
                    var oModel = this.getView().getModel("FilteredSOWModel").getData();
                    const bMandatoryValid =
                        utils._LCvalidateMandatoryField(this.byId("CID_id_AddCustComboBox"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("CID_id_AddBooking"), "ID") &&
                        utils._LCvalidateDate(this.byId("CID_id_Invoice"), "ID") &&
                        utils._LCvalidateDate(this.byId("CID_id_Payby"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("CID_id_InvoiceDesc"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("CID_id_CurrencySelect"), "ID");
                    // const bTDSValid = oModel.Currency === "INR" ? utils._LCvalidateVariablePay(this.byId("CID_id_IncomeTaxPercentage"), "ID") : true;
                    const bConversionRateValid = oModel.Currency !== "INR" ? utils._LCvalidateAmount(this.byId("CID_id_ConversionRate"), "ID") : true;
                    const bOptionalValid = this.Discount && this.RateUnit && this.Particulars;
                    const bIsValid = bMandatoryValid && bOptionalValid && bConversionRateValid;
                    if (!bIsValid) {
                        return MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"));
                    }
                    sap.ui.core.BusyIndicator.show(0);
                    const oPayload = await this.SubmitPayload("Create");
                    if (oPayload === false) {
                        sap.ui.core.BusyIndicator.hide();
                        return;
                    }
                    try {
                        var response = await that.ajaxCreateWithJQuery("HM_ManageInvoice", {
                            data: oPayload.payload,
                            Items: oPayload.items
                        });
                        const oSelectedCustomerModel = that.getView().getModel("SelectedCustomerModel");
                        oSelectedCustomerModel.setProperty("/InvNo", response.InvoiceNo);
                        var CustomerName = oSelectedCustomerModel.getProperty("/Customer");
                        oSelectedCustomerModel.setProperty("/CustomerName", CustomerName)
                        that.closeBusyDialog();
                        var oDialog = new sap.m.Dialog({
                            title: this.i18nModel.getText("success"),
                            type: sap.m.DialogType.Message,
                            state: sap.ui.core.ValueState.Success,
                            content: new sap.m.Text({
                                text: this.i18nModel.getText("invoiceCreatemsg")
                            }),
                            beginButton: new sap.m.Button({
                                text: "OK",
                                type: "Transparent",
                                press: function() {
                                    oDialog.close();
                                    that.getOwnerComponent().getRouter().navTo("RouteManageInvoice");
                                }
                            }),
                            endButton: new sap.m.Button({
                                text: "Generate PDF",
                                type: "Transparent",
                                press: function() {
                                    oDialog.close();
                                    that.CID_onPressGeneratePdf();
                                    that.getOwnerComponent().getRouter().navTo("RouteManageInvoice");
                                }
                            }),
                            afterClose: function() {
                                oDialog.destroy();
                            }
                        });
                        oDialog.open();
                    } catch (error) {
                        sap.m.MessageToast.show(error.responseText || "Submission failed");
                    }
                } catch (error) {
                    MessageToast.show(that.i18nModel.getText("technicalError"));
                }
            },

            CID_onPressEdit: function() {
                var isEditMode = this.visiablityPlay.getProperty("/editable");
                if (isEditMode) {
                    this.onPressUpdateInvoice();
                } else {
                    this.visiablityPlay.setProperty("/editable", true);
                    this.visiablityPlay.setProperty("/CInvoice", true);
                    this.byId("CID_id_TableInvoiceItem").setMode("Delete");
                    this.visiablityPlay.setProperty("/addInvBtn", true);
                    this.visiablityPlay.setProperty("/merge", false);
                    this.visiablityPlay.setProperty("/MultiEmail", false);
                    this.visiablityPlay.setProperty("/payByDate", false);
                }
            },
            CID_onPressLiveChangeEmail: function(oEvent) {
                utils._LCvalidateEmail(oEvent)
            },

            CID_onPressLiveChangeMobileNo: function(oEvent) {
                this.mobileNo = utils._LCvalidateMobileNumber(oEvent);
            },

            onPressUpdateInvoice: async function() {
                try {
                    // var oModel = this.getView().getModel("FilteredSOWModel").getData();
                    const bIsValid =
                        utils._LCvalidateMandatoryField(this.byId("CID_id_InvoiceDesc"), "ID") && this.mobileNo &&
                        utils._LCvalidateEmail(this.byId("CID_id_InputMailID"), "ID") &&
                        (!!this.Discount && !!this.Particulars)

                    if (!bIsValid) {
                        return MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"));
                    }

                    sap.ui.core.BusyIndicator.show(0);
                    const oPayload = await this.SubmitPayload("update");

                    if (oPayload === false) {
                        sap.ui.core.BusyIndicator.hide();
                        return;
                    } else {
                        var Status = oPayload.payload.Status;
                    }
                    try {
                        await this.ajaxUpdateWithJQuery("HM_ManageInvoice", {
                            data: oPayload.payload,
                            filtres: oPayload.filters,
                            Items: oPayload.items
                        });
                        this.visiablityPlay.setProperty("/editable", false);
                        this.visiablityPlay.setProperty("/CInvoice", false);
                        this.byId("CID_id_TableInvoiceItem").setMode("None");
                        this.visiablityPlay.setProperty("/addInvBtn", false);
                        this.visiablityPlay.setProperty("/merge", true);
                        this.visiablityPlay.setProperty("/MultiEmail", true);
                        if (Status !== "Payment Received") this.visiablityPlay.setProperty("/payByDate", this.ReminderEmail);
                        if (Status === "Payment Received") {
                            this.visiablityPlay.setProperty("/MultiEmail", false);
                            this.visiablityPlay.setProperty("/Edit", false);
                        }
                        MessageToast.show(this.i18nModel.getText("invoiceUpdateMess"));
                        sap.ui.core.BusyIndicator.hide();
                    } catch (error) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show(error.responseText || this.i18nModel.getText("invoiceUpdateMessFailed"));
                    }
                } catch (error) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show(this.i18nModel.getText("technicalError"));
                }
            },

            onChangeInvoiceStatus: function(oEventOrStatus) {
                var that = this;
                var status = "";
                if (oEventOrStatus && typeof oEventOrStatus.getSource === "function") {
                    var oSource = oEventOrStatus.getSource();

                    if (typeof oSource.getValue === "function") {
                        status = oSource.getValue();
                        this.visiablityPlay.setProperty("/Form", true);
                        this.visiablityPlay.setProperty("/Table", false);
                    }
                } else if (typeof oEventOrStatus === "string") {
                    status = oEventOrStatus;
                    this.visiablityPlay.setProperty("/Form", false);
                    this.visiablityPlay.setProperty("/Table", true);
                }
                if (status === "Payment Received" || status === "Payment Partially" || status === "Open") {
                    var oView = that.getView();
                    if (!that.oDialog) {
                        that.oDialog = sap.ui.core.Fragment.load({
                            name: "sap.ui.com.project1.fragment.ManageInvoice",
                            controller: that
                        }).then(function(oDialog) {
                            that.oDialog = oDialog;
                            oView.addDependent(that.oDialog);
                            that.oDialog.open();
                            that.modelFunction();
                        }.bind(that));
                    } else {
                        that.oDialog.open();
                        that.modelFunction();
                    }
                }
            },

            modelFunction: function() {
                var oNavigationModel = this.getView().getModel("SelectedCustomerModel").getData();
                var ResivedTDSData = (
                    oNavigationModel.Currency === "INR" ?
                    parseFloat(oNavigationModel.IncomeTax) - parseFloat(this.getView().getModel("InvoicePayment").getProperty("/AllReceivedTDS") || 0) : 0).toFixed(2)
                var oModel = new JSONModel({
                    InvNo: oNavigationModel.InvNo,
                    TransactionId: "",
                    ReceivedDate: "",
                    ReceivedAmount: "",
                    TotalAmount: parseFloat(oNavigationModel.TotalAmount).toFixed(2),
                    DueAmount: (
                        this.getView().getModel("InvoicePayment").getData().length !== 0 ?
                        parseFloat(this.getView().getModel("InvoicePayment").getProperty("/AllDueAmount")) - parseFloat(ResivedTDSData || 0) :
                        parseFloat(oNavigationModel.TotalAmount || 0) - parseFloat(oNavigationModel.IncomeTax || 0)
                    ).toFixed(2),
                    Currency: oNavigationModel.Currency,
                    ReceivedTDS: ResivedTDSData,
                    ConversionRate: "",
                    AmountInINR: "",
                    FlagVisCompany: "Company Invoice"
                });

                this.getView().setModel(oModel, "PaymentModel")
                this.DueAmount = (this.getView().getModel("InvoicePayment").getData().length !== 0) ? parseFloat(this.getView().getModel("InvoicePayment").getProperty("/AllDueAmount")) : parseFloat(oNavigationModel.TotalAmount) - parseFloat(oNavigationModel.IncomeTax);
                this.ResivedTDS = (oNavigationModel.Currency === "INR") ? parseFloat(oNavigationModel.IncomeTax) - parseFloat(this.getView().getModel("InvoicePayment").getProperty("/AllReceivedTDS") || 0) : '0';
            },

            CID_onPressDisplayPaymentDetail: function() {
                this.onChangeInvoiceStatus("Open");
                this.visiablityPlay.setProperty("/Form", false);
                this.visiablityPlay.setProperty("/Table", true);
            },

            onChangeReceivedAmount: function(oEvent) {
                var paymentModel = this.getView().getModel("PaymentModel");
                var allPaymentData = this.getView().getModel("InvoicePayment");

                var totalReceivedAmount = 0;
                if (allPaymentData) {
                    totalReceivedAmount = allPaymentData.getProperty("/AllReceivedAmount");
                }

                var sValue = paymentModel.getProperty("/ReceivedAmount") || "";
                sValue = sValue.replaceAll(',', '');
                paymentModel.setProperty("/ReceivedAmount", sValue);

                var totalAmount = parseFloat(paymentModel.getProperty("/TotalAmount")) || 0;
                var receivedAmount = parseFloat(sValue) || 0;
                var receivedTDS = parseFloat((paymentModel.getProperty("/ReceivedTDS") || "").replaceAll(',', '')) || 0;
                var AllreceivedTDS = parseFloat(allPaymentData.getProperty("/AllReceivedTDS")) || 0;

                var dueAmount = totalAmount - totalReceivedAmount - receivedAmount - receivedTDS - AllreceivedTDS;
                paymentModel.setProperty("/DueAmount", dueAmount.toFixed(2));
                this.onChangePaymentConvertionRate();

                if (oEvent) {
                    var enteredAmount = parseFloat(oEvent.getParameter("value").replaceAll(',', '')) || 0;
                    var dueAmount = parseFloat(this.DueAmount);
                    this.ResivedAmount = true;
                    if (enteredAmount === dueAmount) {
                        sap.ui.getCore().byId("idReceivedAmount").setValueState("None");
                    } else if (enteredAmount > dueAmount) {
                        this.ResivedAmount = false;
                        sap.ui.getCore().byId("idReceivedAmount").setValueState("Error");
                        sap.ui.getCore().byId("idReceivedAmount").setValueStateText(this.i18nModel.getText("invoiceRecievedAmountMessage"));
                    } else {
                        sap.ui.getCore().byId("idReceivedAmount").setValueState("None");
                        this.ResivedAmount = true;
                        utils._LCvalidateAmountZeroTaking(oEvent);
                    }
                }
            },

            onChangePaymentConvertionRate: function(oEvent) {
                if (oEvent) utils._LCvalidateAmount(oEvent);
                var oModelData = this.getView().getModel("PaymentModel");
                var receivedAmount = parseFloat(oModelData.getData().ReceivedAmount);
                var conversionRate = parseFloat(oModelData.getData().ConversionRate);
                var AmountInINR = receivedAmount * conversionRate;
                (isNaN(AmountInINR)) ? oModelData.setProperty("/AmountInINR", '0.00'): oModelData.setProperty("/AmountInINR", AmountInINR.toFixed(2));
            },

            // onChangeReceivedTDS: async function(oEvent) {
            //     var oInput = sap.ui.getCore().byId("idReceivedTDS");
            //     var sValue = oInput.getValue().replaceAll(',', ''); // Remove comma
            //     oInput.setValue(sValue); // Update cleaned value back to Input

            //     if (parseFloat(sValue) > parseFloat(this.ResivedTDS)) {
            //         this.ResivedTDSFlag = false;
            //         oInput.setValueState("Error");
            //         oInput.setValueStateText(this.i18nModel.getText("tdsAmountError"));
            //     } else {
            //         this.ResivedTDSFlag = true;
            //         oInput.setValueState("None");
            //         this.onChangeReceivedAmount();
            //     }
            // },

            Readcall: async function(entity, filterValue) {
                const oData = await this.ajaxReadWithJQuery(entity, filterValue);
                if (entity === "ManageInvoice") {
                    const invoiceData = oData.data?.[0] || {};
                    if (invoiceData.Currency !== "INR") {
                        invoiceData.AmountInFCurrency = invoiceData.AmountInINR;
                    }
                    invoiceData.InvoiceDate = this.Formatter.formatDate(invoiceData.InvoiceDate);
                    invoiceData.PayByDate = this.Formatter.formatDate(invoiceData.PayByDate);
                    this.getView().setModel(new JSONModel(invoiceData), "SelectedCustomerModel");
                    this.Status = invoiceData.Status;
                    return;
                }
                // Handle non-"ManageInvoice" case
                const view = this.getView();
                view.setModel(new JSONModel(oData.data), "InvoicePayment");
                view.setModel(new JSONModel({
                    InvoicePaymentDetail: oData.data
                }), "PaymentDetailModel");
                const items = oData.data || [];
                const totalReceivedAmount = items.reduce((sum, item) => sum + (parseFloat(item.ReceivedAmount) || 0), 0);
                const totalReceivedTDS = items.reduce((sum, item) => sum + (parseFloat(item.ReceivedTDS) || 0), 0);
                const totalAmount = parseFloat(items[0]?.TotalAmount || 0);
                const totalDueAmount = totalAmount - (totalReceivedAmount + totalReceivedTDS);
                const invoiceModel = view.getModel("InvoicePayment");
                invoiceModel.setProperty("/AllReceivedAmount", totalReceivedAmount.toFixed(2));
                invoiceModel.setProperty("/AllReceivedTDS", totalReceivedTDS.toFixed(2));
                invoiceModel.setProperty("/AllDueAmount", totalDueAmount.toFixed(2));
                invoiceModel.setProperty("/AllReceiveTDS", totalReceivedTDS.toFixed(2));
                invoiceModel.refresh(true);
            },

            onPressInvClose: function() {
                sap.ui.getCore().byId("idTransactionID").setValueState("None");
                sap.ui.getCore().byId("idReceivedAmount").setValueState("None");
                // sap.ui.getCore().byId("idReceivedTDS").setValueState("None");
                sap.ui.getCore().byId("idFrgConvertionRate").setValueState("None");

                if (this.oDialog) {
                    this.oDialog.close();
                    this.oDialog.destroy(true);
                    this.oDialog = null;
                }
            },
            onLiveTransactionID: function(oEvent) {
                utils._LCvalidateMandatoryField(oEvent)
            },
            onReceivedDateDatePickerChange: function(oEvent) {
                utils._LCvalidateDate(oEvent);
            },

            onChangePaymentRecived: async function() {
                var paymentModel = this.getView().getModel("PaymentModel").getData();
                const isMandatoryValid =
                    utils._LCvalidateMandatoryField(sap.ui.getCore().byId("idTransactionID"), "ID") &&
                    utils._LCvalidateDate(sap.ui.getCore().byId("idReceivedDate"), "ID");

                let isCurrencyValid = true;
                if (paymentModel.Currency !== "INR") {
                    isCurrencyValid = utils._LCvalidateAmount(sap.ui.getCore().byId("idFrgConvertionRate"), "ID");
                } else {
                    await this.onChangeReceivedTDS();
                }

                var receivedAmount = parseFloat((paymentModel.ReceivedAmount || "0").replaceAll(',', ''));
                // var receivedTDS = parseFloat((paymentModel.ReceivedTDS).replaceAll(',', ''));
                var isReceivedAmountInvalid = isNaN(receivedAmount) || receivedAmount <= 0;
                // var isReceivedTDSInvalid = isNaN(receivedTDS) || receivedTDS < 0;

                if (isReceivedAmountInvalid) {
                    sap.ui.getCore().byId("idReceivedAmount").setValueState("Error").setValueStateText(this.i18nModel.getText("invoiceRecievedAmountMessage"));
                } else {
                    sap.ui.getCore().byId("idReceivedAmount").setValueState("None");
                }
                // if (paymentModel.Currency === "INR") {
                //     if (isReceivedTDSInvalid) {
                //         sap.ui.getCore().byId("idReceivedTDS").setValueState("Error").setValueStateText(this.i18nModel.getText("tdsAmountError"));
                //     } else {
                //         sap.ui.getCore().byId("idReceivedTDS").setValueState("None");
                //     }
                // }

                if (isReceivedAmountInvalid) {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    return;
                }

                const isValid = isMandatoryValid && isCurrencyValid && this.ResivedAmount && this.ResivedTDSFlag;
                if (!this.ResivedAmount) {
                    sap.ui.getCore().byId("idReceivedAmount").setValueState("Error").setValueStateText(this.i18nModel.getText("invoiceRecievedAmountMessage"));
                }

                if (!isValid) {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    return;
                }

                if (Number(paymentModel.DueAmount) < 0) {
                    sap.m.MessageBox.error(this.i18nModel.getText("dueAmountZeroOrNegative"));
                    return;
                }

                sap.ui.core.BusyIndicator.show(0);
                const jsonData = {
                    InvNo: String(paymentModel.InvNo),
                    TransactionId: String(paymentModel.TransactionId),
                    ReceivedDate: String(paymentModel.ReceivedDate),
                    ReceivedAmount: String(paymentModel.ReceivedAmount),
                    TotalAmount: String(paymentModel.TotalAmount),
                    DueAmount: String(paymentModel.DueAmount),
                    Currency: String(paymentModel.Currency),
                    ReceivedTDS: String(paymentModel.ReceivedTDS),
                    ConversionRate: paymentModel.Currency !== "INR" ? String(paymentModel.ConversionRate) : "",
                    AmountInINR: paymentModel.Currency !== "INR" ? String(paymentModel.AmountInINR) : ""
                };

                try {
                    const oData = await this.ajaxCreateWithJQuery("InvoicePaymentDetail", {
                        data: jsonData
                    });

                    if (oData && oData.success) {
                        this.oDialog.close();
                        this.Readcall("InvoicePaymentDetail", {
                            InvNo: this.decodedPath
                        });
                        this.Readcall("ManageInvoice", {
                            InvNo: this.decodedPath
                        });

                        const hasDue = parseFloat(paymentModel.DueAmount) > 0;
                        this.visiablityPlay.setProperty("/payByDate", hasDue ? this.ReminderEmail : false);
                        this.visiablityPlay.setProperty("/MultiEmail", hasDue);
                        this.visiablityPlay.setProperty("/Edit", hasDue);
                        this.visiablityPlay.setProperty("/editable", false);
                        this.visiablityPlay.setProperty("/CInvoice", false);
                        this.visiablityPlay.setProperty("/merge", true);
                        this.visiablityPlay.setProperty("/addInvBtn", false);
                        this.byId("CID_id_TableInvoiceItem").setMode("None");
                        MessageToast.show(this.i18nModel.getText("paymentMessage"));
                    }
                } catch (error) {
                    MessageToast.show(error.responseText);
                } finally {
                    sap.ui.core.BusyIndicator.hide();
                }
            },

            CID_ValidateCommonFields: function(oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },

            CID_CurrencyChanges: function(oEvent) {
                if (oEvent.getSource().getValue() !== "INR") {
                    this.byId("idSAC").setVisible(false);
                    this.byId("idGSTCalculation").setVisible(false);
                    this.visiablityPlay.setProperty("/TDS", false);
                } else {
                    this.byId("idSAC").setVisible(true);
                    this.byId("idGSTCalculation").setVisible(true);
                    this.visiablityPlay.setProperty("/TDS", true);
                }
                this.visiablityPlay.refresh(true);
                this.totalAmountCalculation();
            },
            CD_onDiscountInfoPress: function(oEvent) {
                if (!this._oPopover) {
                    this._oPopover = new sap.m.Popover({
                        contentWidth: "400px",
                        contentHeight: "auto",
                        showHeader: false,
                        placement: sap.m.PlacementType.Bottom,
                        content: [
                            new sap.m.VBox({
                                alignItems: "Center",
                                justifyContent: "Center",
                                width: "100%",
                                items: [
                                    new sap.m.Text({
                                        text: this.i18nModel.getText("discountInfoText"),
                                        wrapping: true
                                    })
                                ]
                            }).addStyleClass("customPopoverContent")
                        ]
                    });
                    this.getView().addDependent(this._oPopover);
                }
                this._oPopover.openBy(oEvent.getSource());
            },

            CID_onPressDelete: function(oEvent) {
                var that = this;
                var oModel = this.getView().getModel("ManageInvoiceItemModel");
                var oContext = oEvent.getParameter("listItem").getBindingContext("ManageInvoiceItemModel");
                var sIndex = oContext.getPath().split("/")[2];
                var aData = oModel.getData();

                if (oContext.getObject().ItemID) {
                    this.showConfirmationDialog(
                        this.i18nModel.getText("msgBoxConfirm"),
                        this.i18nModel.getText("msgBoxConfirmDelete"),
                        function() {
                            that.getBusyDialog();
                            that.ajaxDeleteWithJQuery("/ManageInvoiceItem", {
                                filters: {
                                    ItemID: oContext.getObject().ItemID
                                }
                            }).then(() => {
                                aData.ManageInvoiceItem.splice(oContext.getPath().split('/')[2], 1);
                                aData.ManageInvoiceItem.forEach((item, index) => item.IndexNo = index + 1);
                                oModel.setProperty("/ManageInvoiceItem", aData.ManageInvoiceItem);
                                that.SNoValue = aData.ManageInvoiceItem.length;
                                that.totalAmountCalculation();
                                MessageToast.show(that.i18nModel.getText("ManageInvoiceDeleteSuccess"));
                                that.closeBusyDialog();
                            }).catch((error) => {
                                that.closeBusyDialog();
                                MessageToast.show(error.responseText);
                            });
                        },
                        function() {
                            that.closeBusyDialog();
                        }
                    );
                } else {
                    // Local item – delete directly
                    aData.ManageInvoiceItem.splice(sIndex, 1);
                    aData.ManageInvoiceItem.forEach((item, index) => item.IndexNo = index + 1);
                    oModel.setProperty("/ManageInvoiceItem", aData.ManageInvoiceItem);
                    this.SNoValue = aData.ManageInvoiceItem.length;
                    this.totalAmountCalculation();
                }
            },

            CID_onPressSendEmail: function(oEvent) {
                var that = this;
                that.loginModel.setProperty("/RichText", true);
                that.loginModel.setProperty("/SimpleForm", false);
                var modelData = that.getView().getModel("SelectedCustomerModel").getData();

                var oUploaderDataModel = new JSONModel({
                    isEmailValid: true,
                    ToEmail: modelData.CustomerEmail,
                    ToName: modelData.CustomerName,
                    CCEmail: this.getView().getModel("CCMailModel").getData()[0].CCEmailId,
                    name: "",
                    mimeType: "",
                    content: "",
                    isFileUploaded: false,
                    button: true,
                    Subject: "KALPAVRIKSHA TECHNOLOGIES - INVOICE PAYMENT REMINDER",
                    htmlbody: `<p>Dear Finance Team,</p>
                    <p>I hope you're doing well. This is a friendly reminder that payment for invoice ${modelData.InvNo}, issued on  ${modelData.InvoiceDate}, is still outstanding.</p>
                    <li><b>Invoice No : ${modelData.InvNo}</b></li>
                    <li><b>Due Date : ${modelData.PayByDate}</b></li>
                    <li><b>Invoice Amount : ${this.Formatter.fromatNumber(modelData.TotalAmount)} ${modelData.Currency}</b></li>
                    <li><b>Received Amount : ${this.Formatter.fromatNumber(this.getView().getModel("InvoicePayment").getProperty("/AllReceivedAmount"))} ${modelData.Currency}</b></li>                  
                    <li><b>Due Amount : ${this.Formatter.fromatNumber(this.getView().getModel("InvoicePayment").getProperty("/AllDueAmount"))}</b></li>                  
                    <li><b>Description : ${modelData.InvoiceDescription}</b></li>

                    <p>If you’ve already made the payment, kindly disregard this reminder. Otherwise, we would appreciate it if you could arrange payment as soon as possible.</p>
                    <p>If you have any questions or need further information, please don't hesitate to contact us.</p>
                    <p>Thank you for your attention to this matter.</p>
                   <p style="margin: 0;">Best Regards,</p>                  
                   <p style="margin: 0;">Finance Department</p>
                    `
                });
                this.getView().setModel(oUploaderDataModel, "UploaderData");
                this.EOD_commonOpenDialog("sap.ui.com.project1.fragment.CommonMail", true);
            },

            CID_onPressSendMultipalEmail: function() {
                var that = this;
                that.loginModel.setProperty("/RichText", true);
                that.loginModel.setProperty("/SimpleForm", true);
                var modelData = that.getView().getModel("SelectedCustomerModel").getData();
                // that.getView().getModel("TextDisplay").setProperty("/name", "");
                var EmailData = that.getView().getModel("SelectedCustomerModel");

                var oUploaderDataModel = new JSONModel({
                    isEmailValid: true,
                    ToEmail: modelData.MailID,
                    ToName: modelData.CustomerName,
                    CCEmail: this.getView().getModel("CCMailModel").getData()[0].CCEmailId,
                    name: "",
                    mimeType: "",
                    content: "",
                    isFileUploaded: false,
                    button: false,
                    Subject: `${modelData.CustomerName} - ${modelData.InvoiceDescription}`,
                    htmlbody: `<p>Dear Finance Team,</p>
                    <p>Please find the following invoice details below:</p>
                    <li><b>Invoice No : ${modelData.InvNo}</b></li>
                    <li><b>Invoice Date : ${modelData.InvoiceDate}</b></li>
                    <li><b>Total Amount : ${this.Formatter.fromatNumber(modelData.TotalAmount)} ${modelData.Currency}</b></li>
                    <li><b>Description : ${modelData.InvoiceDescription}</b></li>

                    <p>If you have any questions or require further information, please do not hesitate to contact us.</p>
                   <p style="margin: 0;">Best Regards,</p>
                   <p style="margin: 0;">Nikhil Shah,</p>
                   <p style="margin: 0;">Accountant Manager</p>
                   `
                });
                this.getView().setModel(oUploaderDataModel, "UploaderData");
                this.EOD_commonOpenDialog("sap.ui.com.project1.fragment.CommonMail", false);
                this.validateSendButton();
            },

            Mail_onPressClose: function() {
                this.loginModel.setProperty("/RichText", false);
                this.loginModel.setProperty("/SimpleForm", true);
                this.EOU_oDialogMail.close();
                this.EOU_oDialogMail.destroy(true);
                this.EOU_oDialogMail = null
            },

            EOD_commonOpenDialog: async function(fragmentName, value) {
                if (!this.EOU_oDialogMail) {
                    sap.ui.core.Fragment.load({
                        name: fragmentName,
                        controller: this,
                    }).then(function(EOU_oDialogMail) {
                        this.EOU_oDialogMail = EOU_oDialogMail;
                        this.getView().addDependent(this.EOU_oDialogMail);
                        this.EOU_oDialogMail.open();
                        if (value === true) sap.ui.getCore().byId("SendMail_Button").setEnabled(true);
                    }.bind(this));
                } else {
                    this.EOU_oDialogMail.open();
                    if (value === true) sap.ui.getCore().byId("SendMail_Button").setEnabled(true);
                }
            },

            Mail_onUpload: function(oEvent) {
                this.handleFileUpload(
                    oEvent,
                    this, // context
                    "UploaderData", // model name
                    "/attachments", // path to attachment array
                    "/name", // path to comma-separated file names
                    "/isFileUploaded", // boolean flag path
                    "uploadSuccessfull", // i18n success key
                    "fileAlreadyUploaded", // i18n duplicate key
                    "noFileSelected", // i18n no file selected
                    "fileReadError", // i18n file read error
                    () => this.validateSendButton()
                );
            },
            //Mail dialog button visibility
            validateSendButton: function() {
                const sendBtn = sap.ui.getCore().byId("SendMail_Button");
                const emailField = sap.ui.getCore().byId("CCMail_TextArea");
                const uploaderModel = this.getView().getModel("UploaderData");
                if (!sendBtn || !emailField || !uploaderModel) {
                    return;
                }
                const isEmailValid = utils._LCvalidateEmail(emailField, "ID") === true;
                const isFileUploaded = uploaderModel.getProperty("/isFileUploaded") === true;

                sendBtn.setEnabled(isEmailValid && isFileUploaded);
            },

            Mail_onEmailChange: function() {
                this.validateSendButton();
            },
            //Send mail
            Mail_onSendEmail: function() {
                try {
                    var oModel = this.getView().getModel("UploaderData").getData();
                    if (this.loginModel.getProperty("/SimpleForm")) {
                        if (!oModel.attachments || oModel.attachments.length === 0) {
                            MessageToast.show(this.i18nModel.getText("attachmentRequired")); // Or a hardcoded string: "Please add at least one attachment."
                            return;
                        }
                    }
                    var SelectedModel = this.getView().getModel("SelectedCustomerModel");
                    var oPayload = {
                        "InvNo": SelectedModel.getData().InvNo,
                        "toEmailID": oModel.ToEmail,
                        "toName": oModel.ToName,
                        "subject": oModel.Subject,
                        "body": oModel.htmlbody,
                        "CCEmailId": oModel.CCEmail,
                        "attachments": oModel.attachments
                    };
                    sap.ui.core.BusyIndicator.show(0);
                    this.ajaxCreateWithJQuery("ManageInvoiceEmail", oPayload).then((oData) => {
                        MessageToast.show(this.i18nModel.getText("emailSuccess"));
                        sap.ui.core.BusyIndicator.hide();
                        SelectedModel.setProperty("/Status", "Invoice Sent");
                        SelectedModel.refresh(true);
                        this.loginModel.setProperty("/RichText", false);
                        this.loginModel.setProperty("/SimpleForm", true);
                    }).catch((error) => {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show(error.responseText);
                    });
                    this.Mail_onPressClose();
                } catch (error) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show(error.responseText);
                }
            },

            onIncomeTaxPercentageInputLiveChange: function(oEvent) {
                utils._LCvalidateVariablePay(oEvent);
                const oNavigationModel = this.getView().getModel("SelectedCustomerModel");
                const oNavigationData = oNavigationModel.getData();

                if (oNavigationData.Currency === "INR") {
                    const subTotalInGST = parseFloat(oNavigationData.SubTotalInGST) || 0;
                    const subTotalNotGST = parseFloat(oNavigationData.SubTotalNotGST) || 0;
                    const incomePerc = parseFloat(oNavigationData.IncomePerc) || 0;

                    const total = subTotalInGST + subTotalNotGST;
                    const tds = ((total * incomePerc) / 100).toFixed(2);
                    oNavigationModel.setProperty("/IncomeTax", Math.round(tds));
                }
            },

            CID_onPressGeneratePdf: async function() {
                try {
                    const {
                        jsPDF
                    } = window.jspdf;
                    const oView = this.getView();
                    const oModel = oView.getModel("SelectedCustomerModel").getData();
                    const oManageInvoiceItemModel = oView.getModel("ManageInvoiceItemModel").getData();
                    const oCompanyItemModel = oManageInvoiceItemModel.ManageInvoiceItem || [];
                    var data = this.getView().getModel("FilteredSOWModel").getData();

                    let totalInWords = await this.convertNumberToWords(oModel.TotalAmount, oModel.Currency);
                    const showSAC = oModel.GSTNO !== undefined && oModel.GSTNO !== "";

                    const margin = 15;
                    const doc = new jsPDF({
                        orientation: "portrait",
                        unit: "mm",
                        format: "a4"
                    });

                    const pageWidth = doc.internal.pageSize.getWidth();
                    const pageHeight = doc.internal.pageSize.getHeight();
                    const usableWidth = pageWidth - 2 * margin;
                    const headerMargin = 25.4;
                    let currentY = headerMargin;

                    // ===== HEADER =====
                    doc.setFontSize(16);
                    doc.setFont("times", "bold");
                    let headerLabel = (oModel.GSTNO === undefined || oModel.GSTNO === "") ? "INVOICE" : "TAX-INVOICE";
                    doc.text(headerLabel, pageWidth - 18, currentY, {
                        align: "right"
                    });

                    currentY += 10;

                    // ===== INVOICE DETAILS TABLE RIGHT SIDE =====
                    const detailsStartY = currentY;
                    const rowHeight = 6.5;
                    const columnWidths = [30, 30];
                    doc.setFontSize(12);
                    doc.setFont("times", "normal");
                    const rightAlignX = pageWidth - 13.5 - columnWidths[0] - columnWidths[1];

                    const detailsTable = [{
                            label: 'Invoice No. :',
                            value: oModel.InvNo
                        },
                        {
                            label: 'Date :',
                            value: (oModel.InvoiceDate)
                        },
                        {
                            label: 'Room No :',
                            value: oModel.RoomNo
                        },
                    ];

                    detailsTable.forEach(row => {
                        doc.setFont("times", "bold");
                        doc.text(row.label, rightAlignX + columnWidths[0] - doc.getTextWidth(row.label), currentY + 5);
                        doc.setFont("times", "normal");
                        doc.text(row.value, rightAlignX + columnWidths[0] + 2, currentY + 5);
                        currentY += rowHeight;
                    });

                    // ===== INVOICE TO BLOCK =====
                    currentY = detailsStartY + 5;
                    doc.setFont("times", "bold");
                    doc.text("Invoice To:", margin, currentY);

                    currentY += 5;
                    doc.setFont("times", "normal");
                    doc.setFontSize(12);
                    doc.text(`Name : ${oModel.CustomerName}`, margin, currentY);
                    currentY += 5;

                    const ConsultantAddressLines = doc.splitTextToSize(oModel.PermanentAddress, usableWidth / 2 - 10);
                    doc.text(ConsultantAddressLines, margin, currentY);
                    currentY += ConsultantAddressLines.length * 5;

                    if (oModel.MobileNo) {
                        doc.text(`Mobile No : ${oModel.MobileNo}`, margin, currentY);
                        currentY += 5;
                    }

                    if (oModel.CustomerEmail) {
                        doc.text(`Email : ${oModel.CustomerEmail}`, margin, currentY);
                        currentY += 5;
                    }

                    if (oModel.GSTNO !== undefined && oModel.GSTNO !== "") {
                        doc.text(`GSTIN : ${oModel.GSTNO}`, margin, currentY);
                        currentY += 5;
                    }

                    currentY += 5;

                    // ===== TABLE BODY PREPARATION =====
                    const body = oCompanyItemModel.filter(item => item).map((item, index) => {
                        const row = [
                            index + 1,
                            item.Particulars,
                            (item.StartDate) || "",
                            (item.EndDate) || "",
                            item.UnitText,
                            Formatter.fromatNumber(item.Total) || "0.00"
                        ];
                        if (showSAC) row.splice(2, 0, item.SAC); // Insert SAC column when GST available
                        return row;
                    });

                    const head = showSAC ? [
                        ['Sl.No.', 'Particulars', 'SAC', 'Start Date', 'End Date', 'UnitText', 'Total']
                    ] : [
                        ['Sl.No.', 'Particulars', 'Start Date', 'End Date', 'UnitText', 'Total']
                    ];

                    // ===== AUTO TABLE =====
                    doc.autoTable({
                        startY: currentY,
                        head: head,
                        body: body,
                        theme: 'grid',
                        headStyles: {
                            fillColor: [20, 170, 183]
                        },
                        styles: {
                            font: "times",
                            fontSize: 10,
                            cellPadding: 3,
                            lineWidth: 0.5,
                            lineColor: [30, 30, 30],
                            halign: "center"
                        },
                        columnStyles: {
                            0: {
                                halign: 'center'
                            },
                            1: {
                                halign: 'left'
                            }
                        }
                    });

                    currentY = doc.lastAutoTable.finalY + 5;

                    if (currentY + 40 > pageHeight) {
                        doc.addPage();
                        currentY = 20;
                    }

                    // ===== SUMMARY TABLE =====
                    const summaryBody = [];

                    if (parseFloat(oModel.SubTotalNotGST) > 0) {
                        summaryBody.push([`Sub-Total ( Non-Taxable ) (${data.Currency}) :`,
                            Formatter.fromatNumber(parseFloat(oModel.SubTotalNotGST))
                        ]);
                    }

                    if (parseFloat(oModel.SubTotalInGST) > 0) {
                        summaryBody.push([
                            `Sub-Total ( Taxable ) (${data.Currency}) :`,
                            Formatter.fromatNumber(parseFloat(oModel.SubTotalInGST))
                        ]);
                    }

                    const percentageText = oModel.Value !== undefined ? `(${oModel.Value}%)` : `(${type.split(" ")[1]})`;
                    const cgstPercentage = percentageText;
                    const sgstPercentage = percentageText;
                    const igstPercentage = percentageText;

                    if (data.Currency !== "USD") {
                        const cgstValue = parseFloat(oModel.CGST) || 0;
                        const sgstValue = parseFloat(oModel.SGST) || 0;
                        const igstValue = parseFloat(oModel.IGST) || 0;

                        if (data.Currency === "INR" && (oModel.Type === "CGST/SGST" || type.split(" ")[0] === "CGST/SGST") && cgstValue > 0) {
                            summaryBody.push([`CGST ${cgstPercentage} :`, Formatter.fromatNumber(cgstValue.toFixed(2))]);
                            summaryBody.push([`SGST ${sgstPercentage} :`, Formatter.fromatNumber(sgstValue.toFixed(2))]);
                        } else if (data.Currency === "INR" && (oModel.Type === "IGST" || type.split(" ")[0] === "IGST") &&
                            igstValue > 0) {
                            summaryBody.push([`IGST ${igstPercentage} :`, Formatter.fromatNumber(igstValue.toFixed(2))]);
                        }
                    }

                    if (data.RoundOf && data.RoundOf !== "0") {
                        summaryBody.push([`Round Off (${data.Currency}) :`, data.RoundOf]);
                    }

                    const totalRowIndex = summaryBody.length;
                    summaryBody.push([`Total (${data.Currency}) :`, Formatter.fromatNumber(parseFloat(oModel.TotalAmount))]);

                    doc.autoTable({
                        startY: currentY,
                        head: [],
                        body: summaryBody,
                        theme: 'plain',
                        styles: {
                            font: "times",
                            fontSize: 10,
                            halign: "right",
                            cellPadding: 2,
                            overflow: "ellipsize"
                        },
                        columnStyles: {
                            0: {
                                halign: "right",
                                cellWidth: 60
                            },
                            1: {
                                halign: "right",
                                cellWidth: 40
                            }
                        },
                        margin: {
                            left: 95
                        },
                        didParseCell: function(data) {
                            if (data.row.index === totalRowIndex) {
                                data.cell.styles.lineWidth = {
                                    top: 0.5,
                                    right: 0,
                                    bottom: 0,
                                    left: 0
                                };
                                data.cell.styles.lineColor = [0, 0, 0];
                                data.cell.styles.fontStyle = 'bold';
                            }
                        }
                    });

                    currentY = doc.lastAutoTable.finalY + 10;

                    // ===== AMOUNT IN WORDS =====
                    oModel.AmountInWords = totalInWords;
                    doc.setFont("times", "bold");
                    doc.text("Amount in Words :", 13, currentY);

                    currentY += 5;
                    doc.setFont("times", "normal");
                    doc.text(oModel.AmountInWords || "", 13, currentY, {
                        maxWidth: 180
                    });

                    currentY += 15;
                    doc.setFontSize(11);
                    doc.text("Thank you for your Visiting!", margin - 2, currentY);

                    // ===== SAVE FILE =====
                    doc.save(`${oModel.CustomerName}-${oModel.InvNo}-Invoice.pdf`);

                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(error.message || error.responseText);
                } finally {
                    this.closeBusyDialog();
                }
            }
        });
    });