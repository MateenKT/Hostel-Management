sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../utils/validation"
], function (BaseController, JSONModel, MessageToast, MessageBox, utils) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Hostel", {

        onInit: function () {
            const omodel = new JSONModel({
                // for Database connection
                url: "https://rest.kalpavrikshatechnologies.com/",
                headers: {
                    name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                    password:
                        "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
                    "Content-Type": "application/json",
                },
                isRadioVisible: false,
            });
            this.getOwnerComponent().setModel(omodel, "LoginModel");
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
            var ologin = new JSONModel({
                fullname: "",
                Email: "",
                Mobileno: "",
                password: "",
                comfirmpass: ""
            })
            this.getView().setModel(ologin, "LoginMode");

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
            setTimeout(() => {
                this._loadBranchCode();
            }, 100);

             setTimeout(() => {
                this._loadFilteredData("KLB01");
            }, 100);
             setTimeout(() => {
                this.onReadcallforRoom()
            }, 100);
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
            const oView = this.getView();
            const Response = await this.ajaxReadWithJQuery("HM_Branch", {})
            const abranch = Response?.data || [];
            oView.setModel(new JSONModel(abranch), "sBRModel")
        },


        _loadFilteredData: async function (sBranchCode, sACType) {

    try {
        const oView = this.getView();
        // Call backend to get all room data for this branch
        const response = await this.ajaxReadWithJQuery("HM_BedType", {
            BranchCode: sBranchCode
        });

        const allRooms = response?.data || [];

        //  Apply BOTH filters: BranchCode + ACType (if ACType provided)
        const matchedRooms = allRooms.filter(room => {
            const branchMatch =
                room.BranchCode &&
                room.BranchCode.toLowerCase() === sBranchCode.toLowerCase();

            const acTypeMatch = sACType
                ? room.ACType &&
                  room.ACType.toLowerCase() === sACType.toLowerCase()
                : true; // if no ACType selected, match all

            return branchMatch && acTypeMatch;
        });

        // Identify room types
        const singleRoom = matchedRooms.find(room => room.Name === "Single Bed");
        const doubleRoom = matchedRooms.find(room => room.Name === "Double Bed");
        const fourRoom = matchedRooms.find(room => room.Name === "Four Bed");

        // Base64 image helper
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

        // Prepare VisibilityModel
        const oVisibilityData = {

            singleName: singleRoom?.Name || "Single Bed",
            doubleName: doubleRoom?.Name || "Double Bed",
            fourName: fourRoom?.Name || "Four Bed",
            singleVisible: !!singleRoom,
            doubleVisible: !!doubleRoom,
            fourVisible: !!fourRoom,
            singleDesc: singleRoom?.Description || "",
            doubleDesc: doubleRoom?.Description || "",
            fourDesc: fourRoom?.Description || "",
            singlePrice: singleRoom?.Price || "",
            doublePrice: doubleRoom?.Price || "",
            fourPrice: fourRoom?.Price || "",
            singleImg: singleRoom?.RoomPhotos
                ? convertBase64ToImage(singleRoom.RoomPhotos, singleRoom.MimeType || singleRoom.FileType)
                : "./image/SingleBed.png",
            doubleImg: doubleRoom?.RoomPhotos
                ? convertBase64ToImage(doubleRoom.RoomPhotos, doubleRoom.MimeType || doubleRoom.FileType)
                : "./image/DoubleBed.png",
            fourImg: fourRoom?.RoomPhotos
                ? convertBase64ToImage(fourRoom.RoomPhotos, fourRoom.MimeType || fourRoom.FileType)
                : "./image/4Bed.png"
        };

        // Bind models
        oView.setModel(new JSONModel(oVisibilityData), "VisibilityModel");
        oView.setModel(new JSONModel({ Rooms: matchedRooms }), "RoomModel");

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

        },

       onpressFilter: function () {
    var that = this;

    // Destroy old dialog (optional safety) if you want a fresh one each time
    if (this._oLocationDialog) {
        this._oLocationDialog.destroy();
        this._oLocationDialog = null;
    }

    // Create new dialog dynamically
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
                            path: "sBRModel>/",
                            template: new sap.ui.core.Item({
                                key: "{sBRModel>BranchID}",
                                text: "{sBRModel>Name}"
                            })
                        }
                    }),

                    //  This section (AC Type ComboBox) only visible if user is logged in
                    new sap.m.Label("idACLabel", {
                        text: "Select Bed Type",
                        // visible: !!that._oLoggedInUser // dynamically controlled
                    }),
                    new sap.m.ComboBox("idACTypeCombo", {
                        width: "100%",
                        placeholder: "Select Bed Type...",
                        // visible: !!that._oLoggedInUser, // show only if logged in
                        items: {
                              path: "RoomCountModel>/Rooms",
                            template: new sap.ui.core.Item({
                                key: "{RoomCountModel>BranchCode}",
                                text: "{RoomCountModel>BedTypeName}"
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
    this._oLocationDialog.open();
},


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

        onSearchRooms: function () {
             const oBranchCombo = sap.ui.getCore().byId("idBranchCombo");
    const oACTypeCombo = sap.ui.getCore().byId("idACTypeCombo");

    const sSelectedBranch = oBranchCombo?.getSelectedKey();
    const sSelectedACType = oACTypeCombo?.getSelectedKey();

            if (!sSelectedBranch) {
                sap.m.MessageToast.show("Please select a location first.");
                return;
            }

            //  Pass the selected BranchCode to your read call
            this._loadFilteredData(sSelectedBranch,sSelectedACType);

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

            // Get input values
            var sUserid = sap.ui.getCore().byId("signInuserid").getValue();
            var sUsername = sap.ui.getCore().byId("signInusername").getValue();
            var sPassword = sap.ui.getCore().byId("signinPassword").getValue();

            // Basic validation example
            if (
               !utils._LCvalidateMandatoryField(sap.ui.getCore().byId("signInuserid"), "ID")|| !utils._LCvalidateMandatoryField(sap.ui.getCore().byId("signInusername"), "ID") ||
                !utils._LCvalidatePassword(sap.ui.getCore().byId("signinPassword"), "ID")
            ) {
                sap.m.MessageToast.show("Make sure all the mandatory fields are filled/validate the entered value");
                return;
            }

            try {
                //  Fetch all registered users (no payload — server ignores it anyway)
                const oResponse = await this.ajaxReadWithJQuery("HM_Login", "");

                const aUsers = oResponse?.commentData || [];

                //  Compare user-entered credentials with database records
                const oMatchedUser = aUsers.find(user =>
                   user.UserID === sUserid && user.UserName === sUsername && user.Password === btoa(sPassword)
                );

                if (oMatchedUser) {
                    sap.m.MessageToast.show("Login Successful! Welcome, " + sUsername);

                    const oView = this.getView();
                    const oLoginBtn = oView.byId("loginButton");
                    const oAvatar = oView.byId("ProfileAvatar");

                    if (oLoginBtn) oLoginBtn.setVisible(false);
                    if (oAvatar) oAvatar.setVisible(true);
   
                    //  Store logged-in user info for later use (Profile, Dashboard, etc.)
                    this._oLoggedInUser = oMatchedUser;

                    //  Optionally store in a global model for reuse
                    const oUserModel = new JSONModel(oMatchedUser);
                    sap.ui.getCore().setModel(oUserModel, "HostelModel");

                    //  Clear fields
                    sap.ui.getCore().byId("signInusername").setValue("");
                    sap.ui.getCore().byId("signinPassword").setValue("");

                    // Close dialog
                    if (this._oSignDialog) {
                        this._oSignDialog.close();
                    }
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

        // ✅ Fetch only the logged-in user's data
        const response = await this.ajaxReadWithJQuery("HM_Customer", {
            $filter: `UserID eq '${sUserID}'`
        });

        console.log("HM_Customer Response:", response);

        // ✅ Handle correct structure
        const aCustomers = response?.commentData || response?.Customers || response?.value || [];

        if (!Array.isArray(aCustomers) || aCustomers.length === 0) {
            sap.m.MessageToast.show("No customer data found for this user.");
            return;
        }

        // ✅ Get first customer record
        const oCustomer = aCustomers[0];
        console.log("Customer Record:", oCustomer);

        // ✅ Prepare booking data
        const aBookingData = (Array.isArray(oCustomer.Booking) ? oCustomer.Booking : []).map(booking => ({
            date: booking.StartDate ? new Date(booking.StartDate).toLocaleDateString("en-GB") : "N/A",
            room: booking.BedType || "N/A",
            amount: booking.RentPrice || "N/A",
            status: booking.Status || "N/A"
        }));

        console.log("Booking Data:", aBookingData);

        // ✅ Load fragment if not already loaded
        if (!this._oProfileDialog) {
            const oDialog = await sap.ui.core.Fragment.load({
                name: "sap.ui.com.project1.fragment.ManageProfile",
                controller: this
            });
            this._oProfileDialog = oDialog;
            this.getView().addDependent(oDialog);
        }

        // ✅ Create and bind the Profile Model
        const oProfileModel = new sap.ui.model.json.JSONModel({
            photo: sPhoto,
            initials: oUser.UserName ? oUser.UserName.charAt(0).toUpperCase() : "",
            name: oCustomer.CustomerName || oUser.UserName || "",
            email: oCustomer.CustomerEmail || oUser.EmailID || "",
            phone: oCustomer.MobileNo || oUser.MobileNo || "",
            dob: oCustomer.DateOfBirth
                ? new Date(oCustomer.DateOfBirth).toLocaleDateString("en-GB")
                : "",
            gender: oCustomer.Gender || "",
            nationality: oCustomer.Country || "",
            bookings: aBookingData
        });
        this._oProfileDialog.setModel(oProfileModel, "profileData");

        // ✅ Menu model (for tab switch)
        const oMenuModel = new sap.ui.model.json.JSONModel({
            items: [
                { title: "My Profile", icon: "sap-icon://employee", key: "profile" },
                { title: "Booking History", icon: "sap-icon://history", key: "devices" }
            ]
        });
        this._oProfileDialog.setModel(oMenuModel, "profileMenuModel");

        // ✅ Section model (default = booking if available)
        const oSectionModel = new sap.ui.model.json.JSONModel({
            selectedSection: aBookingData.length ? "devices" : "profile"
        });
        this._oProfileDialog.setModel(oSectionModel, "profileSectionModel");

        // ✅ Open the dialog
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
    try {
        // Get the clicked button and its custom data
        const oButton = oEvent.getSource();
        const sRoomType = oButton.data("roomType"); 

        // Get VisibilityModel from the view
        const oVisibilityModel = this.getView().getModel("VisibilityModel");
        if (!oVisibilityModel) {
            sap.m.MessageToast.show("Room details not found.");
            return;
        }

        // Get logged-in user ID
        const sUserID = sap.ui.getCore().getModel("HostelModel")?.getProperty("/UserID") || "";

        // Get the correct price based on room type
        let sPrice = "";
        switch (sRoomType) {
            case "Single Bed":
                sPrice = oVisibilityModel.getProperty("/singlePrice");
                break;
            case "Double Bed":
                sPrice = oVisibilityModel.getProperty("/doublePrice");
                break;
            case "Four Bed":
                sPrice = oVisibilityModel.getProperty("/fourPrice");
                break;
            default:
                sPrice = "";
        }

        // Create or update global HostelModel
        const oHostelModel = new JSONModel({
            UserID: sUserID,
            RoomType: sRoomType,
            Price: sPrice,
            PaymentType: "",
            Person: "",
            StartDate: "",
            EndDate: ""
        });

        sap.ui.getCore().setModel(oHostelModel, "HostelModel");

        // Navigate to booking page
        this.getOwnerComponent().getRouter().navTo("RouteBookRoom");

    } catch (err) {
        console.error("Booking navigation error:", err);
        sap.m.MessageToast.show("Error while booking room.");
    }
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
