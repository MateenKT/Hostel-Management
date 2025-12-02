sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library",
    "../model/formatter",
], function (BaseController, JSONModel, Fragment, MessageBox, Spreadsheet, exportLibrary, Formatter) {
    "use strict";

    var EdmType = exportLibrary.EdmType;

    return BaseController.extend("sap.ui.com.project1.controller.CouponDetails", {
        Formatter: Formatter,

        /* ==========================
         *  Lifecycle
         * ========================== */
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

        _onRouteMatched: function () {
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

                    return c;
                });

                var oModel = new JSONModel(aCoupons);
                oView.setModel(oModel, "CouponModel");

            } catch (err) {
                MessageBox.error(
                    err?.responseJSON?.message || "Failed to load coupons (HM_Coupon)."
                );
            } finally {
                oTable.setBusy(false);
            }
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

            // default values for new coupon
            var oNow = new Date();
            var sToday = oNow.toISOString().slice(0, 10); // yyyy-MM-dd

            oViewModel.setProperty("/DialogMode", "Add");
            oViewModel.setProperty("/CurrentCoupon", {
                DiscountType: "Percentage",
                DiscountValue: "",
                MaxUses: "",
                UsedCount: "0",
                PerUserLimit: "1",
                StartDate: sToday,
                EndDate: sToday,
                MinOrderValue: "",
                Status: "Active",                         
                CreatedAt: oNow.toISOString().slice(0, 19).replace("T", " "),
                CreatedBy: "system"                 // adjust as per your login
              
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

            // ✅ KEEP CouponId
            // Don't delete it or omit it

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
                { label: "Coupon Code", property: "CouponCode", type: EdmType.String },
    
                    { label: "Customer ID", property: "CustomerID", type: EdmType.String },

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
                    id: oView.getId(), // important: view-prefixed IDs
                    name: "sap.ui.com.project1.fragment.CouponDialog",
                    controller: this
                });

                oView.addDependent(this._oCouponDialog);

                // make DatePickers readonly (no manual typing; use your BaseController helper)
                var sViewId = oView.getId();
                this._FragmentDatePickersReadOnly([
                    sViewId + "--dpStartDate",
                    sViewId + "--dpEndDate"
                ]);
            }

            this._oCouponDialog.open();
        },

        onCancelCouponDialog: function () {
            if (this._oCouponDialog) {
                this._oCouponDialog.close();
            }
        },

        onSaveCoupon: async function () {

            var oViewModel = this.getView().getModel("CouponView");
            var sMode = oViewModel.getProperty("/DialogMode");
            var oCoupon = Object.assign({}, oViewModel.getProperty("/CurrentCoupon"));

            oCoupon.Status = "Active";

            try {

                if (sMode === "Add") {

                    await this.ajaxCreateWithJQuery("HM_Coupon", {
                        data: oCoupon
                    });

                    MessageBox.success("Coupon created successfully.");

                } else {
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
                            CreatedBy: oCoupon.CreatedBy
                        }
                    });

                    MessageBox.success("Coupon updated successfully.");

                }

                this._oCouponDialog.close();
                this._loadCoupons();

            } catch (err) {
                MessageBox.error(
                    err?.responseJSON?.message || "Failed to save coupon."
                );
            }
        },

    });
});
