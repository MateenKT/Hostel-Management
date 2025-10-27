sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
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

             var oProfileMenuModel = new sap.ui.model.json.JSONModel({
        items: [
            { title: "My Profile", icon: "sap-icon://person-placeholder", key: "profile" },
            { title: "Room-Mates", icon: "sap-icon://collaborate", key: "co-travellers" },
            { title: "Booking History", icon: "sap-icon://connected", key: "devices" },
            { title: "Logout", icon: "sap-icon://log", key: "logout" }
        ]
    });
    oView.setModel(oProfileMenuModel, "profileMenuModel");
            this._loadFilteredData("KLB01");
        },

        _loadFilteredData: function (sBranchCode) {
            var oView = this.getView();
            var sUrl = "https://rest.kalpavrikshatechnologies.com/HM_Master_Data";
            var sFilteredUrl = sUrl + "?BranchCode=" + encodeURIComponent(sBranchCode);

            $.ajax({
                url: sFilteredUrl,
                type: "GET",
                contentType: "application/json",

                headers: {
                    name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                    password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
                },
                success: function (response) {
                    console.log("Service call success", response);
                    const allRooms = response?.commentData || [];

                    // Use all rooms without filtering by Status
                    const singleRoom = allRooms.find(room => room.BedType === "Single");
                    const doubleRoom = allRooms.find(room => room.BedType === "Double");
                    const fourRoom = allRooms.find(room => room.BedType === "Four");

                    const oVisibilityModel = new JSONModel({
                        singleVisible: !!singleRoom,
                        doubleVisible: !!doubleRoom,
                        fourVisible: !!fourRoom,
                        singleDesc: singleRoom ? singleRoom.Description : "",
                        doubleDesc: doubleRoom ? doubleRoom.Description : "",
                        fourDesc: fourRoom ? fourRoom.Description : "",
                        singlePrice: singleRoom ? singleRoom.Price : "",
        doublePrice: doubleRoom ? doubleRoom.Price : "",
        fourPrice: fourRoom ? fourRoom.Price : ""
                    });
                    oView.setModel(oVisibilityModel, "VisibilityModel");

                    const oRoomsModel = new JSONModel({ Rooms: allRooms });
                    oView.setModel(oRoomsModel, "RoomModel");

                }.bind(this),
                error: function (xhr, status, error) {
                    console.error("AJAX Error:", status, error);
                    sap.m.MessageToast.show("Error fetching data: " + error);
                }
            });
        }
        ,

        onTabSelect: function (oEvent) {
            var oItem = oEvent.getParameter("item");
            const sKey = oItem.getKey();
            this.byId("pageContainer").to(this.byId(sKey));

            var page = this.byId(sKey);
            if (page && page.scrollTo) page.scrollTo(0, 0);
        },

        onpressBookrooms: function () {
            var oTabHeader = this.byId("mainTabHeader");
            oTabHeader.setSelectedKey("idRooms");
            this.byId("pageContainer").to(this.byId("idRooms"));

            var page = this.byId("idRooms");
            if (page && page.scrollTo) page.scrollTo(0, 0);
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
        }
        ,
     onSignIn: function() {
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
        success: function(response) {
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

           sap.ui.getCore().byId("signInusername").setValue("");
   sap.ui.getCore().byId("signInPassword").setValue("");
   
                if (this._oSignDialog) {
                    this._oSignDialog.close();
                }
            } else {
                sap.m.MessageToast.show("Invalid credentials. Please try again.");
            }
        }.bind(this),

        error: function(xhr, status, error) {
            console.error("AJAX Error:", error);
            sap.m.MessageToast.show("Failed to fetch login data: " + error);
        }
    });
},


       onPressAvatar: function () {
    var oUser = this._oLoggedInUser || {}; // Get stored user (from login)
    var sPhoto = "./image.jpg"; 

            if (!this._oProfileDialog) {
                sap.ui.core.Fragment.load({
                    name: "sap.ui.com.project1.fragment.ManageProfile",
                    controller: this
                }).then(function (oDialog) {
                    this._oProfileDialog = oDialog;
                    this.getView().addDependent(oDialog);

                            var oProfileModel = new JSONModel({
                        photo: sPhoto,
                        initials: oUser.UserName ? oUser.UserName.charAt(0).toUpperCase() : "",
                        name: oUser.UserName || "",
                        email: oUser.EmailID|| "",
                        phone: oUser.MobileNo || ""
                    });
                    oDialog.setModel(oProfileModel, "profileData");
                    oDialog.open();
                }.bind(this));
            } else {
        // Update model every time in case user changed
        var oProfileModel = new JSONModel({
            photo: sPhoto,
            initials: oUser.UserName ? oUser.UserName.charAt(0).toUpperCase() : "",
            name: oUser.UserName || "",
            email: oUser.Email || "",
            phone: oUser.MobileNo || ""
        });
        this._oProfileDialog.setModel(oProfileModel, "profileData");
                this._oProfileDialog.open();
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
        onSingleRoomPress: function (oEvent) {
            this.Bookfragment();
            const oButton = oEvent.getSource();
            const sRoomType = oButton.data("roomType");
            sap.ui.getCore().byId("idRoomType").setValue(sRoomType);


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
            var payload = this.getView().getModel("HostelModel").getData();
            payload.StartDate = payload.StartDate.split("/").reverse().join("-");
            payload.Status = "New";
            payload.RoomType = this.getView().getModel("HostelModel").getProperty("/RoomType");

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
                        FileName: oFile.name.split(".")[0],
                        FileType: oFile.name.split(".").pop(),

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
            this.Bookfragment();
            const oButton = oEvent.getSource();
            this.sRoomType = oButton.data("roomType");
            sap.ui.getCore().byId("idRoomType").setValue(this.sRoomType);
        },
        onFourRoomPress: function (oEvent) {
            this.Bookfragment();
            const oButton = oEvent.getSource();
            const sRoomType = oButton.data("roomType");
            sap.ui.getCore().byId("idRoomType").setValue(sRoomType);
        }
,
SectionPress: function(oEvent) {
    var oSelectedItem = oEvent.getParameter("listItem");
    if (oSelectedItem) {
        var oContext = oSelectedItem.getBindingContext("profileMenuModel");
        var oSectionData = oContext ? oContext.getObject() : null;

        if (oSectionData && oSectionData.key === "logout") {
            var oView = this.getView();

            // Show login button
            var oLoginBtn = oView.byId("loginButton");
            if (oLoginBtn) {
                oLoginBtn.setVisible(true);
            }

            // Hide profile avatar
            var oAvatar = oView.byId("ProfileAvatar");
            if (oAvatar) {
                oAvatar.setVisible(false);
            }
         if (this._oProfileDialog) this._oProfileDialog.close();
            // Optionally, perform logout logic here (clear session, navigate, etc.)
        } else {
            // Handle other menu item selections as needed
        }
    }
}




    });
});
