sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"../utils/validation",
], function(
	BaseController,
	JSONModel,
	Formatter, utils
) {
	"use strict";

	return BaseController.extend("sap.ui.com.project1.controller.Book_Room", {
		Formatter: Formatter,
		onInit: function() {

			const oUserModel = sap.ui.getCore().getModel("LoginModel");
			if (oUserModel) {
				this._oLoggedInUser = oUserModel.getData();
			} else {
				this._oLoggedInUser = {}; // fallback
			}
			let oHostelModel = sap.ui.getCore().getModel("HostelModel");

			if (!oHostelModel) {
				// If not found, create a fallback model
				oHostelModel = new JSONModel({
					UserID: "",
					RoomType: "",
					Price: "",
					PaymentType: "",
					Person: "",
					StartDate: "",
					EndDate: "",
          BedType: "",
					ACType: "",
					FinalPrice: "",
					SelectedPriceType: "",
          Capacity:""
				});
				sap.ui.getCore().setModel(oHostelModel, "HostelModel");
			}

			// Set it on the view

      // 🔥 Ensure defaults come from previous step (HostelModel)
			const oData = oHostelModel.getData();

			// If older fields exist, normalize them to new ones
			if (oData.RoomType && !oData.BedType && oData.RoomType.includes("-")) {
				const parts = oData.RoomType.split("-");
				oData.BedType = parts[0]?.trim();
				oData.ACType = parts[1]?.trim();
			}

			// Assign FinalPrice and SelectedPriceType
			if (oData.SelectedPriceValue) {
				oData.FinalPrice = oData.SelectedPriceValue;
			}

			if (oData.SelectedPriceType && !["daily", "monthly", "yearly"].includes(oData.SelectedPriceType)) {
				// Convert older values like "Per Month" to "monthly"
				const map = {
					"Per Day": "daily",
					"Per Month": "monthly",
					"Per Year": "yearly"
				};
				oData.SelectedPriceType = map[oData.SelectedPriceType] || "monthly";
			}

			oHostelModel.refresh(true);
			this.getView().setModel(oHostelModel, "HostelModel");

			setTimeout(() => {
				this._LoadFacilities()
			}, 100);
			var oBTn = new JSONModel({
				Next: false,
				Previous: false,
				Submit: false,
				Cancel: false,
				NXTVis: true,
				PERVIOUSVIS: false,
        Month:false,
        Year:false
			})
			this.getView().setModel(oBTn, "OBTNModel")
       var oEndDatePicker = this.getView().byId("idEndDate1")
       const sSelectedType = oData.SelectedPriceType?.toLowerCase() || "";

    if (sSelectedType === "daily") {
        oBTn.setProperty("/Month", false);

        oEndDatePicker.setEditable(true)
    } else if (sSelectedType === "monthly") {
        oBTn.setProperty("/Month", true);
        oEndDatePicker.setEditable(false)
    } else if (sSelectedType === "yearly") {
        oBTn.setProperty("/Month", true);

        oEndDatePicker.setEditable(false)
    }

    //  Refresh visibility
    oBTn.refresh(true);

			setTimeout(() => {
				this.Roomdetails();
			}, 100);
      const oLoginModeModel = new JSONModel({
                fullname: "",
                Email: "",
                Mobileno: "",
                password: "",
                comfirmpass: ""
            });
            this.getView().setModel(oLoginModeModel, "LoginMode")

			this.ajaxReadWithJQuery("Currency", "").then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                var model = new JSONModel(oFCIAerData);
                this.getView().setModel(model, "CurrencyModel");
            }).catch((err) => {
                console.error("Error fetching currency data:", err);
            });

            const oToday = new Date();
    // Strip time (set hours to 0) to avoid timezone offset issues
    oToday.setHours(0, 0, 0, 0);
    oHostelModel.setProperty("/TodayDate", oToday)
		},
		Roomdetails: async function() {
			try {
				const oData = await this.ajaxReadWithJQuery("HM_Rooms", {});
				let aBedTypes = Array.isArray(oData.commentData) ?
					oData.commentData :
					[oData.commentData];
				const oBedTypeModel = new JSONModel(aBedTypes);
				this.getView().setModel(oBedTypeModel, "RoomDetailModel");
				this._oWizard = this.byId("TC_id_wizard");
				this._iSelectedStepIndex = 0;
				this._oSelectedStep = this._oWizard.getSteps()[this._iSelectedStepIndex];
				this.handleButtonsVisibility();

			} catch (err) {
				console.error("Error while fetching Bed Type details:", err);
			}
		},
		_LoadFacilities: async function() {
			const oView = this.getView();
      let oHostelModel = sap.ui.getCore().getModel("HostelModel").getData();
      let oBranch = oHostelModel.BranchCode
       const filter = {
                    Brach: oBranch
                };
			const Response = await this.ajaxReadWithJQuery("HM_Facilities", filter);

			// Extract array safely
			const aFacilities = Response?.data || [];

			// Helper function to convert Base64 → data:image URL
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

			// Convert images and prepare data
			const aFinalFacilities = aFacilities.map(f => ({
				FacilityID: f.ID,
				FacilityName: f.FacilityName,
				Image: convertBase64ToImage(f.Photo1, f.Photo1Type),
        Price:f.Price,
        UnitText:f.UnitText
			}));

			//  Wrap in object for proper binding
			const oFacilityModel = new JSONModel({
				Facilities: aFinalFacilities
			});
			oView.setModel(oFacilityModel, "FacilityModel");
		},
    

		onNoOfPersonSelect: function(oEvent) {
			var that = this
       var sKey = "";
    if (oEvent && oEvent.getSource && oEvent.getSource().getSelectedKey) {
        sKey = oEvent.getSource().getSelectedKey();
    }
    // fallback to model value (in case we call this without an event)
    var oModel = this.getView().getModel("HostelModel");
    if (!sKey) {
        sKey = oModel.getProperty("/SelectedPerson");
    }
    const iPersons = parseInt(sKey) || 1;

    // If Persons already present and count matches, do nothing
    const oData = oModel.getData();
    if (oData.Persons && oData.Persons.length === iPersons) {
        return; // already created
    }
			// const iPersons = parseInt(oEvent.getSource().getSelectedKey());
			const oVBox = this.getView().byId("idPersonalContainer1");
			// const oModel = this.getView().getModel("HostelModel");
			const oFacilityModel = this.getView().getModel("FacilityModel");
			const oLoginModel = sap.ui.getCore().getModel("LoginModel");
			const sUserID = oLoginModel?.getData().UserID || "";
			// const oData = oModel.getData();

			oData.Persons = [];
			oVBox.destroyItems();
			oData.ForBothSelected = iPersons > 1;

			for (let i = 0; i < iPersons; i++) {
				oData.Persons.push({
					UserID: sUserID,
					FullName: "",
					DateOfBirth: "",
					Gender: "",
					MobileNo: "",
					CustomerEmail: "",
					Country: "",
					State: "",
					City: "",
					Address: "",
					Facilities: {
						SelectedFacilities: []
					},
					Documents: []
				});

				/** ---- PERSON FORM ---- **/
				const oForm = new sap.ui.layout.form.SimpleForm({
					editable: true,
					title: "Person " + (i + 1) + " Details",
					layout: "ColumnLayout",
					labelSpanXL: 4,
					labelSpanL: 3,
					labelSpanM: 4,
					columnsXL: 2,
					columnsL: 2,
					columnsM: 1,
					content: [
						//  Only show the checkbox for the first person
						...(i === 0 ?
							[
								new sap.m.Label({
									text: "Fill Yourself"
								}),
								new sap.m.CheckBox({
									 id:that.createId("IDSelfCheck_" + i),
								select: function (oEvent) {
  const oView = sap.ui.getCore().byId("idBookRoomView") || that.getView();
  const oModel = oView.getModel("HostelModel");
  const aPersons = oModel.getProperty("/Persons") || [];

  if (aPersons.length === 0) {
    sap.m.MessageToast.show("Please add personal information first.");
    return;
  }

  const bSelected = oEvent.getParameter("selected");

  // Access login model data
  const oLoginModel = sap.ui.getCore().getModel("LoginModel");
  const oUser = oLoginModel ? oLoginModel.getData() : null;

  if (bSelected) {
    if (!oUser || !oUser.UserID) {
      
      // Lazy-load fragment if not already created
      if (!that._oLoginAlertDialog) {
        that._oLoginAlertDialog = sap.ui.xmlfragment(
          that.createId("LoginAlertDialog"),
          "sap.ui.com.project1.fragment.SignInSignup", // Change to your dialog fragment path
          that
        );
        oView.addDependent(that._oLoginAlertDialog);
      }
      that._oLoginAlertDialog.open();

      // Uncheck the checkbox since login data is missing
      oEvent.getSource().setSelected(false);
      return;
    }

    // Fill first person data from login user info
    aPersons[0].FullName = oUser.UserName || "";
    aPersons[0].CustomerEmail = oUser.EmailID || "";
    aPersons[0].MobileNo = oUser.MobileNo || "";
    aPersons[0].UserID = oUser.UserID || "";

  } else {
    // Clear first person data when unchecked
    aPersons[0].FullName = "";
    aPersons[0].CustomerEmail = "";
    aPersons[0].MobileNo = "";
    aPersons[0].UserID = "";
  }

  oModel.refresh(true);
}
								})
							] :
							[]),
						new sap.m.Label({
							text: "Full Name",
              required: true
						}),
              new sap.m.ComboBox({
							selectedKey: "{HostelModel>/Persons/" + i + "/Gender}",
							items: [
								new sap.ui.core.ListItem({
									key: "Mr",
									text: "Mr"
								}),	new sap.ui.core.ListItem({
									key: "Mrs",
									text: "Mrs"
								}),
                	new sap.ui.core.ListItem({
									key: "Other",
									text: "Other"
								})
							]
						}),
						new sap.m.Input({
							value: "{HostelModel>/Persons/" + i + "/FullName}"
						}),
						new sap.m.Label({
							text: "UserID",
							required: true
						}),
						new sap.m.Input({
							value: "{HostelModel>/Persons/" + i + "/UserID}",
							editable: false,
							visible:false
						}),

						new sap.m.Label({
    text: "Date of Birth",
    required: true
}),
new sap.m.DatePicker({
    value: "{HostelModel>/Persons/" + i + "/DateOfBirth}",
    valueFormat: "dd/MM/yyyy",
    displayFormat: "dd/MM/yyyy",
    maxDate: (function () {
        // Calculate today's date minus 10 years
        const oToday = new Date();
        oToday.setFullYear(oToday.getFullYear() - 20);
        return oToday;
    })(),
    placeholder: "Select Date of Birth",
    change: function (oEvent) {
        const oDate = oEvent.getSource().getDateValue();
        if (oDate > new Date()) {
            sap.m.MessageToast.show("Date of Birth cannot be in the future.");
            oEvent.getSource().setValue("");
        }
    }
})
,

						new sap.m.Label({
							text: "Gender",
              required: true
						}),
						new sap.m.ComboBox({
							selectedKey: "{HostelModel>/Persons/" + i + "/Gender}",
							items: [
								new sap.ui.core.ListItem({
									key: "Male",
									text: "Male"
								}),
								new sap.ui.core.ListItem({
									key: "Female",
									text: "Female"
								}),
								new sap.ui.core.ListItem({
									key: "Other",
									text: "Other"
								})
							]
						}),

						new sap.m.Label({
							text: "Mobile",
              required: true
						}),
            new sap.m.ComboBox({
							selectedKey: "{HostelModel>/Persons/" + i + "/Gender}",
							items: [
								new sap.ui.core.ListItem({
									key: "",
									text: ""
								})
							]
						}),
						new sap.m.Input({
							value: "{HostelModel>/Persons/" + i + "/MobileNo}",
              type:"Number",
              liveChange:function(oEvent){
                 let sValue = oEvent.getParameter("value") || "";
        const oInput = oEvent.getSource();

        //  Allow only digits and strictly limit to 10
        sValue = sValue.replace(/\D/g, ""); // remove non-digits
        if (sValue.length > 10) {
            sValue = sValue.substring(0, 10); // cut off anything beyond 10
        }

        //  Set sanitized value back
        oInput.setValue(sValue);

        //  Real-time validation feedback
        if (sValue.length < 10) {
            oInput.setValueState("Error");
            oInput.setValueStateText("Mobile number must be 10 digits");
        } else {
            oInput.setValueState("None");
        }
             
              },
						}),

						new sap.m.Label({
							text: "Email",
              required: true,
              type:"Email"
						}),
						new sap.m.Input({
							value: "{HostelModel>/Persons/" + i + "/CustomerEmail}"
						}),

						new sap.m.Label({
							text: "Country",
              required: true
						}),
						new sap.m.Input({
							value: "{HostelModel>/Persons/" + i + "/Country}"
						}),

						new sap.m.Label({
							text: "City",
              required: true
						}),
						new sap.m.Input({
							value: "{HostelModel>/Persons/" + i + "/City}"
						}),

						new sap.m.Label({
							text: "Address",
							required: true
						}),
						new sap.m.TextArea({
							value: "{HostelModel>/Persons/" + i + "/Address}",
							placeholder: "Enter Permanent Address",
							rows: 3
						})
					]
				});

				// ---- Document Upload Section ----
				const oDocument = new sap.ui.layout.form.SimpleForm({
					editable: true,
					title: "Document Upload",
					layout: "ColumnLayout",
					content: [
						new sap.m.Label({
							text: "Upload ID Proof"
						}),
						new sap.ui.unified.FileUploader({
							width: "100%",
							customData: [new sap.ui.core.CustomData({
								key: "index",
								value: i
							})],
							change: function(oEvent) {
								const index = parseInt(oEvent.getSource().data("index"));
								const oFile = oEvent.getParameter("files")[0];
								if (oFile) {
									const reader = new FileReader();
									reader.onload = function(e) {
										const sBase64 = e.target.result.split(",")[1];
										oData.Persons[index].Document = sBase64;
										oData.Persons[index].FileName = oFile.name;
										oData.Persons[index].FileType = oFile.type;
										oModel.refresh(true);
									};
									reader.readAsDataURL(oFile);
								}
							}
						}),

					]
				});


				/** ---- FACILITIES SECTION (card layout) ---- **/
			 const oFacilities = new sap.m.Panel({
      headerText: "Facilities",
      expandable: true,
      expanded: true,
      content: [
        ...(i === 0 && iPersons > 1 ?
          [
            new sap.m.CheckBox({
              text: "For Both",
              selected: true,
              select: (e) => {
                oData.ForBothSelected = e.getParameter("selected");
                if (oData.ForBothSelected && iPersons > 1) {
                  // Copy selected facilities from first person to second person
                  oData.Persons[1].Facilities.SelectedFacilities = oData.Persons[0].Facilities.SelectedFacilities.map(f => ({...f}));
                }
                oModel.refresh(true);
              }
            })
          ] :
          []),

        new sap.m.FlexBox({
          wrap: "Wrap",
          alignItems: "Start",
          justifyContent: "SpaceAround",
          items: {
            path: "FacilityModel>/Facilities",
            template: new sap.m.VBox({
              width: "264px",
              height: "230px",
              alignItems: "Center",
              justifyContent: "Center",
              styleClass: "serviceCard",
              items: [
                // Facility Image + Overlay Name
                new sap.m.VBox({
                  width: "264px",
                  height: "178px",
                  styleClass: "imageContainer",
                  items: [
                    new sap.m.Image({
                      src: "{FacilityModel>Image}",
                      width: "264px",
                      height: "178px",
                      class: "serviceImage",
                      densityAware: false,
                      press: function (oEvent) {
                        const oCtx = oEvent.getSource().getBindingContext("FacilityModel");
                        const oFacilityObj = oCtx.getObject();
                        const aPersons = oModel.getProperty("/Persons");
                        const aSelected = aPersons[i].Facilities.SelectedFacilities;
                        const oCard = oEvent.getSource().getParent().getParent();
                        const bAlreadySelected = aSelected.find(f => f.FacilityName === oFacilityObj.FacilityName);

                        if (bAlreadySelected) {
                          const idx = aSelected.findIndex(f => f.FacilityName === oFacilityObj.FacilityName);
                          aSelected.splice(idx, 1);
                          oCard.removeStyleClass("serviceCardSelected");
                        } else {
                          aSelected.push({
                            FacilityName: oFacilityObj.FacilityName,
                            Price: oFacilityObj.Price,
                            Image: oFacilityObj.Image
                          });
                          oCard.addStyleClass("serviceCardSelected");
                        }

                        // If "For Both" is selected, copy selected facilities to second person
                        if (oData.ForBothSelected && iPersons > 1) {
                          oData.Persons[1].Facilities.SelectedFacilities = aSelected.map(f => ({...f}));
                        }

                        oModel.refresh(true);
                      }
                    }),

                    // Facility name overlay (hover effect)
                    (() => {
                      const oHTML = new sap.ui.core.HTML({
                        content: `
                      <div class="facility-overlay">
                        <a href="#" class="facility-overlay-link">{FacilityModel>FacilityName}</a>
                      </div>
                    `
                      }).bindElement("FacilityModel");
                      return oHTML;
                    })()
                  ]
                }),

                // Facility Price (below the image)
                new sap.m.Text({
                  text: "{= '₹ ' + ${FacilityModel>Price}}"
                }).addStyleClass("sapUiTinyMarginTop facilityPriceText")
              ]
            })
          }
        })
      ],
      visible: {
        path: "HostelModel>/ForBothSelected",
        formatter: function (bSel) {
          if (bSel && i > 0) return false;
          return true;
        }
      }
    });

    // Add sections for each person
    oVBox.addItem(oForm);
    oVBox.addItem(oDocument);
    oVBox.addItem(oFacilities);
  }

  oModel.refresh(true);
},
    _checkMandatoryFields: function() {
    const oModel = this.getView().getModel("HostelModel");
    const aPersons = oModel.getProperty("/Persons") || [];
    let bAllValid = true;

    aPersons.forEach((oPerson, iIndex) => {
        // List all your required fields here
        const aFields = [
            { key: "FullName", label: "Full Name" },
            { key: "DateOfBirth", label: "Date of Birth" },
            { key: "Gender", label: "Gender" },
            { key: "MobileNo", label: "Mobile" },
            { key: "CustomerEmail", label: "Email" },
            { key: "Country", label: "Country" },
            { key: "City", label: "City" },
            { key: "Address", label: "Address" }
        ];
        aFields.forEach(field => {
            const sValue = oPerson[field.key];
            if (!sValue || sValue.trim() === "") {
                bAllValid = false;
            }
        });
    });

    return bAllValid;
},

    onDialogClose: function () {
            this._oLoginAlertDialog.close()
        },
         onSignIn: async function () {
    const oLoginModel = this.getView().getModel("LoginModel");

    // Access the fragment inputs safely
    const sUserId = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInuserid")?.getValue();
    const sUserName = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInusername")?.getValue();
    const sPassword = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signinPassword")?.getValue();

    // Basic validation
    if (!sUserId || !sUserName || !sPassword) {
        sap.m.MessageToast.show("Please fill in all fields.");
        return;
    }

    try {
        const oResponse = await this.ajaxReadWithJQuery("HM_Login", "");
        const aUsers = oResponse?.commentData || [];

        const oMatchedUser = aUsers.find(user =>
            user.UserID === sUserId &&
            user.UserName === sUserName &&
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
            const oUserModel = new sap.ui.model.json.JSONModel(oMatchedUser);
            sap.ui.getCore().setModel(oUserModel, "LoginModel");

            // Clear input fields
            sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInusername").setValue("");
            sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signinPassword").setValue("");

            // Close dialog
            if (this._oLoginAlertDialog) this._oLoginAlertDialog.close();

            sap.m.MessageToast.show("Login successful!");
        } else {
            sap.m.MessageToast.show("Invalid credentials.");
        }

    } catch (err) {
        console.error("Login Error:", err);
        sap.m.MessageToast.show("Failed to fetch login data: " + err);
    }
}
,
		onDialogNextButton: async function() {
    //     if (this._iSelectedStepIndex === 1) {
    //     if (!this._checkMandatoryFields()) {
    //         sap.m.MessageToast.show("Please fill all mandatory personal details before proceeding.");
    //         return; // STOP navigation
    //     }
    // }
			this._iSelectedStepIndex = this._oWizard.getSteps().indexOf(this._oSelectedStep);
			this.oNextStep = this._oWizard.getSteps()[this._iSelectedStepIndex + 1];
			if (this._oSelectedStep && !this._oSelectedStep.bLast) {
				this._oWizard.goToStep(this.oNextStep, true);
			} else {
				this._oWizard.nextStep();
			}
			this._iSelectedStepIndex++;
			this._oSelectedStep = this.oNextStep;
      
			this.handleButtonsVisibility();
		},

		onDialogBackButton: function() {
			this._iSelectedStepIndex = this._oWizard.getSteps().indexOf(this._oSelectedStep);
			var oPreviousStep = this._oWizard.getSteps()[this._iSelectedStepIndex - 1];

			if (this._oSelectedStep) {
				this._oWizard.goToStep(oPreviousStep, true);
			} else {
				this._oWizard.previousStep();
			}

			this._iSelectedStepIndex--;
			this._oSelectedStep = oPreviousStep;

			this.handleButtonsVisibility();
		},
		handleNavigationChange: function(oEvent) {
			this._oSelectedStep = oEvent.getParameter("step");
			this._iSelectedStepIndex = this._oWizard.getSteps().indexOf(this._oSelectedStep);
			this.handleButtonsVisibility();
		},

		handleButtonsVisibility: function() {
			var oModel = this.getView().getModel("OBTNModel");
      const oHostelModel =  this.getView().getModel("HostelModel")
			oModel.setProperty("/Submit", false);
			oModel.setProperty("/Cancel", false);
			switch (this._iSelectedStepIndex) {
				case 0:
					oModel.setProperty("/NXTVis", true);
					oModel.setProperty("/PERVIOUSVIS", false);
					break;
				case 1:
					oModel.setProperty("/PERVIOUSVIS", true);
					oModel.setProperty("/NXTVis", true);
           try {
        // First try to get the Select control and call handler with a fake event
        const oSelect = this.getView().byId("id_Noofperson1");
        if (oSelect) {
            // call original handler with a synthetic event object that provides getSource()
            this.onNoOfPersonSelect({ getSource: function() { return oSelect; } });
        } else {
            // fallback: call handler without event so it uses model value
            this.onNoOfPersonSelect();
        }
    } catch (e) {
        // safe fallback: call without event
        this.onNoOfPersonSelect();
    }
            this._LoadFacilities()
					break;
				case 2:
         
					oModel.setProperty("/Submit", true);
					oModel.setProperty("/Cancel", true);
					oModel.setProperty("/NXTVis", false);
					oModel.setProperty("/PERVIOUSVIS", false);
          
            this.TC_onDialogNextButton()
					break;
				default:
					break;
			}
		},

TC_onDialogNextButton: function () { 
    const oView = this.getView();
    const oHostelModel = oView.getModel("HostelModel");
    const aPersons = oHostelModel.getProperty("/Persons") || [];

    const sStartDate = oHostelModel.getProperty("/StartDate");
    const sEndDate = oHostelModel.getProperty("/EndDate");
    const sDurationType = oHostelModel.getProperty("/SelectedPriceType"); // daily, monthly, yearly
    const iSelectedMonthsOrYears = parseInt(oHostelModel.getProperty("/SelectedMonths") || "1", 10);
    const perUnitPrice = parseFloat(oHostelModel.getProperty("/FinalPrice")) || 0;

    // Convert dates
    const oStartDate = this._parseDate(sStartDate);
    const oEndDate = this._parseDate(sEndDate);

    const iDays = Math.ceil((oEndDate - oStartDate) / (1000 * 3600 * 24));
    if (iDays <= 0) {
        sap.m.MessageToast.show("End Date must be after Start Date");
        return;
    }

    // ⭐ PRICE CALCULATION BASED ON DURATION
    let totalFinalPrice = 0;

    if (sDurationType === "daily") {
        totalFinalPrice = perUnitPrice * iDays;
    }
    else if (sDurationType === "monthly") {
        totalFinalPrice = perUnitPrice * iSelectedMonthsOrYears;
    }
    else if (sDurationType === "yearly") {
        totalFinalPrice = perUnitPrice * iSelectedMonthsOrYears;
    }

    // ⭐ UPDATE FINAL PRICE FOR DISPLAY
    oHostelModel.setProperty("/FinalPrice", totalFinalPrice);

    // Continue your existing logic...
    const totals = this.calculateTotals(aPersons, sStartDate, sEndDate, perUnitPrice);
    if (!totals) return;

    const aUpdatedPersons = aPersons.map((oPerson, iIndex) => {
        const personName = oPerson.FullName || `Person ${iIndex + 1}`;
        const aPersonFacilities = (totals.AllSelectedFacilities || []).filter(
            f => f.PersonName === personName
        );

        const facilityTotal = aPersonFacilities.reduce((sum, f) => {
            const iPrice = parseFloat(f.Price) || 0;
            const iDays = parseFloat(f.TotalDays) || 0;
            return sum + (iPrice * iDays);
        }, 0);

        return {
            ...oPerson,
            PersonFacilitiesSummary: aPersonFacilities,
            AllSelectedFacilities: aPersonFacilities,
            TotalFacilityPrice: facilityTotal,
            GrandTotal: totalFinalPrice + facilityTotal,
            TotalDays: iDays
        };
    });

    const totalFacilitySum = aUpdatedPersons.reduce((sum, obj) => sum + obj.TotalFacilityPrice, 0);
    const grandTotalSum = aUpdatedPersons.reduce((sum, obj) => sum + obj.GrandTotal, 0);

    oHostelModel.setProperty("/Persons", aUpdatedPersons);
    oHostelModel.setProperty("/TotalDays", iDays);
    oHostelModel.setProperty("/TotalFacilityPrice", totalFacilitySum);
    oHostelModel.setProperty("/GrandTotal", grandTotalSum);

    oHostelModel.updateBindings(true);
},


		// Separated calculation function
		calculateTotals: function(aPersons, sStartDate, sEndDate, roomRentPrice) {
				const oStartDate = this._parseDate(sStartDate);
				const oEndDate = this._parseDate(sEndDate);
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
						const fPrice = parseFloat(f.Price || 0);
						totalFacilityPricePerDay += fPrice;
						const fTotal = fPrice * iDays;

						aAllFacilities.push({
							PersonName: oPerson.FullName || `Person ${iIndex + 1}`,
							FacilityName: f.FacilityName,
							Price: fPrice,
							StartDate: sStartDate,
							EndDate: sEndDate,
							TotalDays: iDays,
							TotalAmount: fTotal,
							Image: f.Image
						});
					});
				});

				const totalFacilityPrice = totalFacilityPricePerDay * iDays;
				const grandTotal = totalFacilityPrice + Number(roomRentPrice || 0);

				return {
					TotalDays: iDays,
					TotalFacilityPrice: totalFacilityPrice,
					GrandTotal: grandTotal,
					AllSelectedFacilities: aAllFacilities
				};
			}

			,

		// Helper function to parse date
		_parseDate: function(sDate) {
			const aParts = sDate.split("/");
			return new Date(aParts[2], aParts[1] - 1, aParts[0]);
		},

		TC_onDialogBackButton: function() {
			const oWizard = this.getView().byId("TC_id_wizard");
			oWizard.previousStep();
		},

	onFieldValidation: function (oEvent) {
    const oView = this.getView();
    const oHostelModel = oView.getModel("HostelModel");
    const oBtnModel = oView.getModel("OBTNModel");

    const oData = oHostelModel.getData();
    const oStartDatePicker = oView.byId("idStartDate1");
    const oEndDatePicker = oView.byId("idEndDate1");

    const sStartDate = oStartDatePicker?.getValue() || "";
    const sEndDate = oEndDatePicker?.getValue() || "";
    const sPaymentType = oData.SelectedPriceType || oView.byId("idPaymentMethod1")?.getSelectedKey() || "";
    const sPerson = oData.Person || oView.byId("id_Noofperson1")?.getSelectedKey() || "";
    const iSelectedMonths = parseInt(oHostelModel.getProperty("/SelectedMonths") || 1, 10);

    let bAllFilled = sPaymentType && sPerson && sStartDate && sEndDate;

    // ✅ Auto-calculate End Date if plan is "monthly" and Start Date selected
    if (oEvent.getSource().getId().includes("idStartDate1") && sStartDate && sPaymentType === "monthly") {
        const oStart = this._parseDate(sStartDate);
        if (oStart instanceof Date && !isNaN(oStart)) {
            const oNewEnd = new Date(oStart);
            // Add 30 days per month
            oNewEnd.setDate(oStart.getDate() + (30 * iSelectedMonths));
            const sNewEndDate = this._formatDateToDDMMYYYY(oNewEnd);

            // Update model and picker
            oHostelModel.setProperty("/EndDate", sNewEndDate);
            oEndDatePicker.setValue(sNewEndDate);

            // Enable "Next" automatically
            oBtnModel.setProperty("/Next", true);
            return;
        }
    }

    // ✅ Validate: End Date cannot be before Start Date
    if (sStartDate && sEndDate) {
        const oStart = this._parseDate(sStartDate);
        const oEnd = this._parseDate(sEndDate);

        if (oEnd < oStart) {
            oEndDatePicker.setValueState("Error");
            oEndDatePicker.setValueStateText("End date cannot be before start date");
            sap.m.MessageToast.show("End date cannot be before start date");
            oHostelModel.setProperty("/EndDate", "");
            oBtnModel.setProperty("/Next", false);
            return;
        } else {
            oEndDatePicker.setValueState("None");
        }
    }

    // ✅ Control “Next” button visibility based on EndDate validity
    const bEndDateValid = !!(sEndDate && sEndDate.trim() !== "");
    oBtnModel.setProperty("/Next", !!(bAllFilled && bEndDateValid));
}
,
onMonthSelectionChange: function (oEvent) {
    const oView = this.getView();
    const oHostelModel = oView.getModel("HostelModel");

    const sStartDate = oView.byId("idStartDate1")?.getValue() || "";
    const iSelectedNumber = parseInt(oEvent.getSource().getSelectedKey() || "1", 10);
    const sDuration = oHostelModel.getProperty("/SelectedPriceType");  // daily / monthly / yearly

    if (!sStartDate) {
        sap.m.MessageToast.show("Please select Start Date first.");
        return;
    }

    const oStart = this._parseDate(sStartDate);
    if (!(oStart instanceof Date) || isNaN(oStart)) {
        sap.m.MessageToast.show("Invalid Start Date.");
        return;
    }

    let iDaysToAdd = 0;

    // ⭐ APPLY LOGIC BASED ON BOOKING DURATION
    switch (sDuration) {
        case "monthly":
            iDaysToAdd = iSelectedNumber * 30; // per month logic
            break;

        case "yearly":
            iDaysToAdd = iSelectedNumber * 365; // per year logic
            break;

        case "daily":
            sap.m.MessageToast.show("Duration is per day. No month/year selection needed.");
            return;
    }

    // Calculate End Date
    const oEnd = new Date(oStart);
    oEnd.setDate(oStart.getDate() + iDaysToAdd);

    const sEndDate = this._formatDateToDDMMYYYY(oEnd);

    // Update model + Field
    oHostelModel.setProperty("/EndDate", sEndDate);
    oView.byId("idEndDate1")?.setValue(sEndDate);
}

