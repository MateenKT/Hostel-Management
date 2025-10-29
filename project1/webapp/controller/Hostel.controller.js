sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("sap.ui.com.project1.controller.Hostel", {

        onInit: function () {

            var oView = this.getView();
            var oAvatar = oView.byId("ProfileAvatar"); // Change to your avatar ID if needed
            if (oAvatar) {
                oAvatar.setVisible(false);
            }
            var model = new JSONModel({
                CustomerName: "",
                MobileNo: "",
                Gender: "",
                DateOfBirth: "",
                CustomerEmail: "",
                RoomType: "",
            });
            this.getView().setModel(model, "HostelModel");

            var oProfileMenuModel = new JSONModel({
                items: [
                    { title: "My Profile", icon: "sap-icon://person-placeholder", key: "profile" },
                    { title: "Booking History", icon: "sap-icon://connected", key: "devices" },
                    { title: "Logout", icon: "sap-icon://log", key: "logout" }
                ]
            });
            oView.setModel(oProfileMenuModel, "profileMenuModel");
            var login = new JSONModel({
                "isOtpSelected": false,
                "isPasswordSelected": true

            })
            oView.setModel(login, "LoginViewModel")

            var oProfileSectionModel = new JSONModel({
                selectedSection: "profile"  // default section shown on dialog open
            });
            this.getView().setModel(oProfileSectionModel, "profileSectionModel");
            const aBranches = [
                { BranchCode: "KLB01", BranchName: "Kalaburgi" },
                { BranchCode: "BR002", BranchName: "Mumbai" },
                { BranchCode: "BR003", BranchName: "Nagpur" },
                { BranchCode: "BR004", BranchName: "Nashik" }
            ];
            const oBranchModel = new JSONModel({ Branches: aBranches });
            this.getView().setModel(oBranchModel, "BranchModel");

            // this._loadFilteredData("KLB01");
            this.onpressLogin()
        },

        // _base64ToBlob: function (base64Data, mimeType) {
        //     const byteCharacters = atob(base64Data);
        //     const byteArrays = [];

        //     for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        //         const slice = byteCharacters.slice(offset, offset + 512);
        //         const byteNumbers = new Array(slice.length);

        //         for (let i = 0; i < slice.length; i++) {
        //             byteNumbers[i] = slice.charCodeAt(i);
        //         }

        //         const byteArray = new Uint8Array(byteNumbers);
        //         byteArrays.push(byteArray);
        //     }

        //     return new Blob(byteArrays, { type: mimeType });
        // },

        // _convertBLOBToImage: function (oBlob) {
        //     return new Promise((resolve, reject) => {
        //         const oImage = new Image();
        //         oImage.onload = function () {
        //             const MAX_WIDTH = 600; // scale for UI
        //             const scale = MAX_WIDTH / oImage.width;
        //             const canvas = document.createElement("canvas");
        //             canvas.width = MAX_WIDTH;
        //             canvas.height = oImage.height * scale;

        //             const ctx = canvas.getContext("2d");
        //             ctx.drawImage(oImage, 0, 0, canvas.width, canvas.height);

        //             const dataUrl = canvas.toDataURL("image/jpeg");
        //             resolve(dataUrl);
        //         };
        //         oImage.onerror = function () {
        //             reject("Image load failed");
        //         };
        //         oImage.src = URL.createObjectURL(oBlob);
        //     });
        // },
        _loadFilteredData: async function (sBranchCode) {
            try {
                const oView = this.getView();
                const sUrl = "https://rest.kalpavrikshatechnologies.com/HM_Master_Data";
                const sFilteredUrl = `${sUrl}?BranchCode=${encodeURIComponent(sBranchCode)}`;

                const response = await $.ajax({
                    url: sFilteredUrl,
                    type: "GET",
                    contentType: "application/json",
                    headers: {
                        name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                        password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
                    }
                });

                const allRooms = response?.HM_Master_Data || [];

                // Filter rooms with matching BranchCode (case-insensitive)
                const matchedRooms = allRooms.filter(room =>
                    room.BranchCode && room.BranchCode.toLowerCase() === sBranchCode.toLowerCase()
                );

                // Find room types only in matchedRooms
                const singleRoom = matchedRooms.find(room => room.BedType === "Single");
                const doubleRoom = matchedRooms.find(room => room.BedType === "Double");
                const fourRoom = matchedRooms.find(room => room.BedType === "Four");

                // Base64 image conversion function
                const convertBase64ToImage = (base64String, fileType) => {
                    // Remove whitespace from base64
                    let sBase64 = base64String.replace(/\s/g, "");

                    // Attempt to decode if not in expected format
                    try {
                        if (!sBase64.startsWith("iVB") && !sBase64.startsWith("data:image")) {
                            const decoded = atob(sBase64);

                            if (decoded.startsWith("iVB")) {
                                sBase64 = decoded;
                            }
                        }
                    } catch (e) {
                        // Safely ignore decode error, fallback to original base64
                        console.warn("Base64 decode error:", e);
                    }

                    // Use correct image type (default to jpeg if not provided)
                    const mimeType = fileType || "image/jpeg";
                    if (!sBase64) return "./image/Fallback.png";
                    if (sBase64.startsWith("data:image")) return sBase64;
                    return `data:${mimeType};base64,${sBase64}`;
                };


                // Prepare model data for visibility and images (using the fileType/MimeType property!)
                const oVisibilityData = {
                    singleVisible: !!singleRoom,
                    doubleVisible: !!doubleRoom,
                    fourVisible: !!fourRoom,
                    singleDesc: singleRoom?.Description || "",
                    doubleDesc: doubleRoom?.Description || "",
                    fourDesc: fourRoom?.Description || "",
                    singlePrice: singleRoom?.Price || "",
                    doublePrice: doubleRoom?.Price || "",
                    fourPrice: fourRoom?.Price || "",
                    singleImg: singleRoom?.File
                        ? convertBase64ToImage(singleRoom.File, singleRoom.MimeType || singleRoom.FileType || "image/jpeg")
                        : "./image/SingleBed.png",
                    doubleImg: doubleRoom?.File
                        ? convertBase64ToImage(doubleRoom.File, doubleRoom.MimeType || doubleRoom.FileType || "image/jpeg")
                        : "./image/DoubleBed.png",
                    fourImg: fourRoom?.File
                        ? convertBase64ToImage(fourRoom.File, fourRoom.MimeType || fourRoom.FileType || "image/jpeg")
                        : "./image/4Bed.png"
                };

                // Bind view models
                const oVisibilityModel = new JSONModel(oVisibilityData);
                oView.setModel(oVisibilityModel, "VisibilityModel");

                // Only matchedRooms are set in the RoomModel
                const oRoomsModel = new JSONModel({ Rooms: matchedRooms });
                oView.setModel(oRoomsModel, "RoomModel");

            } catch (error) {
                console.error("Data Load Failed:", error);
                sap.m.MessageToast.show("Error fetching room data.");
            }
        },



        onTabSelect: function (oEvent) {
            var oItem = oEvent.getParameter("item");
            const sKey = oItem.getKey();
            this.byId("pageContainer").to(this.byId(sKey));

            var page = this.byId(sKey);
            if (page && page.scrollTo) page.scrollTo(0, 0);

            // --- Open popup only when "Rooms" tab is selected ---
            if (sKey === "idRooms") {
                var that = this;

                // Initialize BranchModel if not yet done
                if (!this.getView().getModel("BranchModel")) {
                    const aBranches = [
                        { BranchCode: "KLB01", BranchName: "Kalaburgi" },
                        { BranchCode: "BR002", BranchName: "Mumbai" },
                        { BranchCode: "BR003", BranchName: "Nagpur" },
                        { BranchCode: "BR004", BranchName: "Nashik" }
                    ];
                    const oBranchModel = new sap.ui.model.json.JSONModel({ Branches: aBranches });
                    this.getView().setModel(oBranchModel, "BranchModel");
                }

                // Create popup dynamically (only once)
                if (!this._oLocationDialog) {
                    this._oLocationDialog = new sap.m.Dialog({
                        title: "Search Rooms by Location",
                        type: "Message",
                        contentWidth: "400px",
                        draggable: true,
                        resizable: true,
                        content: [
                            new sap.m.VBox({
                                width: "100%",
                                items: [
                                    new sap.m.Label({ text: "Select Location", labelFor: "idBranchCombo" }),
                                    new sap.m.ComboBox("idBranchCombo", {
                                        width: "100%",
                                        placeholder: "Select City...",
                                        items: {
                                            path: "BranchModel>/Branches",
                                            template: new sap.ui.core.Item({
                                                key: "{BranchModel>BranchCode}",
                                                text: "{BranchModel>BranchName}"
                                            })
                                        }
                                    }),
                                    new sap.m.Button({
                                        text: "Search",
                                        type: "Emphasized",
                                        icon: "sap-icon://search",
                                        press: function () {
                                            that.onSearchRooms();
                                        }
                                    })
                                ]
                            })
                        ]
                    });

                    this.getView().addDependent(this._oLocationDialog);
                }

                // Open popup every time the tab is selected
                this._oLocationDialog.open();
            }
        },


        onpressBookrooms: function () {
            var oTabHeader = this.byId("mainTabHeader");
            oTabHeader.setSelectedKey("idRooms");
            this.byId("pageContainer").to(this.byId("idRooms"));

            var page = this.byId("idRooms");
            if (page && page.scrollTo) page.scrollTo(0, 0);

            //  Preserve controller context
            var that = this;

            // --- Create popup dynamically ---
            if (!this._oLocationDialog) {
                this._oLocationDialog = new sap.m.Dialog({
                    title: "Search Rooms by Location",
                    type: "Message",
                    contentWidth: "400px",
                    draggable: true,
                    resizable: true,
                    content: [
                        new sap.m.VBox({
                            width: "100%",
                            items: [
                                new sap.m.Label({ text: "Select Location", labelFor: "idBranchCombo" }),
                                new sap.m.ComboBox("idBranchCombo", {
                                    width: "100%",
                                    placeholder: "Select City...",
                                    items: {
                                        path: "BranchModel>/Branches",
                                        template: new sap.ui.core.Item({
                                            key: "{BranchModel>BranchCode}",
                                            text: "{BranchModel>BranchName}"
                                        })
                                    }
                                }),
                                new sap.m.Button({
                                    text: "Search",
                                    type: "Emphasized",
                                    icon: "sap-icon://search",
                                    press: function () {
                                        that.onSearchRooms();
                                    }
                                })
                            ]
                        })
                    ]

                });

                this.getView().addDependent(this._oLocationDialog);
            }

            this._oLocationDialog.open();
        },
        onSearchRooms: function () {
            const oComboBox = sap.ui.getCore().byId("idBranchCombo");
            const sSelectedBranch = oComboBox.getSelectedKey();

            if (!sSelectedBranch) {
                sap.m.MessageToast.show("Please select a location first.");
                return;
            }

            //  Pass the selected BranchCode to your read call
            this._loadFilteredData(sSelectedBranch);

            // Close popup after triggering data load
            this._oLocationDialog.close();
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
        onSignUp: function () {
            var oDialog = this._oSignDialog;  // Assumes you stored the fragment dialog in this._oAuthDialog

            // Fetch user input values by ID with fragment's scoping: Fragment.byId(fragmentId, controlId)
            var sFullName = sap.ui.getCore().byId("signUpName").getValue();
            var sEmail = sap.ui.getCore().byId("signUpEmail").getValue();
            var sPhone = sap.ui.getCore().byId("signUpPhone").getValue();
            var sPassword = sap.ui.getCore().byId("signUpPassword").getValue();
            var sConfirmPass = sap.ui.getCore().byId("signUpConfirmPassword").getValue();

            // Basic validation example
            if (!sFullName || !sEmail || !sPassword || !sConfirmPass) {
                sap.m.MessageToast.show("Please enter all required fields correctly.");
                return;
            }

            var oPayload = {
                data: {
                    UserName: sFullName,
                    EmailID: sEmail,
                    MobileNo: sPhone,
                    Password: btoa(sPassword)
                }
            };
            $.ajax({
                url: "https://rest.kalpavrikshatechnologies.com/HM_Login",
                method: "POST",
                contentType: "application/json",
                headers: {
                    name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                    password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
                },
                data: JSON.stringify(oPayload),
                success: function (response) {
                    sap.m.MessageToast.show("Sign Up successful!");
                    oDialog.close();
                },
                error: function (xhr, status, error) {
                    sap.m.MessageToast.show("Error in Sign Up: " + error);
                }
            });
        },
        onSignIn: function () {
            var sUsername = sap.ui.getCore().byId("signInusername").getValue();
            var sPassword = sap.ui.getCore().byId("signInPassword").getValue();

            if (!sUsername || !sPassword) {
                sap.m.MessageToast.show("Please enter both username and password.");
                return;
            }

            var sUrl = "https://rest.kalpavrikshatechnologies.com/HM_Login";

            $.ajax({
                url: sUrl,
                type: "GET",
                contentType: "application/json",
                headers: {
                    name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                    password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
                },
                success: function (response) {
                    var aUsers = response?.commentData || [];
                    var oMatchedUser = null;

                    for (var i = 0; i < aUsers.length; i++) {
                        if (
                            aUsers[i].UserName === sUsername &&
                            aUsers[i].Password === btoa(sPassword)
                        ) {
                            oMatchedUser = aUsers[i];
                            break;
                        }
                    }
                    if (oMatchedUser) {
                        sap.m.MessageToast.show("Login Successful! Welcome, " + sUsername);
                        var oView = this.getView();
                        var oLoginBtn = oView.byId("loginButton");

                        if (oLoginBtn) {
                            oLoginBtn.setVisible(false);
                        }
                        var oAvatar = oView.byId("ProfileAvatar");
                        if (oAvatar) {
                            oAvatar.setVisible(true);
                        }
                        // Store user info in controller or as a global model
                        this._oLoggedInUser = oMatchedUser; // Store for later profile usage

                        // Clear inputs
                        sap.ui.getCore().byId("signInusername").setValue("");
                        sap.ui.getCore().byId("signInPassword").setValue("");

                        if (this._oSignDialog) {
                            this._oSignDialog.close();
                        }

                        //  Check role
                        if (oMatchedUser.Role && oMatchedUser.Role.trim() !== "") {
                            // User has a role → navigate to tilepage
                            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                            oRouter.navTo("TilePage");
                        } else {

                            sap.m.MessageToast.show(
                                "Welcome, " + sUsername + "! You are logged in successfully "
                            );
                        }

                    } else {
                        sap.m.MessageToast.show("Invalid credentials. Please try again.");
                    }
                }.bind(this),

                error: function (xhr, status, error) {
                    console.error("AJAX Error:", error);
                    sap.m.MessageToast.show("Failed to fetch login data: " + error);
                }
            });
        },




        onPressAvatar: async function () {
            var that = this;
            var oUser = this._oLoggedInUser || {};
            var sPhoto = "./image.jpg";

            try {
                const sUrl = "https://rest.kalpavrikshatechnologies.com/HM_Customer";
                const response = await $.ajax({
                    url: sUrl,
                    type: "GET",
                    contentType: "application/json",
                    headers: {
                        name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                        password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
                    }
                });

                const allCustomers = response?.Customers || [];

                const matchedBookings = allCustomers.filter(cust =>
                    cust.LoginID && cust.LoginID.toLowerCase() === oUser.ID?.toLowerCase()
                );

                const aBookingData = matchedBookings.map(item => ({
                    date: item.StartDate || "N/A",
                    room: item.RoomType || "N/A",
                    amount: item.Amount || "N/A"
                }));

                if (!this._oProfileDialog) {
                    const oDialog = await sap.ui.core.Fragment.load({
                        name: "sap.ui.com.project1.fragment.ManageProfile",
                        controller: this
                    });
                    this._oProfileDialog = oDialog;
                    this.getView().addDependent(oDialog);
                }

                const oProfileModel = new JSONModel({
                    photo: sPhoto,
                    initials: oUser.UserName ? oUser.UserName.charAt(0).toUpperCase() : "",
                    name: oUser.UserName || "",
                    email: oUser.EmailID || "",
                    phone: oUser.MobileNo || "",
                    bookings: aBookingData
                });

                this._oProfileDialog.setModel(oProfileModel, "profileData");

                const oSectionModel = new JSONModel({
                    selectedSection: "profile" // show Profile first
                });
                this._oProfileDialog.setModel(oSectionModel, "profileSectionModel");

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
        onSingleRoomPress: async function (oEvent) {
            if (this._oLoggedInUser === undefined) {
                MessageBox.alert("Please Signin to book a room.");
                return;
            }

            var price = this.getView().getModel("VisibilityModel").getData();

            const oButton = oEvent.getSource();
            const sRoomType = oButton.data("roomType");
            await this.Bookfragment();
            sap.ui.getCore().byId("idRoomType").setValue(sRoomType);
            sap.ui.getCore().byId("idPrice1").setValue(price.singlePrice);
            sap.ui.getCore().byId("idFullName").setValue(this._oLoggedInUser.UserName);
            sap.ui.getCore().byId("idE-mail").setValue(this._oLoggedInUser.EmailID);
            sap.ui.getCore().byId("idMobile").setValue(this._oLoggedInUser.MobileNo);
            // this.getView().getModel("HostelModel").setData(this._oLoggedInUser);
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

        // onSaveDialog: function () {
        //     // Final form submission logic
        //     MessageBox.success("Form submitted successfully!");
        // },

        onCancelDialog: function () {
            this.FCIA_Dialog.close();
            sap.ui.getCore().byId("idHostelWizardDialog").close();
        },
        //     onSaveDialog:function(){
        //             var payload=this.getView().getModel("HostelModel").getData();
        //              payload.DateOfBirth=payload.DateOfBirth.split("/").reverse().join("-");


        //         $.ajax({
        //     url: "https://rest.kalpavrikshatechnologies.com/HM_Customer",
        //     method: "POST",
        //     contentType: "application/json",
        //      headers: {
        //       name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
        //       password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
        //      },
        //     data: JSON.stringify({data:payload}),
        //     success: function(response) {
        //     }
        //     })
        // },
        onSaveDialog: function () {
            var logindata = this._oLoggedInUser
            var payload = this.getView().getModel("HostelModel").getData();
            payload.StartDate = payload.StartDate.split("/").reverse().join("-");
            payload.Status = "New";
            payload.RoomType = this.getView().getModel("HostelModel").getProperty("/RoomType");
            payload.LoginID = logindata.ID

            if (payload.DateOfBirth) {
                payload.DateOfBirth = payload.DateOfBirth.split("/").reverse().join("-");
            }

            var oFileUploader = sap.ui.getCore().byId("idFileUploader");
            var aFiles = oFileUploader.oFileUpload.files;

            if (!aFiles.length) {
                sap.m.MessageBox.error("Please select a file to upload.");
                return;
            }

            var oFile = aFiles[0]; // single file
            var reader = new FileReader();

            reader.onload = function (e) {
                var sBase64 = e.target.result.split(",")[1];
                payload.Documents = [
                    {
                        DocumentType: "ID Proof",
                        File: sBase64,
                        FileName: oFile.name[0],
                        FileType: oFile.type,

                    }
                ];
                //    Documents: "Uploaded via web",
                //                 EmployeeID: "emp-001"
                $.ajax({
                    url: "https://rest.kalpavrikshatechnologies.com/HM_Customer",
                    method: "POST",
                    contentType: "application/json",
                    headers: {
                        name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                        password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
                    },
                    data: JSON.stringify({ data: payload }),
                    success: function (response) {
                        sap.m.MessageToast.show("Booking successfully!");

                        oFileUploader.setValue("");

                    }.bind(this),
                    error: function (err) {
                        sap.m.MessageBox.error("Error uploading data or file.");
                    }
                });
            };
            this.FCIA_Dialog.close();
            reader.readAsDataURL(oFile);
        },
        onDoubleRoomPress: function (oEvent) {
            if (this._oLoggedInUser === undefined) {
                MessageBox.alert("Please signin to book a room.");
                return;
            }

            this.Bookfragment();
            const oButton = oEvent.getSource();
            var price = this.getView().getModel("VisibilityModel").getData();

            this.sRoomType = oButton.data("roomType");
            sap.ui.getCore().byId("idRoomType").setValue(this.sRoomType);
            sap.ui.getCore().byId("idPrice1").setValue(price.doublePrice);
            sap.ui.getCore().byId("idFullName").setValue(this._oLoggedInUser.UserName);
            sap.ui.getCore().byId("idE-mail").setValue(this._oLoggedInUser.EmailID);
            sap.ui.getCore().byId("idMobile").setValue(this._oLoggedInUser.MobileNo);

        },
        // onpressBookrooms: function (oEvent) {
        //          var oRouter = this.getOwnerComponent().getRouter();
        //     oRouter.navTo("TilePage");
        // //     this.Bookfragment();
        // //     const oButton = oEvent.getSource();
        // //                var price= this.getView().getModel("VisibilityModel").getData();

        // //     const sRoomType = oButton.data("roomType");
        // //     sap.ui.getCore().byId("idRoomType").setValue(sRoomType);
        // //  sap.ui.getCore().byId("idPrice1").setValue(price.fourPrice);
        // }        ,
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






    });
});
