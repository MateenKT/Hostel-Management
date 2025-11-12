sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../utils/validation"
], function (BaseController, JSONModel, MessageToast, MessageBox, utils) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Hostel", {

        onInit: async function () {
            const oView = this.getView();

            const omodel = new sap.ui.model.json.JSONModel({
                url: "https://rest.kalpavrikshatechnologies.com/",
                headers: {
                    name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                    password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
                    "Content-Type": "application/json"
                },
                isRadioVisible: false
            });
            this.getOwnerComponent().setModel(omodel, "LoginModel");

            this.byId("id_Branch").setEnabled(true);
            this.byId("id_Area").setEnabled(false);
            this.byId("id_Roomtype").setEnabled(false);

            const oAvatar = oView.byId("ProfileAvatar");
            if (oAvatar) oAvatar.setVisible(false);

            const oHostelModel = new sap.ui.model.json.JSONModel({
                CustomerName: "",
                MobileNo: "",
                Gender: "",
                DateOfBirth: "",
                CustomerEmail: "",
                RoomType: "",

            });
            oView.setModel(oHostelModel, "HostelModel");

            const oProfileMenuModel = new sap.ui.model.json.JSONModel({
                items: [
                    { title: "My Profile", icon: "sap-icon://person-placeholder", key: "profile" },
                    { title: "Booking History", icon: "sap-icon://connected", key: "devices" },
                    { title: "Logout", icon: "sap-icon://log", key: "logout" }
                ]
            });
            oView.setModel(oProfileMenuModel, "profileMenuModel");

            const oLoginViewModel = new sap.ui.model.json.JSONModel({
                isOtpSelected: false,
                isPasswordSelected: true
            });
            oView.setModel(oLoginViewModel, "LoginViewModel");

            const oLoginModeModel = new sap.ui.model.json.JSONModel({
                fullname: "",
                Email: "",
                Mobileno: "",
                password: "",
                comfirmpass: ""
            });
            oView.setModel(oLoginModeModel, "LoginMode");

            const oProfileSectionModel = new sap.ui.model.json.JSONModel({
                selectedSection: "profile"
            });
            oView.setModel(oProfileSectionModel, "profileSectionModel");

            const aBranches = [
                { BranchCode: "KLB01", BranchName: "Kalaburgi" },
                { BranchCode: "BR002", BranchName: "Mumbai" },
                { BranchCode: "BR003", BranchName: "Nagpur" },
                { BranchCode: "BR004", BranchName: "Nashik" }
            ];
            oView.setModel(new sap.ui.model.json.JSONModel({ Branches: aBranches }), "BranchModel");

            try {
                await this.BedTypedetails();
                await this.CustomerDetails();
                await this._loadBranchCode();
                await this.onReadcallforRoom();
                await this._loadFilteredData("KLB01", "");
                
            } catch (error) {
                console.error("Error during initialization:", error);
            }
            this.byId("id_Branch").setSelectedKey("KLB01")
                 const oModelData = oView.getModel("sBRModel").getData();

            // 🔹 Filter the data for the selected branch name
            const aFiltered = oModelData.filter(function (item) {
                return item.Name === "Kalaburagi";
            });

            // 🔹 Update Area model dynamically
            const oAreaModel = new sap.ui.model.json.JSONModel(aFiltered);
            oView.setModel(oAreaModel, "AreaModel");

            // 🔹 Enable the Area dropdown now that data is ready
           oView.byId("id_Area").setEnabled(true);
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
        BedTypedetails: async function () {
            try {
                const oData = await this.ajaxReadWithJQuery("HM_BedType", {});
                const aBedTypes = Array.isArray(oData.data)
                    ? oData.data
                    : [oData.data];

                const oBedTypeModel = new JSONModel(aBedTypes);
                this.getView().setModel(oBedTypeModel, "BedTypeModel");

            } catch (err) {
                console.error("Error while fetching Bed Type details:", err);
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

                console.log("oBranchModel:", oBranchModel.getData());
                console.log("Branch data loaded successfully");
            } catch (err) {
                console.error("Error while loading branch data:", err);
            }
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
        _loadFilteredData: async function (sBranchCode, sACType) {
            if(sACType==="All"){
                sACType=""
            }
            try {
                const oView = this.getView();

                // 🔹 Fetch all bed type data for the selected branch
                const response = await this.ajaxReadWithJQuery("HM_BedType", {
                    BranchCode: sBranchCode
                });

                const allRooms = response?.data.data || [];

                // 🔹 If AC type is not provided → show all bed types for the branch
                let matchedRooms = [];

                if (!sACType) {
                    // No ACType → all bed types for the branch
                    matchedRooms = allRooms.filter(
                        room =>
                            room.BranchCode &&
                            room.BranchCode.toLowerCase() === sBranchCode.toLowerCase()
                    );
                } else {
                    // ACType is provided → filter by branch + ACType
                    matchedRooms = allRooms.filter(
                        room =>
                            room.BranchCode &&
                            room.BranchCode.toLowerCase() === sBranchCode.toLowerCase() &&
                            room.ACType &&
                            room.ACType.toLowerCase() === sACType.toLowerCase()
                    );
                }

                // 🔹 Models
                const oRoomDetailsModel = oView.getModel("RoomCountModel");
                const oCustomerModel = oView.getModel("CustomerModel");

                const roomDetails = oRoomDetailsModel.getData()?.Rooms || [];
                const customerData = oCustomerModel.getData() || [];

                // 🔹 Safe Base64 image converter
                const convertBase64ToImage = (base64String, fileType) => {
                    if (!base64String) return "./image/Fallback.png";
                    let sBase64 = base64String.replace(/\s/g, "");
                    try {
                        if (!sBase64.startsWith("iVB") && !sBase64.startsWith("data:image")) {
                            const decoded = atob(sBase64);
                            if (decoded.startsWith("iVB")) sBase64 = decoded;
                        }
                    } catch (e) {
                        console.warn("Base64 decode error:", e);
                    }
                    const mimeType = fileType || "image/jpeg";
                    if (sBase64.startsWith("data:image")) return sBase64;
                    return `data:${mimeType};base64,${sBase64}`;
                };

                // 🔹 Prepare array for cards (no unique filtering now)
                const aBedTypes = matchedRooms.map(room => {
                    const matchingRooms = roomDetails.filter(
                        rd =>
                            rd.BranchCode?.toLowerCase() === sBranchCode.toLowerCase() &&
                            rd.BedTypeName?.trim().toLowerCase() ===
                            (room.Name?.trim().toLowerCase() + " - " + room.ACType?.trim().toLowerCase())
                    );

                    const firstRoom = matchingRooms[0];
                    const price = firstRoom?.Price ? " " + firstRoom.Price : "";

                    let totalBooked = 0;
                    let totalCapacity = 0;

                    matchingRooms.forEach(rm => {
                        totalCapacity += rm.NoofPerson || 0;

                        // Count customers for each matching room
                        const bookedCount = customerData.filter(cust =>
                            cust.Bookings?.some(bk =>
                                bk.BranchCode?.toLowerCase() === sBranchCode.toLowerCase() &&
                                bk.RoomNo?.toLowerCase() === rm.RoomNo?.toLowerCase() &&
                                bk.BedType?.trim().toLowerCase() ===
                                rm.BedTypeName?.trim().toLowerCase()
                            )
                        ).length;

                        totalBooked += bookedCount;
                    });

                    const isFull = totalBooked >= totalCapacity && totalCapacity > 0;

                    const isVisible = !isFull && price.trim() !== "";

                    return {
                        Name: room.Name,
                        ACType: room.ACType,
                        Description: room.Description || "",
                        Price: price,
                        BranchCode: room.BranchCode,
                        ID: room.ID,

                        Image: convertBase64ToImage(room.Photo1 || room.Photo1Type),
                        Visible: isVisible
                    };
                });

                //  Only show available beds
                const availableBeds = aBedTypes;

                //  Bind model for dynamic UI
                oView.setModel(
                    new sap.ui.model.json.JSONModel({ BedTypes: availableBeds }),
                    "VisibilityModel"
                );

            } catch (err) {
                console.error("Error loading data:", err);
                sap.m.MessageToast.show("Failed to load bed type data.");
            }
        },

        // _LoadFacilities: async function () {
        //     const oView = this.getView();
        //     const Response = await this.ajaxReadWithJQuery("HM_ExtraFacilities", {});

        //     // Extract array safely
        //     const aFacilities = Response?.data || [];

        //     // Helper function to convert Base64 → data:image URL
        //     const convertBase64ToImage = (base64String, fileType) => {
        //         if (!base64String) return "./image/Fallback.png";
        //         let sBase64 = base64String.replace(/\s/g, "");
        //         try {
        //             if (!sBase64.startsWith("iVB") && !sBase64.startsWith("data:image")) {
        //                 const decoded = atob(sBase64);
        //                 if (decoded.startsWith("iVB")) sBase64 = decoded;
        //             }
        //         } catch (e) {
        //             console.warn("Base64 decode error:", e);
        //         }
        //         const mimeType = fileType || "image/jpeg";
        //         if (sBase64.startsWith("data:image")) return sBase64;
        //         return `data:${mimeType};base64,${sBase64}`;
        //     };

        //     // Convert images and prepare data
        //     const aFinalFacilities = aFacilities.map(f => ({
        //         FacilityID: f.FacilityID,
        //         FacilityName: f.FacilityName,
        //         Image: convertBase64ToImage(f.FicilityImage, f.FileType),
        //         Price: Number(f.Price)
        //     }));

        //     //  Wrap in object for proper binding
        //     const oFacilityModel = new JSONModel({ Facilities: aFinalFacilities });
        //     oView.setModel(oFacilityModel, "FacilityModel");
        // },
        _LoadFacilities: async function (sBranchID) {
            try {
                const oView = this.getView();

                // Fetch all facilities
                const Response = await this.ajaxReadWithJQuery("HM_ExtraFacilities", {});
                const aFacilities = Response?.data || [];

                // Helper: convert Base64 → data:image URL
                const convertBase64ToImage = (base64String, fileType) => {
                    if (!base64String) return "./image/Fallback.png";
                    let sBase64 = base64String.replace(/\s/g, "");
                    try {
                        if (!sBase64.startsWith("iVB") && !sBase64.startsWith("data:image")) {
                            const decoded = atob(sBase64);
                            if (decoded.startsWith("iVB")) sBase64 = decoded;
                        }
                    } catch (e) {
                        console.warn("Base64 decode error:", e);
                    }
                    const mimeType = fileType || "image/jpeg";
                    return sBase64.startsWith("data:image") ? sBase64 : `data:${mimeType};base64,${sBase64}`;
                };

                // Normalize and filter facilities by branch
                const normalize = v => (v ? String(v).trim().toLowerCase() : "");

                const aFilteredFacilities = aFacilities.filter(f => {
                    // keep all if no BranchID is passed
                    if (!sBranchID) return true;
                    const facilityBranch = normalize(f.BranchID || f.BranchCode || f.Address || f.Location);
                    return facilityBranch && facilityBranch.includes(normalize(sBranchID));
                });

                // Convert images and prepare final data
                const aFinalFacilities = aFilteredFacilities.map(f => ({
                    FacilityID: f.FacilityID,
                    FacilityName: f.FacilityName,
                    Image: convertBase64ToImage(f.FicilityImage, f.FileType),
                    Price: Number(f.Price)
                }));

                // Bind to view model
                const oFacilityModel = new sap.ui.model.json.JSONModel({ Facilities: aFinalFacilities });
                oView.setModel(oFacilityModel, "FacilityModel");

                console.log("Facilities loaded for branch:", sBranchID, aFinalFacilities);
            } catch (e) {
                console.error("Error loading filtered facilities:", e);
            }
        },


        onSelectPricePlan: function (oEvent) {
            const oTile = oEvent.getSource();
            const sType = oTile.data("type");
            const oView = this.getView();
            const oModel = oView.getModel("HostelModel");
            const oData = oModel.getData();

            // Price mapping
            const mPriceMap = {
                daily: "Price",
                monthly: "MonthPrice",
                yearly: "YearPrice"
            };

            const sPriceKey = mPriceMap[sType];
            const sPrice = sPriceKey ? oData[sPriceKey] : "N/A";

            // Update model
            oModel.setProperty("/SelectedPriceType", sType);
            oModel.setProperty("/SelectedPriceValue", sPrice);

            // --- FIX: Handle layout container gracefully ---
            const oParent = oTile.getParent();

            // Try to get tile siblings whether in Grid, VBox, or HBox
            let aSiblings = [];
            if (oParent.getItems) {
                aSiblings = oParent.getItems(); // For HBox/VBox/List
            } else if (oParent.getContent) {
                aSiblings = oParent.getContent(); // For Grid or layout containers
            }

            // Clear selection from all sibling tiles
            aSiblings.forEach(oItem => {
                if (oItem.removeStyleClass) {
                    oItem.removeStyleClass("selectedTile");
                }
            });

            // Add selection highlight to clicked tile
            oTile.addStyleClass("selectedTile");

            // Feedback
            sap.m.MessageToast.show(
                `Selected ${sType.charAt(0).toUpperCase() + sType.slice(1)} plan — ₹${sPrice}`
            );
        },
  


        viewDetails: async function (oEvent) {
            const oView = this.getView();

            // 1. Get selected card object from the UI model
            const oSelected = oEvent.getSource().getBindingContext("VisibilityModel").getObject();

            // 2. Get reference models
            const oRoomsModel = oView.getModel("RoomCountModel");
            const oBedTypeModel = oView.getModel("BedTypeModel");
            const oBranchModel = oView.getModel("sBRModel");

            const aRooms = oRoomsModel?.getData()?.Rooms || [];
            const aBedTypes = oBedTypeModel?.getData() || [];
            const aBranches = oBranchModel?.getData() || [];

            // 3. Identify selected bed and AC type
            const sSelectedBedType = oSelected.Name?.trim().toLowerCase();
            const sSelectedAC = (oSelected.ACType || "AC").trim().toLowerCase();

            // Match corresponding records
            const oBedTypeDetails = aBedTypes.find(bt =>
                bt.Name?.trim().toLowerCase() === sSelectedBedType &&
                bt.ACType?.trim().toLowerCase() === sSelectedAC
            ) || {};

            const oRoomDetails = aRooms.find(r =>
                r.BedTypeName?.trim().toLowerCase() === `${sSelectedBedType} - ${sSelectedAC}`
            ) || {};

            // 4. Resolve address based on branch data
            let sAddress = "Not specified";
            const sRoomBranchRaw = (oRoomDetails.BranchID ?? oRoomDetails.BranchCode ?? "").toString().trim();
            if (sRoomBranchRaw) {
                const normalize = v => (v ? String(v).trim().toLowerCase() : "");
                const oBranch = aBranches.find(b =>
                    normalize(b.BranchID) === normalize(sRoomBranchRaw) ||
                    normalize(b.BranchCode) === normalize(sRoomBranchRaw)
                ) || aBranches.find(b => normalize(b.Name) === normalize(sRoomBranchRaw)) ||
                    aBranches.find(b =>
                        normalize(b.Name).includes(normalize(sRoomBranchRaw)) ||
                        normalize(b.Address).includes(normalize(sRoomBranchRaw))
                    );
                if (oBranch) sAddress = oBranch.Address || oBranch.Name || "Not specified";
            }
            // 
            console.log("   Room Branch:", sRoomBranchRaw, "Address:", sAddress);

            let aImageList = [];

            // If backend provides multiple images as array
            if (Array.isArray(oBedTypeDetails.RoomPhotosList) && oBedTypeDetails.RoomPhotosList.length > 0) {
                aImageList = oBedTypeDetails.RoomPhotosList.map(img =>
                    `data:${oBedTypeDetails.MimeType || "image/jpeg"};base64,${img}`
                );
            }
            // If a single image exists
            else if (oBedTypeDetails.RoomPhotos && oBedTypeDetails.RoomPhotos.trim() !== "") {
                aImageList = [
                    `data:${oBedTypeDetails.MimeType || "image/jpeg"};base64,${oBedTypeDetails.RoomPhotos}`
                ];
            }
            // Fallback to oSelected.Image
            else if (oSelected.Image && oSelected.Image.trim() !== "") {
                aImageList = [oSelected.Image];
            }
            // Final fallback — local default image
            else {
                aImageList = [sap.ui.require.toUrl("sap/ui/com/project1/image/no-image.png")];
            }
            // 5. Build the full detail object
            const oFullDetails = {
                RoomNo: oRoomDetails.RoomNo || "",
                BedType: oBedTypeDetails.Name || oSelected.Name || "",
                ACType: oBedTypeDetails.ACType || sSelectedAC.toUpperCase(),
                Description: oBedTypeDetails.Description || "No description available",
                Price: oRoomDetails.Price || "N/A",
                MonthPrice: oRoomDetails.MonthPrice || "N/A",
                YearPrice: oRoomDetails.YearPrice || "N/A",
                Address: sAddress,
                Capacity: oRoomDetails.NoofPerson || "",
                ImageList: aImageList,
                // 👇 Newly added properties for price selection
                SelectedPriceType: "",
                SelectedPriceValue: ""
            };
            // 6. Bind model (HostelModel) and filter facilities
            const oHostelModel = new sap.ui.model.json.JSONModel(oFullDetails);
            oView.setModel(oHostelModel, "HostelModel");

            await this._LoadFacilities(oRoomDetails.BranchID || oRoomDetails.BranchCode || oFullDetails.Address);

            // 7. Open the details fragment
            if (!this._oRoomDetailFragment) {
                // Note: The fragment ID should be the first argument if you want to use sap.ui.core.Fragment.byId later
                // Best practice is to use the controller reference (this) to open fragments
                this._oRoomDetailFragment = await sap.ui.core.Fragment.load({
                    name: "sap.ui.com.project1.fragment.viewRoomDetails",
                    controller: this // Pass controller reference
                });
                oView.addDependent(this._oRoomDetailFragment);
            }

            // Model binding is necessary before opening
            this._oRoomDetailFragment.setModel(oHostelModel, "HostelModel");
            this._oRoomDetailFragment.setModel(oView.getModel("FacilityModel"), "FacilityModel");

            // Open the dialog
            this._oRoomDetailFragment.open();
            const oCarousel = sap.ui.core.Fragment.byId("sap.ui.com.project1.fragment.viewRoomDetails", "roomImageCarousel");

            if (oCarousel) {
                oCarousel.unbindAggregation("pages"); // This is now a clean reset
                oCarousel.bindAggregation("pages", {
                    path: "HostelModel>/ImageList",
                    template: new sap.m.Image({
                        src: "{HostelModel>}",
                        // ... other properties
                        error: this.onImageLoadError.bind(this)
                    })
                });
            }
            this._oRoomDetailFragment.open();
        },
        // // 6. Bind model and filter facilities
        // const oHostelModel = new sap.ui.model.json.JSONModel(oFullDetails);
        // oView.setModel(oHostelModel, "HostelModel");

        // await this._LoadFacilities(oRoomDetails.BranchID || oRoomDetails.BranchCode || oFullDetails.Address);

        // // 7. Open the details fragment
        // if (!this._oRoomDetailFragment) {
        //     this._oRoomDetailFragment = await sap.ui.xmlfragment(
        //         "sap.ui.com.project1.fragment.viewRoomDetails",
        //         this
        //     );
        //     oView.addDependent(this._oRoomDetailFragment);
        // }

        // this._oRoomDetailFragment.setModel(oHostelModel, "HostelModel");
        // this._oRoomDetailFragment.setModel(oView.getModel("FacilityModel"), "FacilityModel");
        // this._oRoomDetailFragment.open();
        // // 🧩 Bind carousel dynamically
        // // 🧩 Correct carousel binding
        // const oCarousel = sap.ui.core.Fragment.byId("sap.ui.com.project1.fragment.viewRoomDetails", "roomImageCarousel");
        // if (oCarousel) {
        //     oCarousel.unbindAggregation("pages"); // reset previous binding safely
        //     oCarousel.bindAggregation("pages", {
        //         path: "HostelModel>/ImageList",
        //         template: new sap.m.Image({
        //             src: "{HostelModel>}", // the string URL itself
        //             width: "100%",
        //             densityAware: false,
        //             decorative: false,
        //             alt: "Room Image",
        //             error: this.onImageLoadError.bind(this)
        //         })
        //     });
        // }
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
            this._oRoomDetailFragment.close();
        },


        // onBookNow: function (oEvent) {

        //     // Get selected bed type object
        //     const oItem = oEvent.getSource().getBindingContext("VisibilityModel").getObject();

        //     sap.m.MessageToast.show(`Booking started for ${oItem.Name}`);

        //     //  Get or create the HostelModel
        //     let oHostelModel = sap.ui.getCore().getModel("HostelModel");
        //     if (!oHostelModel) {
        //         oHostelModel = new sap.ui.model.json.JSONModel({});
        //         sap.ui.getCore().setModel(oHostelModel, "HostelModel");
        //     }

        //     //  Set RoomType and Price in HostelModel
        //     oHostelModel.setProperty("/RoomType", oItem.Name || "");
        //     oHostelModel.setProperty("/Price", oItem.Price || 0);

        //     // Optionally set other details
        //     oHostelModel.setProperty("/Image", oItem.Image || "");
        //     oHostelModel.setProperty("/Description", oItem.Description || "");
        //     console.log("onBookNow: Passing data to next page:", oItem);

        //     //  Navigate to the booking route (or open fragment)
        //     const oRouter = this.getOwnerComponent().getRouter();
        //     oRouter.navTo("RouteBookRoom");
        // },

        onBookNow: function (oEvent) {
            // 1. Get selected bed type object
            const oItem = oEvent.getSource().getBindingContext("VisibilityModel").getObject();
            sap.m.MessageToast.show(`Booking started for ${oItem.Name}`);

            // 2. Access global HostelModel
            let oHostelModel = sap.ui.getCore().getModel("HostelModel");
            if (!oHostelModel) {
                oHostelModel = new sap.ui.model.json.JSONModel({});
                sap.ui.getCore().setModel(oHostelModel, "HostelModel");
            }

            // 3. Set basic room info
            oHostelModel.setProperty("/RoomType", oItem.Name || "");
            oHostelModel.setProperty("/Image", oItem.Image || "");
            oHostelModel.setProperty("/Description", oItem.Description || "");
            oHostelModel.setProperty("/Price", oItem.Price || 0);
            oHostelModel.setProperty("/MonthPrice", oItem.MonthPrice || 0);
            oHostelModel.setProperty("/YearPrice", oItem.YearPrice || 0);

            // 4. Check if a pricing plan was selected earlier (from fragment)
            const sSelectedType = oHostelModel.getProperty("/SelectedPriceType");
            const sSelectedValue = oHostelModel.getProperty("/SelectedPriceValue");

            // 5. Validate selection
            if (!sSelectedType || !sSelectedValue) {
                sap.m.MessageToast.show("Please select a pricing plan before booking.");
                return;
            }

            // 6. Store final booking data
            oHostelModel.setProperty("/FinalBookingType", sSelectedType);
            oHostelModel.setProperty("/FinalBookingPrice", sSelectedValue);

            console.log("onBookNow → Booking data being sent:", oHostelModel.getData());

            // 7. Navigate to booking page
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteBookRoom");
        },



        onConfirmBooking: function () {
            const oView = this.getView();
            const oHostelModel = oView.getModel("HostelModel");
            const oData = oHostelModel?.getData?.() || {};

            console.log("onConfirmBooking: HostelModel data:", oData);

            // 1️⃣ Validate selection
            if (!oData.SelectedPriceType || !oData.SelectedPriceValue) {
                sap.m.MessageToast.show("Please select a pricing plan before booking.");
                return;
            }

            // 2️⃣ Construct payload
            const oPayload = {
                BookingDate: new Date().toISOString(),
                RoomNo: oData.RoomNo || "",
                BedType: oData.BedType || "",
                ACType: oData.ACType || "",
                Capacity: oData.Capacity || "",
                Address: oData.Address || "",
                Description: oData.Description || "",
                SelectedPriceType: oData.SelectedPriceType,
                FinalPrice: oData.SelectedPriceValue,
                Source: "UI5_HostelApp",
                Status: "Pending"
            };

            // (Optional) Only keep if you actually need this extra property in model
            oHostelModel.setProperty("/roomtype", oData.BedType);

            console.log("Full Payload JSON:", JSON.stringify(oPayload, null, 4));

            // 3️⃣ User feedback
            sap.m.MessageToast.show(
                `Booking confirmed for ${oData.BedType || "Room"} (${oData.SelectedPriceType} plan)`
            );

            // 4️⃣ Close the dialog
            if (this._oRoomDetailFragment) this._oRoomDetailFragment.close();
        },






        onTabSelect: function (oEvent) {
            var oItem = oEvent.getParameter("item");
            const sKey = oItem.getKey();
            this.byId("pageContainer").to(this.byId(sKey));

            var page = this.byId(sKey);
            if (page && page.scrollTo) page.scrollTo(0, 0);

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
                this._oSignDialog = sap.ui.xmlfragment("sap.ui.com.project1.fragment.SignInSignup", this);
                this.getView().addDependent(this._oSignDialog);
            }
            this._oSignDialog.open();
            return;
        },
        onDialogClose: function () {
            this._oSignDialog.close()
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

        onMobileLivechnage: function (oEvent) {
            utils._LCvalidateMobileNumber(oEvent)
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
        FSM_onConfirm: function () {
            const oFragModel = this.getView().getModel("LoginMode");
            if (oFragModel.getProperty("/password") !== oFragModel.getProperty("/comfirmpass")) {
                sap.ui.getCore().byId("signUpConfirmPassword").setValueState("Error")
                MessageToast.show("Password Mismatch");
                return;
            } else {
                sap.ui.getCore().byId("signUpConfirmPassword").setValueState("None")
            }
        },
        onSignUp: async function () {
            var oDialog = this._oSignDialog;  // Assumes you stored the fragment dialog in this._oAuthDialog
            var ofrag = sap.ui.getCore();
            var oModel = this.getView().getModel("LoginMode");
            var oData = oModel.getData();

            // Basic validation example
            if (
                !utils._LCvalidateMandatoryField(ofrag.byId("signUpName"), "ID") ||
                !utils._LCvalidateEmail(ofrag.byId("signUpEmail"), "ID") || !utils._LCvalidateMobileNumber(ofrag.byId("signUpPhone"), "ID") || !utils._LCvalidatePassword(ofrag.byId("signUpPassword"), "ID")
            ) {
                MessageToast.show("Make sure all the mandatory fields are filled/validate the entered value");
                return;
            }
            // Get current timestamp
            var oNow = new Date();
            var sTimeDate = oNow.getFullYear() + "-" +
                String(oNow.getMonth() + 1).padStart(2, "0") + "-" +
                String(oNow.getDate()).padStart(2, "0") + " " +
                String(oNow.getHours()).padStart(2, "0") + ":" +
                String(oNow.getMinutes()).padStart(2, "0") + ":" +
                String(oNow.getSeconds()).padStart(2, "0");

            // Payload
            var oPayload = {
                data: {
                    UserName: oData.fullname,
                    EmailID: oData.Email,
                    MobileNo: oData.Mobileno,
                    Password: btoa(oData.password),
                    Role: "Customer",
                    TimeDate: sTimeDate,
                    Status: "Active"
                }
            };

            try {
                // Use your reusable helper
                await this.ajaxCreateWithJQuery("HM_Login", oPayload);

                // Handle success
                sap.m.MessageToast.show("Sign Up successful!");

                // Reset model
                oModel.setData({
                    salutation: "Mr.",
                    fullname: "",
                    Email: "",
                    STDCode: "+91",
                    Mobileno: "",
                    password: "",
                    comfirmpass: ""
                });

                if (oDialog) {
                    oDialog.close();
                }

            } catch (err) {
                // Handle error
                sap.m.MessageToast.show("Error in Sign Up: " + err);
            }
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

                if (oMatchedUser.Role === "Customer") {
                    sap.m.MessageToast.show("Login Successful! Welcome, " + sUsername);
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
                    sap.m.MessageToast.show("Login Successful! Welcome, " + sUsername);
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

                // Map booking data
                const aBookingData = aAllBookings.map(booking => ({
                    Startdate: booking.StartDate
                        ? new Date(booking.StartDate
                        ).toLocaleDateString("en-GB") : "N/A",
                    EndDate: booking.EndDate
                        ? new Date(booking.EndDate
                        ).toLocaleDateString("en-GB") : "N/A",
                    room: booking.BedType || "N/A",
                    amount: booking.RentPrice || "N/A",
                    status: booking.Status || "N/A",
                    cutomerid: booking.CustomerID,
                    branchCode: booking.BranchCode,
                    noofperson: booking.NoOfPersons,
                    grandTotal: booking.RentPrice,
                    paymenytype: booking.PaymentType,
                    RoomPrice: booking.RoomPrice

                }));
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
                    selectedSection: aBookingData.length ? "devices" : "profile"
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
            this._oProfileDialog.close()
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
            if (oRoomTypeCombo) oRoomTypeCombo.setEnabled(false);
        },

        onAfterRendering: function () {
            var oCarousel = this.byId("customSlideCarousel");
            var iIndex = 0;
            var that = this;
            var iSlideCount = oCarousel.getPages().length;

            // Clear existing interval (in case of rerender)
            if (this._autoSlideInterval) {
                clearInterval(this._autoSlideInterval);
            }

            // Set new interval
            this._autoSlideInterval = setInterval(function () {
                if (oCarousel && !oCarousel.bIsDestroyed) {
                    iIndex = (iIndex + 1) % iSlideCount;
                    oCarousel.setActivePage(oCarousel.getPages()[iIndex]);
                }
            }, 3000); // Auto-scroll every 3 seconds
        },

        onExit: function () {
            // Clear interval when view is destroyed
            if (this._autoSlideInterval) {
                clearInterval(this._autoSlideInterval);
            }
        },
        onEditBooking: function () {
            var oTable = sap.ui.getCore().byId("IdProfileaTable");
            var oSelectedItem = oTable.getSelectedItem();

            if (!oSelectedItem) {
                sap.m.MessageToast.show("Please select a booking to edit.");
                return;
            }
            // Extract selected booking data
            var oContext = oSelectedItem.getBindingContext("profileData");
            var oBookingData = oContext.getObject();


            var sStatus = (oBookingData.status || "").trim().toLowerCase();
            if (sStatus !== "new") {
                sap.m.MessageToast.show("Only bookings with status 'New' can be edited.");
                return;
            }
            // Retrieve customerID using the booking (from bookings array)
            var oProfileModel = this._oProfileDialog.getModel("profileData");
            var aCustomers = oProfileModel.getProperty("/aCustomers");
            var aFacilities = oProfileModel.getProperty("/facility");

            // Fix possible typo (cutomerid → customerid)
            var sCustomerID = oBookingData.cutomerid || oBookingData.CustomerID || "";

            if (!sCustomerID) {
                sap.m.MessageToast.show("Customer ID not found for this booking.");
                return;
            }

            // Find the full customer details for that CustomerID
            var oCustomer = aCustomers.find(cust => cust.customerID === sCustomerID);
            if (!oCustomer) {
                sap.m.MessageToast.show("No customer details found for this booking.");
                return;
            }

            // Filter all facilities belonging to that customer
            var aCustomerFacilities = aFacilities.filter(fac => fac.customerid === sCustomerID);

            // 🧮 Call the calculation function for totals
            var oTotals = this.calculateTotals(
                [{ FullName: oCustomer.customerName, Facilities: { SelectedFacilities: aCustomerFacilities } }],
                oBookingData.Startdate,
                oBookingData.EndDate,
                oBookingData.RoomPrice
            );
            if (!oTotals) {
                return; // calculation returned null (invalid dates)
            }

            // Prepare data for the next view (HostelModel)
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
                TotalDays: oTotals.TotalDays,
                AllSelectedFacilities: oTotals.AllSelectedFacilities,
                TotalFacilityPrice: oTotals.TotalFacilityPrice,
                GrandTotal: oTotals.GrandTotal
            };

            // Create a model to pass to next view
            var oHostelModel = new JSONModel(oFullCustomerData);
            this.getOwnerComponent().setModel(oHostelModel, "HostelModel");

            // Navigate to next view
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("EditBookingDetails");
        },

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
            oRoomType.setSelectedKey("").setEnabled(false);

            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) return;

            // 🔹 Selected Branch Name
            const sSelectedBranch = oSelectedItem.getText();

            // 🔹 Fetch existing Branch model data
            const oModelData = oView.getModel("sBRModel").getData();

            // 🔹 Filter the data for the selected branch name
            const aFiltered = oModelData.filter(function (item) {
                return item.Name === sSelectedBranch;
            });

            // 🔹 Update Area model dynamically
            const oAreaModel = new sap.ui.model.json.JSONModel(aFiltered);
            oView.setModel(oAreaModel, "AreaModel");

            // 🔹 Enable the Area dropdown now that data is ready
            oAreaCombo.setEnabled(true);
        },


        // 🔹 When Area is selected, enable Room Type combo
        onAreaSelectionChange: function (oEvent) {
            const oRoomType = this.byId("id_Roomtype");
            const oSelectedItem = oEvent.getSource().getSelectedItem();

            if (oSelectedItem) {
                oRoomType.setEnabled(true);
            } else {
                oRoomType.setEnabled(false);
            }
        },

        // 🔹 Search logic remains same
        onSearchRooms: function () {
            const oBranchCombo = this.byId("id_Area");   // Area Combo
            const oACTypeCombo = this.byId("id_Roomtype");

            const oSelectedBranchItem = oBranchCombo.getSelectedItem();
            const sSelectedBranch = oSelectedBranchItem?.getKey(); // BranchID from AreaModel

            const sSelectedACType = oACTypeCombo?.getSelectedKey();

            if (!sSelectedBranch) {
                sap.m.MessageToast.show("Please select a location first.");
                return;
            }

            this._loadFilteredData(sSelectedBranch, sSelectedACType);
        },






    });
});