,

_formatDateToDDMMYYYY: function (oDate) {
    if (!(oDate instanceof Date)) return "";
    const dd = String(oDate.getDate()).padStart(2, "0");
    const mm = String(oDate.getMonth() + 1).padStart(2, "0");
    const yyyy = oDate.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
},

		onNavBack: function() {
			var oRouter = this.getOwnerComponent().getRouter();
			oRouter.navTo("RouteHostel");
		},

		TC_handleNavigationChange: function(oEvent) {
			const oWizard = oEvent.getSource();
			const oCurrentStep = oEvent.getParameter("step");
			const oView = this.getView();
			const oBtnModel = oView.getModel("OBTNModel");

			// Get step IDs
			const sStepId = oCurrentStep.getId();

			// Reset all button visibilities
			oBtnModel.setProperty("/Submit", false);
			oBtnModel.setProperty("/Cancel", false);
			oBtnModel.setProperty("/PERVIOUSVIS", false);
			oBtnModel.setProperty("/NXTVis", false);

			// Identify current step
			if (sStepId.includes("TC_id_stepGeneralInfo")) {
				// Step 1 → Show only Next
				oBtnModel.setProperty("/NXTVis", true);
			} else if (sStepId.includes("idStepPersonal1")) {
				// Step 2 → Show Previous and Next
				oBtnModel.setProperty("/PERVIOUSVIS", true);
				oBtnModel.setProperty("/NXTVis", true);
			} else if (sStepId.includes("id_Summary")) {
				// Step 3 → Show Proceed to Pay and Cancel
				oBtnModel.setProperty("/Submit", true);
				oBtnModel.setProperty("/Cancel", true);
			}

			// Optional: enable next by default (if needed)
			oBtnModel.setProperty("/Next", true);
		},

		// onRoomDurationChange: function(oEvent) {
		// 	const sSelectedDuration = oEvent.getParameter("selectedItem").getKey(); // E.g. "Daily", "Monthly", "Yearly" if any
		// 	const oHostelModel = this.getView().getModel("HostelModel");
		// 	const oRoomDetailModel = this.getView().getModel("RoomDetailModel");

		// 	// Get current RoomType value
		// 	const sRoomType = this.getView().byId("GI_Roomtype").getText();

		// 	// Get all RoomDetail entries
		// 	const aRoomDetails = oRoomDetailModel.getData(); // assumes array at root "/"

		// 	// Find matching room detail by BedTypeName == RoomType
		// 	const oMatchingRoom = aRoomDetails.find(item => item.BedTypeName === sRoomType);

		// 	if (oMatchingRoom) {
		// 		let sNewPrice = "";
		// 		if (sSelectedDuration === "Per Day") {
		// 			sNewPrice = oMatchingRoom.Price; // Daily price field
		// 		} else if (sSelectedDuration === "Monthly" || sSelectedDuration === "Per Month") {
		// 			sNewPrice = oMatchingRoom.MonthPrice; // Monthly price field
		// 		} else if (sSelectedDuration === "Yearly" || sSelectedDuration === "Per Year") {
		// 			sNewPrice = oMatchingRoom.YearPrice; // Optional yearly price if exists
		// 		} else {
		// 			sNewPrice = oMatchingRoom.Price; // default fallback
		// 		}

		// 		// Update Price in HostelModel
		// 		oHostelModel.setProperty("/Price", sNewPrice);

		// 	} else {
		// 		// No matching room found - clear price or handle otherwise
		// 		oHostelModel.setProperty("/Price", "");
		// 	}
		// },
