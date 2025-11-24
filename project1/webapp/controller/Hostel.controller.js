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

                    let city = data.address.city
                        || data.address.town
                        || data.address.village
                        || data.address.municipality;

                    let state = data.address.state;
                    let country = data.address.country;

                    console.log("City:", city);
                    console.log("State:", state);
                    console.log("Country:", country);

                    console.log("Full Location:", `${city}, ${state}, ${country}`);

                    this.City = city
                },
                error: (err) => {
                    console.error("Reverse geocoding failed", err);
                }
            });
        }
        ,
        _onRouteMatched: async function () {
            const oView = this.getView();

            // 1️⃣ Login model setup
            const omodel = new JSONModel({
                url: "https://rest.kalpavrikshatechnologies.com/",
                headers: {
                    name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                    password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
                    "Content-Type": "application/json"
                },
                isRadioVisible: false
            });
            this.getOwnerComponent().setModel(omodel, "LoginModel");

            // 2️⃣ Disable controls initially
            this.byId("id_Branch").setEnabled(true);
            this.byId("id_Area").setEnabled(true);
            this.byId("id_Roomtype").setEnabled(true);

            // 3️⃣ Hide avatar initially
            const oAvatar = oView.byId("ProfileAvatar");
            if (oAvatar) oAvatar.setVisible(false);

            // 4️⃣ Create all static local models
            oView.setModel(new sap.ui.model.json.JSONModel({
                CustomerName: "",
                MobileNo: "",
                Gender: "",
                DateOfBirth: "",
                CustomerEmail: "",
                RoomType: ""
            }), "HostelModel");

            oView.setModel(new sap.ui.model.json.JSONModel({
                items: [
                    { title: "My Profile", icon: "sap-icon://person-placeholder", key: "profile" },
                    { title: "Booking History", icon: "sap-icon://connected", key: "devices" },
                    { title: "Logout", icon: "sap-icon://log", key: "logout" }
                ]
            }), "profileMenuModel");

            oView.setModel(new JSONModel({ isEditMode: false }), "saveModel");
            oView.setModel(new JSONModel({ isOtpSelected: false, isPasswordSelected: true }), "LoginViewModel");
            oView.setModel(new JSONModel({ fullname: "", Email: "", Mobileno: "", password: "", comfirmpass: "" }), "LoginMode");
            oView.setModel(new JSONModel({ selectedSection: "profile" }), "profileSectionModel");

            // 5️⃣ Hardcoded branches (initial fallback)
            const aBranches = [
                { BranchCode: "KLB01", BranchName: "Kalaburagi" },
                { BranchCode: "BR002", BranchName: "Mumbai" },
                { BranchCode: "BR003", BranchName: "Nagpur" },
                { BranchCode: "BR004", BranchName: "Nashik" }
            ];
            oView.setModel(new JSONModel({ Branches: aBranches }), "BranchModel");
        },

        CustomerDetails: async function () {
            try {
                const oData = await this.ajaxReadWithJQuery("HM_Customer", {});
                const aCustomers = Array.isArray(oData.Customers) ? oData.Customers : [oData.Customers];

                const oCustomerModel = new JSONModel(aCustomers);
                this.getView().setModel(oCustomerModel, "CustomerModel");

                console.log("Customer details loaded successfully");
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

                //  Call backend to get all room data
                const oResponse = await this.ajaxReadWithJQuery("HM_Rooms", {});
                const aRooms = oResponse?.commentData || [];
                const oRoomModel = new JSONModel({
                    Rooms: aRooms
                });
                //  Bind model to the view
                oView.setModel(oRoomModel, "RoomCountModel");


            } catch (err) {
                console.error("Error reading rooms:", err);
                sap.m.MessageToast.show("Failed to load room data.");
            }
        },

        _loadBranchCode: async function () {
            try {
                const oView = this.getView();

                const oResponse = await this.ajaxReadWithJQuery("HM_Branch", {});

                const aBranches = Array.isArray(oResponse?.data)
                    ? oResponse.data
                    : (oResponse?.data ? [oResponse.data] : []);

                const oBranchModel = new sap.ui.model.json.JSONModel(aBranches);
                oView.setModel(oBranchModel, "sBRModel");
                this._populateUniqueFilterValues(aBranches);


                console.log("oBranchModel:", oBranchModel.getData());
                console.log("Branch data loaded successfully");
            } catch (err) {
                console.error("Error while loading branch data:", err);
            }
        },
        _populateUniqueFilterValues: function (data) {
            let uniqueValues = {
                id_Branch: new Set(),

            };

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



        //         _loadFilteredData: async function (sBranchCode, sACType) {

        //     try {
        //         const oView = this.getView();
        //         // Call backend to get all room data for this branch
        //         const response = await this.ajaxReadWithJQuery("HM_BedType", {
        //             BranchCode: sBranchCode
        //         });

        //         const allRooms = response?.data || [];

        //         //  Apply BOTH filters: BranchCode + ACType (if ACType provided)
        //         const matchedRooms = allRooms.filter(room => {
        //             const branchMatch =
        //                 room.BranchCode &&
        //                 room.BranchCode.toLowerCase() === sBranchCode.toLowerCase();

        //             const acTypeMatch = sACType
        //                 ? room.ACType &&
        //                   room.ACType.toLowerCase() === sACType.toLowerCase()
        //                 : true; // if no ACType selected, match all

        //             return branchMatch && acTypeMatch;
        //         });

        //         // Identify room types
        //         const singleRoom = matchedRooms.find(room => room.Name === "Single Bed");
        //         const doubleRoom = matchedRooms.find(room => room.Name === "Double Bed");
        //         const fourRoom = matchedRooms.find(room => room.Name === "Four Bed");

        //         // Base64 image helper
        //         const convertBase64ToImage = (base64String, fileType) => {
        //             if (!base64String) return "./image/Fallback.png";
        //             let sBase64 = base64String.replace(/\s/g, "");
        //             try {
        //                 if (!sBase64.startsWith("iVB") && !sBase64.startsWith("data:image")) {
        //                     const decoded = atob(sBase64);
        //                     if (decoded.startsWith("iVB")) sBase64 = decoded;
        //                 }
        //             } catch (e) {
        //                 console.warn("Base64 decode error:", e);
        //             }
        //             const mimeType = fileType || "image/jpeg";
        //             if (sBase64.startsWith("data:image")) return sBase64;
        //             return `data:${mimeType};base64,${sBase64}`;
        //         };

        //         // Prepare VisibilityModel
        //         const oVisibilityData = {

        //             singleName: singleRoom?.Name || "Single Bed",
        //             doubleName: doubleRoom?.Name || "Double Bed",
        //             fourName: fourRoom?.Name || "Four Bed",
        //             singleVisible: !!singleRoom,
        //             doubleVisible: !!doubleRoom,
        //             fourVisible: !!fourRoom,
        //             singleDesc: singleRoom?.Description || "",
        //             doubleDesc: doubleRoom?.Description || "",
        //             fourDesc: fourRoom?.Description || "",
        //             singlePrice: singleRoom?.Price || "",
        //             doublePrice: doubleRoom?.Price || "",
        //             fourPrice: fourRoom?.Price || "",
        //             singleImg: singleRoom?.RoomPhotos
        //                 ? convertBase64ToImage(singleRoom.RoomPhotos, singleRoom.MimeType || singleRoom.FileType)
        //                 : "./image/SingleBed.png",
        //             doubleImg: doubleRoom?.RoomPhotos
        //                 ? convertBase64ToImage(doubleRoom.RoomPhotos, doubleRoom.MimeType || doubleRoom.FileType)
        //                 : "./image/DoubleBed.png",
        //             fourImg: fourRoom?.RoomPhotos
        //                 ? convertBase64ToImage(fourRoom.RoomPhotos, fourRoom.MimeType || fourRoom.FileType)
        //                 : "./image/4Bed.png"
        //         };

        //         // Bind models
        //         oView.setModel(new JSONModel(oVisibilityData), "VisibilityModel");
        //         oView.setModel(new JSONModel({ Rooms: matchedRooms }), "RoomModel");

        //     } catch (error) {
        //         console.error("Data Load Failed:", error);
        //         sap.m.MessageToast.show("Error fetching room data.");
        //     }
        // },
        // _loadFilteredData: async function (sBranchCode, sACType) {
        //     try {
        //         const oView = this.getView();

        //         // 🔹 Fetch all bed type data for selected branch
        //         const response = await this.ajaxReadWithJQuery("HM_BedType", {
        //             BranchCode: sBranchCode
        //         });

        //         const allRooms = response?.data || [];

        //         // 🔹 Filter based on BranchCode + ACType
        //         const matchedRooms = allRooms.filter(room => {
        //             const branchMatch =
        //                 room.BranchCode &&
        //                 room.BranchCode.toLowerCase() === sBranchCode.toLowerCase();

        //             const acTypeMatch = sACType
        //                 ? room.ACType &&
        //                   room.ACType.toLowerCase() === sACType.toLowerCase()
        //                 : true;

        //             return branchMatch && acTypeMatch;
        //         });

        //         // 🔹 Extract unique bed types (avoid duplicates)
        //         const uniqueRooms = [];
        //         const seenNames = new Set();
        //         matchedRooms.forEach(room => {
        //             const key = room.Name?.trim().toLowerCase();
        //             if (key && !seenNames.has(key)) {
        //                 seenNames.add(key);
        //                 uniqueRooms.push(room);
        //             }
        //         });

        //         // 🔹 Safe Base64 image converter
        //           const convertBase64ToImage = (base64String, fileType) => {
        //             if (!base64String) return "./image/Fallback.png";
        //             let sBase64 = base64String.replace(/\s/g, "");
        //             try {
        //                 if (!sBase64.startsWith("iVB") && !sBase64.startsWith("data:image")) {
        //                     const decoded = atob(sBase64);
        //                     if (decoded.startsWith("iVB")) sBase64 = decoded;
        //                 }
        //             } catch (e) {
        //                 console.warn("Base64 decode error:", e);
        //             }
        //             const mimeType = fileType || "image/jpeg";
        //             if (sBase64.startsWith("data:image")) return sBase64;
        //             return `data:${mimeType};base64,${sBase64}`;
        //         };

        //         // 🔹 Prepare array for cards (dynamic binding)
        //         const aBedTypes = uniqueRooms.map(room => ({
        //             Name: room.Name,
        //             Description: room.Description || "",
        //             Price: room.Price
        //                 ? "₹ " + room.Price + " / month"
        //                 : "",
        //             Image: convertBase64ToImage(
        //                 room.RoomPhotos,
        //                 room.MimeType || room.FileType
        //             )
        //         }));

        //         // 🔹 Bind model for dynamic UI
        //         oView.setModel(
        //             new sap.ui.model.json.JSONModel({ BedTypes: aBedTypes }),
        //             "VisibilityModel"
        //         );
        //     } catch (err) {
        //         console.error("Error loading data:", err);
        //         sap.m.MessageToast.show("Failed to load bed type data.");
        //     }
        // },

        onSelectPricePlan: function (oEvent) {
            const oTile = oEvent.getSource();
            const sType = oTile.data("type"); // "daily", "monthly", or "yearly"
            const oView = this.getView();
            const oModel = oView.getModel("HostelModel");
            const oData = oModel.getData();
            const sCurrency = oData.Currency || "INR";
            // Define mapping between tile type → model property
            const mPriceMap = {
                daily: "Price",
                monthly: "MonthPrice",
                yearly: "YearPrice"
            };
            // Safely pick the right price
            const sPriceKey = mPriceMap[sType];
            const sPriceValue = sPriceKey ? oData[sPriceKey] : "N/A";
            // Clear any previously selected plan(for visual and logical consistency)
            oModel.setProperty("/SelectedPriceType", "");
            oModel.setProperty("/SelectedPriceValue", "");

            // Update the model with only the chosen plan
            oModel.setProperty("/SelectedPriceType", sType);
            oModel.setProperty("/SelectedPriceValue", sPriceValue);
            oModel.setProperty("/SelectedCurrency", sCurrency);

            // --- VISUAL FEEDBACK SECTION ---
            const oParent = oTile.getParent();
            let aSiblings = [];

            if (oParent.getItems) {
                aSiblings = oParent.getItems(); // HBox/VBox/List/Grid
            } else if (oParent.getContent) {
                aSiblings = oParent.getContent(); // layout controls
            }

            // Remove highlight from all other tiles
            aSiblings.forEach(oItem => {
                if (oItem.removeStyleClass) {
                    oItem.removeStyleClass("selectedTile");
                    oItem.addStyleClass("defaultTile");
                }
            });
            // Add selection highlight to current one
            oTile.removeStyleClass("defaultTile");
            oTile.addStyleClass("selectedTile");
            // User feedback
            sap.m.MessageToast.show(
                `Selected ${sType.charAt(0).toUpperCase() + sType.slice(1)} plan — ${sCurrency} ${sPriceValue}`
            );
        },





        onConfirmBooking: function () {
            const oView = this.getView();
            const oLocalModel = oView.getModel("HostelModel"); // Local model bound to dialog
            const oData = oLocalModel?.getData?.() || {};

            if (!oData.SelectedPriceType || !oData.SelectedPriceValue) {
                sap.m.MessageToast.show("Please select a pricing plan before booking.");
                return;
            }

            // 1️⃣ Get or create global model
            let oGlobalModel = sap.ui.getCore().getModel("HostelModel");
            if (!oGlobalModel) {
                oGlobalModel = new sap.ui.model.json.JSONModel({});
                sap.ui.getCore().setModel(oGlobalModel, "HostelModel");
            }

            // 2️⃣ Build booking data
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
                Status: "Pending"
            };

            // 3️⃣ Merge and clean
            const oMergedData = {
                ...oGlobalModel.getData(),
                ...oBookingData
            };

            delete oMergedData.Price;
            delete oMergedData.MonthPrice;
            delete oMergedData.YearPrice;

            // ✅ 4️⃣ Dynamically create dropdown items for Capacity
            const iCapacity = oMergedData.Capacity || 1;
            const aPersonsList = Array.from({ length: iCapacity }, (_, i) => ({
                key: (i + 1).toString(),
                text: (i + 1).toString()
            }));

            // Set dynamic list to model (for ComboBox binding)
            oMergedData.NoOfPersonsList = aPersonsList;

            //  Update global model
            oGlobalModel.setData(oMergedData, true);

            sap.m.MessageToast.show(
                `Booking prepared for ${oData.BedType || "Room"} (${oData.SelectedPriceType} plan)`
            );

            // Close dialog
            if (this._oRoomDetailFragment) {
                this._oRoomDetailFragment.close();   // close FIRST
            }

            this._clearRoomDetailDialog();



            // this._clearRoomDetailDialog();
            // if (this._oRoomDetailFragment) this._oRoomDetailFragment.close();

            // ✅ 6️⃣ Navigate to booking view
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteBookRoom");
        },




        // BedTypedetails: async function () {
        //     try {
        //         const oResponse = await this.ajaxReadWithJQuery("HM_BedType", "");
        //         const aData = Array.isArray(oResponse?.data) ? oResponse.data : [];
        //         const oBedTypeModel = new sap.ui.model.json.JSONModel(aData);
        //         this.getView().setModel(oBedTypeModel, "BedTypeModel");
        //         console.log("Bed Type details loaded successfully", aData);
        //     } catch (err) {
        //         console.error("❌ Failed to load BedType details:", err);
        //     }
        // },




        // _getBedTypeImages: async function (sBedTypeID) {
        //     try {
        //         if (!sBedTypeID) {
        //             console.warn("⚠️ No BedType ID provided for image lookup");
        //             return [sap.ui.require.toUrl("sap/ui/com/project1/image/no-image.png")];
        //         }

        //         // 🔹 Initialize cache store (first-time)
        //         this._imageCache = this._imageCache || {};

        //         // 🔹 Serve from cache if available
        //         if (this._imageCache[sBedTypeID]) {
        //             console.log(`🧠 Cached images returned for BedType ID: ${sBedTypeID}`);
        //             return this._imageCache[sBedTypeID];
        //         }

        //         // 🔹 Fetch from backend
        //         const oResponse = await this.ajaxReadWithJQuery("HM_BedTypeDetails", {
        //             filters: { ID: sBedTypeID }
        //         });
        //         console.log("🧾 HM_BedTypeDetails raw response:", oResponse);

        //         const oData = Array.isArray(oResponse?.data)
        //             ? oResponse.data.find(item => item.ID === sBedTypeID)
        //             : oResponse?.data;

        //         if (!oData) {
        //             console.warn("⚠️ No image data returned for BedType ID:", sBedTypeID);
        //             return [sap.ui.require.toUrl("sap/ui/com/project1/image/no-image.png")];
        //         }

        //         // 🔹 Extract Photo1–Photo5 safely
        //         const aImages = [];
        //         for (let i = 1; i <= 5; i++) {
        //             const sPhoto = oData[`Photo${i}`];
        //             const sType = oData[`Photo${i}Type`] || "image/jpeg";
        //             if (sPhoto && sPhoto.trim() !== "") {
        //                 const sDataUrl = sPhoto.startsWith("data:image")
        //                     ? sPhoto
        //                     : `data:${sType};base64,${sPhoto.trim()}`;
        //                 aImages.push(sDataUrl);
        //             }
        //         }

        //         // 🔹 If empty, use fallback
        //         const aFinal = aImages.length
        //             ? aImages
        //             : [sap.ui.require.toUrl("sap/ui/com/project1/image/no-image.png")];

        //         console.log(`📸 Extracted ${aFinal.length} images for BedType ID: ${sBedTypeID}`);

        //         // 🔹 Cache it
        //         this._imageCache[sBedTypeID] = aFinal;

        //         return aFinal;
        //     } catch (err) {
        //         console.error("❌ Error fetching bed type images:", err);
        //         return [sap.ui.require.toUrl("sap/ui/com/project1/image/no-image.png")];
        //     }
        // },




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


            console.log("🧨 Fragment destroyed — fresh state guaranteed.");
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

            if (this._carouselInterval) {
                clearInterval(this._carouselInterval);
                this._carouselInterval = null;
            }

            const that = this;
            setTimeout(() => {
                that._carouselInterval = setInterval(() => {
                    const aPages = oCarousel.getPages();
                    if (aPages.length <= 1) return;

                    const sCurrent = oCarousel.getActivePage();
                    const oCurrent = sap.ui.getCore().byId(sCurrent);
                    if (!oCurrent) return;

                    const iIndex = aPages.indexOf(oCurrent);
                    const iNext = (iIndex + 1) % aPages.length;

                    oCarousel.setActivePage(aPages[iNext]);

                }, 3500);
            }, 400);
        },






        _LoadFacilities: function (sBranchCode) {
            const oView = this.getView();
            if (!this._oRoomDetailFragment) return; // Safety check

            if (!sBranchCode) return;

            // Set loading state ON for facility container
            // const oFacilityModel = oView.getModel("FacilityModel");
            // 🎯 Get the model directly from the fragment
            const oFacilityModel = this._oRoomDetailFragment.getModel("FacilityModel");
            if (!oFacilityModel) return; // Model might not be set yet

            oFacilityModel.setProperty("/loading", true);
            this.ajaxReadWithJQuery("HM_Facilities", { BranchCode: sBranchCode })
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
                    SelectedPriceValue: ""
                };
                console.log(" oSelected.BranchCode  oSelected.BranchCode  oSelected.BranchCode ", oSelected.BranchCode);

                // Set HostelModel
                const oHostelModel = new sap.ui.model.json.JSONModel(oFullDetails);
                oView.setModel(oHostelModel, "HostelModel");
                console.log("oHostelModel:", oHostelModel.getData());

                // Always set an EMPTY FacilityModel BEFORE opening fragment
                // oView.setModel(new sap.ui.model.json.JSONModel({ Facilities: [] }), "FacilityModel");


                oView.setModel(new sap.ui.model.json.JSONModel({ loading: true, Facilities: [] }), "FacilityModel");

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
                console.error("❌ viewDetails error:", err);
            }
        },

        _LoadAmenities: async function (sBranchCode) {
            console.log("📌 Amenity load for branch:", sBranchCode); //      sBranchCode
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
                ImageSrc: item.Photo1
                    ? `data:${item.Photo1Type || "image/jpeg"};base64,${item.Photo1}`
                    : ""
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
            }

            else {
                console.warn("⚠️ Final fallback image also failed to load:", sFallback);
            }
        },




        onCloseRoomDetail: function () {
            if (this._oRoomDetailFragment) {
                this._oRoomDetailFragment.close();   // close FIRST
            }

            this._clearRoomDetailDialog();           // destroy AFTER
        },

        onDialogAfterClose: function () {
            if (this._oRoomDetailFragment) {
                this._oRoomDetailFragment.close();   // close FIRST
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

        //        onpressFilter: function () {
        //         var that = this;

        //     // Destroy old dialog (optional safety) if you want a fresh one each time
        //     if (this._oLocationDialog) {
        //         this._oLocationDialog.destroy();
        //         this._oLocationDialog = null;
        //     }

        //     // Create new dialog dynamically
        //     this._oLocationDialog = new sap.m.Dialog({
        //         title: "Search Rooms by Location",
        //         type: "Message",
        //         contentWidth: "400px",
        //         draggable: true,
        //         resizable: true,
        //         content: [
        //             new sap.m.VBox({
        //                 width: "100%",
        //                 items: [
        //                     new sap.m.Label({ text: "Select Location", labelFor: "idBranchCombo" }),
        //                     new sap.m.ComboBox("idBranchCombo", {
        //                         width: "100%",
        //                         placeholder: "Select City...",
        //                         items: {
        //                             path: "sBRModel>/",
        //                             template: new sap.ui.core.Item({
        //                                 key: "{sBRModel>BranchID}",
        //                                 text: "{sBRModel>Name}"
        //                             })
        //                         }
        //                     }),

        //                     //  This section (AC Type ComboBox) only visible if user is logged in
        //                     new sap.m.Label("idACLabel", {
        //                         text: "Select Bed Type",
        //                         // visible: !!that._oLoggedInUser // dynamically controlled
        //                     }),
        //                     new sap.m.ComboBox("idACTypeCombo", {
        //                         width: "100%",
        //                         placeholder: "Select Bed Type...",
        //                         // visible: !!that._oLoggedInUser, // show only if logged in
        //                         items: {
        //                               path: "RoomCountModel>/Rooms",
        //                             template: new sap.ui.core.Item({
        //                                 key: "{RoomCountModel>BranchCode}",
        //                                 text: "{RoomCountModel>BedTypeName}"
        //                             })
        //                         }
        //                     }), 

        //                     new sap.m.Button({
        //                         text: "Search",
        //                         type: "Emphasized",
        //                         icon: "sap-icon://search",
        //                         press: function () {
        //                             that.onSearchRooms();
        //                         }
        //                     })
        //                 ]
        //             })
        //         ]
        //     });

        //     this.getView().addDependent(this._oLocationDialog);
        //     this._oLocationDialog.open();
        // },


        onpressBookrooms: function () {
            var oTabHeader = this.byId("mainTabHeader");
            oTabHeader.setSelectedKey("idRooms");
            this.byId("pageContainer").to(this.byId("idRooms"));

            var page = this.byId("idRooms");
            if (page && page.scrollTo) page.scrollTo(0, 0);

            var that = this;

            // --- Create popup dynamically ---
            // if (!this._oLocationDialog) {
            //     this._oLocationDialog = new sap.m.Dialog({
            //         title: "Search Rooms by Location",
            //         type: "Message",
            //         contentWidth: "400px",
            //         draggable: true,
            //         resizable: true,
            //         content: [
            //             new sap.m.VBox({
            //                 width: "100%",
            //                 items: [
            //                     new sap.m.Label({ text: "Select Location", labelFor: "idBranchCombo" }),
            //                     new sap.m.ComboBox("idBranchCombo", {
            //                         width: "100%",
            //                         placeholder: "Select City...",
            //                         items: {
            //                             path: "BranchModel>/Branches",
            //                             template: new sap.ui.core.Item({
            //                                 key: "{BranchModel>BranchCode}",
            //                                 text: "{BranchModel>BranchName}"
            //                             })
            //                         }
            //                     }),

            //                     //  Add AC Type ComboBox
            //                     new sap.m.Label({ text: "AC Type", labelFor: "idACTypeCombo" }),
            //                     new sap.m.ComboBox("idACTypeCombo", {
            //                         width: "100%",
            //                         placeholder: "Select AC Type...",
            //                         items: [
            //                             new sap.ui.core.Item({ key: "AC", text: "AC Room" }),
            //                             new sap.ui.core.Item({ key: "Non-AC", text: "Non-AC Room" })
            //                         ]
            //                     }),

            //                     new sap.m.Button({
            //                         text: "Search",
            //                         type: "Emphasized",
            //                         icon: "sap-icon://search",
            //                         press: function () {
            //                             that.onSearchRooms();
            //                         }
            //                     })
            //                 ]
            //             })
            //         ]
            //     });

            //     this.getView().addDependent(this._oLocationDialog);
            // }

            // this._oLocationDialog.open();
        },

   

        onpressLogin: function () {
            if (!this._oSignDialog) {
                this._oSignDialog = sap.ui.xmlfragment(
                    "sap.ui.com.project1.fragment.SignInSignup",
                    this
                );
                this.getView().addDependent(this._oSignDialog);

                // Attach the reset logic to the afterClose event
                // This ensures cleanup happens whether closed by ESC key or button
                this._oSignDialog.attachAfterClose(this._resetAuthDialog, this);
            }

            // Always default to the Sign In panel
            const oSignInPanel = sap.ui.getCore().byId("signInPanel");
            const oSignUpPanel = sap.ui.getCore().byId("signUpPanel");
            if (oSignInPanel) oSignInPanel.setVisible(true);
            if (oSignUpPanel) oSignUpPanel.setVisible(false);


            this._oSignDialog.open();
            this._FragmentDatePickersReadOnly(["signUpDOB"]);

            const oDOB = sap.ui.getCore().byId("signUpDOB");
            const today = new Date();

            const maxDOB = new Date();  // Minimum age = 10
            maxDOB.setFullYear(today.getFullYear() - 10);

            const minDOB = new Date();  // Maximum age = 118
            minDOB.setFullYear(today.getFullYear() - 118);

            oDOB.setMaxDate(maxDOB);
            oDOB.setMinDate(minDOB);
            setTimeout(() => {
                const oGender = sap.ui.getCore().byId("signUpGender");
                if (oGender) oGender.setSelectedKey("");
            }, 0);

            return;
        },

        _resetAuthDialog: function () {
            const $C = (id) => sap.ui.getCore().byId(id);
            const oModel = this.getView().getModel("LoginMode");

            // 🔄 Reset Model Data
            oModel.setData({
                Salutation: "",
                fullname: "",
                Email: "",        // <<<<< Clear Email Model
                STDCode: "",
                Mobileno: "",
                password: "",     // <<<<< Clear Password Model
                comfirmpass: "",
                UserID: "",
                Gender: "",
                Country: "",
                State: "",
                City: "",
                Address: "",
                DateOfBirth: ""
            });

            // 🧹 Reset UI controls
            // 🧹 Reset Sign-Up controls
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

            // 🧹 Reset Sign-In controls
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


            // Reset to SignIn tab (if you want)
            const oVM = this.getView().getModel("LoginViewModel");
            oVM.setProperty("/selectedAccountType", "personal");
        },


        onDialogClose: function () {
            if (this._oSignDialog) this._oSignDialog.close();
        },


        _onFieldclear: function () {
            var ofield
        },
        onSwitchToSignIn: function () {
            var oSignInPanel = sap.ui.getCore().byId("signInPanel");
            var oSignUpPanel = sap.ui.getCore().byId("signUpPanel");
            oSignInPanel.setVisible(true);
            oSignUpPanel.setVisible(false);
        },

        onSwitchToSignUp: function () {
            var oSignInPanel = sap.ui.getCore().byId("signInPanel");
            var oSignUpPanel = sap.ui.getCore().byId("signUpPanel");
            oSignInPanel.setVisible(false);
            oSignUpPanel.setVisible(true);
        },
        onEmailliveChange: function (oEvent) {
            utils._LCvalidateEmail(oEvent);
        },


        SM_onTogglePasswordVisibility: function (oEvent) {
            var oInput = oEvent.getSource();
            var sType = oInput.getType() === "Password" ? "Text" : "Password";
            oInput.setType(sType);
            // Toggle the value help icon properly without losing the value
            var sIcon =
                sType === "Password" ? "sap-icon://show" : "sap-icon://hide";
            oInput.setValueHelpIconSrc(sIcon);
            // Ensure the current value of the password is retained
            var sCurrentValue = oInput.getValue();
            oInput.setValue(sCurrentValue);
        },
        SM_onChnageSetAndConfirm: function (oEvent) {
            utils._LCvalidatePassword(oEvent);
        },

        // onSignUp: async function () {


        //     const oModel = this.getView().getModel("LoginMode");
        //     const oData = oModel.getData();

        //     /* ========= CONTROL GETTER ========= */
        //     const $C = (id) => sap.ui.getCore().byId(id);

        //     /* ========= SEQUENTIAL VALIDATION (follow UI order) ========= */

        //     // 1) Salutation
        //     if (!utils._LCstrictValidationComboBox($C("signUpSalutation"), "ID")) return;

        //     // 2) Full Name
        //     if (!utils._LCvalidateName($C("signUpName"), "ID")) return;

        //     // 3) Email
        //     if (!utils._LCvalidateEmail($C("signUpEmail"), "ID")) return;

        //     // 4) Create Password
        //     if (!utils._LCvalidatePassword($C("signUpPassword"), "ID")) return;

        //     // 5) Confirm Password
        //     if ($C("signUpPassword").getValue() !== $C("signUpConfirmPassword").getValue()) {
        //         $C("signUpConfirmPassword").setValueState("Error");
        //         $C("signUpConfirmPassword").setValueStateText("Passwords do not match");
        //         sap.m.MessageToast.show("Passwords do not match");
        //         return;
        //     }
        //     $C("signUpConfirmPassword").setValueState("Success");

        //     /* ===== 6) Date of Birth + Age Check ===== */
        //     const oDOB = $C("signUpDOB");
        //     const dobValue = oDOB.getDateValue();

        //     if (!dobValue) {
        //         oDOB.setValueState("Error");
        //         oDOB.setValueStateText("Date of Birth is required");
        //         return;
        //     }

        //     // Prevent future dates
        //     const today = new Date();
        //     today.setHours(0, 0, 0, 0);
        //     if (dobValue > today) {
        //         oDOB.setValueState("Error");
        //         oDOB.setValueStateText("Future date not allowed");
        //         sap.m.MessageToast.show("Future date not allowed!");
        //         return;
        //     }

        //     // Age calculation
        //     let age = today.getFullYear() - dobValue.getFullYear();
        //     const m = today.getMonth() - dobValue.getMonth();
        //     if (m < 0 || (m === 0 && today.getDate() < dobValue.getDate())) age--;

        //     // Strict age limits: 10–118
        //     if (age < 10 || age > 118) {
        //         oDOB.setValueState("Error");
        //         oDOB.setValueStateText("Age must be between 10 and 118 years");
        //         sap.m.MessageToast.show("Age must be between 10 and 118 years");
        //         return;
        //     }

        //     // Valid age
        //     oDOB.setValueState("None");
        //     const DateOfBirth = dobValue.toISOString().split("T")[0];

        //     /* ===== 7) Gender Validation + Dr Rule ===== */
        //     const sSalutation = $C("signUpSalutation").getSelectedKey();
        //     const sGender = $C("signUpGender").getSelectedKey();

        //     if (sSalutation === "Dr." && !sGender) {
        //         $C("signUpGender").setValueState("Error");
        //         $C("signUpGender").setValueStateText("Please select gender");
        //         sap.m.MessageToast.show("Please select gender");
        //         return;
        //     }

        //     // Strict validation for Mr./Ms./Mrs.
        //     if (!utils._LCstrictValidationSelect($C("signUpGender"))) return;

        //     // 8) Country → State → City
        //     if (!utils._LCstrictValidationComboBox($C("signUpCountry"), "ID")) return;
        //     if (!utils._LCstrictValidationComboBox($C("signUpState"), "ID")) return;
        //     if (!utils._LCstrictValidationComboBox($C("signUpCity"), "ID")) return;

        //     // 9) Mobile Number (After location – correct UI order)
        //     if (!utils._LCstrictValidationComboBox($C("signUpSTD"), "ID")) return;
        //     const sSTD = $C("signUpSTD").getSelectedKey();
        //     if (!utils._LCvalidateInternationalMobileNumberWithSTD($C("signUpPhone"), sSTD)) return;

        //     // 10) Address
        //     const addrInput = $C("signUpAddress");
        //     const addr = addrInput.getValue().trim();
        //     if (!addr) {
        //         addrInput.setValueState("Error");
        //         addrInput.setValueStateText("Address is required");
        //         return;
        //     }
        //     if (addr.length < 8) {
        //         addrInput.setValueState("Error");
        //         addrInput.setValueStateText("Address must be at least 8 characters long");
        //         return;
        //     }


        //     /* ===================== 14) TIMESTAMP ======================== */
        //     const now = new Date();
        //     const TimeDate =
        //         `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ` +
        //         `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

        //     /* ===================== 15) FINAL PAYLOAD ==================== */
        //     const payload = {
        //         data: {
        //             Salutation: $C("signUpSalutation").getSelectedKey(),
        //             UserName: oData.fullname,
        //             Role: "Customer",
        //             EmailID: oData.Email,
        //             Password: btoa(oData.password),
        //             STDCode: oData.STDCode,
        //             MobileNo: oData.Mobileno,
        //             Status: "Active",
        //             TimeDate,
        //             DateOfBirth,
        //             Gender: $C("signUpGender").getSelectedKey(),
        //             Country: oData.Country,
        //             State: oData.State,
        //             City: oData.City,
        //             Address: oData.Address
        //         }
        //     };

        //     try {
        //         await this.ajaxCreateWithJQuery("HM_Login", payload);
        //         sap.m.MessageToast.show("Sign Up successful!");

        //         // oModel.setData({
        //         //     Salutation: "Mr.",
        //         //     fullname: "",
        //         //     Email: "",
        //         //     STDCode: "+91",
        //         //     Mobileno: "",
        //         //     password: "",
        //         //     comfirmpass: "",
        //         //     UserID: "",
        //         //     Gender: "",
        //         //     Country: "",
        //         //     State: "",
        //         //     City: "",
        //         //     Address: "",
        //         //     DateOfBirth: ""
        //         // });
        //         this._resetAuthDialog();
        //         this._oSignDialog.close();

        //     } catch (err) {
        //         sap.m.MessageToast.show("Sign Up failed!" + err);
        //         console.error("SignUp Error:", err);
        //     }
        // },



        onSignUp: async function () {

            const oModel = this.getView().getModel("LoginMode");
            const oData = oModel.getData();

            /* ========= CONTROL GETTER ========= */
            const $C = (id) => sap.ui.getCore().byId(id);

            /* =======================================================
             *                1) IDENTITY VALIDATION
             * ======================================================= */

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


            /* =======================================================
             *             2) CONTACT DETAILS VALIDATION
             * ======================================================= */

            // 5) Email
            if (!utils._LCvalidateEmail($C("signUpEmail"), "ID")) return;

            // 6) Country → State → City
            if (!utils._LCstrictValidationComboBox($C("signUpCountry"), "ID")) return;
            if (!utils._LCstrictValidationComboBox($C("signUpState"), "ID")) return;
            if (!utils._LCstrictValidationComboBox($C("signUpCity"), "ID")) return;

            // 7) Mobile Number
            if (!utils._LCstrictValidationComboBox($C("signUpSTD"), "ID")) return;
            const sSTD = $C("signUpSTD").getSelectedKey();
            if (!utils._LCvalidateInternationalMobileNumberWithSTD($C("signUpPhone"), sSTD)) return;


            /* =======================================================
             *             3) ADDRESS VALIDATION
             * ======================================================= */

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


            /* =======================================================
             *            4) ACCOUNT SECURITY VALIDATION
             * ======================================================= */

            // 8) Create Password
            if (!utils._LCvalidatePassword($C("signUpPassword"), "ID")) return;

            // 9) Confirm Password
            if ($C("signUpPassword").getValue() !== $C("signUpConfirmPassword").getValue()) {
                $C("signUpConfirmPassword").setValueState("Error");
                $C("signUpConfirmPassword").setValueStateText("Passwords do not match");
                sap.m.MessageToast.show("Passwords do not match");
                return;
            }
            $C("signUpConfirmPassword").setValueState("Success");


            /* =======================================================
             *              5) TIMESTAMP & FINAL PAYLOAD
             * ======================================================= */

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


            /* =======================================================
             *                      SUBMIT
             * ======================================================= */
            try {
                await this.ajaxCreateWithJQuery("HM_Login", payload);
                sap.m.MessageToast.show("Sign Up successful!");
                this._resetAuthDialog();
                this._oSignDialog.close();
            } catch (err) {
                sap.m.MessageToast.show("Sign Up failed!" + err);
                console.error("SignUp Error:", err);
            }
        },


        onChangeSalutation: function (oEvent) {
            const $C = (id) => sap.ui.getCore().byId(id);
            const oCombo = oEvent.getSource();
            const sal = oCombo.getValue();           // user typed or selected text
            const oGender = $C("signUpGender");

            // 🔍 Strict Combo Validation (Check must match list)
            const valid = utils._LCstrictValidationComboBox(oCombo, "ID");
            if (!valid) {
                // invalid → reset dependent Gender & disable it
                oGender.setSelectedKey("");
                oGender.setEnabled(false);
                oGender.setValueState("None");
                return;   // 🔥 stop, don't auto assign!
            }

            // 🎯 If valid selection → apply Gender Autoselect Rules
            if (sal === "Mr.") {
                oGender.setSelectedKey("Male");
                oGender.setEnabled(false);
            }
            else if (sal === "Ms." || sal === "Mrs.") {
                oGender.setSelectedKey("Female");
                oGender.setEnabled(false);
            }
            else { // Dr.
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
            if (!utils._LCstrictValidationComboBox(oCountryCB, "ID")) return;
            oCountryCB.setValueState("None"); // Clear previous error

            /** RESET CHILD CONTROLS */
            oModel.setProperty("/State", ""); oStateCB.setValue("");
            oModel.setProperty("/City", ""); oCityCB.setValue("");

            oStateCB.getBinding("items")?.filter([]);
            oCityCB.getBinding("items")?.filter([]);

            /** RESET PHONE + STD */
            oPhone.setValue(""); oPhone.setValueState("None"); oPhone.setMaxLength(18);
            oStdCB.setEnabled(true); oStdCB.setSelectedKey(""); oStdCB.setValueState("None");

            /** SET STD FROM COUNTRY LIST */
            const name = oCountryCB.getSelectedKey();
            const list = this.getOwnerComponent().getModel("CountryModel").getData();
            const obj = list.find(c => c.countryName === name);
            if (obj?.stdCode) {
                oModel.setProperty("/STDCode", obj.stdCode);
                oStdCB.setSelectedKey(obj.stdCode);
                oStdCB.setEnabled(false); // 🔐 Lock STD
            }

            /** FILTER STATES BY COUNTRY */
            oStateCB.getBinding("items")?.filter([
                new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, oCountryCB.getSelectedItem().getAdditionalText())
            ]);
        },

        onMobileLivechnage: function (oEvent) {
            const sSTD = sap.ui.getCore().byId("signUpSTD").getSelectedKey() || "";
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
        onChangeState: function (oEvent) {
            const $C = (id) => sap.ui.getCore().byId(id);
            const oModel = this.getView().getModel("LoginMode");

            const oStateCB = oEvent.getSource();
            const oCityCB = $C("signUpCity");

            if (!utils._LCstrictValidationComboBox(oStateCB, "ID")) return;
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
            if (!utils._LCstrictValidationComboBox(oCityCB, "ID")) return;
            oCityCB.setValueState("None");

            const value = oCityCB.getSelectedKey();
            this.getView().getModel("LoginMode").setProperty("/City", value);
        },



        _LCvalidateName: function (oEvent) {
            utils._LCvalidateName(oEvent);
        },

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
            oInput.setValueState("Success");
            oInput.setValueStateText("Passwords matched");
        },
        onSignIn: async function () {
            // var ofrag = sap.ui.getCore();
            var oModel = this.getView().getModel("LoginMode");
            var oData = oModel.getData();
            const oLoginModel = this.getView().getModel("LoginModel");

            // Get input values
            var sUserid = sap.ui.getCore().byId("signInuserid").getValue();
            var sUsername = sap.ui.getCore().byId("signInusername").getValue();
            var sPassword = sap.ui.getCore().byId("signinPassword").getValue();

            // Basic validation example
            if (
                !utils._LCvalidateMandatoryField(sap.ui.getCore().byId("signInuserid"), "ID") || !utils._LCvalidateMandatoryField(sap.ui.getCore().byId("signInusername"), "ID") ||
                !utils._LCvalidatePassword(sap.ui.getCore().byId("signinPassword"), "ID")
            ) {
                sap.m.MessageToast.show("Make sure all the mandatory fields are filled/validate the entered value");
                return;
            }

            try {
                //  Fetch all registered users (no payload — server ignores it anyway)
                const oResponse = await this.ajaxReadWithJQuery("HM_Login", "");

                const aUsers = oResponse?.commentData || [];

                const oMatchedUser = aUsers.find(user =>
                    user.UserID === sUserid &&
                    user.UserName === sUsername &&
                    (user.Password === sPassword || user.Password === btoa(sPassword))
                );

                if (!oMatchedUser) {
                    sap.m.MessageToast.show("Invalid credentials. Please try again.");
                    return;
                }

                oLoginModel.setProperty("/EmployeeID", oMatchedUser.UserID);
                oLoginModel.setProperty("/EmployeeName", oMatchedUser.UserName);
                oLoginModel.setProperty("/EmailID", oMatchedUser.EmailID);
                oLoginModel.setProperty("/Role", oMatchedUser.Role);
                oLoginModel.setProperty("/BranchCode", oMatchedUser.BranchCode || "");
                oLoginModel.setProperty("/MobileNo", oMatchedUser.MobileNo || "");
                oLoginModel.setProperty("/DateofBirth", oMatchedUser.DateofBirth)


                if (oMatchedUser.Role === "Customer") {
                    this._oLoggedInUser = oMatchedUser;
                    const oUserModel = new JSONModel(oMatchedUser);
                    sap.ui.getCore().setModel(oUserModel, "LoginModel");

                    sap.ui.getCore().byId("signInusername").setValue("");
                    sap.ui.getCore().byId("signinPassword").setValue("");

                    if (this._oSignDialog) this._oSignDialog.close();

                    const oView = this.getView();
                    oView.byId("loginButton")?.setVisible(false);
                    oView.byId("ProfileAvatar")?.setVisible(true);

                } else if (oMatchedUser.Role === "Admin" || oMatchedUser.Role === "Employee") {
                    sap.ui.getCore().byId("signInusername").setValue("");
                    sap.ui.getCore().byId("signinPassword").setValue("");

                    if (this._oSignDialog) this._oSignDialog.close();

                    this.getOwnerComponent().getRouter().navTo("TilePage");
                } else {
                    sap.m.MessageToast.show("Invalid credentials. Please try again.");
                }

            } catch (err) {
                console.error("Login Error:", err);
                sap.m.MessageToast.show("Failed to fetch login data: " + err);
            }
        },


        onPressAvatar: async function () {
            const oUser = this._oLoggedInUser || {};
            const sPhoto = "./image.jpg";

            try {
                const sUserID = oUser.UserID || "";
                if (!sUserID) {
                    sap.m.MessageToast.show("User not logged in.");
                    return;
                }
                const filter = {
                    UserID: sUserID
                };
                //  Fetch only the logged-in user's data
                const response = await this.ajaxReadWithJQuery("HM_Customer", filter);

                console.log("HM_Customer Response:", response);

                // Handle correct structure
                const aCustomers = response?.commentData || response?.Customers || response?.value || [];

                if (!Array.isArray(aCustomers) || aCustomers.length === 0) {
                    sap.m.MessageToast.show("No customer data found for this user.");
                    return;
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

                })
                );
                // Combine all bookings from all customers
                const aAllBookings = aCustomers.flatMap(customer =>
                    Array.isArray(customer.Bookings) ? customer.Bookings : []
                );
                const aAllFacilitis = aCustomers.flatMap(customer =>
                    Array.isArray(customer.FaciltyItems) ? customer.FaciltyItems : []
                );

                if (aAllBookings.length === 0) {
                    sap.m.MessageToast.show("No booking history found.");
                }

               const today = new Date();
                today.setHours(0, 0, 0, 0); // avoid timezone issues
                const aBookingData = aAllBookings.map(booking => {
                    const oStart = booking.StartDate ? new Date(booking.StartDate) : null;
                    if (oStart) oStart.setHours(0, 0, 0, 0);

                    let bookingGroup = "Others";

                    if (booking.Status === "Completed") {
                        bookingGroup = "Completed";
                    } else if (booking.Status === "New" || booking.Status === "Assigned") {
                        if (oStart <= today) {
                            bookingGroup = "Ongoing";
                        } else {
                            bookingGroup = "Upcoming";
                        }
                    }

                    return {
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
                    const oDialog = await sap.ui.core.Fragment.load({
                        name: "sap.ui.com.project1.fragment.ManageProfile",
                        controller: this
                    });
                    this._oProfileDialog = oDialog;
                    this.getView().addDependent(oDialog);
                }

                //  Create and bind the Profile Model
                const oProfileModel = new JSONModel({
                    photo: sPhoto,
                    initials: oUser.UserName ? oUser.UserName.charAt(0).toUpperCase() : "",
                    name: oUser.UserName || "",
                    email: oUser.EmailID || "",
                    phone: oUser.MobileNo || "",
                    dob: this.Formatter.DateFormat(oUser.DateOfBirth) || "",
                    gender: oUser.Gender || "",
                    address : oUser.Address || "",
                    bookings: aBookingData,
                    facility: aFacilitiData,
                    aCustomers: aCustomerDetails
                });
                this._oProfileDialog.setModel(oProfileModel, "profileData");

                //  Menu model (for tab switch)
                const oMenuModel = new JSONModel({
                    items: [
                        { title: "My Profile", icon: "sap-icon://employee", key: "profile" },
                        { title: "Booking History", icon: "sap-icon://history", key: "devices" }
                    ]
                });
                this._oProfileDialog.setModel(oMenuModel, "profileMenuModel");

                //  Section model (default = booking if available)
                const oSectionModel = new JSONModel({
                    selectedSection: aBookingData.length ? "profile" : "devices"
                });
                this._oProfileDialog.setModel(oSectionModel, "profileSectionModel");

                //  Open the dialog
                this._oProfileDialog.open();

            } catch (error) {
                console.error("Profile data load failed:", error);
                sap.m.MessageToast.show("Error fetching profile details.");
            }
        },




        onProfileLogout: function () {
            // Close the dialog and perform logout logic
            if (this._oProfileDialog) this._oProfileDialog.close();
            sap.m.MessageToast.show("You have been logged out.");

        },

        onEditProfilePic: function () {
            sap.m.MessageToast.show("Profile picture edit not implemented yet.");

        },
         onProfileDialogClose: function () {
    this._oProfileDialog.close();

    const oView = this.getView();
    oView.byId("loginButton")?.setVisible(true);
    oView.byId("ProfileAvatar")?.setVisible(false);
}
,
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

        // onAfterRendering: function () {
        //     setTimeout(() => {
        //         this._startCarouselAutoSlide();
        //     }, 500);
        // },

        // _startCarouselAutoSlide: function () {
        //     const oView = this.getView();

        //     // Find all Carousel controls rendered in the view
        //     const aCarousels = oView.findAggregatedObjects(true, control => control.isA("sap.m.Carousel"));

        //     aCarousels.forEach(carousel => {
        //         let currentIndex = 0;

        //         // Clear existing timers to avoid duplicates
        //         if (carousel._autoSlideInterval) {
        //             clearInterval(carousel._autoSlideInterval);
        //         }

        //         const iSlideCount = carousel.getPages().length;
        //         if (iSlideCount <= 1) return; // Skip if only one image

        //         // Start auto-slide
        //         carousel._autoSlideInterval = setInterval(() => {
        //             if (!carousel || carousel.bIsDestroyed) return;

        //             currentIndex = (currentIndex + 1) % iSlideCount;
        //             carousel.setActivePage(carousel.getPages()[currentIndex]);
        //         }, 3000);
        //     });
        // },
        onAfterRendering: function () {
            const oView = this.getView();
            const aCarousels = oView.findAggregatedObjects(true, c => c.isA("sap.m.Carousel"));

            aCarousels.forEach(carousel => {
                const oBinding = carousel.getBinding("pages");
                if (oBinding) {
                    // When data arrives and pages are created
                    oBinding.attachEventOnce("dataReceived", () => {
                        setTimeout(() => this._startAllCarouselsAutoSlide(3000), 200);
                    });

                    // Also run if pages already available (local data, static, cached)
                    setTimeout(() => this._startAllCarouselsAutoSlide(3000), 200);
                }
            });
        },




        onExit: function () {
            // Clear all intervals when leaving view
            const oView = this.getView();
            const aCarousels = oView.findAggregatedObjects(true, c => c.isA("sap.m.Carousel"));
            aCarousels.forEach(c => {
                if (c._autoSlideInterval) {
                    clearInterval(c._autoSlideInterval);
                }
            });
        },
        onPressBookingRow: function (oEvent) {

            var oContext = oEvent.getSource().getBindingContext("profileData");
            var oBookingData = oContext.getObject();

            // Status check (optional)
            var sStatus = (oBookingData.status || "").trim().toLowerCase();
            if (sStatus !== "new") {
                sap.m.MessageToast.show("Only bookings with status 'New' can be edited.");
                return;
            }

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
                [{ FullName: oCustomer.customerName, Facilities: { SelectedFacilities: aCustomerFacilities } }],
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
            this.getOwnerComponent().getRouter().navTo("EditBookingDetails");
        }
        ,

        // 🧮 Separated calculation function
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
        }
        ,

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
            var oBranchcity = this.byId("id_Branch").getSelectedKey()
                || this.byId("id_Branch").getValue();

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
                }

                else if (Scity && sBranchCode) {
                    aBranchCodes = [sBranchCode];
                }

                else if (!Scity && sBranchCode) {
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
                        Images: aImages
                        // Visible: isVisible
                    };
                });


                oView.setModel(new sap.ui.model.json.JSONModel({ BedTypes: aBedTypes }),
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

            // sap.m.MessageToast.show(`Booking started for ${oItem.Name}`);

            //  Get or create the HostelModel
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
                await this.ajaxUpdateWithJQuery("HM_Login", { data: oPayload, filters: filter });
                sap.m.MessageToast.show("Data Saved successfully ");
                oSaveModel.setProperty("/isEditMode", false);
            }
            catch (error) {
                sap.m.MessageToast.show("Failed");
            }
        },
        OnpressBookingDetails: function () {

        }
    });
});
