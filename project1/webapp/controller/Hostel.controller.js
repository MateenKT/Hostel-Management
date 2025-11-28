sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../utils/validation",
    "../model/formatter",
], function (BaseController, JSONModel, MessageToast, MessageBox, utils, Formatter) {
    "use strict";
    const $C = (id) => sap.ui.getCore().byId(id);
    const $V = (id) => $C(id)?.getValue()?.trim() || "";
    return BaseController.extend("sap.ui.com.project1.controller.Hostel", {
        _isProfileRequested: false,
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteHostel").attachMatched(this._onRouteMatched, this);
            this._getBrowserLocation();
        },
        _getBrowserLocation: function () {
            if (!navigator.geolocation) {
                sap.m.MessageToast.show("Geolocation not supported!");
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    let lat = pos.coords.latitude;
                    let lng = pos.coords.longitude;
                    this._getLocationName(lat, lng);
                },
                (err) => {
                    console.error("Location error:", err);
                }
            );
        },
        _getLocationName: function (lat, lng) {
            let url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

            $.ajax({
                url: url,
                method: "GET",
                success: (data) => {
                    if (!data || !data.address) {
                        console.log("Address not found");
                        return;
                    }

                    let city = data.address.city ||
                        data.address.town ||
                        data.address.village ||
                        data.address.municipality;
                    this.City = city
                },
                error: (err) => {
                    console.error("Reverse geocoding failed", err);
                }
            });
        },
        _onRouteMatched: async function () {
            const oView = this.getView();

            //  Disable controls initially
            this.byId("id_Branch").setEnabled(true);
            this.byId("id_Area").setEnabled(true);
            this.byId("id_Roomtype").setEnabled(true);

            //  Create all static local models
            oView.setModel(new sap.ui.model.json.JSONModel({
                CustomerName: "",
                MobileNo: "",
                Gender: "",
                DateOfBirth: "",
                CustomerEmail: "",
                RoomType: ""
            }), "HostelModel");
            oView.setModel(new JSONModel({ isEditMode: false }), "saveModel");
            // oView.setModel(new JSONModel({ isOtpSelected: false, isPasswordSelected: true }), "LoginViewModel");
            oView.setModel(new JSONModel({
                isOtpSelected: false,
                isPasswordSelected: true,
                authFlow: "signin", // [signin, forgot, otp, reset]
                isOtpBoxVisible: false

            }), "LoginViewModel");

            const vm = oView.getModel("LoginViewModel");

            // Add only your required properties (safe, isolated)
            vm.setProperty("/loginMode", "password");   // "password" or "otp"
            vm.setProperty("/showOTPField", false);     // show OTP input box only after Send OTP success
            vm.setProperty("/isOtpEntered", false);     // enable Sign In only when OTP entered

            oView.setModel(new JSONModel({
                fullname: "",
                Email: "",
                Mobileno: "",
                password: "",
                comfirmpass: ""
            }), "LoginMode");
            oView.setModel(new JSONModel({
                selectedSection: "profile"
            }), "profileSectionModel");

            //  Hardcoded branches (initial fallback)
            const aBranches = [{
                BranchCode: "KLB01",
                BranchName: "Kalaburagi"
            },
            {
                BranchCode: "BR002",
                BranchName: "Mumbai"
            },
            {
                BranchCode: "BR003",
                BranchName: "Nagpur"
            },
            {
                BranchCode: "BR004",
                BranchName: "Nashik"
            }
            ];
            oView.setModel(new JSONModel({
                Branches: aBranches
            }), "BranchModel");
            oView.getModel("LoginViewModel").setProperty("/showOTPField", false);

        },

        CustomerDetails: async function () {
            try {
                const oData = await this.ajaxReadWithJQuery("HM_Customer", {});
                const aCustomers = Array.isArray(oData.Customers) ? oData.Customers : [oData.Customers];

                const oCustomerModel = new JSONModel(aCustomers);
                this.getView().setModel(oCustomerModel, "CustomerModel");

            } catch (err) {
                console.error("Error while fetching Customer details:", err);
            }
        },

        onUserlivechange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },

        onReadcallforRoom: async function () {
            try {
                const oView = this.getView();
                const oResponse = await this.ajaxReadWithJQuery("HM_Rooms", {});
                const aRooms = oResponse?.commentData || [];
                const oRoomModel = new JSONModel({ Rooms: aRooms });
                oView.setModel(oRoomModel, "RoomCountModel"); //  Bind model to the view
            } catch (err) {
                console.error("Error reading rooms:", err);
                sap.m.MessageToast.show("Failed to load room data.");
            }
        },

        _loadBranchCode: async function () {
            try {
                const oView = this.getView();
                const oResponse = await this.ajaxReadWithJQuery("HM_Branch", {});
                const aBranches = Array.isArray(oResponse?.data) ? oResponse.data : (oResponse?.data ? [oResponse.data] : []);

                const oBranchModel = new sap.ui.model.json.JSONModel(aBranches);
                oView.setModel(oBranchModel, "sBRModel");
                this._populateUniqueFilterValues(aBranches);
            } catch (err) {
                console.error("Error while loading branch data:", err);
            }
        },

        _populateUniqueFilterValues: function (data) {
            let uniqueValues = { id_Branch: new Set(), };

            data.forEach(item => {
                uniqueValues.id_Branch.add(item.City);
            });

            let oView = this.getView();
            ["id_Branch"].forEach(field => {
                let oComboBox = oView.byId(field);
                oComboBox.destroyItems();
                Array.from(uniqueValues[field]).sort().forEach(value => {
                    oComboBox.addItem(new sap.ui.core.Item({
                        key: value,
                        text: value
                    }));
                });
            });
        },

        onSelectPricePlan: function (oEvent) {
            const oTile = oEvent.getSource();
            const sType = oTile.data("type"); // "daily", "monthly", or "yearly"
            const oView = this.getView();
            const oModel = oView.getModel("HostelModel");
            const oData = oModel.getData();
            const sCurrency = oData.Currency || "INR";

            // Map type -> model property
            const mPriceMap = {
                daily: "Price",
                monthly: "MonthPrice",
                yearly: "YearPrice"
            };

            // Map type -> backend label
            const mTypeLabel = {
                daily: "Per Day",
                monthly: "Per Month",
                yearly: "Per Year"
            };

            const sPriceKey = mPriceMap[sType];
            const sPriceValue = sPriceKey ? oData[sPriceKey] : "N/A";

            // Reset then set values
            oModel.setProperty("/SelectedPriceType", "");
            oModel.setProperty("/SelectedPriceValue", "");

            oModel.setProperty("/SelectedPriceType", mTypeLabel[sType] || sType);
            oModel.setProperty("/SelectedPriceValue", sPriceValue);
            oModel.setProperty("/SelectedCurrency", sCurrency);

            // --- VISUAL FEEDBACK SECTION ---
            const oParent = oTile.getParent();
            let aSiblings = [];

            if (oParent.getItems) {
                aSiblings = oParent.getItems();
            } else if (oParent.getContent) {
                aSiblings = oParent.getContent();
            }

            aSiblings.forEach(oItem => {
                if (oItem.removeStyleClass) {
                    oItem.removeStyleClass("selectedTile");
                    oItem.addStyleClass("defaultTile");
                }
            });

            oTile.removeStyleClass("defaultTile");
            oTile.addStyleClass("selectedTile");

            // // Toast using label, not raw key
            // sap.m.MessageToast.show(
            //     `Selected ${mTypeLabel[sType]} — ${sCurrency} ${sPriceValue}`
            // );
        },

        onConfirmBooking: function () {
            const oView = this.getView();
            const oLocalModel = oView.getModel("HostelModel"); // Local model bound to dialog
            const oData = oLocalModel?.getData?.() || {};

            if (!oData.SelectedPriceType || !oData.SelectedPriceValue) {
                sap.m.MessageToast.show("Please select a pricing plan before booking.");
                return;
            }

            //  Get or create global model
            let oGlobalModel = sap.ui.getCore().getModel("HostelModel");
            if (!oGlobalModel) {
                oGlobalModel = new sap.ui.model.json.JSONModel({});
                sap.ui.getCore().setModel(oGlobalModel, "HostelModel");
            }

            //  Build booking data
            const oBookingData = {
                BookingDate: new Date().toISOString(),
                RoomNo: oData.RoomNo || "",
                BedType: oData.BedType || "",
                ACType: oData.ACType || "",
                Capacity: parseInt(oData.Capacity) || 1,
                Address: oData.Address || "",
                Description: oData.Description || "",
                BranchCode: oData.BranchCode || "",
                SelectedPriceType: oData.SelectedPriceType,
                FinalPrice: oData.SelectedPriceValue,
                Currency: oData.Currency || "INR",
                Source: "UI5_HostelApp",
                Status: "Pending",
                Country:oData.Country
            };

            //  Merge and clean
            const oMergedData = {
                ...oGlobalModel.getData(),
                ...oBookingData
            };

            delete oMergedData.Price;
            delete oMergedData.MonthPrice;
            delete oMergedData.YearPrice;

            //  Dynamically create dropdown items for Capacity
            const iCapacity = oMergedData.Capacity || 1;
            const aPersonsList = Array.from({
                length: iCapacity
            }, (_, i) => ({
                key: (i + 1).toString(),
                text: (i + 1).toString()
            }));

            // Set dynamic list to model (for ComboBox binding)
            oMergedData.NoOfPersonsList = aPersonsList;

            //  Update global model
            oGlobalModel.setData(oMergedData, true);

            // sap.m.MessageToast.show(
            //     `Booking prepared for ${oData.BedType || "Room"} (${oData.SelectedPriceType} plan)`
            // );

            // Close dialog
            if (this._oRoomDetailFragment) {
                this._oRoomDetailFragment.close(); // close FIRST
            }

            this._clearRoomDetailDialog();

            //  Navigate to booking view
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteBookRoom");
        },

        _clearRoomDetailDialog: function () {
            if (!this._oRoomDetailFragment) return;

            const oFrag = this._oRoomDetailFragment;

            // Reset price tile classes
            oFrag.findAggregatedObjects(true, obj => obj.hasStyleClass && obj.hasStyleClass("priceItem"))
                .forEach(item => {
                    item.removeStyleClass("selectedTile");
                    item.addStyleClass("defaultTile");
                });

            // Destroy carousel pages
            const oCarousel = oFrag.findAggregatedObjects(true, obj => obj.isA && obj.isA("sap.m.Carousel"))[0];
            if (oCarousel) oCarousel.destroyPages();

            // Destroy integration card
            const oCard = oFrag.findAggregatedObjects(true, obj => obj.isA && obj.isA("sap.ui.integration.widgets.Card"))[0];
            if (oCard) oCard.destroy();

            // Destroy fragment models
            ["HostelModel", "FacilityModel"].forEach(name => {
                const m = oFrag.getModel(name);
                if (m) m.destroy();
            });

            // Remove the fragment entirely
            this.getView().removeDependent(oFrag);
            oFrag.destroy();
            this._oRoomDetailFragment = null;

            if (this._carouselInterval) {
                clearInterval(this._carouselInterval);
                this._carouselInterval = null;
            }
        },

        _bindCarousel: function () {
            const oCarousel = this._oRoomDetailFragment
                .findAggregatedObjects(true, obj => obj.isA && obj.isA("sap.m.Carousel"))[0];

            if (!oCarousel) return;

            oCarousel.unbindAggregation("pages");
            oCarousel.bindAggregation("pages", {
                path: "HostelModel>/ImageList",
                template: new sap.m.Image({
                    src: "{HostelModel>}",
                    width: "100%",
                    densityAware: false,
                    decorative: false
                })
            });
        },

        _LoadFacilities: function (sBranchCode) {
            const oView = this.getView();
            if (!this._oRoomDetailFragment) return; // Safety check

            if (!sBranchCode) return;

            const oFacilityModel = this._oRoomDetailFragment.getModel("FacilityModel");
            if (!oFacilityModel) return; // Model might not be set yet

            oFacilityModel.setProperty("/loading", true);
            this.ajaxReadWithJQuery("HM_Facilities", {
                BranchCode: sBranchCode
            })
                .then((Response) => {
                    console.log("Facility Response:", Response);
                    const aFacilities = (Response && Response.data) ? Response.data : [];

                    const convert = (base64, type) => {
                        if (!base64) {
                            return sap.ui.require.toUrl("sap/ui/com/project1/image/no-image.png");
                        }
                        return `data:${type || "image/jpeg"};base64,${base64}`;
                    };

                    const formatted = aFacilities.map(f => ({
                        FacilityID: f.ID,
                        FacilityName: f.FacilityName,
                        Image: convert(f.Photo1, f.Photo1Type),
                        Price: f.Price,
                        Price: f.PerHourPrice, // Correctly map the price from API response
                        UnitText: f.UnitText,
                        Currency: f.Currency
                    }));

                    oFacilityModel.setProperty("/Facilities", formatted);
                    oFacilityModel.setProperty("/loading", false);

                    oFacilityModel.refresh(true);
                })
                .catch(err => {
                    console.error("Failed to load facilities:", err);
                    oFacilityModel.setProperty("/loading", false);
                });
        },

        viewDetails: function (oEvent) {
            try {
                const oView = this.getView();
                const oSelected = oEvent.getSource().getBindingContext("VisibilityModel").getObject();
                const oFullDetails = {
                    RoomNo: oSelected.RoomNo || "",
                    BedType: oSelected.Name || "",
                    ACType: oSelected.ACType || "AC",
                    Description: oSelected.Description || "No description available",
                    Price: oSelected.Price || "N/A",
                    MonthPrice: oSelected.MonthPrice || "N/A",
                    YearPrice: oSelected.YearPrice || "N/A",
                    Currency: oSelected.Currency || "INR",
                    Address: oSelected.Address || "",
                    BranchCode: oSelected.BranchCode || "",
                    Capacity: oSelected.NoOfPerson || "",
                    ImageList: (oSelected.Images || []).map(img => img.src),
                    SelectedPriceType: "",
                    SelectedPriceValue: "",
                    Country:oSelected.Country
                };

                const oHostelModel = new sap.ui.model.json.JSONModel(oFullDetails);
                oView.setModel(oHostelModel, "HostelModel");

                oView.setModel(new sap.ui.model.json.JSONModel({
                    loading: true,
                    Facilities: []
                }), "FacilityModel");

                // Load / reuse fragment
                if (!this._oRoomDetailFragment) {
                    sap.ui.core.Fragment.load({
                        name: "sap.ui.com.project1.fragment.viewRoomDetails",
                        controller: this
                    }).then(fragment => {
                        this._oRoomDetailFragment = fragment;
                        this.getView().addDependent(fragment);

                        // Bind initial models
                        fragment.setModel(oHostelModel, "HostelModel");
                        fragment.setModel(oView.getModel("FacilityModel"), "FacilityModel");

                        // Open immediately
                        fragment.open();

                        // Bind carousel
                        this._bindCarousel();



                        // Now load facilities in background
                        this._LoadFacilities(oSelected.BranchCode);
                    });

                    return; // stop here because first-time load is async via .then()
                }

                // Fragment already exists (2nd, 3rd, nth time)

                this._oRoomDetailFragment.setModel(oHostelModel, "HostelModel");
                this._oRoomDetailFragment.setModel(oView.getModel("FacilityModel"), "FacilityModel");

                // Open instantly
                this._oRoomDetailFragment.open();

                // Bind carousel
                this._bindCarousel();

                // Load facilities asynchronously
                this._LoadFacilities(oSelected.BranchCode);

            } catch (err) {
                console.error(" viewDetails error:", err);
            }
        },

        _LoadAmenities: async function (sBranchCode) {
            const oAmenityModel = new sap.ui.model.json.JSONModel({
                loading: true,
                Amenities: []
            });

            this._oRoomDetailFragment.setModel(oAmenityModel, "AmenityModel");

            try {
                // 1️⃣ Fetch ALL once (don’t rely on server filter)
                let resp = await this.ajaxReadWithJQuery("HM_HostelFeatures", {});
                let allList = resp?.data || [];

                // 2️⃣ Filter branch only (strict match)
                const branchList = allList.filter(x => (x.BranchCode || "").trim() === (sBranchCode || "").trim());

                if (branchList.length > 0) {
                    // ✔ Branch exists → show only branch amenities
                    console.log("🎯 Showing branch amenities:", branchList);
                    oAmenityModel.setProperty("/Amenities", this._convertAmenities(branchList));
                    // } else {
                    //     // 🔄 Branch not found → show ONLY blank fallback
                    //     const fallbackList = allList.filter(x => (x.BranchCode || "").trim() === "");
                    //     console.warn("↩️ Showing fallback amenities:", fallbackList);
                    //     oAmenityModel.setProperty("/Amenities", this._convertAmenities(fallbackList));
                    // }
                } else {
                    console.warn("🚫 No amenities found for this branch:", sBranchCode);
                    oAmenityModel.setProperty("/Amenities", []); // show nothing
                }

            } catch (err) {
                console.error("❌ Amenity load error:", err);
            }
            oAmenityModel.setProperty("/loading", false);
        },

        _convertAmenities: function (list) {
            return list.map(item => ({
                ...item,
                ImageSrc: item.Photo1 ?
                    `data:${item.Photo1Type || "image/jpeg"};base64,${item.Photo1}` : ""
            }));
        },

        onRoomDetailOpened: function () {
            // Get the branch code from the dialog's model
            if (this._oRoomDetailFragment) {
                const oModel = this._oRoomDetailFragment.getModel("HostelModel");
                if (oModel) {
                    const sBranchCode = oModel.getProperty("/BranchCode");
                    this._LoadAmenities(sBranchCode);
                }
            }
        },

        onImageLoadError: function (oEvent) {
            const oImage = oEvent.getSource();
            const sFallback = sap.ui.require.toUrl("sap/ui/com/project1/image/no-image.png");

            if (!oImage.data("hasFallback")) {
                oImage.data("hasFallback", true);
                setTimeout(() => oImage.setSrc(sFallback), 0); // Agar image load nahi hui, toh fallback set hoga
            } else {
                console.warn("⚠️ Final fallback image also failed to load:", sFallback);
            }
        },

        onCloseRoomDetail: function () {
            if (this._oRoomDetailFragment) {
                this._oRoomDetailFragment.close(); // close FIRST
            }

            this._clearRoomDetailDialog(); // destroy AFTER
        },

        onDialogAfterClose: function () {
            if (this._oRoomDetailFragment) {
                this._oRoomDetailFragment.close(); // close FIRST
            }

            this._clearRoomDetailDialog();
        },

        onTabSelect: async function (oEvent) {
            var oItem = oEvent.getParameter("item");
            const sKey = oItem.getKey();

            this.byId("pageContainer").to(this.byId(sKey));

            var page = this.byId(sKey);
            if (page && page.scrollTo) page.scrollTo(0, 0);

            if (sKey === "idRooms") {
                await this._loadRoomsPageData();
            }
        },

        _loadRoomsPageData: async function () {
            const oContainer = this.byId("idBedTypeFlex");
            const oBranch = this.byId("id_Branch");
            const oArea = this.byId("id_Area");
            const oRoomType = this.byId("id_Roomtype");

            oContainer.setBusy(true);
            oBranch.setBusy(true);
            oArea.setBusy(true);
            oRoomType.setBusy(true);

            try {
                await this.onReadcallforRoom();

                const oBRModel = this.getView().getModel("sBRModel");
                const oModelData = oBRModel.getData();
                const aFiltered = oModelData.filter(item => item.City === this.City);

                if (aFiltered.length === 0) {
                    await this._loadFilteredData("Kalaburagi", "", "");
                } else {
                    await this._loadFilteredData(this.City, "", "");
                }

                this.getView().setModel(new JSONModel(aFiltered), "AreaModel");

                // Default selections
                this.byId("id_Branch").setSelectedKey("Kalaburagi");
                this.byId("id_Area").setEnabled(true).setSelectedKey("");
                this.byId("id_Roomtype").setEnabled(true).setSelectedKey("All");

            } catch (error) {
                console.error("Error loading Rooms:", error);
            } finally {
                oContainer.setBusy(false);
                oBranch.setBusy(false);
                oArea.setBusy(false);
                oRoomType.setBusy(false);
            }
        },

        onpressFilter: function () {
            var oView = this.getView();
            if (!this.ARD_Dialog) {

                this.ARD_Dialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.Filter_Branch", this);
                oView.addDependent(this.ARD_Dialog);
            }
            this._clearFilterFields()
            var oBedTypeCombo = this.byId("id_Area");
            this.byId("id_Roomtype").setSelectedKey("");

            this.byId("id_Branch").setSelectedKey("");

            oBedTypeCombo.setSelectedKey("").setVisible(false);
            this.ARD_Dialog.open();
        },

        onpressBookrooms: async function () {
            var oTabHeader = this.byId("mainTabHeader");
            oTabHeader.setSelectedKey("idRooms");
            this.byId("pageContainer").to(this.byId("idRooms"));

            var page = this.byId("idRooms");
            if (page && page.scrollTo) {
                page.scrollTo(0, 0);
            }

            await this._loadRoomsPageData();
        },



        onpressLogin: function () {

            if (!this._oSignDialog) {
                this._oSignDialog = sap.ui.xmlfragment(
                    "sap.ui.com.project1.fragment.SignInSignup",
                    this
                );
                this.getView().addDependent(this._oSignDialog);
                this._oSignDialog.attachAfterClose(this._resetAuthDialog, this);
            }

            const vm = this.getView().getModel("LoginViewModel");

            // COMPLETE reset of all auth-related states
            vm.setProperty("/authFlow", "signin");
            vm.setProperty("/loginMode", "password");
            vm.setProperty("/showOTPField", false);
            vm.setProperty("/isOtpEntered", false);

            // 🔥 FIX: You forgot these
            vm.setProperty("/isOtpSelected", false);
            vm.setProperty("/isPasswordSelected", true);

            // Reset fields
            this._resetAllAuthFields?.();
            this._clearAllAuthFields?.();

            // Reset OTP UI
            const otpCtrl = sap.ui.getCore().byId("signInOTP");
            if (otpCtrl) {
                otpCtrl.setValue("");
                otpCtrl.setEnabled(false);
            }

            const btnSendOTP = sap.ui.getCore().byId("btnSignInSendOTP");
            if (btnSendOTP) btnSendOTP.setVisible(false);

            // Reset password valid state
            const passCtrl = sap.ui.getCore().byId("signinPassword");
            if (passCtrl) {
                passCtrl.setEnabled(true);
                passCtrl.setValue("");
                passCtrl.setValueState("None");
            }

            // Reset dialog title
            vm.setProperty("/dialogTitle", "Hostel Access Portal");

            this._oSignDialog.open();
        },




        onDialogClose: function () {
            if (this._oSignDialog) this._oSignDialog.close();
        },



        onSwitchToSignIn: function () {
            const vm = this.getView().getModel("LoginViewModel");

            // Show / Hide panels
            sap.ui.getCore().byId("signInPanel").setVisible(true);
            sap.ui.getCore().byId("signUpPanel").setVisible(false);

            // Reset Login mode to PASSWORD
            vm.setProperty("/authFlow", "signin");
            vm.setProperty("/isPasswordSelected", true);
            vm.setProperty("/isOtpSelected", false);
            vm.setProperty("/isOtpBoxVisible", false);

            // Reset Sign-In UI states
            sap.ui.getCore().byId("signinPassword").setEnabled(true).setValue("");
            sap.ui.getCore().byId("signInOTP").setEnabled(false).setValue("");
            sap.ui.getCore().byId("btnSignInSendOTP").setVisible(false);

            // Clear Sign-In fields (NOT Sign-Up fields)
            sap.ui.getCore().byId("signInuserid").setValue("");
            sap.ui.getCore().byId("signInusername").setValue("");

            // Restore dialog header title
            sap.ui.getCore().byId("authDialog")
                .getCustomHeader()
                .getContentMiddle()[0]
                .setText("Hostel Access Portal");
        },


        onSwitchToSignUp: function () {
            const vm = this.getView().getModel("LoginViewModel");

            const oSignInPanel = sap.ui.getCore().byId("signInPanel");
            const oSignUpPanel = sap.ui.getCore().byId("signUpPanel");

            oSignInPanel?.setVisible(false);
            oSignUpPanel?.setVisible(true);

            vm.setProperty("/authFlow", "signup");
            vm.setProperty("/dialogTitle", "Hostel Access Portal");
        },


        onEmailliveChange: function (oEvent) {
            utils._LCvalidateEmail(oEvent);
        },


        SM_onTogglePasswordVisibility: function (oEvent) {
            const oInput = oEvent.getSource();
            const isPassword = oInput.getType() === "Password";

            oInput.setType(isPassword ? "Text" : "Password");
            oInput.setValueHelpIconSrc(isPassword ? "sap-icon://hide" : "sap-icon://show");
        },

        SM_onChnageSetAndConfirm: function (oEvent) {
            utils._LCvalidatePassword(oEvent);
        },

        onSignUp: async function () {

            const oModel = this.getView().getModel("LoginMode");
            const oData = oModel.getData();

            /* ========= CONTROL GETTER ========= */
            const $C = (id) => sap.ui.getCore().byId(id);
            // ========= Mandatory fields check (toast once) =========
            const mandatoryValid =
                utils._LCvalidateMandatoryField($C("signUpSalutation"), "ID") &&
                utils._LCvalidateMandatoryField($C("signUpName"), "ID") &&
                utils._LCvalidateMandatoryField($C("signUpGender"), "ID") &&
                utils._LCvalidateMandatoryField($C("signUpEmail"), "ID") &&
                utils._LCvalidateMandatoryField($C("signUpCountry"), "ID") &&
                utils._LCvalidateMandatoryField($C("signUpState"), "ID") &&
                utils._LCvalidateMandatoryField($C("signUpCity"), "ID") &&
                utils._LCvalidateMandatoryField($C("signUpSTD"), "ID") &&
                utils._LCvalidateMandatoryField($C("signUpPhone"), "ID") &&
                utils._LCvalidateMandatoryField($C("signUpAddress"), "ID");

            if (!mandatoryValid) {
                sap.m.MessageToast.show("Please fill all mandatory fields.");
                return;
            }


            // 1) Salutation
            if (!utils._LCstrictValidationComboBox($C("signUpSalutation"), "ID")) return;

            // 2) Full Name
            if (!utils._LCvalidateName($C("signUpName"), "ID")) return;

            // 3) Date of Birth (Age Check)
            const oDOB = $C("signUpDOB");
            const dobValue = oDOB.getDateValue();

            if (!dobValue) {
                oDOB.setValueState("Error");
                oDOB.setValueStateText("Date of Birth is required");
                return;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (dobValue > today) {
                oDOB.setValueState("Error");
                oDOB.setValueStateText("Future date not allowed");
                sap.m.MessageToast.show("Future date not allowed!");
                return;
            }

            let age = today.getFullYear() - dobValue.getFullYear();
            const m = today.getMonth() - dobValue.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < dobValue.getDate())) age--;

            if (age < 10 || age > 118) {
                oDOB.setValueState("Error");
                oDOB.setValueStateText("Age must be between 10 and 118 years");
                sap.m.MessageToast.show("Age must be between 10 and 118 years");
                return;
            }
            oDOB.setValueState("None");
            const DateOfBirth = dobValue.toISOString().split("T")[0];

            // 4) Gender + Dr special rule
            const sSalutation = $C("signUpSalutation").getSelectedKey();
            const sGender = $C("signUpGender").getSelectedKey();

            if (sSalutation === "Dr." && !sGender) {
                $C("signUpGender").setValueState("Error");
                $C("signUpGender").setValueStateText("Please select gender");
                sap.m.MessageToast.show("Please select gender");
                return;
            }

            if (!utils._LCstrictValidationSelect($C("signUpGender"))) return;

            // 5) Email
            if (!utils._LCvalidateEmail($C("signUpEmail"), "ID")) return;

            // 6) Country → State → City
            if (!utils._LCvalidateMandatoryField($C("signUpCountry"), "ID")) return;
            if (!utils._LCvalidateMandatoryField($C("signUpState"), "ID")) return;
            if (!utils._LCvalidateMandatoryField($C("signUpCity"), "ID")) return;

            // 7) Mobile Number
            if (!utils._LCvalidateMandatoryField($C("signUpSTD"), "ID")) return;
            const sSTD = $C("signUpSTD").getSelectedKey();
            // ========= FINAL MOBILE VALIDATION (same as liveChange rules) =========
            const phoneInput = $C("signUpPhone");
            let mobile = phoneInput.getValue().replace(/\D/g, ""); // keep only digits

            // Mandatory
            if (!mobile) {
                phoneInput.setValueState("Error");
                phoneInput.setValueStateText("Mobile number is required");
                return;
            }

            // India rules
            if (sSTD === "+91") {
                if (mobile.length !== 10) {
                    phoneInput.setValueState("Error");
                    phoneInput.setValueStateText("Mobile Number must be exactly 10 digits");
                    return;
                }
                if (mobile.startsWith("0")) {
                    phoneInput.setValueState("Error");
                    phoneInput.setValueStateText("Mobile number must not start with 0");
                    return;
                }
            }
            // International rules
            else {
                if (mobile.length < 4 || mobile.length > 18) {
                    phoneInput.setValueState("Error");
                    phoneInput.setValueStateText("Mobile number must be 4–18 digits");
                    return;
                }
            }

            phoneInput.setValueState("None");

            // 7) Address

            const addrInput = $C("signUpAddress");
            const addr = addrInput.getValue().trim();

            if (!addr) {
                addrInput.setValueState("Error");
                addrInput.setValueStateText("Address is required");
                return;
            }
            if (addr.length < 8) {
                addrInput.setValueState("Error");
                addrInput.setValueStateText("Address must be at least 8 characters long");
                return;
            }


            // 8) Create Password
            if (!utils._LCvalidatePassword($C("signUpPassword"), "ID")) return;

            // 9) Confirm Password
            if ($C("signUpPassword").getValue() !== $C("signUpConfirmPassword").getValue()) {
                $C("signUpConfirmPassword").setValueState("Error");
                $C("signUpConfirmPassword").setValueStateText("Passwords do not match");
                sap.m.MessageToast.show("Passwords do not match");
                return;
            }
            $C("signUpConfirmPassword").setValueState("None");

            const now = new Date();
            const TimeDate =
                `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ` +
                `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

            const payload = {
                data: {
                    Salutation: $C("signUpSalutation").getSelectedKey(),
                    UserName: oData.fullname,
                    Role: "Customer",
                    EmailID: oData.Email,
                    Password: btoa(oData.password),
                    STDCode: oData.STDCode,
                    MobileNo: oData.Mobileno,
                    Status: "Active",
                    TimeDate,
                    DateOfBirth,
                    Gender: $C("signUpGender").getSelectedKey(),
                    Country: oData.Country,
                    State: oData.State,
                    City: oData.City,
                    Address: oData.Address
                }
            };
            console.log("SignUp Payload:", payload);
            try {
                const oResp = await this.ajaxCreateWithJQuery("HM_Login", payload);

                if (!oResp || oResp.success !== true) {
                    sap.m.MessageToast.show("Registration failed! Please try again.");
                    console.error("SignUp Error Response:", oResp);
                    return; // 🚫 Do not show success
                }

                sap.m.MessageBox.success("Registration Successful!", {
                    title: "Success",
                    onClose: () => {

                        const vm = this.getView().getModel("LoginViewModel");

                        // Reset main login flow
                        vm.setProperty("/authFlow", "signin");
                        vm.setProperty("/loginMode", "password");
                        vm.setProperty("/showOTPField", false);
                        vm.setProperty("/isOtpEntered", false);
                        vm.setProperty("/dialogTitle", "Hostel Access Portal");
                        vm.setProperty("/forgotStep", 1);

                        // Reset all fields globally
                        this._resetAllAuthFields?.();
                        this._clearAllAuthFields?.();

                        // Reset Sign-Up model cleanly (NO extra unwanted props)
                        this.getView().getModel("LoginMode").setData({
                            fullname: "",
                            Email: "",
                            Mobileno: "",
                            password: "",
                            comfirmpass: "",
                            STDCode: "",
                            Address: "",
                            Country: "",
                            State: "",
                            City: "",
                            Gender: "",
                            DateOfBirth: ""
                        });

                        // Ensure UI switches to Sign-In view
                        sap.ui.getCore().byId("signInPanel")?.setVisible(true);
                        sap.ui.getCore().byId("signUpPanel")?.setVisible(false);

                        // Clean and enforce sign-in mode
                        sap.ui.getCore().byId("signinPassword")?.setEnabled(true).setValue("");
                        sap.ui.getCore().byId("signInOTP")?.setEnabled(false).setValue("");
                        sap.ui.getCore().byId("btnSignInSendOTP")?.setVisible(false);

                        // Reset Sign-In fields
                        sap.ui.getCore().byId("signInuserid")?.setValue("");
                        sap.ui.getCore().byId("signInusername")?.setValue("");

                        // Close the old dialog
                        this._oSignDialog?.close();

                        // 🔥 Re-open clean auth dialog smoothly
                        setTimeout(() => {
                            this._oSignDialog?.open();
                        }, 200);

                    }
                });
            }
            catch (err) {
                sap.m.MessageToast.show("Registration failed!");
                console.error("SignUp Error:", err);
            }


        },

        onChangeSalutation: function (oEvent) {
            const $C = (id) => sap.ui.getCore().byId(id);
            const oCombo = oEvent.getSource();
            const sal = oCombo.getValue(); // user typed or selected text
            const oGender = $C("signUpGender");

            // 🔍 Strict Combo Validation (Check must match list)
            const valid = utils._LCstrictValidationComboBox(oCombo, "ID");
            if (!valid) {
                // invalid → reset dependent Gender & disable it
                oGender.setSelectedKey("");
                oGender.setEnabled(false);
                oGender.setValueState("None");
                return; // 🔥 stop, don't auto assign!
            }

            // 🎯 If valid selection → apply Gender Autoselect Rules
            if (sal === "Mr.") {
                oGender.setSelectedKey("Male");
                oGender.setEnabled(false);
            } else if (sal === "Ms." || sal === "Mrs.") {
                oGender.setSelectedKey("Female");
                oGender.setEnabled(false);
            } else { // Dr.
                oGender.setSelectedKey("");
                oGender.setEnabled(true);
                oGender.setValueState("Error");
                oGender.setValueStateText("Please select gender");
            }
        },

        onChangeGender: function (oEvent) {
            const oSel = oEvent.getSource();
            const val = oSel.getSelectedKey();

            if (val) {
                oSel.setValueState("None");
                oSel.setValueStateText("");
            } else {
                oSel.setValueState("Error");
                oSel.setValueStateText("Please select gender");
            }
        },

        onChangeDOB: function (oEvent) {
            const oDP = oEvent.getSource();
            const dobValue = oDP.getDateValue();

            if (dobValue) {
                oDP.setValueState("None");
                oDP.setValueStateText("");
            } else {
                oDP.setValueState("Error");
                oDP.setValueStateText("Date of Birth is required");
            }
        },

        onChangeCountry: function (oEvent) {
            const $C = (id) => sap.ui.getCore().byId(id);
            const oModel = this.getView().getModel("LoginMode");

            const oCountryCB = oEvent.getSource();
            const oStateCB = $C("signUpState");
            const oCityCB = $C("signUpCity");
            const oStdCB = $C("signUpSTD");
            const oPhone = $C("signUpPhone");

            // 🚫 Validate only if invalid entry typed
            if (!utils._LCvalidateMandatoryField(oCountryCB, "ID")) return;
            oCountryCB.setValueState("None"); // Clear previous error

            /** ✔ SET SELECTED COUNTRY INTO MODEL */
            const country = oCountryCB.getSelectedKey();
            oModel.setProperty("/Country", country);

            /** RESET CHILD CONTROLS */
            oModel.setProperty("/State", "");
            oStateCB.setValue("");
            oModel.setProperty("/City", "");
            oCityCB.setValue("");

            oStateCB.getBinding("items")?.filter([]);
            oCityCB.getBinding("items")?.filter([]);

            /** RESET PHONE + STD */
            oPhone.setValue("");
            oPhone.setValueState("None");
            oPhone.setMaxLength(18);
            oStdCB.setEnabled(true);
            oStdCB.setSelectedKey("");
            oStdCB.setValueState("None");

            /** SET STD FROM COUNTRY LIST */
            const name = oCountryCB.getSelectedKey();
            const list = this.getOwnerComponent().getModel("CountryModel").getData();
            const obj = list.find(c => c.countryName === name);
            if (obj?.stdCode) {
                oModel.setProperty("/STDCode", obj.stdCode);
                oStdCB.setSelectedKey(obj.stdCode);
                // oStdCB.setEnabled(false); // 🔐 Lock STD
            }

            /** FILTER STATES BY COUNTRY */
            oStateCB.getBinding("items")?.filter([
                new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, oCountryCB.getSelectedItem().getAdditionalText())
            ]);
        },

        onMobileLivechnage: function (oEvent) {

                const sSTD = $C("signUpSTD").getSelectedKey() || "";
                const oInput = oEvent.getSource();

                // Force-only digits
                let sValue = oInput.getValue().replace(/\D/g, "");
                oInput.setValue(sValue);

                // Validate using your utility function
                utils._LCvalidateInternationalMobileNumberWithSTD(oEvent, sSTD);
            }, 

        onAddressChange: function (oEvent) {
            const oInput = oEvent.getSource();
            const sValue = oInput.getValue().trim();

            if (!sValue) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Address is required");
                return;
            }

            if (sValue.length < 8) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Address must be at least 8 characters long");
                return;
            }

            oInput.setValueState("None");
            oInput.setValueStateText("");
        }, 
        onSTDChange: function (oEvent) {
            const sSTD = oEvent.getSource().getSelectedKey();
            const oInput = $C("signUpPhone");

            // Reset mobile number when STD changes
            oInput.setValue("");
            oInput.setValueState("None");

            // Update maxLength based on STD
            if (sSTD === "+91") {
                oInput.setMaxLength(10);
            } else {
                oInput.setMaxLength(18);
            }

        },



        onChangeState: function (oEvent) {
            const $C = (id) => sap.ui.getCore().byId(id);
            const oModel = this.getView().getModel("LoginMode");

            const oStateCB = oEvent.getSource();
            const oCityCB = $C("signUpCity");

            if (!utils._LCvalidateMandatoryField(oStateCB, "ID")) return;
            oStateCB.setValueState("None");

            const state = oStateCB.getSelectedKey();
            oModel.setProperty("/State", state);

            /** RESET & FILTER CITY */
            oModel.setProperty("/City", "");
            oCityCB.setValue("");
            oCityCB.getBinding("items")?.filter([
                new sap.ui.model.Filter("stateName", sap.ui.model.FilterOperator.EQ, state)
            ]);
        },

        onChangeCity: function (oEvent) {
            const oCityCB = oEvent.getSource();
            if (!utils._LCvalidateMandatoryField(oCityCB, "ID")) return;
            oCityCB.setValueState("None");

            const value = oCityCB.getSelectedKey();
            this.getView().getModel("LoginMode").setProperty("/City", value);
        },


        _LCvalidateName: function (oEvent) {
            utils._LCvalidateName(oEvent);
        },



        // onSignIn: async function() {
        //     var oModel = this.getView().getModel("LoginMode");
        //     var oData = oModel.getData();
        //     const oLoginModel = this.getView().getModel("LoginModel");

        //     const sUserid = sap.ui.getCore().byId("signInuserid").getValue();
        //     const sUsername = sap.ui.getCore().byId("signInusername").getValue();
        //     const sPassword = sap.ui.getCore().byId("signinPassword").getValue();

        //     if (!utils._LCvalidateMandatoryField(sap.ui.getCore().byId("signInuserid"), "ID") ||
        //         !utils._LCvalidateMandatoryField(sap.ui.getCore().byId("signInusername"), "ID") ||
        //         !utils._LCvalidatePassword(sap.ui.getCore().byId("signinPassword"), "ID")
        //     ) {
        //         sap.m.MessageToast.show("Make sure all mandatory fields are filled correctly");
        //         return;
        //     }

        //     try {
        //         const payload = {
        //             UserID: sUserid,
        //             UserName: sUsername,
        //             Password: btoa(sPassword)
        //         };
        //         sap.ui.core.BusyIndicator.show(0);
        //         const oResponse = await this.ajaxReadWithJQuery("HM_Login", payload);
        //         const aUsers = oResponse.data[0] || [];

        //         oLoginModel.setProperty("/EmployeeID", aUsers.UserID);
        //         oLoginModel.setProperty("/EmployeeName", aUsers.UserName);
        //         oLoginModel.setProperty("/EmailID", aUsers.EmailID);
        //         oLoginModel.setProperty("/Role", aUsers.Role);
        //         oLoginModel.setProperty("/BranchCode", aUsers.BranchCode || "");
        //         oLoginModel.setProperty("/MobileNo", aUsers.MobileNo || "");
        //         oLoginModel.setProperty("/DateofBirth", this.Formatter.DateFormat(aUsers.DateOfBirth) || "");

        //         // For global access
        //         this._oLoggedInUser = aUsers;

        //         sap.ui.getCore().byId("signInusername").setValue("");
        //         sap.ui.getCore().byId("signinPassword").setValue("");

        //         if (this._oSignDialog) {
        //             this._oSignDialog.close();
        //         }

        //         if (aUsers.Role === "Customer") {
        //             const oUserModel = new JSONModel(aUsers);
        //             sap.ui.getCore().setModel(oUserModel, "LoginModel");
        //             this.getOwnerComponent().getModel("UIModel").setProperty("/isLoggedIn", true);
        //         } else if (aUsers.Role === "Admin" || aUsers.Role === "Employee") {
        //             this.getOwnerComponent().getRouter().navTo("TilePage");
        //         } else {
        //             sap.m.MessageToast.show("Invalid credentials. Please try again.");
        //         }
        //     } catch (err) {
        //         sap.ui.core.BusyIndicator.hide();
        //         sap.m.MessageToast.show(err.message || err.responseText);
        //     } finally {
        //         sap.ui.core.BusyIndicator.hide();
        //     }
        // },

        onCloseManageProfile: function () {
            if (this._oProfileDialog) {
                this._oProfileDialog.destroy();
                this._oProfileDialog = null;
            }
            this.getOwnerComponent().getModel("UIModel").setProperty("/isLoggedIn", false);
        },

        onPressAvatar: async function (oEvent) {
            const oUser = this._oLoggedInUser || {};
            const fullUserData = this._oLoggedInUser || {};
            console.log(" FULL HM_Login DATA:", fullUserData);
            try {
                const sUserID = oUser.UserID || "";
                if (!sUserID) {
                    sap.m.MessageToast.show("User not logged in.");
                    return;
                }
                const filter = {
                    UserID: sUserID
                };
                if (!this._isProfileRequested) {
                    this.createAvatarActionSheet();
                    this._oProfileActionSheet.openBy(oEvent.getSource());
                    return;
                }
                this._isProfileRequested = false;
                //  Fetch only the logged-in user's data
                sap.ui.core.BusyIndicator.show(0);
                const response = await this.ajaxReadWithJQuery("HM_Customer", filter);
                // Handle correct structure
                const aCustomers = response?.commentData || response?.Customers || response?.value || [];

                if (!Array.isArray(aCustomers) || aCustomers.length === 0) {
                    sap.m.MessageToast.show("No customer data found for this user.");
                }

                const aCustomerDetails = aCustomers.flatMap(response => ({
                    city: response.City,
                    country: response.Country,
                    customerID: response.CustomerID,
                    salutation: response.Salutation,
                    customerName: response.CustomerName,
                    mobileno: response.MobileNo,
                    stdCode: response.STDCode,
                    state: response.State,
                    countryCode: response.CountryCode,
                    customerEmail: response.CustomerEmail,
                    DOB: response.DateOfBirth,
                    gender: response.Gender,
                    Address: response.PermanentAddress

                }));
                // Combine all bookings from all customers
                const aAllBookings = aCustomers.flatMap(customer =>
                    Array.isArray(customer.Bookings) ? customer.Bookings : []
                );
                const aAllFacilitis = aCustomers.flatMap(customer =>
                    Array.isArray(customer.FaciltyItems) ? customer.FaciltyItems : []
                );
                let aBookingData = [];
                const today = new Date();
                today.setHours(0, 0, 0, 0); // avoid timezone issues

                if (aAllBookings.length === 0) {
                } else {
                    aBookingData = aAllBookings.map(booking => {
                        const oStart = booking.StartDate ? new Date(booking.StartDate) : null;
                        if (oStart) {
                            oStart.setHours(0, 0, 0, 0);
                        }

                        let bookingGroup = "Others";

                        if (booking.Status === "Completed") {
                            bookingGroup = "Completed";
                        } else if (booking.Status === "New" || booking.Status === "Assigned") {
                            if (oStart && oStart <= today) {
                                bookingGroup = "Ongoing";
                            } else {
                                bookingGroup = "Upcoming";
                            }
                        }
                        const customer = aCustomers.find(c => c.CustomerID === booking.CustomerID);
                        const sSalutation = customer?.Salutation || "";
                        const sFullName = customer?.CustomerName || "N/A";
                        return {
                            salutation: sSalutation,                // ✔ Add salutation
                            customerName: `${sSalutation} ${sFullName}`.trim(),
                            Startdate: oStart ? oStart.toLocaleDateString("en-GB") : "N/A",
                            EndDate: booking.EndDate
                                ? new Date(booking.EndDate).toLocaleDateString("en-GB") : "N/A",
                            room: booking.BedType || "N/A",
                            amount: booking.RentPrice || "N/A",
                            status: booking.Status || "N/A",
                            bookingGroup: bookingGroup,
                            cutomerid: booking.CustomerID,
                            branchCode: booking.BranchCode,
                            noofperson: booking.NoOfPersons,
                            grandTotal: booking.RentPrice,
                            paymenytype: booking.PaymentType,
                            RoomPrice: booking.RoomPrice
                        };
                    });
                }
                const aFacilitiData = aAllFacilitis.map(faciliti => ({
                    startdate: faciliti.StartDate ? new Date(faciliti.StartDate).toLocaleDateString("en-GB") : "N/A",
                    bookingid: faciliti.BookingID,
                    enddate: faciliti.EndDate,
                    customerid: faciliti.CustomerID || "N/A",
                    facilitiname: faciliti.FacilityName || "N/A",
                    facilitiId: faciliti.FacilityID,
                    facilitiPrice: faciliti.FacilitiPrice || "N/A",
                    status: faciliti.PaidStatus || "N/A"
                }));

                //  Load fragment if not already loaded
                if (!this._oProfileDialog) {
                    if (this._isProfileDialogLoading) {
                        console.log("Profile dialog load already in process, skipping duplicate call.");
                        return;
                    }
                    this._isProfileDialogLoading = true;

                    const oDialog = await sap.ui.core.Fragment.load({
                        name: "sap.ui.com.project1.fragment.ManageProfile",
                        controller: this
                    });
                    this._oProfileDialog = oDialog;
                    this.getView().addDependent(oDialog);
                    this._isProfileDialogLoading = false;
                }

                //  Create and bind the Profile Model
                const oProfileModel = new JSONModel({
                    ...fullUserData,
                    isEditMode: false,
                    photo: "data:image/png;base64," + oUser.FileContent || "",
                    initials: oUser.UserName ? oUser.UserName.charAt(0).toUpperCase() : "",
                    name: oUser.UserName || "",
                    UserID: oUser.UserID,
                    Salutation: oUser.Salutation,
                    email: oUser.EmailID || "",
                    phone: oUser.MobileNo || "",
                    dob: this.Formatter.DateFormat(oUser.DateOfBirth) || "",
                    gender: oUser.Gender || "",
                    address: oUser.Address || "",
                    state: oUser.State,
                    country: oUser.Country,
                    city: oUser.City,
                    stdCode: oUser.STDCode,
                    branchCode: oUser.BranchCode,
                    role: oUser.Role,
                    bookings: aBookingData,
                    facility: aFacilitiData,
                    aCustomers: aCustomerDetails
                });
                this._oProfileDialog.setModel(oProfileModel, "profileData");

                //  Open the dialog
                this._oProfileDialog.open();

            } catch (err) {
                console.error("Profile Load Error:", err);

                // Always open fragment even when error (like no customer found)
                if (!this._oProfileDialog) {
                     if (this._isProfileDialogLoading) {
                        console.log("Profile dialog load already in process, skipping duplicate call.");
                        return;
                    }
                    this._isProfileDialogLoading = true;
                    const oDialog = await sap.ui.core.Fragment.load({
                        name: "sap.ui.com.project1.fragment.ManageProfile",
                        controller: this
                    });
                    this._oProfileDialog = oDialog;
                    this.getView().addDependent(oDialog);
                    this._isProfileDialogLoading = false;
                }

                const oProfileModel = new sap.ui.model.json.JSONModel({
                    ...fullUserData,
                    photo: "data:image/png;base64," + oUser.FileContent || "",
                    initials: oUser.UserName ? oUser.UserName.charAt(0).toUpperCase() : "",
                    name: oUser.UserName || "",
                    email: oUser.EmailID || "",
                    phone: oUser.MobileNo || "",
                    dob: this.Formatter.DateFormat(oUser.DateOfBirth) || "",
                    gender: oUser.Gender || "",
                    address: oUser.Address || "",
                    bookings: [],
                    facility: [],
                    aCustomers: []
                });
                this._oProfileDialog.setModel(oProfileModel, "profileData");
                this._oProfileDialog.open();
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

         onEditSaveProfile: async function () {
            const oModel = this._oProfileDialog.getModel("profileData");
            const isEditMode = oModel.getProperty("/isEditMode");

            if (!isEditMode) {
                oModel.setProperty("/isEditMode", true);
                // this._oProfileDialog.close();
                sap.ui.core.BusyIndicator.show(0);
                if (!this._oProfileEditDialog) {
                    this._oProfileEditDialog = await sap.ui.core.Fragment.load({
                        name: "sap.ui.com.project1.fragment.ManageProfileEdit",
                        controller: this
                    });
                    this.getView().addDependent(this._oProfileEditDialog);
                    this._oProfileEditDialog.setModel(oModel, "profileData");
                }
                sap.ui.core.BusyIndicator.hide();
                this._oProfileEditDialog.open();
                return;
            }
            const isMandatoryValid = (
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("id_Name"), "ID") &&
                utils._LCvalidateDate(sap.ui.getCore().byId("id_dob"), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("id_gender"), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("id_mail"), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("id_country"), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("id_state"), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("id_city"), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("id_phone"), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("id_address"), "ID")
            );

            if (!isMandatoryValid) {
                sap.m.MessageToast.show("Please fill all mandatory fields.");
                return;
            }
            const payload = {
                data: {
                    UserName: oModel.getProperty("/name"),
                    Salutation: oModel.getProperty("/Salutation"),
                    MobileNo: oModel.getProperty("/phone"),
                    EmailID: oModel.getProperty("/email"),
                    DateOfBirth: oModel.getData().DateOfBirth ? oModel.getData().DateOfBirth.split("/").reverse().join("-") : "",
                    Gender: oModel.getProperty("/gender"),
                    Address: oModel.getProperty("/address"),
                    City: oModel.getProperty("/city"),
                    State: oModel.getProperty("/state"),
                    Country: oModel.getProperty("/country"),
                    STDCode: oModel.getProperty("/stdCode")
                },
                filters: { UserID: oModel.getProperty("/UserID") }
            };

            try {
                sap.ui.core.BusyIndicator.show(0);
                await this.ajaxUpdateWithJQuery("HM_Login", payload);
                Object.assign(this._oLoggedInUser, payload.data);
                sap.m.MessageToast.show("Profile Updated Successfully!");

            } catch (err) {
                console.error(err);
                sap.m.MessageToast.show("Error updating profile");
            } finally {
                sap.ui.core.BusyIndicator.hide();
                oModel.setProperty("/isEditMode", false);
                this._oProfileEditDialog.close();
                this._oProfileDialog.open();
            }
        },

        onProfileclose: function () {
            // Close the dialog and perform logout logic
            if (this._oProfileDialog) this._oProfileDialog.close();
        },

        onEditProfilePic: function () {
            sap.m.MessageToast.show("Profile picture edit not implemented yet.");
        },

       onProfileDialogClose: function () {
            if (this._oProfileEditDialog) {
                this._oProfileEditDialog.close();
            }
            if (this._oProfileDialog) {
                this._oProfileDialog.close();
            }
        },

        onLogout: function () {
            const oLoginModel = sap.ui.getCore().getModel("LoginModel");
            if (oLoginModel) {
                oLoginModel.setData({
                    EmployeeID: "",
                    EmployeeName: "",
                    EmailID: "",
                    Role: "",
                    BranchCode: "",
                    MobileNo: "",
                    DateofBirth: ""
                });
            }

            this._oLoggedInUser = null;

            if (this._oProfileDialog) {
                this._oProfileDialog.destroy();
                this._oProfileDialog = null;
            }

            this.getOwnerComponent().getModel("UIModel").setProperty("/isLoggedIn", false);
        },

        _onEnterProfile: async function () {
            this._oProfileActionSheet.close();
            this._isProfileRequested = true;
            await this.onPressAvatar();
        },

        _onLogout: function () {
            this._oProfileActionSheet.close();
            sap.m.MessageToast.show("Logging out...");
            this._oLoggedInUser = null;
            if (this._oProfileDialog) {
                this._oProfileDialog.destroy();
                this._oProfileDialog = null;
            }
            if (this._oProfileActionSheet) {
                this._oProfileActionSheet.destroy();
                this._oProfileActionSheet = null;
            }
            this.getOwnerComponent().getModel("UIModel").setProperty("/isLoggedIn", false);
            this.getOwnerComponent().getRouter().navTo("RouteHostel");
        },

        createAvatarActionSheet: function () {
            if (!this._oProfileActionSheet) {
                this._oProfileActionSheet = new sap.m.ActionSheet({
                    placement: sap.m.PlacementType.Bottom,
                    buttons: [
                        new sap.m.Button({
                            text: "Enter into Profile",
                            icon: "sap-icon://customer",
                            class: "myUnifiedBtn",
                            press: this._onEnterProfile.bind(this)
                        }).addStyleClass("myUnifiedBtn"),

                        new sap.m.Button({
                            text: "Logout",
                            class: "myUnifiedBtn",
                            icon: "sap-icon://log",
                            press: this._onLogout.bind(this)
                        }).addStyleClass("myUnifiedBtn")
                    ]
                });

                this.getView().addDependent(this._oProfileActionSheet);
            }
        },

        Bookfragment: function () {
            if (!this.FCIA_Dialog) {
                var oView = this.getView();
                this.FCIA_Dialog = sap.ui.xmlfragment("sap.ui.com.project1.fragment.Book_Room", this);
                oView.addDependent(this.FCIA_Dialog);

                this.FCIA_Dialog.open();

            } else {
                this.FCIA_Dialog.open();
            }
        },

        onRoomBookPress: function (oEvent) {
            this.getOwnerComponent().getRouter().navTo("TilePage")
            // try {
            //     // Get the clicked button and its custom data
            //     const oButton = oEvent.getSource();
            //     const sRoomType = oButton.data("roomType"); 

            //     // Get VisibilityModel from the view
            //     const oVisibilityModel = this.getView().getModel("VisibilityModel");
            //     if (!oVisibilityModel) {
            //         sap.m.MessageToast.show("Room details not found.");
            //         return;
            //     }

            //     // Get logged-in user ID
            //     const sUserID = sap.ui.getCore().getModel("HostelModel")?.getProperty("/UserID") || "";

            //     // Get the correct price based on room type
            //     let sPrice = "";
            //     switch (sRoomType) {
            //         case "Single Bed":
            //             sPrice = oVisibilityModel.getProperty("/singlePrice");
            //             break;
            //         case "Double Bed":
            //             sPrice = oVisibilityModel.getProperty("/doublePrice");
            //             break;
            //         case "Four Bed":
            //             sPrice = oVisibilityModel.getProperty("/fourPrice");
            //             break;
            //         default:
            //             sPrice = "";
            //     }

            //     // Create or update global HostelModel
            //     const oHostelModel = new JSONModel({
            //         UserID: sUserID,
            //         RoomType: sRoomType,
            //         Price: sPrice,
            //         PaymentType: "",
            //         Person: "",
            //         StartDate: "",
            //         EndDate: ""
            //     });

            //     sap.ui.getCore().setModel(oHostelModel, "HostelModel");

            //     // Navigate to booking page
            //     this.getOwnerComponent().getRouter().navTo("RouteBookRoom");

            // } catch (err) {
            //     console.error("Booking navigation error:", err);
            //     sap.m.MessageToast.show("Error while booking room.");
            // }
        },

        onCancelDialog: function () {
            this.FCIA_Dialog.close();
        },

        onAdminPress: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("RouteStudentDetails");
        },

        onWizardNext: function () {
            const oDialog = this.FCIA_Dialog;
            const oWizard = sap.ui.getCore().byId("idHostelWizard");
            const oNextButton = sap.ui.getCore().byId("idWizardNextBtn");
            const oBackButton = sap.ui.getCore().byId("idWizardBackBtn");
            const oSubmitButton = sap.ui.getCore().byId("idWizardSubmitBtn");

            oWizard.nextStep();

            const aSteps = oWizard.getSteps();
            const oCurrentStep = oWizard.getProgressStep();

            // If current step is last, adjust button visibility
            const bIsLast = aSteps[aSteps.length - 1].getId() === oCurrentStep.getId();

            if (bIsLast) {
                oNextButton.setVisible(false);
                oSubmitButton.setVisible(true);
            } else {
                oNextButton.setVisible(true);
                oSubmitButton.setVisible(false);
            }

            oBackButton.setEnabled(true);
        },

        onWizardBack: function () {
            const oWizard = sap.ui.getCore().byId("idHostelWizard");
            const oNextButton = sap.ui.getCore().byId("idWizardNextBtn");
            const oBackButton = sap.ui.getCore().byId("idWizardBackBtn");
            const oSubmitButton = sap.ui.getCore().byId("idWizardSubmitBtn");
            oWizard.previousStep();

            const aSteps = oWizard.getSteps();
            const oCurrentStep = oWizard.getCurrentStep();
            const bIsFirst = aSteps[0].getId() === oCurrentStep;

            oBackButton.setEnabled(!bIsFirst);
            oNextButton.setVisible(true);
            oSubmitButton.setVisible(false);
        },

        onWizardComplete: function () {
            MessageToast.show("Wizard completed successfully!");
        },

        onCancelDialog: function () {
            this.FCIA_Dialog.close();
            sap.ui.getCore().byId("idHostelWizardDialog").close();
        },

        onDoubleRoomPress: function (oEvent) {

            // var oRouter = this.getOwnerComponent().getRouter();
            // oRouter.navTo("TilePage");
            this.Bookfragment()
            // if (this._oLoggedInUser === undefined) {
            //     MessageBox.alert("Please signin to book a room.");
            //     return;
            // }

            // this.Bookfragment();
            // const oButton = oEvent.getSource();
            // var price = this.getView().getModel("VisibilityModel").getData();

            // this.sRoomType = oButton.data("roomType");
            // sap.ui.getCore().byId("idRoomType").setValue(this.sRoomType);
            // sap.ui.getCore().byId("idPrice1").setValue(price.doublePrice);
            // sap.ui.getCore().byId("idFullName").setValue(this._oLoggedInUser.UserName);
            // sap.ui.getCore().byId("idE-mail").setValue(this._oLoggedInUser.EmailID);
            // sap.ui.getCore().byId("idMobile").setValue(this._oLoggedInUser.MobileNo);

        },

        SectionPress: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("listItem");
            if (!oSelectedItem) return;

            var oContext = oSelectedItem.getBindingContext("profileMenuModel");
            var oSectionData = oContext ? oContext.getObject() : null;

            if (oSectionData) {
                if (oSectionData.key === "logout") {
                    var oView = this.getView();
                    if (oView.byId("loginButton")) oView.byId("loginButton").setVisible(true);
                    if (oView.byId("ProfileAvatar")) oView.byId("ProfileAvatar").setVisible(false);
                    if (this._oProfileDialog) this._oProfileDialog.close();
                } else {
                    // Update the dialog's section model, not the view’s
                    if (this._oProfileDialog) {
                        var oSectionModel = this._oProfileDialog.getModel("profileSectionModel");
                        if (oSectionModel) {
                            oSectionModel.setProperty("/selectedSection", oSectionData.key);
                        }
                    }
                }
            }
        },

        onSearchChange: function (oEvent) {
            var sBranchCode = oEvent.getParameter("value").trim();
            if (!sBranchCode) {
                sap.m.MessageToast.show("Please enter a location to search.");
                return;
            }
            // Call your function with new search value
            this._loadFilteredData(sBranchCode);
        },

        FC_onPressClear: function () {
            const oView = this.getView();
            const oBranchCombo = oView.byId("id_Branch");
            const oAreaTypeCombo = oView.byId("id_Area");
            const oRoomTypeCombo = oView.byId("id_Roomtype");

            // 🔹 Reset all selected keys
            if (oBranchCombo) oBranchCombo.setSelectedKey("");
            if (oAreaTypeCombo) oAreaTypeCombo.setSelectedKey("");
            if (oRoomTypeCombo) oRoomTypeCombo.setSelectedKey("");

            // 🔹 Make Area and Room Type non-editable
            if (oAreaTypeCombo) oAreaTypeCombo.setEnabled(false);
            if (oRoomTypeCombo) oRoomTypeCombo.setEnabled(true);
        },

        onPressBookingRow: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("profileData");
            var oBookingData = oContext.getObject();

            // Status check (optional)
            // var sStatus = (oBookingData.status || "").trim().toLowerCase();
            // if (sStatus !== "new") {
            //     sap.m.MessageToast.show("Only bookings with status 'New' can be edited.");
            //     return;
            // }

            // Now reuse your logic exactly as in onEditBooking
            var oProfileModel = this._oProfileDialog.getModel("profileData");
            var aCustomers = oProfileModel.getProperty("/aCustomers");
            var aFacilities = oProfileModel.getProperty("/facility");

            var sCustomerID = oBookingData.cutomerid || oBookingData.CustomerID || "";

            if (!sCustomerID) {
                sap.m.MessageToast.show("Customer ID not found for this booking.");
                return;
            }

            var oCustomer = aCustomers.find(cust => cust.customerID === sCustomerID);
            if (!oCustomer) {
                sap.m.MessageToast.show("No customer details found for this booking.");
                return;
            }

            var aCustomerFacilities = aFacilities.filter(fac => fac.customerid === sCustomerID);

            // Calculate totals
            var oTotals = this.calculateTotals(
                [{
                    FullName: oCustomer.customerName,
                    Facilities: {
                        SelectedFacilities: aCustomerFacilities
                    }
                }],
                oBookingData.Startdate,
                oBookingData.EndDate,
                oBookingData.RoomPrice
            );
            if (!oTotals) {
                return;
            }

            // Prepare data for details view
            var oFullCustomerData = {
                salutation: oCustomer.salutation,
                FullName: oCustomer.customerName,
                Gender: oCustomer.gender,
                stdcode: oCustomer.stdCode,
                MobileNo: oCustomer.mobileno,
                CustomerEmail: oCustomer.customerEmail,
                Country: oCustomer.country,
                State: oCustomer.state,
                City: oCustomer.city,
                DateOfBirth: oCustomer.DOB,
                RoomType: oBookingData.room,
                Price: oBookingData.amount,
                noofperson: oBookingData.noofperson,
                RoomPrice: oBookingData.RoomPrice,
                PaymentType: oBookingData.paymenytype,
                StartDate: oBookingData.Startdate,
                EndDate: oBookingData.EndDate || "",
                CustomerId: oBookingData.cutomerid,
                TotalDays: oTotals.TotalDays,
                AllSelectedFacilities: oTotals.AllSelectedFacilities,
                TotalFacilityPrice: oTotals.TotalFacilityPrice,
                GrandTotal: oTotals.GrandTotal
            };

            // Set model for next screen
            var oHostelModel = new sap.ui.model.json.JSONModel(oFullCustomerData);
            this.getOwnerComponent().setModel(oHostelModel, "HostelModel");

            // Navigate
            this.getOwnerComponent().getRouter().navTo("RouteAdminDetails", {
                sPath: encodeURIComponent(sCustomerID)
            });
        },

        //  Separated calculation function
        calculateTotals: function (aPersons, sStartDate, sEndDate, RoomPrice) {
            const oStartDate = this._parseDate(sStartDate);
            const oEndDate = this._parseDate(sEndDate);

            if (!oStartDate || !oEndDate) {
                sap.m.MessageToast.show("Invalid Start or End Date");
                return null;
            }

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
                    // Defensive coding to avoid undefined values
                    const sFacilityName = f.facilitiname || f.facilityname || "N/A";
                    const fPrice = parseFloat(f.facilitiPrice || f.facilitiPrice || 0);
                    const fTotal = (fPrice * iDays).toFixed(2);
                    const aEndDate = f.enddate

                    totalFacilityPricePerDay += fPrice;

                    aAllFacilities.push({
                        PersonName: oPerson.FullName || `Person ${iIndex + 1}`,
                        FacilityName: sFacilityName,
                        Price: fPrice,
                        StartDate: sStartDate,
                        EndDate: aEndDate,
                        TotalDays: iDays,
                        TotalAmount: fTotal,
                        Image: f.Image || f.image || ""
                    });
                });
            });

            const totalFacilityPrice = totalFacilityPricePerDay * iDays;
            const grandTotal = totalFacilityPrice + Number(RoomPrice || 0);

            return {
                TotalDays: iDays,
                TotalFacilityPrice: totalFacilityPrice,
                GrandTotal: grandTotal,
                AllSelectedFacilities: aAllFacilities
            };
        },

        // 🗓️ Helper date parser
        _parseDate: function (sDate) {
            if (!sDate) return null;

            // If it's already a Date object
            if (sDate instanceof Date) {
                return sDate;
            }

            // Convert from DD/MM/YYYY or YYYY-MM-DD
            if (sDate.includes("/")) {
                const [d, m, y] = sDate.split("/");
                return new Date(`${y}-${m}-${d}`);
            } else {
                return new Date(sDate);
            }
        },

        onBranchSelectionChange: function (oEvent) {
            const oView = this.getView();
            const oAreaCombo = oView.byId("id_Area");
            const oRoomType = oView.byId("id_Roomtype");

            // Reset previous selections
            oAreaCombo.setSelectedKey("").setEnabled(false);
            oRoomType.setSelectedKey("");

            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) return;

            // 🔹 Selected Branch Name
            const sSelectedBranch = oSelectedItem.getText();

            // 🔹 Fetch existing Branch model data
            const oModelData = oView.getModel("sBRModel").getData();

            // 🔹 Filter the data for the selected branch name
            const aFiltered = oModelData.filter(function (item) {
                return item.City === sSelectedBranch;
            });

            // 🔹 Update Area model dynamically
            const oAreaModel = new sap.ui.model.json.JSONModel(aFiltered);
            oView.setModel(oAreaModel, "AreaModel");

            // 🔹 Enable the Area dropdown now that data is ready
            oAreaCombo.setEnabled(true);
        },

        // 🔹 When Area is selected, enable Room Type combo
        onAreaSelectionChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");

            const oRoomType = this.byId("id_Roomtype");
            const oSelectedItem = oEvent.getSource().getSelectedItem();

            if (oSelectedItem) {
                oRoomType.setEnabled(true);
            } else {
                oRoomType.setEnabled(true);
            }
        },

        onSearchRooms: async function () {
            const oContainer = this.byId("idBedTypeFlex");
            oContainer.setBusy(true);

            // City
            var oBranchcity = this.byId("id_Branch").getSelectedKey() ||
                this.byId("id_Branch").getValue();

            if (!oBranchcity) {
                MessageToast.show("Please Select City");
                oContainer.setBusy(false);
                return;
            }

            // AC Type
            const sSelectedACType = this.byId("id_Roomtype")?.getSelectedKey();

            if (sSelectedACType === "") {
                this.byId("id_Roomtype").setSelectedKey("All")
            }

            // Locality ComboBox
            var oAreaCB = this.byId("id_Area");
            var sSelectedBranch = oAreaCB.getSelectedKey() || oAreaCB.getValue();

            var areaList = this.getView().getModel("AreaModel").getData() || [];

            // Check if selected or typed locality is valid
            var validArea = areaList.find(item =>
                item.Address === sSelectedBranch || item.BranchID === sSelectedBranch
            );

            if (sSelectedBranch && !validArea) {
                // User typed something, but it does not match the list
                MessageToast.show("Please select locality");
                oContainer.setBusy(false);
                return;
            }

            // If locality is empty, keep it empty (search by city only)
            var finalBranch = validArea ? validArea.BranchID : "";
            try {
                await this._loadFilteredData(oBranchcity, finalBranch, sSelectedACType);
            } catch (e) {
                console.error(e);
            } finally {
                oContainer.setBusy(false);
            }
        },

        _loadFilteredData: async function (Scity, sBranchCode, sACType) {

            if (sACType === "All") {
                sACType = "";
            }

            try {

                const oView = this.getView();

                let aBranchCodes = [];

                if (Scity && !sBranchCode) {

                    const aBranches = await this.ajaxReadWithJQuery("HM_Branch", {
                        City: Scity
                    });

                    if (aBranches.data.length === 0) {
                        const oModel = this.getView().getModel("VisibilityModel");
                        oModel.setProperty("/BedTypes", []);
                        oModel.setProperty("/NoData", true);
                        return;
                    }

                    aBranchCodes = (Array.isArray(aBranches.data) ? aBranches.data : [aBranches.data])
                        .map(branch => branch.BranchID);
                } else if (Scity && sBranchCode) {
                    aBranchCodes = [sBranchCode];
                } else if (!Scity && sBranchCode) {
                    aBranchCodes = [sBranchCode];
                }

                const response = await this.ajaxReadWithJQuery("HM_BedType", {
                    BranchCode: JSON.stringify(aBranchCodes)
                });

                let matchedRooms = response?.data?.data || [];


                if (sACType) {
                    matchedRooms = matchedRooms.filter(
                        room => room.ACType?.toLowerCase() === sACType.toLowerCase()
                    );
                }

                if (sBranchCode && sBranchCode.trim() !== "") {
                    matchedRooms = matchedRooms.filter(
                        room =>
                            room.BranchCode?.toLowerCase() === sBranchCode.toLowerCase()
                    );
                } else {
                    matchedRooms = matchedRooms.filter(
                        room =>
                            aBranchCodes
                                .map(code => code.toLowerCase())
                                .includes(room.BranchCode?.toLowerCase())
                    );
                }

                const oRoomDetailsModel = oView.getModel("RoomCountModel");
                // const oCustomerModel = oView.getModel("CustomerModel");

                const roomDetails = oRoomDetailsModel.getData()?.Rooms || [];
                // const customerData = oCustomerModel.getData() || [];


                const oBranchModel = oView.getModel("sBRModel");
                const aBranchData = oBranchModel?.getData() || [];

                const convertBase64ToImage = (base64String, fileType) => {
                    if (!base64String) return "./image/Fallback.png";
                    let sBase64 = base64String.replace(/\s/g, "");
                    try {
                        if (!sBase64.startsWith("iVB") && !sBase64.startsWith("data:image")) {
                            const decoded = atob(sBase64);
                            if (decoded.startsWith("iVB")) sBase64 = decoded;
                        }
                    } catch (e) { }

                    const mimeType = fileType || "image/jpeg";
                    if (sBase64.startsWith("data:image")) return sBase64;
                    return `data:${mimeType};base64,${sBase64}`;
                };

                const aBedTypes = matchedRooms.map(room => {
                    const matchingRooms = roomDetails.filter(
                        rd =>
                            rd.BranchCode?.toLowerCase() === room.BranchCode?.toLowerCase() &&
                            rd.BedTypeName?.trim().toLowerCase() ===
                            (room.Name?.trim().toLowerCase() +
                                " - " +
                                room.ACType?.trim().toLowerCase())
                    );

                    const firstRoom = matchingRooms[0];
                    const price = firstRoom?.Price ? " " + firstRoom.Price : "";
                    const MonthPrice = firstRoom?.MonthPrice ? " " + firstRoom.MonthPrice : "";
                    const YearPrice = firstRoom?.YearPrice ? " " + firstRoom.YearPrice : "";
                    const Currency = firstRoom?.Currency ? " " + firstRoom.Currency : "";

                    let totalBooked = 0;
                    let totalCapacity = 0;

                    // matchingRooms.forEach(rm => {
                    //     totalCapacity += rm.NoofPerson || 0;
                    //     const bookedCount = customerData.filter(cust =>
                    //         cust.Bookings?.some(bk =>
                    //             bk.BranchCode?.toLowerCase() === rm.BranchCode?.toLowerCase() &&
                    //             bk.RoomNo?.toLowerCase() === rm.RoomNo?.toLowerCase() &&
                    //             bk.BedType?.trim().toLowerCase() === rm.BedTypeName?.trim().toLowerCase()
                    //         )
                    //     ).length;
                    //     totalBooked += bookedCount;
                    // });

                    // const isFull = totalBooked >= totalCapacity && totalCapacity > 0;
                    // const isVisible = !isFull && price.trim() !== "";


                    const oBranchInfo = aBranchData.find(b =>
                        b.BranchID?.toLowerCase() === room.BranchCode?.toLowerCase()
                    );

                    const sArea = oBranchInfo?.Address || "";
                    const sCountry= oBranchInfo?.Country|| "";

                    const aImages = [];
                    for (let i = 1; i <= 5; i++) {
                        const base64 = room[`Photo${i}`];
                        const type = room[`Photo${i}Type`];
                        if (base64) {
                            aImages.push({
                                src: convertBase64ToImage(base64, type),
                                Area: sArea
                            });
                        }
                    }
                    return {
                        Name: room.Name,
                        ACType: room.ACType,
                        NoOfPerson: room.NoOfPerson,
                        Description: room.Description || "",
                        Price: price,
                        MonthPrice: MonthPrice,
                        YearPrice: YearPrice,
                        Currency: Currency,
                        BranchCode: room.BranchCode,
                        Images: aImages,
                        Country:sCountry
                        // Visible: isVisible
                    };
                });


                oView.setModel(new sap.ui.model.json.JSONModel({
                    BedTypes: aBedTypes
                }),
                    "VisibilityModel");
                oView.getModel("VisibilityModel").setProperty("/NoData", false);
            } catch (err) {
                console.error("Error loading data:", err);
                sap.m.MessageToast.show("Failed to load bed type data.");
            }
        },


        onBookNow: function (oEvent) {

            // Get selected bed type object
            const oItem = oEvent.getSource().getBindingContext("VisibilityModel").getObject();

            let oHostelModel = sap.ui.getCore().getModel("HostelModel");
            if (!oHostelModel) {
                oHostelModel = new sap.ui.model.json.JSONModel({});
                sap.ui.getCore().setModel(oHostelModel, "HostelModel");
            }

            //  Set RoomType and Price in HostelModel
            oHostelModel.setProperty("/RoomType", oItem.Name || "");
            oHostelModel.setProperty("/Price", oItem.Price || 0);
            oHostelModel.setProperty("/ACType", oItem.ACType || 0);
            oHostelModel.setProperty("/BranchCode", oItem.BranchCode || 0);


            // Optionally set other details
            oHostelModel.setProperty("/Image", oItem.Image || "");
            oHostelModel.setProperty("/Description", oItem.Description || "");


            //  Navigate to the booking route (or open fragment)
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteBookRoom");
        },

        onFormEdit: async function () {
            var oSaveModel = this.getView().getModel("saveModel");
            var oedit = oSaveModel.getProperty("/isEditMode");
            var oEdit = this._oProfileDialog.getModel("profileData").getData();
            if (!oedit) {
                oSaveModel.setProperty("/isEditMode", true);
                return;
            }
            var oPayload = {
                UserName: oEdit.name
            }

            const oId = this._oLoggedInUser || {};
            const ID = oId.UserID || "";
            const filter = {
                UserID: ID
            };
            try {
                await this.ajaxUpdateWithJQuery("HM_Login", {
                    data: oPayload,
                    filters: filter
                });
                sap.m.MessageToast.show("Data Saved successfully ");
                oSaveModel.setProperty("/isEditMode", false);
            } catch (error) {
                sap.m.MessageToast.show("Failed");
            }
        },
        OnpressBookingDetails: function () {

        },
        //.,.,.,.,.,.
        FSM_onConfirm: function (oEvent) {
            const oModel = this.getView().getModel("LoginMode");

            // Get confirm directly from the control (live accurate value)
            const confirm = oEvent?.getSource()?.getValue()?.trim() || "";

            // Get main password directly from its input (not from model)
            const pass = sap.ui.getCore().byId("signUpPassword").getValue().trim();

            const oInput = sap.ui.getCore().byId("signUpConfirmPassword");

            // Required
            if (!confirm) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Confirm Password is required");
                return;
            }

            // Compare
            if (pass !== confirm) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Passwords do not match");
                return;
            }

            // If matched → Green
            oInput.setValueState("None");
            // oInput.setValueStateText("Passwords matched");
        },
        Forget_onConfirm: function (oEvent) {
            const confirm = oEvent.getSource().getValue().trim();
            const pass = sap.ui.getCore().byId("newPass").getValue().trim();
            const oInput = sap.ui.getCore().byId("confPass");

            if (!confirm) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Confirm Password is required");
                return;
            }

            if (pass !== confirm) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Passwords do not match");
                return;
            }

            oInput.setValueState("None");
            oInput.setValueStateText("Passwords matched");
        },

        onOtpLive: function (oEvent) {
            const sInput = oEvent.getSource();
            const sVal = oEvent.getParameter("value").replace(/\D/g, ""); // allow digits only

            sInput.setValue(sVal);

            // Keep it in error state until full 6 digits
            if (sVal.length === 6) {
                sInput.setValueState(sap.ui.core.ValueState.None);
            } else {
                sInput.setValueState(sap.ui.core.ValueState.Error);
                sInput.setValueStateText("Enter a valid 6-digit OTP");
            }
        },


        onBackToForgot: function () {
            const vm = this.getView().getModel("LoginViewModel");
            vm.setProperty("/authFlow", "forgot");
            vm.setProperty("/forgotStep", 1); // RESET to step 1
        },



        onForgotPassword: function () {
            const vm = this.getView().getModel("LoginViewModel");

            vm.setProperty("/authFlow", "forgot");
            vm.setProperty("/forgotStep", 1); // safe, runtime only
            vm.setProperty("/dialogTitle", "Reset Password"); //
        },







        onSelectLoginMode: function (e) {
            const vm = this.getView().getModel("LoginViewModel");
            const mode = e.getSource().getText().toLowerCase(); // "password" or "otp"

            vm.setProperty("/loginMode", mode);

            // 🔥 Always reset OTP field visibility when switching modes
            vm.setProperty("/showOTPField", false);
            vm.setProperty("/isOtpEntered", false);

            // 🔥 Clean OTP input field and disable it
            const otpCtrl = sap.ui.getCore().byId("signInOTP");
            if (otpCtrl) {
                otpCtrl.setValue("");
                otpCtrl.setEnabled(false);
            }

            // 🔥 Reset password field too (fresh mode)
            const passCtrl = sap.ui.getCore().byId("signinPassword");
            if (passCtrl) {
                passCtrl.setValue("");
                passCtrl.setValueState("None");
            }

            // 🔥 Hide Send OTP button unless user is in OTP mode
            const btnSendOtp = sap.ui.getCore().byId("btnSignInSendOTP");
            if (btnSendOtp) {
                btnSendOtp.setVisible(mode === "otp");
            }
        },



        _clearAllAuthFields: function () {
            const ids = [
                "signInuserid", "signInusername", "signinPassword",
                "fpUserId", "fpUserName", "fpOTP",
                "newPass", "confPass", "loginOTP"
            ];
            ids.forEach(id => {
                const c = sap.ui.getCore().byId(id);
                if (c) {
                    c.setValue("");
                    c.setValueState("None");
                }
            });
            this._storedLoginCreds = null;
            this._oResetUser = null;
        },








        _resetAuthDialog: function () {
            const oModel = this.getView().getModel("LoginMode");

            // Reset LoginMode data (your existing block)
            oModel.setData({
                Salutation: "",
                fullname: "",
                Email: "",
                STDCode: "",
                Mobileno: "",
                password: "",
                comfirmpass: "",
                UserID: "",
                Gender: "",
                Country: "",
                State: "",
                City: "",
                Address: "",
                DateOfBirth: ""
            });
            //  Reset UI controls
            //  Reset Sign-Up controls
            [
                "signUpSalutation", "signUpName", "signUpEmail", "signUpPassword",
                "signUpConfirmPassword", "signUpDOB", "signUpGender", "signUpCountry",
                "signUpState", "signUpCity", "signUpSTD", "signUpPhone", "signUpAddress"
            ].forEach(id => {
                const ctrl = $C(id);
                if (ctrl) {
                    ctrl.setValueState("None");
                    if (ctrl.setValue) ctrl.setValue("");
                    if (ctrl.setSelectedKey) ctrl.setSelectedKey("");
                }
            });

            //  Reset Sign-In controls
            ["signInuserid", "signInusername", "signinPassword"].forEach(id => {
                const ctrl = $C(id);
                if (ctrl) {
                    ctrl.setValueState("None");
                    if (ctrl.setValue) ctrl.setValue("");
                }
            });


            // Re-enable STD & Gender
            const STD = $C("signUpSTD");
            const GEN = $C("signUpGender");
            if (STD) STD.setEnabled(true);
            if (GEN) GEN.setEnabled(true);



            // Reset account type
            const oVM = this.getView().getModel("LoginViewModel");
            oVM.setProperty("/selectedAccountType", "personal");
            oVM.setProperty("/authFlow", "signin");










            // Clear all fields including forgot/otp/reset
            this._clearAllAuthFields();

            // Ensure only Sign In panel is visible when dialog opens next time

        },

        _showPanel: function (panelId) {
            const aPanels = [
                "signInPanel",
                "signUpPanel",
                "forgotFlowPanel"
            ];

            aPanels.forEach(id => {
                const c = sap.ui.getCore().byId(id);
                if (c) {
                    c.setVisible(id === panelId);
                }
            });
        },





        onSubmitNewPassword: async function () {
            const oNew = sap.ui.getCore().byId("newPass");
            const oConf = sap.ui.getCore().byId("confPass");

            const pass = oNew.getValue().trim();
            const confirm = oConf.getValue().trim();

            // RESET state before validation
            oNew.setValueState("None");
            oConf.setValueState("None");

            // 1) Required check for New Password
            if (!pass) {
                oNew.setValueState("Error");
                oNew.setValueStateText("Password is required");
                sap.m.MessageToast.show("Password is required");
                return;
            }

            // 2) Format rule check
            if (!utils._LCvalidatePassword(oNew)) {
                oNew.setValueState("Error");
                oNew.setValueStateText("Must contain 1 uppercase, 1 lowercase, 1 number & 1 special character");
                return;
            }

            // 3) Required check for Confirm Password
            if (!confirm) {
                oConf.setValueState("Error");
                oConf.setValueStateText("Confirm Password is required");
                sap.m.MessageToast.show("Confirm Password is required");
                return;
            }

            // 4) Match both
            if (pass !== confirm) {
                oConf.setValueState("Error");
                oConf.setValueStateText("Passwords do not match");
                sap.m.MessageToast.show("Passwords do not match");
                return;
            }

            // 🔥 PASSED ALL VALIDATIONS → SUCCESS STATE
            oConf.setValueState("None");
            // oConf.setValueStateText("Passwords matched");

            try {
                await this.ajaxUpdateWithJQuery("HM_Login", {
                    data: { Password: btoa(pass) },
                    filters: { UserID: this._oResetUser?.UserID }
                });


                sap.m.MessageBox.success("Password updated successfully", {
                    title: "Success",
                    onClose: () => {

                        // fully clean values
                        this._clearAllAuthFields?.();
                        this._clearForgotFlow?.();





                        // reset dialog title
                        sap.ui.getCore().byId("authDialog")
                            .getCustomHeader()
                            .getContentMiddle()[0]
                            .setText("Hostel Access Portal");

                        // switch flow back to signin
                        const vm = this.getView().getModel("LoginViewModel");
                        vm.setProperty("/authFlow", "signin");

                        // show login panel
                        vm.setProperty("/authFlow", "signin");
                        vm.setProperty("/forgotStep", 1);
                        vm.setProperty("/dialogTitle", "Hostel Access Portal");


                    }
                });

            } catch (err) {
                sap.m.MessageToast.show("Password reset failed");
            }
        },

        _resetAllAuthFields: function () {
            ["signInuserid", "signInusername", "signinPassword",
                "fpUserId", "fpUserName", "fpOTP", "newPass", "confPass", "loginOTP"
            ]
                .forEach(id => {
                    let o = sap.ui.getCore().byId(id);
                    if (o) o.setValue("");
                });
        },




        _verifyOTPWithBackend: async function (otp) {
            sap.ui.core.BusyIndicator.show(0);

            try {
                const oPayload = {
                    UserID: this._oResetUser.UserID,
                    UserName: this._oResetUser.UserName,
                    OTP: otp.trim()
                };

                // Call the BaseController Generic Read method
                const oResp = await this.ajaxReadWithJQuery("HM_Login", oPayload);

                return oResp?.success === true;

            } catch (err) {
                console.error("OTP Verify Error:", err);
                return false;

            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },




        // onValidateUser: async function () {
        //     const oIdCtrl = sap.ui.getCore().byId("fpUserId");
        //     const oNameCtrl = sap.ui.getCore().byId("fpUserName");

        //     // Basic client validation
        //     const okId = utils._LCvalidateMandatoryField(oIdCtrl, "ID");
        //     const okName = utils._LCvalidateMandatoryField(oNameCtrl, "ID");

        //     if (!okId || !okName) {
        //         sap.m.MessageToast.show("Enter valid User ID and User Name");
        //         return;
        //     }

        //     const sUserId = oIdCtrl.getValue().trim();
        //     const sUserName = oNameCtrl.getValue().trim();

        //     const payload = {
        //         UserID: sUserId,
        //         UserName: sUserName,
        //         Type: "OTP"
        //     };

        //     sap.ui.core.BusyIndicator.show(0);

        //     try {
        //         // call backend
        //         const oResp = await this.ajaxCreateWithJQuery("HostelSendOTP", payload);

        //         if (oResp?.success) {
        //             sap.m.MessageToast.show("OTP sent! Check your email.");
        //             alert(oResp.OTP); // Remove in production

        //             // Storing user
        //             this._oResetUser = {
        //                 UserID: sUserId,
        //                 UserName: sUserName
        //             };

        //             // 🔥 Update ViewModel flow (this drives UI via XML binding)
        //             const vm = this.getView().getModel("LoginViewModel");
        //             vm.setProperty("/forgotStep", 2);
        //         } else {
        //             sap.m.MessageToast.show("No user found with given ID / Name");
        //         }
        //     } catch (err) {
        //         sap.m.MessageToast.show("Invalid User ID / User Name");
        //         console.error("Send OTP Error:", err);
        //     } finally {
        //         sap.ui.core.BusyIndicator.hide();
        //     }
        // },









        onLoginOtpLive: function (e) {
            const vm = this.getView().getModel("LoginViewModel");
            const input = e.getSource();

            // allow only digits and enforce 6 max
            let val = e.getParameter("value").replace(/\D/g, "");
            if (val.length > 6) val = val.slice(0, 6);

            input.setValue(val);

            const isValid = val.length === 6;
            vm.setProperty("/isOtpEntered", isValid);

            if (val.length === 0) {
                input.setValueState("None");
            } else if (!isValid) {
                input.setValueState("Error");
                input.setValueStateText("Enter valid 6-digit OTP");
            } else {
                input.setValueState("None");
            }
        },






        onPressOTP: async function () {
            const oUserIdCtrl = sap.ui.getCore().byId("signInuserid");
            const oUserNameCtrl = sap.ui.getCore().byId("signInusername");

            const sUserId = oUserIdCtrl.getValue().trim();
            const sUserName = oUserNameCtrl.getValue().trim();

            // Validate inputs
            if (!utils._LCvalidateMandatoryField(oUserIdCtrl, "ID") ||
                !utils._LCvalidateMandatoryField(oUserNameCtrl, "ID")) {
                sap.m.MessageToast.show("Enter valid User ID and User Name");
                return;
            }

            const payload = {
                UserID: sUserId,
                UserName: sUserName,
                Type: "OTP"
            };

            sap.ui.core.BusyIndicator.show(0);

            try {
                // 🚀 Reuse BaseController POST
                const oResp = await this.ajaxCreateWithJQuery("HostelSendOTP", payload);

                if (oResp?.success) {

                    sap.m.MessageToast.show("OTP sent! Check your email.");
                    alert(oResp.OTP);

                    // Save login user for OTP verification
                    this._oResetUser = { UserID: sUserId, UserName: sUserName };

                    const vm = this.getView().getModel("LoginViewModel");

                    // ❗ Show OTP input field only now
                    vm.setProperty("/showOTPField", true);

                    // Clean & enable OTP input
                    const oOtpCtrl = sap.ui.getCore().byId("signInOTP");


                    oOtpCtrl.setEnabled(true);
                    oOtpCtrl.setValue("");
                    oOtpCtrl.setValueState("None");     // <--- IMPORTANT
                    oOtpCtrl.setValueStateText("");     // <--- no error by default
                    oOtpCtrl.focus();

                }
                else {
                    sap.m.MessageToast.show("User not found or unable to send OTP.");
                }

            } catch (err) {
                sap.m.MessageToast.show("Invalid credentials, Please try again");
                console.error("OTP Send Error:", err);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },




        _onVerifyOTP: async function () {

            const vm = this.getView().getModel("LoginViewModel");
            const flow = vm.getProperty("/authFlow");

            // Read OTP from correct field
            const otp = (flow === "forgot")
                ? sap.ui.getCore().byId("fpOTP").getValue().trim()
                : sap.ui.getCore().byId("signInOTP").getValue().trim();

            // Validate OTP format (6 digits only)
            if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
                const oInput = (flow === "forgot")
                    ? sap.ui.getCore().byId("fpOTP")
                    : sap.ui.getCore().byId("signInOTP");

                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText("Enter a valid 6-digit OTP");
                sap.m.MessageToast.show("Invalid OTP");
                return;
            }

            if (!otp) {
                sap.m.MessageToast.show("Enter OTP");
                sap.ui.getCore().byId("fpOTP").setValueState(sap.ui.core.ValueState.Error);
                sap.ui.getCore().byId("fpOTP").setValueStateText("Please enter OTP");
                return;
            }

            // Verify with backend
            const isValid = await this._verifyOTPWithBackend(otp);
            if (!isValid) {
                sap.m.MessageToast.show("Incorrect OTP");
                return;
            }

            // --------------------------
            // 📌 Forgot Password Flow
            // --------------------------
            if (flow === "forgot") {

                // switch to password reset
                vm.setProperty("/forgotStep", 3);

                return;
            }

            // --------------------------
            // 📌 Normal OTP Login
            // --------------------------
            if (flow === "otp") {
                const resp = await this.ajaxReadWithJQuery("HM_Login", {
                    UserID: this._oResetUser?.UserID,
                    UserName: this._oResetUser?.UserName,
                    OTP: otp
                });

                sap.m.MessageToast.show("Login Successful!");
                this._setLoggedInUser(resp.data[0]);
                this._resetAllAuthFields();
                this._oSignDialog.close();
            }
        },






        onShowForgotUser: function () {
            this._showForgotSection("secForgotUser");
        },



        onBackToLogin: function () {

            // Clean auth data & any internal flags
            this._clearAllAuthFields();

            // Reset only values (not visibility/enabled state)
            sap.ui.getCore().byId("fpUserId").setValue("");
            sap.ui.getCore().byId("fpUserName").setValue("");
            sap.ui.getCore().byId("fpOTP").setValue("");
            sap.ui.getCore().byId("newPass").setValue("");
            sap.ui.getCore().byId("confPass").setValue("");

            // Update flow using ViewModel
            const vm = this.getView().getModel("LoginViewModel");
            vm.setProperty("/authFlow", "signin");
            vm.setProperty("/forgotStep", 1);

            vm.setProperty("/authFlow", "signin");
            vm.setProperty("/forgotStep", 1);
            vm.setProperty("/dialogTitle", "Hostel Access Portal");


        },







        _setLoggedInUser: function (user) {
            const oLoginModel = this.getView().getModel("LoginModel");

            oLoginModel.setProperty("/EmployeeID", user.UserID);
            oLoginModel.setProperty("/EmployeeName", user.UserName);
            oLoginModel.setProperty("/EmailID", user.EmailID);
            oLoginModel.setProperty("/Role", user.Role);
            oLoginModel.setProperty("/BranchCode", user.BranchCode || "");
            oLoginModel.setProperty("/MobileNo", user.MobileNo || "");
            oLoginModel.setProperty("/DateofBirth", user.DateOfBirth || "");

            this._oLoggedInUser = user;

            if (user.Role === "Customer") {
            } else {
                this.getOwnerComponent().getRouter().navTo("TilePage");
            }
        },

        onPressAvatarEdit: function () {
            if (!this._oAvatarActionSheet) {
                this._oAvatarActionSheet = new sap.m.ActionSheet({
                    buttons: [
                        new sap.m.Button({
                            text: "Take Photo",
                            icon: "sap-icon://camera",
                            press: this.onTakePhoto.bind(this)
                        }),
                        new sap.m.Button({
                            text: "Upload from Gallery",
                            icon: "sap-icon://add-photo",
                            press: this.onUploadPhoto.bind(this)
                        }),
                        new sap.m.Button({
                            text: "Remove Photo",
                            icon: "sap-icon://delete",
                            type: "Reject",
                            press: this.onRemovePhoto.bind(this)
                        })
                    ],
                    placement: "Bottom"
                });
                this.getView().addDependent(this._oAvatarActionSheet);
            }
            this._oAvatarActionSheet.openBy(sap.ui.getCore().byId("avatarEditBtn"));
        },

        _StartCamera: function () {
            var oVideo = document.getElementById("video");
            if (!oVideo) return;

            // Create segmentation instance only once
            if (!this.selfieSegmentation) {
                this.selfieSegmentation = new SelfieSegmentation({
                    locateFile: (file) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
                    },
                });

                this.selfieSegmentation.setOptions({
                    modelSelection: 1, // 0 = general, 1 = landscape
                });

                // Store segmentation results
                this.latestSegmentation = null;
                this.selfieSegmentation.onResults((results) => {
                    this.latestSegmentation = results;
                });
            }

            // Always create a new Camera instance when starting
            this.camera = new Camera(oVideo, {
                onFrame: async () => {
                    await this.selfieSegmentation.send({ image: oVideo });
                },
                width: 640,
                height: 480,
            });
            this.camera.start();
        },

        _StopCamera: function () {
            if (this.camera) {
                this.camera.stop();
                this.camera = null;
            }
            if (this._cameraStream) {
                this._cameraStream.getTracks().forEach((track) => track.stop());
                this._cameraStream = null;
            }
            var oVideo = document.getElementById("video");
            if (oVideo) {
                oVideo.srcObject = null;
            }
        },

        onTakePhoto: function () {
            if (!this.oCameraDialog) {
                sap.ui.core.Fragment.load({
                    name: "sap.ui.com.project1.fragment.SelfieCam",
                    controller: this,
                }).then(
                    function (oDialog) {
                        this.oCameraDialog = oDialog;
                        this.getView().addDependent(this.oCameraDialog);
                        this.oCameraDialog.attachAfterOpen(this._StartCamera.bind(this));
                        this.oCameraDialog.attachAfterClose(this._StopCamera.bind(this));
                        this.oCameraDialog.open();
                    }.bind(this)
                );
            } else {
                this.oCameraDialog.open();
            }
        },

        IC_onCapturePress: function () {
            var oVideo = document.getElementById("video");

            if (!oVideo || !this.latestSegmentation) return;

            const oCanvas = document.createElement("canvas");
            const oContext = oCanvas.getContext("2d");

            oCanvas.width = oVideo.videoWidth;
            oCanvas.height = oVideo.videoHeight;

            oContext.fillStyle = "white";
            oContext.fillRect(0, 0, oCanvas.width, oCanvas.height);

            oContext.drawImage(oVideo, 0, 0, oCanvas.width, oCanvas.height);

            const mask = this.latestSegmentation.segmentationMask;
            oContext.globalCompositeOperation = "destination-in";
            oContext.drawImage(mask, 0, 0, oCanvas.width, oCanvas.height);
            oContext.globalCompositeOperation = "destination-over";
            oContext.fillStyle = "white";
            oContext.fillRect(0, 0, oCanvas.width, oCanvas.height);
            oContext.globalCompositeOperation = "source-over";

            var base64Image = oCanvas.toDataURL("image/png");
            var mimeType = "image/png";
            var imageName = "captured_image.png";

            // remove base64 prefix
            var rawBase64 = base64Image.replace(`data:${mimeType};base64,`, "");

            var oModel = this._oProfileDialog.getModel("profileData");
            oModel.setProperty("/fileName", imageName);
            oModel.setProperty("/fileType", mimeType);
            oModel.setProperty("/fileContent", rawBase64);

            // Add this to update UI avatar
            oModel.setProperty("/photo", base64Image);

            // Upload to backend
            this.updateUserPhoto({
                fileName: imageName,
                fileType: mimeType,
                fileContent: rawBase64
            });

            this._StopCamera();
            this.oCameraDialog.close();
        },

        IC_onPressCloseCameraDialog: function () {
            this._StopCamera();
            if (this.oCameraDialog) {
                this.oCameraDialog.close();
            }
        },

        onUploadPhoto: function () {
            const uploader = sap.ui.getCore().byId("fileUploaderAvatar");
            if (!uploader) return;

            setTimeout(() => {
                const oInput = uploader.getFocusDomRef();
                if (!oInput) {
                    console.error("Uploader input not ready");
                    return;
                }
                uploader.clear();
                uploader.setValue("");
                oInput.value = "";
                oInput.accept = "image/*";
                oInput.capture = "";   // remove camera request → gallery
                oInput.click();
            }, 200);
        },

        onAvatarFileSelected: function (oEvent) {
            const file = oEvent.getParameter("files")[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                const fullDataURL = e.target.result;
                const base64 = fullDataURL.split(",")[1]; // remove prefix

                const oModel = this._oProfileDialog.getModel("profileData");
                oModel.setProperty("/photo", fullDataURL);
                await this.updateUserPhoto({
                    fileName: file.name,
                    fileType: file.type,
                    fileContent: base64
                });
            };
            reader.readAsDataURL(file);
        },

        onRemovePhoto: async function () {
            const oModel = this._oProfileDialog.getModel("profileData");
            const initials = oModel.getProperty("/initials");

            oModel.setProperty("/photo", "");
            oModel.setProperty("/initials", initials);
            await this.updateUserPhoto({
                fileName: "",
                fileType: "",
                fileContent: ""
            });
        },

        updateUserPhoto: async function ({ fileName, fileType, fileContent }) {
            try {
                const sUserID = this._oLoggedInUser?.UserID;
                if (!sUserID) {
                    sap.m.MessageToast.show("User not logged in");
                    return;
                }
                const payload = {
                    data: {
                        FileName: fileName,
                        FileType: fileType,
                        FileContent: fileContent
                    },
                    filters: { UserID: sUserID }
                };
                await this.ajaxUpdateWithJQuery("HM_Login", payload);
                this._oLoggedInUser.FileContent = fileContent;
                this._oLoggedInUser.Photo = "data:image/png;base64," + fileContent;

                sap.m.MessageToast.show("Profile photo updated!");

            } catch (err) {
                console.error(err);
                sap.m.MessageToast.show("Failed to update profile photo");
            }
        },

        onPreviewProfilePhoto: function () {
            const sPhoto = this._oProfileDialog.getModel("profileData").getProperty("/photo");
            if (!sPhoto) {
                sap.m.MessageToast.show("No profile photo available");
                return;
            }
            if (!this._oPreviewDialog) {
                this._oPreviewDialog = new sap.m.Dialog({
                    title: "Profile Photo",
                    contentWidth: "300px",
                    contentHeight: "300px",
                    verticalScrolling: true,
                    content: new sap.m.Image({
                        id: "previewProfileImage",
                        width: "300px",
                        height: "300px",
                        src: ""
                    }),
                    beginButton: new sap.m.Button({
                        text: "Close",
                        press: () => this._oPreviewDialog.close()
                    })
                });
                this.getView().addDependent(this._oPreviewDialog);
            }
            sap.ui.getCore().byId("previewProfileImage").setSrc(sPhoto);
            this._oPreviewDialog.open();
        },
        // onSignIn: async function () {

        //     const vm = this.getView().getModel("LoginViewModel");
        //     const isOTP = vm.getProperty("/isOtpSelected");

        //     const sUserid = sap.ui.getCore().byId("signInuserid").getValue().trim();
        //     const sUsername = sap.ui.getCore().byId("signInusername").getValue().trim();
        //     const sPassword = sap.ui.getCore().byId("signinPassword").getValue().trim();
        //     const sOTP = sap.ui.getCore().byId("signInOTP").getValue().trim();

        //     // 🔐 Common mandatory fields (UserID + UserName)
        //     if (!utils._LCvalidateMandatoryField(sap.ui.getCore().byId("signInuserid"), "ID") ||
        //         !utils._LCvalidateMandatoryField(sap.ui.getCore().byId("signInusername"), "ID")) {
        //         sap.m.MessageToast.show("Enter valid User ID and User Name");
        //         return;
        //     }

        //     // 📌 LOGIN WITH OTP MODE
        //     if (isOTP) {

        //         // OTP must be entered
        //         if (!sOTP) {
        //             sap.m.MessageToast.show("Enter OTP to Login");
        //             return;
        //         }

        //         const isValid = await this._verifyOTPWithBackend(sOTP);
        //         if (!isValid) {
        //             sap.m.MessageToast.show("Incorrect OTP");
        //             return;
        //         }

        //         // OTP Verified → Login using backend
        //         const resp = await $.ajax({
        //             url: "https://rest.kalpavrikshatechnologies.com/HM_Login",
        //             method: "GET",
        //             contentType: "application/json",
        //             headers: {
        //                 name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
        //                 password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
        //             },
        //             data: {
        //                 UserID: sUserid,
        //                 UserName: sUsername,
        //                 OTP: sOTP
        //             }
        //         });

        //         sap.m.MessageToast.show("Login Successful!");
        //         this._setLoggedInUser(resp.data[0]);
        //         this._resetAllAuthFields();
        //         this._oSignDialog.close();
        //         return; // done
        //     }

        //     // 🔐 LOGIN WITH PASSWORD MODE
        //     if (!utils._LCvalidatePassword(sap.ui.getCore().byId("signinPassword"))) {
        //         sap.m.MessageToast.show("Enter valid password");
        //         return;
        //     }

        //     try {
        //         const payload = {
        //             UserID: sUserid,
        //             UserName: sUsername,
        //             Password: btoa(sPassword)
        //         };

        //         sap.ui.core.BusyIndicator.show(0);
        //         const oResponse = await this.ajaxReadWithJQuery("HM_Login", payload);
        //         const aUsers = oResponse.data[0] || [];

        //         if (!aUsers?.UserID) {
        //             sap.m.MessageToast.show("Invalid credentials");
        //             return;
        //         }

        //         sap.m.MessageToast.show("Login Successful!");
        //         this._setLoggedInUser(aUsers);
        //         this._resetAllAuthFields();
        //         this._oSignDialog.close();

        //     } catch (err) {
        //         sap.ui.core.BusyIndicator.hide();
        //         sap.m.MessageToast.show(err.message || "Login failed");
        //     } finally {
        //         sap.ui.core.BusyIndicator.hide();
        //     }
        // },

        onSigninPasswordLive: function (oEvent) {
            utils._LCvalidatePassword(oEvent.getSource());
        },
        onSignIn: async function () {

            const vm = this.getView().getModel("LoginViewModel");
            // const isOTP = vm.getProperty("/isOtpSelected");
            const isOTP = vm.getProperty("/loginMode") === "otp";


            const oLoginModel = this.getView().getModel("LoginModel");

            const sUserid = sap.ui.getCore().byId("signInuserid").getValue().trim();
            const sUsername = sap.ui.getCore().byId("signInusername").getValue().trim();
            const sPassword = sap.ui.getCore().byId("signinPassword").getValue().trim();
            const sOTP = sap.ui.getCore().byId("signInOTP").getValue().trim();

            // Common mandatory fields
            if (!utils._LCvalidateMandatoryField(sap.ui.getCore().byId("signInuserid"), "ID") ||
                !utils._LCvalidateMandatoryField(sap.ui.getCore().byId("signInusername"), "ID")) {
                sap.m.MessageToast.show("Enter valid User ID and Name");
                return;
            }

            try {
                sap.ui.core.BusyIndicator.show(0);

                let payload, oResponse;

                // ----------------------------- OTP MODE -----------------------------
                // ----------------------------- OTP MODE -----------------------------
                if (isOTP) {

                    const vm = this.getView().getModel("LoginViewModel");
                    const showOTPField = vm.getProperty("/showOTPField");
                    const isOtpEntered = vm.getProperty("/isOtpEntered");

                    const otpCtrl = sap.ui.getCore().byId("signInOTP");

                    // 1️⃣ OTP has NOT been generated
                    if (!showOTPField) {
                        sap.m.MessageToast.show("Please generate OTP first.");
                        return;
                    }

                    // 2️⃣ OTP was generated but user has not typed anything
                    if (!isOtpEntered) {
                        otpCtrl.setValueState("Error");
                        otpCtrl.setValueStateText("Enter valid 6-digit OTP");
                        sap.m.MessageToast.show("Enter a valid 6-digit OTP");
                        return;
                    }

                    // 3️⃣ Validate OTP format strictly
                    if (!/^\d{6}$/.test(sOTP)) {
                        otpCtrl.setValueState("Error");
                        otpCtrl.setValueStateText("Enter a valid 6-digit OTP");
                        sap.m.MessageToast.show("Enter a valid 6-digit OTP");
                        return;
                    }

                    // 4️⃣ Backend verification
                    const isValid = await this._verifyOTPWithBackend(sOTP);
                    if (!isValid) {
                        sap.m.MessageToast.show("Incorrect OTP");
                        return;
                    }

                    // 5️⃣ Construct payload and continue login
                    payload = { UserID: sUserid, UserName: sUsername, OTP: sOTP };
                    oResponse = await this.ajaxReadWithJQuery("HM_Login", payload);
                }
                else {
                    // -------------------------- PASSWORD MODE -------------------------
                    const passCtrl = sap.ui.getCore().byId("signinPassword");

                    // Required
                    if (!sPassword) {
                        passCtrl.setValueState("Error");
                        passCtrl.setValueStateText("Password is required");
                        sap.m.MessageToast.show("Password is required");
                        return;
                    }

                    // Format validation
                    if (!utils._LCvalidatePassword(passCtrl)) {
                        passCtrl.setValueState("Error");
                        passCtrl.setValueStateText("Enter a valid password");
                        sap.m.MessageToast.show("Enter a valid password");
                        return;
                    }

                    // If valid
                    passCtrl.setValueState("None");

                    if (!utils._LCvalidatePassword(sap.ui.getCore().byId("signinPassword"))) {
                        sap.m.MessageToast.show("Enter valid password");
                        return;
                    }

                    payload = {
                        UserID: sUserid,
                        UserName: sUsername,
                        Password: btoa(sPassword)
                    };

                    oResponse = await this.ajaxReadWithJQuery("HM_Login", payload);

                }

                // ---------------------------- HANDLE RESPONSE ----------------------------
                const user = oResponse?.data?.[0];
                if (!user?.UserID) {
                    sap.m.MessageToast.show("Invalid credentials");
                    return;
                }

                // sap.m.MessageToast.show("Login Successful!");

                // Global access + Model update
                this._oLoggedInUser = user;
                oLoginModel.setProperty("/EmployeeID", user.UserID);
                oLoginModel.setProperty("/EmployeeName", user.UserName);
                oLoginModel.setProperty("/EmailID", user.EmailID);
                oLoginModel.setProperty("/Role", user.Role);
                oLoginModel.setProperty("/BranchCode", user.BranchCode || "");
                oLoginModel.setProperty("/MobileNo", user.MobileNo || "");
                oLoginModel.setProperty("/DateofBirth", this.Formatter.DateFormat(user.DateOfBirth) || "");

                // Role Based Access
                if (user.Role === "Customer") {
                    const oUserModel = new sap.ui.model.json.JSONModel(user);
                    sap.ui.getCore().setModel(oUserModel, "LoginModel");
                    this.getOwnerComponent().getModel("UIModel").setProperty("/isLoggedIn", true);
                    await this.onPressAvatar();
                } else if (user.Role === "Admin" || user.Role === "Employee") {
                    this.getOwnerComponent().getRouter().navTo("TilePage");
                } else {
                    sap.m.MessageToast.show("Invalid credentials found");
                    return;
                }

                // Reset login fields
                sap.ui.getCore().byId("signInusername").setValue("");
                sap.ui.getCore().byId("signinPassword").setValue("");
                sap.ui.getCore().byId("signInOTP").setValue("");

                // Close dialog
                if (this._oSignDialog) {
                    this._oSignDialog.close();
                }

            } catch (err) {
                sap.m.MessageToast.show(err.message || "Invalid credentials, Please try again");
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },


        onChange: function (oEvent) {
            const oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

        onDateChange: function (oEvent) {
            const oInput = oEvent.getSource();
            utils._LCvalidateDate(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None");
        },

         onCountrySelectionChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
            const oModel =
                this._oProfileEditDialog?.getModel("profileData") ||
                this._oProfileDialog.getModel("profileData");

            const oStateCB = sap.ui.getCore().byId("id_state");
            const oCityCB = sap.ui.getCore().byId("id_city");
            const oSTD = sap.ui.getCore().byId("id_std");

            const oItem = oEvent.getSource().getSelectedItem();
            if (!oItem) return;

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
            utils._LCvalidateMandatoryField(oEvent);
            const oModel =
                this._oProfileEditDialog?.getModel("profileData") ||
                this._oProfileDialog?.getModel("profileData");

            const oCityCB = sap.ui.getCore().byId("id_city");
            const oCountryCB = sap.ui.getCore().byId("id_country");
            const oItem = oEvent.getSource().getSelectedItem();

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
    });
});