onRoomDurationChange: function (oEvent) {
    const oView = this.getView();
    const oHostelModel = oView.getModel("HostelModel");
    const oRoomDetailModel = oView.getModel("RoomDetailModel");
    const oBTN = oView.getModel("OBTNModel");

    if (!oHostelModel || !oRoomDetailModel || !oBTN) {
        console.warn("⚠️ Missing models");
        return;
    }

    const sSelectedKey = oEvent.getParameter("selectedItem").getKey(); // daily / monthly / yearly
    const iSelectedValue = parseInt(oHostelModel.getProperty("/SelectedMonths") || "1", 10);  // <-- HOW MANY MONTH/YEAR
    const sStartDate = oHostelModel.getProperty("/StartDate");

    // ⭐ UPDATE PRICE (same as your code)
    const sRoomType = oView.byId("GI_Roomtype")?.getText()?.trim() || "";
    const aRoomDetails = oRoomDetailModel.getData();
    const normalize = v => (v ? String(v).trim().toLowerCase() : "");
    const oMatchingRoom = aRoomDetails.find(item => normalize(item.BedTypeName) === normalize(sRoomType));

    if (!oMatchingRoom) {
        oHostelModel.setProperty("/FinalPrice", "");
        return;
    }

    let sNewPrice = "";
    switch (sSelectedKey) {
        case "daily":   sNewPrice = oMatchingRoom.Price; break;
        case "monthly": sNewPrice = oMatchingRoom.MonthPrice; break;
        case "yearly":  sNewPrice = oMatchingRoom.YearPrice; break;
    }

    oHostelModel.setProperty("/FinalPrice", sNewPrice);
    oHostelModel.setProperty("/SelectedPriceType", sSelectedKey);

    const oEndDatePicker = oView.byId("idEndDate1");

    // ⭐ DAILY → user selects end date manually
    if (sSelectedKey === "daily") {
        oBTN.setProperty("/Month", false);
        oEndDatePicker.setEditable(true);
        return;
    }

    // ⭐ MONTHLY or YEARLY → need “How Many Month/Year”
    oBTN.setProperty("/Month", true);
    oEndDatePicker.setEditable(false);

    // NEED START DATE FIRST
    if (!sStartDate) {
        oHostelModel.setProperty("/EndDate", "");
        oEndDatePicker.setValue("");
        return;
    }

    const oStart = this._parseDate(sStartDate);
    if (!(oStart instanceof Date) || isNaN(oStart)) return;

    // ⭐ FINAL CALCULATION (THIS IS WHAT YOU ASKED FOR)
    let daysToAdd = 0;

    if (sSelectedKey === "monthly") {
        daysToAdd = iSelectedValue * 30;       // ← SelectedMonths × 30
    } 
    else if (sSelectedKey === "yearly") {
        daysToAdd = iSelectedValue * 365;      // ← SelectedYears × 365
    }

    const oEnd = new Date(oStart);
    oEnd.setDate(oEnd.getDate() + daysToAdd);

    const sEnd = this._formatDateToDDMMYYYY(oEnd);

    // Update model + picker
    oHostelModel.setProperty("/EndDate", sEnd);
    oEndDatePicker.setValue(sEnd);

    oBTN.refresh(true);
    oHostelModel.refresh(true);
}
,
onOpenProceedtoPay: function() {
			if (!this._oPaymentDialog) {
				this._oPaymentDialog = sap.ui.xmlfragment(
					"sap.ui.com.project1.fragment.PaymentPage",
					this
				);
				this.getView().addDependent(this._oPaymentDialog);
			}

			// Reset input fields
			const aFields = [
				"idBankName", "idAmount", "idPaymentTypeField", "idTransactionID",
				"idPaymentDate", "idCurrency", "idUPIID", "idCardNumber", "idCardExpiry", "idCardCVV"
			];
			aFields.forEach(id => sap.ui.getCore().byId(id)?.setValue(""));

			// Default visibility (UPI)
			sap.ui.getCore().byId("idPaymentTypeGroup").setSelectedIndex(0);
			this._togglePaymentSections(true);

			this._oPaymentDialog.open();
		},

		onPaymentTypeSelect: function(oEvent) {
			const selectedIndex = oEvent.getSource().getSelectedIndex();
			const isUPI = selectedIndex === 0;

			this._togglePaymentSections(isUPI);

			// Auto-fill Payment Type
			const sType = isUPI ? "UPI" : "Debit/Credit Card";
			sap.ui.getCore().byId("idPaymentTypeField").setValue(sType);
		},

		_togglePaymentSections: function(isUPI) {
			// UPI Fields
			sap.ui.getCore().byId("lblUPIID").setVisible(isUPI);
			sap.ui.getCore().byId("idUPIID").setVisible(isUPI);
			sap.ui.getCore().byId("lblUPIImage").setVisible(isUPI);
			sap.ui.getCore().byId("idUPIImage").setVisible(isUPI);

			// Card Fields
			sap.ui.getCore().byId("lblCardNumber").setVisible(!isUPI);
			sap.ui.getCore().byId("idCardNumber").setVisible(!isUPI);
			sap.ui.getCore().byId("lblCardExpiry").setVisible(!isUPI);
			sap.ui.getCore().byId("idCardExpiry").setVisible(!isUPI);
			sap.ui.getCore().byId("lblCardCVV").setVisible(!isUPI);
			sap.ui.getCore().byId("idCardCVV").setVisible(!isUPI);
		},

		onPaymentClose: function() {
			if (this._oPaymentDialog) {
				this._oPaymentDialog.close();
			}

			const aFields = [
				"idBankName", "idAmount", "idPaymentTypeField", "idTransactionID",
				"idPaymentDate", "idCurrency", "idUPIID", "idCardNumber", "idCardExpiry", "idCardCVV"
			];
			aFields.forEach(id => sap.ui.getCore().byId(id)?.setValue(""));
		},

		onBankNameChange: function(oEvent) {
			const oInput = oEvent.getSource();
			utils._LCvalidateMandatoryField(oEvent);
			if (oInput.getValue() === "") oInput.setValueState("None");
		},

		onAmountChange: function(oEvent) {
			const oInput = oEvent.getSource();
			utils._LCvalidateAmount(oEvent);
			if (oInput.getValue() === "") oInput.setValueState("None");
		},

		onCurrencyChange: function(oEvent) {
			const oInput = oEvent.getSource();
			utils._LCstrictValidationComboBox(oEvent);
			if (oInput.getValue() === "") oInput.setValueState("None");
		},

		onPaymentTypeChange: function(oEvent) {
			const oInput = oEvent.getSource();
			utils._LCvalidateMandatoryField(oEvent);
			if (oInput.getValue() === "") oInput.setValueState("None");
		},

		onTransactionIDChange: function(oEvent) {
			const oInput = oEvent.getSource();
			utils._LCvalidateMandatoryField(oEvent);
			if (oInput.getValue() === "") oInput.setValueState("None");
		},

		onChangeUPIID: function(oEvent) {
			const oInput = oEvent.getSource();
			utils._LCvalidateMandatoryField(oEvent);
			if (oInput.getValue() === "") oInput.setValueState("None");
		},

		onPaymentDateChange: function(oEvent) {
			const oInput = oEvent.getSource();
			if (!oInput.getValue()) {
				oInput.setValueState("Error");
				oInput.setValueStateText("Select Payment Date");
			} else {
				oInput.setValueState("None");
			}
		},

		onSubmitPress: async function() {
			const oModel = this.getView().getModel("HostelModel");
			const oData = oModel.getData();

			// Mandatory validation
			const isMandatoryValid = (
				utils._LCvalidateMandatoryField(sap.ui.getCore().byId("idUPIID"), "ID") &&
				utils._LCvalidateMandatoryField(sap.ui.getCore().byId("idBankName"), "ID") &&
				utils._LCvalidateAmount(sap.ui.getCore().byId("idAmount"), "ID") &&
				utils._LCstrictValidationComboBox(sap.ui.getCore().byId("idCurrency"), "ID") &&
				utils._LCvalidateMandatoryField(sap.ui.getCore().byId("idPaymentTypeField"), "ID") &&
				utils._LCvalidateMandatoryField(sap.ui.getCore().byId("idTransactionID"), "ID") 
				// utils._LCvalidateDate(sap.ui.getCore().byId("idPaymentDate"), "ID") 
			);

			if (!isMandatoryValid) {
				sap.m.MessageToast.show(this.i18nModel.getText("mandetoryFields") || "Please fill all mandatory fields.");
				return;
			}

			try {
				// Format payload according to your new structure
				const formattedPayload = oData.Persons.map((p) => {
					const bookingData = [];
					const facilityData = [];

					//  FIX: Use oData for booking fields, not individual person object
					if (oData.StartDate) {
						bookingData.push({
							BookingDate: oData.StartDate ? oData.StartDate.split("/").reverse().join("-") : "",
							RentPrice: oData.GrandTotal ? oData.GrandTotal.toString() : "0",
							RoomPrice: oData.Price,
							NoOfPersons: oData.Person || oData.Persons.length,
							StartDate: oData.StartDate ? oData.StartDate.split("/").reverse().join("-") : "",
							EndDate: oData.EndDate ? oData.EndDate.split("/").reverse().join("-") : "",
							Status: "New",
							PaymentType: oData.PaymentType || "",
							BedType: oData.RoomType
						});
					}

					const paymentDetails = {
						BankName: sap.ui.getCore().byId("idBankName").getValue(),
						Amount: sap.ui.getCore().byId("idAmount").getValue(),
						PaymentType: sap.ui.getCore().byId("idPaymentTypeField").getValue(),
						BankTransactionID: sap.ui.getCore().byId("idTransactionID").getValue(),
						Date: sap.ui.getCore().byId("idPaymentDate").getValue(),
						Currency: sap.ui.getCore().byId("idCurrency").getValue()
					};

					// Store in model temporarily
					oData.PaymentDetails = paymentDetails;

					//  Handle both object and string facility formats
					if (p.Facilities && p.Facilities.SelectedFacilities && p.Facilities.SelectedFacilities.length > 0) {
						p.Facilities.SelectedFacilities.forEach(fac => {
							facilityData.push({
								PaymentID: "",
								FacilityName: typeof fac === 'string' ? fac : fac.FacilityName,
								FacilitiPrice: fac.Price,
								StartDate: oData.StartDate ? oData.StartDate.split("/").reverse().join("-") : "",
								EndDate: oData.EndDate ? oData.EndDate.split("/").reverse().join("-") : "",
								PaidStatus: "Pending"
							});
						});
					}

					// Return formatted entry
					return {
						Salutation: p.Salutation,
						CustomerName: p.FullName,
						UserID: p.UserID,
						STDCode: p.StdCode,
						MobileNo: p.MobileNo,
						Gender: p.Gender,
						DateOfBirth: p.DateOfBirth ? p.DateOfBirth.split("/").reverse().join("-") : "",
						CustomerEmail: p.CustomerEmail,
						Country: p.Country,
						State: p.State,
						City: p.City,
						PermanentAddress: p.Address,
						Documents: p.Document ?
							[{
								DocumentType: p.DocumentType || "ID Proof",
								File: p.Document,
								FileName: p.FileName || "Document",
								FileType: p.FileType || "application/pdf"
							}] :
							[],
						Booking: bookingData,
						FacilityItems: facilityData,
						PaymentDetails: [oData.PaymentDetails]
					};
				});

				// Final payload structure
				const oPayload = {
					data: formattedPayload
				};

				// Use your reusable AJAX helper
				await this.ajaxCreateWithJQuery("HM_Customer", oPayload);

				// On success
				sap.m.MessageToast.show("Booking successful!");
        
				var oroute = this.getOwnerComponent().getRouter();
				oroute.navTo("RouteHostel");
				// Clear uploaded files
				oData.Persons.forEach((_, idx) => {
					const uploader = sap.ui.getCore().byId("idFileUploader_" + idx);
					if (uploader) uploader.setValue("");
				});

				// Close dialog if exists
				if (this.FCIA_Dialog) {
					this.FCIA_Dialog.close();
				}

			} catch (err) {
				sap.m.MessageBox.error("Error while booking: " + err);
			}
		},

		onCancelPress: function() {
			var oRouter = this.getOwnerComponent().getRouter()
			oRouter.navTo("RouteHostel")
		},






	});
});