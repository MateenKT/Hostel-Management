sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library",
    "../model/formatter",
    "../utils/validation"
], function (BaseController, JSONModel, Fragment, MessageBox, Spreadsheet, exportLibrary, Formatter, utils) {
    "use strict";

    var EdmType = exportLibrary.EdmType;

    return BaseController.extend("sap.ui.com.project1.controller.CouponDetails", {
        Formatter: Formatter,

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteCouponDetails").attachPatternMatched(this._onRouteMatched, this);

            // View model for dialog state
            var oViewModel = new JSONModel({
                DialogMode: "Add",        // "Add" or "Edit"
                CurrentCoupon: {}         // bound to dialog
            });
            this.getView().setModel(oViewModel, "CouponView");
        },

        onHome: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },


        _onRouteMatched: function () {

            const oLoginModel = this.getOwnerComponent().getModel("LoginModel");

            if (oLoginModel) {
                this.getView().setModel(oLoginModel, "LoginModel");
            }
            this._loadCoupons();
        },

        /* ==========================
         *  Backend read: HM_Coupon
         * ========================== */
        _loadCoupons: async function () {
            var oView = this.getView();
            var oTable = oView.byId("couponTable");

            try {
                oTable.setBusy(true);

                var result = await this.ajaxReadWithJQuery("HM_Coupon", {});
                var aCoupons;

                if (Array.isArray(result.data)) aCoupons = result.data;
                else if (result.data) aCoupons = [result.data];
                else aCoupons = [];

                // ✅ NORMALIZE all dates
                // ✅ NORMALIZE all dates + derive Expired status
                aCoupons = aCoupons.map(function (c) {

                    if (c.StartDate) {
                        c.StartDate = c.StartDate.substring(0, 10);
                    }

                    if (c.EndDate) {
                        c.EndDate = c.EndDate.substring(0, 10);
                    }

                    if (c.CreatedAt && c.CreatedAt.includes("T")) {
                        c.CreatedAt = c.CreatedAt.replace("T", " ").substring(0, 19);
                    }

                    // ✅ DERIVE Expired status
                    var today = new Date().toISOString().slice(0, 10);

                    if (c.EndDate && c.EndDate < today && c.Status !== "Inactive") {
                        c.Status = "Expired";
                    }

                    return c;
                });


                var oModel = new JSONModel(aCoupons);
                oView.setModel(oModel, "CouponModel");

                // ✅ APPLY GROUP + SORT
                var oTable = oView.byId("couponTable");
                var oBinding = oTable.getBinding("items");

                var aSorters = [
                    // 1️⃣ Group by Status
                    new sap.ui.model.Sorter("Status", false, function (oContext) {
                        var sStatus = oContext.getProperty("Status");

                        return {
                            key: sStatus,
                            text: sStatus + " Coupons"
                        };
                    }),

                    // 2️⃣ Soonest expiry first
                    new sap.ui.model.Sorter("EndDate", false),

                    // 3️⃣ Highest value first
                    new sap.ui.model.Sorter("DiscountValue", true)
                ];

                oBinding.sort(aSorters);


            } catch (err) {
                MessageBox.error(
                    err?.responseJSON?.message || "Failed to load coupons (HM_Coupon)."
                );
            } finally {
                oTable.setBusy(false);
            }
        },


        createGroupHeader: function (oGroup) {
            return new sap.m.GroupHeaderListItem({
                title: oGroup.text,
                uppercase: false
            });
        },


        /* ================
         *  Navigation back
         * ================ */
        onNavBack: function () {
            var oHistory = sap.ui.core.routing.History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();
            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("TilePage", {}, true);
            }
        },

        /* =================
         *  Table actions
         * ================= */
        onAddCoupon: function () {

            var oViewModel = this.getView().getModel("CouponView");

            oViewModel.setProperty("/DialogMode", "Add");

            // ✅ Blank model → placeholders only
            oViewModel.setProperty("/CurrentCoupon", {
                DiscountType: "",
                DiscountValue: "",
                MaxUses: "",
                UsedCount: "",
                PerUserLimit: "",
                MinOrderValue: "",
                StartDate: "",
                EndDate: "",
                Status: ""
                // CreatedBy / CreatedAt added on SAVE only
            });

            this._openCouponDialog();
        },


        onEditCoupon: function () {

            var oTable = this.getView().byId("couponTable");
            var oItem = oTable.getSelectedItem();

            if (!oItem) {
                MessageBox.warning("Please select a coupon to edit.");
                return;
            }

            var oCtx = oItem.getBindingContext("CouponModel");
            var oData = Object.assign({}, oCtx.getObject());

            // ✅ Prevent editing expired coupons
            if (oData.Status === "Expired") {
                MessageBox.warning("Expired coupons cannot be modified.");
                return;
            }

            var oViewModel = this.getView().getModel("CouponView");
            oViewModel.setProperty("/DialogMode", "Edit");
            oViewModel.setProperty("/CurrentCoupon", oData);

            this._openCouponDialog();
        },



        onDeleteCoupon: async function () {

            var oTable = this.getView().byId("couponTable");
            var aSelectedItems = oTable.getSelectedItems();

            if (!aSelectedItems.length) {
                MessageBox.warning("Please select at least one coupon to delete.");
                return;
            }

            MessageBox.confirm(
                `Delete ${aSelectedItems.length} selected coupon(s)?`,
                {
                    icon: MessageBox.Icon.WARNING,
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    emphasizedAction: MessageBox.Action.NO,

                    onClose: async function (sAction) {

                        if (sAction !== MessageBox.Action.YES) return;

                        sap.ui.core.BusyIndicator.show(0);

                        try {

                            for (let oItem of aSelectedItems) {

                                let oCtx = oItem.getBindingContext("CouponModel");
                                let oData = oCtx.getObject();

                                await this.ajaxDeleteWithJQuery("HM_Coupon", {
                                    filters: {
                                        CouponId: oData.CouponId    // ✅ SAFE ROW-LEVEL DELETE
                                    }
                                });
                            }

                            MessageBox.success("Selected coupons deleted successfully.");
                            this._loadCoupons();

                        } catch (err) {

                            console.error("Delete failed:", err);
                            MessageBox.error("Error while deleting coupons.");

                        } finally {

                            sap.ui.core.BusyIndicator.hide();
                            oTable.removeSelections(true);
                        }

                    }.bind(this)
                }
            );
        },



        /* =====================
         *  Download (Spreadsheet)
         * ===================== */
        onDownloadCoupons: function () {
            var oTable = this.getView().byId("couponTable");
            var oBinding = oTable.getBinding("items");

            if (!oBinding || !oBinding.getLength || oBinding.getLength() === 0) {
                MessageBox.info("No coupons available to download.");
                return;
            }

            var aCols = this._createColumnConfig();
            var oSettings = {
                workbook: {
                    columns: aCols
                },
                dataSource: oBinding,
                fileName: "Coupons.xlsx"
            };

            var oSheet = new Spreadsheet(oSettings);
            oSheet.build()
                .then(function () {
                    oSheet.destroy();
                })
                .catch(function () {
                    oSheet.destroy();
                });
        },

        _createColumnConfig: function () {
            return [
                { label: "Discount Type", property: "DiscountType", type: EdmType.String },
                { label: "Discount Value", property: "DiscountValue", type: EdmType.Number },
                { label: "Max Uses", property: "MaxUses", type: EdmType.Number },
                { label: "Used Count", property: "UsedCount", type: EdmType.Number },
                { label: "Per User Limit", property: "PerUserLimit", type: EdmType.Number },
                { label: "Min Order Value", property: "MinOrderValue", type: EdmType.Number },
                { label: "Start Date", property: "StartDate", type: EdmType.String },
                { label: "End Date", property: "EndDate", type: EdmType.String },
                { label: "Status", property: "Status", type: EdmType.String },
                { label: "Created At", property: "CreatedAt", type: EdmType.String },
                { label: "Created By", property: "CreatedBy", type: EdmType.String }
            ];
        },


        /* =====================
         *  Dialog handling
         * ===================== */
        _openCouponDialog: async function () {
            var oView = this.getView();

            if (!this._oCouponDialog) {
                this._oCouponDialog = await Fragment.load({
                    id: oView.getId(),
                    name: "sap.ui.com.project1.fragment.CouponDialog",
                    controller: this
                });

                oView.addDependent(this._oCouponDialog);

                // make DatePickers readonly (no manual typing)
                var sViewId = oView.getId();
                this._FragmentDatePickersReadOnly([
                    sViewId + "--dpStartDate",
                    sViewId + "--dpEndDate"
                ]);

                // ✅ single source of truth for cleanup
                this._oCouponDialog.attachAfterClose(function () {
                    this._clearTableSelection();
                }.bind(this));
            }

            this._oCouponDialog.open();
        },



        onSaveCoupon: async function () {

            var oViewModel = this.getView().getModel("CouponView");
            var sMode = oViewModel.getProperty("/DialogMode");
            var oCoupon = Object.assign({}, oViewModel.getProperty("/CurrentCoupon"));

            // oCoupon.Status = "Active";
            let oView = this.getView();

            let bValid =
                utils._LCstrictValidationComboBox(
                    sap.ui.getCore().byId(oView.createId("cbDiscountType")), "ID"
                ) &&
                utils._LCvalidateMandatoryField(
                    sap.ui.getCore().byId(oView.createId("inDiscountValue")), "ID"
                ) &&
                utils._LCvalidateMandatoryField(
                    sap.ui.getCore().byId(oView.createId("inMaxUses")), "ID"
                ) &&
                utils._LCvalidateMandatoryField(
                    sap.ui.getCore().byId(oView.createId("inUsedCount")), "ID"
                ) &&
                utils._LCvalidateMandatoryField(
                    sap.ui.getCore().byId(oView.createId("inPerUserLimit")), "ID"
                ) &&
                utils._LCvalidateMandatoryField(
                    sap.ui.getCore().byId(oView.createId("inMinOrderValue")), "ID"
                ) &&
                (
                    sMode === "Add" ||
                    utils._LCstrictValidationComboBox(
                        sap.ui.getCore().byId(oView.createId("cbStatus")), "ID"
                    )
                ) &&
                utils._LCvalidateMandatoryField(
                    sap.ui.getCore().byId(oView.createId("dpStartDate")), "ID"
                ) &&
                utils._LCvalidateMandatoryField(
                    sap.ui.getCore().byId(oView.createId("dpEndDate")), "ID"
                );


            // ✅ THIS IS THE MISSING SAFETY NET
            if (!bValid) {
                sap.m.MessageToast.show("Please fill all mandatory fields correctly.");
                return;
            }



            // ✅ Date sanity
            let dStart = new Date(
                oView.getModel("CouponView").getProperty("/CurrentCoupon/StartDate")
            );
            let dEnd = new Date(
                oView.getModel("CouponView").getProperty("/CurrentCoupon/EndDate")
            );

            if (dEnd < dStart) {
                sap.m.MessageToast.show("End Date cannot be less than Start Date");
                return;
            }
            if (sMode === "Add") {
                oCoupon.Status = "Active";
            }


            try {

                if (sMode === "Add") {

                    oCoupon.Status = "Active";

                    oCoupon.CreatedAt = new Date()
                        .toISOString()
                        .slice(0, 19)
                        .replace("T", " ");

                    oCoupon.CreatedBy =
                        this.getView()
                            .getModel("LoginModel")
                            ?.getProperty("/EmployeeName") || "system";

                    await this.ajaxCreateWithJQuery("HM_Coupon", {
                        data: oCoupon
                    });

                    MessageBox.success("Coupon created successfully.");
                }
                else {
                    // ✅ UPDATE must include CouponId
                    if (!oCoupon.CouponId) {
                        MessageBox.error("Update failed: CouponId missing.");
                        return;
                    }

                    // ✅ PUT must send ID as FILTER not inside data
                    await this.ajaxUpdateWithJQuery("HM_Coupon", {
                        filters: {
                            CouponId: oCoupon.CouponId
                        },
                        data: {
                            DiscountType: oCoupon.DiscountType,
                            DiscountValue: oCoupon.DiscountValue,
                            MaxUses: oCoupon.MaxUses,
                            UsedCount: oCoupon.UsedCount,
                            PerUserLimit: oCoupon.PerUserLimit,
                            StartDate: oCoupon.StartDate,
                            EndDate: oCoupon.EndDate,
                            MinOrderValue: oCoupon.MinOrderValue,
                            Status: oCoupon.Status,
                            CreatedAt: oCoupon.CreatedAt,
                            CreatedBy: this.getView()
                                .getModel("LoginModel")
                                ?.getProperty("/EmployeeName") || oCoupon.CreatedBy

                        }
                    });

                    MessageBox.success("Coupon updated successfully.");

                }

                this._oCouponDialog.close();
                this._clearTableSelection();
                this._loadCoupons();


            } catch (err) {
                MessageBox.error(
                    err?.responseJSON?.message || "Failed to save coupon."
                );
            }
        },




        onCouponSearch: function () {

            var oTable = this.byId("couponTable");
            var oBinding = oTable.getBinding("items");

            var aFilters = [];

            var sStatus = this.byId("fStatus").getSelectedKey();
            var sType = this.byId("fDiscountType").getSelectedKey();

            var oRange = this.byId("fEndRange");
            var dFrom = oRange.getDateValue();
            var dTo = oRange.getSecondDateValue();

            // Status
            if (sStatus) {
                aFilters.push(new sap.ui.model.Filter(
                    "Status",
                    sap.ui.model.FilterOperator.EQ,
                    sStatus
                ));
            }

            // Discount type
            if (sType) {
                aFilters.push(new sap.ui.model.Filter(
                    "DiscountType",
                    sap.ui.model.FilterOperator.EQ,
                    sType
                ));
            }

            // ✅ Correct OVERLAP date filter
            if (dFrom && dTo) {

                var sFrom = dFrom.toISOString().slice(0, 10);
                var sTo = dTo.toISOString().slice(0, 10);

                aFilters.push(new sap.ui.model.Filter({
                    and: true,
                    filters: [
                        new sap.ui.model.Filter(
                            "StartDate",
                            sap.ui.model.FilterOperator.LE,
                            sTo
                        ),
                        new sap.ui.model.Filter(
                            "EndDate",
                            sap.ui.model.FilterOperator.GE,
                            sFrom
                        )
                    ]
                }));
            }

            oBinding.filter(aFilters);
        },



        onClearCoupons: function () {


            this.byId("fStatus").setSelectedKey("");
            this.byId("fDiscountType").setSelectedKey("");

            var oRange = this.byId("fEndRange");

            // ✅ Fully reset date range
            oRange.setValue("");
            oRange.setDateValue(null);
            oRange.setSecondDateValue(null);

        },
        // ===== Discount Type (STRICT combo) =====
        onChange_DiscountType: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent);
        },

        // ===== Discount Value (PERCENT vs FIXED logic) =====
        onLiveChange_DiscountValue: function (oEvent) {

            const oInput = oEvent.getSource();
            const sValue = oInput.getValue().trim();

            const sType = sap.ui.getCore()
                .byId(this.getView().createId("cbDiscountType"))
                .getSelectedKey();

            // Must have discount type selected first
            if (!sType) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText("Select Discount Type first");
                return;
            }

            // Only digits + optional decimal
            if (!/^\d+(\.\d+)?$/.test(sValue)) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText("Only numbers allowed");
                return;
            }

            const fVal = parseFloat(sValue);

            if (sType === "Percentage") {

                // ✅ Validate 1 – 100
                if (fVal <= 0 || fVal > 100) {
                    oInput.setValueState(sap.ui.core.ValueState.Error);
                    oInput.setValueStateText("Percentage must be between 1 and 100");
                    return;
                }

            } else {

                // ✅ Validate currency amount
                if (fVal <= 0) {
                    oInput.setValueState(sap.ui.core.ValueState.Error);
                    oInput.setValueStateText("Amount must be greater than 0");
                    return;
                }

            }

            // ✅ Clear error when valid
            oInput.setValueState(sap.ui.core.ValueState.None);
        },





        // ===== All numeric fields =====
        onLiveChange_Number_MinOne: function (oEvent) {

            const oInput = oEvent.getSource();
            const sValue = oInput.getValue().trim();

            if (!/^\d*$/.test(sValue)) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText("Only numbers allowed");
                return;
            }

            const iVal = parseInt(sValue, 10);

            if (isNaN(iVal) || iVal < 1) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText("Value must be at least 1");
                return;
            }

            oInput.setValueState(sap.ui.core.ValueState.None);
        },
        onLiveChange_Number_AllowZero: function (oEvent) {

            const oInput = oEvent.getSource();
            const sValue = oInput.getValue().trim();

            if (!/^\d*$/.test(sValue)) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText("Only numbers allowed");
                return;
            }

            const iVal = parseInt(sValue, 10);

            if (isNaN(iVal) || iVal < 0) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText("Value must be 0 or more");
                return;
            }

            oInput.setValueState(sap.ui.core.ValueState.None);
        },




        onLiveChange_MinAmount: function (oEvent) {
            utils._LCvalidateAmount(oEvent);
        },

        // ===== Status =====
        onChange_Status: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent);
        },

        // ===== Dates =====
        onChange_Date: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },

        _clearTableSelection: function () {
            var oTable = this.byId("couponTable");
            if (oTable) {
                oTable.removeSelections(true);
            }
        },

        onCancelCouponDialog: function () {
            if (this._oCouponDialog) {
                this._oCouponDialog.close();
            }
            this._clearTableSelection();
        },



    });
});
