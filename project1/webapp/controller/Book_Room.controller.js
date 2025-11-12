sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
], function(
	BaseController,
	JSONModel,
	Formatter
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
					EndDate: ""
				});
				sap.ui.getCore().setModel(oHostelModel, "HostelModel");
			}

			// Set it on the view
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


			})
			this.getView().setModel(oBTn, "OBTNModel")

			setTimeout(() => {
				this.Roomdetails();
			}, 100);
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
        Price:f.Price
			}));

			//  Wrap in object for proper binding
			const oFacilityModel = new JSONModel({
				Facilities: aFinalFacilities
			});
			oView.setModel(oFacilityModel, "FacilityModel");
		},
    

		onNoOfPersonSelect: function(oEvent) {
			var that = this
			const iPersons = parseInt(oEvent.getSource().getSelectedKey());
			const oVBox = this.getView().byId("idPersonalContainer1");
			const oModel = this.getView().getModel("HostelModel");
			const oFacilityModel = this.getView().getModel("FacilityModel");
			const oLoginModel = sap.ui.getCore().getModel("LoginModel");
			const sUserID = oLoginModel?.getData().UserID || "";
			const oData = oModel.getData();

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
									select: function(oEvent) {
										const oView = sap.ui.getCore().byId("idBookRoomView") || that.getView();
										const oModel = oView.getModel("HostelModel");
										const aPersons = oModel.getProperty("/Persons") || [];

										if (aPersons.length === 0) {
											console.warn("⚠ No persons data found in model.");
											sap.m.MessageToast.show("Please add personal information first.");
											return;
										}

										// Checkbox logic
										const bSelected = oEvent.getParameter("selected");

										if (bSelected) {
											// Fill first person data with logged-in user info
											const oLoginModel = sap.ui.getCore().getModel("LoginModel");
											const oUser = oLoginModel ? oLoginModel.getData() : {};

											aPersons[0].FullName = oUser.UserName || "";
											aPersons[0].CustomerEmail = oUser.EmailID || "";
											aPersons[0].MobileNo = oUser.MobileNo || "";
											aPersons[0].UserID = oUser.UserID || "";

											oModel.refresh(true);

										} else {
											// Clear data when unchecked
											aPersons[0].FullName = "";
											aPersons[0].CustomerEmail = "";
											aPersons[0].MobileNo = "";
											aPersons[0].UserID = "";

											oModel.refresh(true);
										}
									}


								})
							] :
							[]),
						new sap.m.Label({
							text: "Full Name"
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
							text: "Date of Birth"
						}),
						new sap.m.DatePicker({
							value: "{HostelModel>/Persons/" + i + "/DateOfBirth}",
							valueFormat: "dd/MM/yyyy",
							displayFormat: "dd/MM/yyyy"
						}),

						new sap.m.Label({
							text: "Gender"
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
							text: "Mobile"
						}),
						new sap.m.Input({
							value: "{HostelModel>/Persons/" + i + "/MobileNo}",
             
						}),

						new sap.m.Label({
							text: "Email"
						}),
						new sap.m.Input({
							value: "{HostelModel>/Persons/" + i + "/CustomerEmail}"
						}),

						new sap.m.Label({
							text: "Country"
						}),
						new sap.m.Input({
							value: "{HostelModel>/Persons/" + i + "/Country}"
						}),

						new sap.m.Label({
							text: "City"
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
													press: function(oEvent) {
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
											text: "{= '₹ ' + ${FacilityModel>Price}}",
											class: "facilityPriceText"
										})
									]
								})
							}
						})
					],
					visible: {
						path: "HostelModel>/ForBothSelected",
						formatter: function(bSel) {
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

    // onDialogClose: function () {
    //         this._oLoginAlertDialog.close()
    //     },
    //       onSignIn: async function () {
    //         // var ofrag = sap.ui.getCore();
    //         var oModel = this.getOwnerComponent().getModel("LoginMode");
    //         var oData = oModel.getData();
    //         const oLoginModel = this.getView().getModel("LoginModel"); 

    //         // Get input values
    //         var sUserid = sap.ui.getCore().byId("signInuserid").getValue();
    //         var sUsername = sap.ui.getCore().byId("signInusername").getValue();
    //         var sPassword = sap.ui.getCore().byId("signinPassword").getValue();

    //         // Basic validation example
    //         if (
    //            !utils._LCvalidateMandatoryField(sap.ui.getCore().byId("signInuserid"), "ID")|| !utils._LCvalidateMandatoryField(sap.ui.getCore().byId("signInusername"), "ID") ||
    //             !utils._LCvalidatePassword(sap.ui.getCore().byId("signinPassword"), "ID")
    //         ) {
    //             sap.m.MessageToast.show("Make sure all the mandatory fields are filled/validate the entered value");
    //             return;
    //         }

    //         try {
    //             //  Fetch all registered users (no payload — server ignores it anyway)
    //             const oResponse = await this.ajaxReadWithJQuery("HM_Login", "");

    //             const aUsers = oResponse?.commentData || [];

    //             const oMatchedUser = aUsers.find(user =>
    //             user.UserID === sUserid &&
    //             user.UserName === sUsername &&
    //             (user.Password === sPassword || user.Password === btoa(sPassword))
    //             );

    //             if (!oMatchedUser) {
    //                 sap.m.MessageToast.show("Invalid credentials. Please try again.");
    //                 return;
    //             }

    //             oLoginModel.setProperty("/EmployeeID", oMatchedUser.UserID);
    //             oLoginModel.setProperty("/EmployeeName", oMatchedUser.UserName);
    //             oLoginModel.setProperty("/EmailID", oMatchedUser.EmailID);
    //             oLoginModel.setProperty("/Role", oMatchedUser.Role);
    //             oLoginModel.setProperty("/BranchCode", oMatchedUser.BranchCode || "");
    //             oLoginModel.setProperty("/MobileNo", oMatchedUser.MobileNo || "");

    //             if (oMatchedUser.Role === "Customer") {
    //                 this._oLoggedInUser = oMatchedUser;
    //                 const oUserModel = new JSONModel(oMatchedUser);
    //                 sap.ui.getCore().setModel(oUserModel, "LoginModel");

    //                 sap.ui.getCore().byId("signInusername").setValue("");
    //                 sap.ui.getCore().byId("signinPassword").setValue("");

    //                 if (this._oSignDialog) this._oSignDialog.close();

    //                 const oView = this.getView();
    //                 oView.byId("loginButton")?.setVisible(false);
    //                 oView.byId("ProfileAvatar")?.setVisible(true);

    //             }else {
    //                 sap.m.MessageToast.show("Invalid credentials. Please try again.");
    //             }

    //         } catch (err) {
    //             console.error("Login Error:", err);
    //             sap.m.MessageToast.show("Failed to fetch login data: " + err);
    //         }
    //     },
		onDialogNextButton: async function() {
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
            // if (!this._checkMandatoryFields()) {
            //     sap.m.MessageToast.show("Please fill all mandatory personal details before proceeding.");
            //     // Move wizard back to previous valid step
            //     // If using goToStep/goBack, implement as needed to stay on current step
            //     this._iSelectedStepIndex--;
            //     this._oSelectedStep = this._oWizard.getSteps()[this._iSelectedStepIndex];
            //     oModel.setProperty("/NXTVis", true);
            //     return; // Exit without proceeding
            // }
           
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
    const roomRentPrice = oHostelModel.getProperty("/Price");

    const oStartDate = this._parseDate(sStartDate);
    const oEndDate = this._parseDate(sEndDate);
    const diffTime = oEndDate - oStartDate;
    const iDays = Math.ceil(diffTime / (1000 * 3600 * 24));

    if (iDays <= 0) {
        sap.m.MessageToast.show("End Date must be after Start Date");
        return;
    }

    // Calculate totals (assuming returns structure with AllSelectedFacilities)
    const totals = this.calculateTotals(aPersons, sStartDate, sEndDate, roomRentPrice);
    if (!totals) return;  

    // Deep copy and attach unique facilities
    const aUpdatedPersons = aPersons.map((oPerson, iIndex) => {
        const personName = oPerson.FullName || `Person ${iIndex + 1}`;
        const aFacilities = totals.AllSelectedFacilities.filter(f => f.PersonName === personName);

        return Object.assign({}, oPerson, {
            PersonFacilitiesSummary: JSON.parse(JSON.stringify(aFacilities))
        });
    });

    oHostelModel.setProperty("/Persons", aUpdatedPersons);
    oHostelModel.setProperty("/TotalDays", totals.TotalDays);
    oHostelModel.setProperty("/TotalFacilityPrice", totals.TotalFacilityPrice);
    oHostelModel.setProperty("/GrandTotal", totals.GrandTotal);
    oHostelModel.setProperty("/AllSelectedFacilities", totals.AllSelectedFacilities);
    oHostelModel.refresh(true);
}
,


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

		onOpenProceedtoPay: function() {
			if (!this._oPaymentDialog) {
				this._oPaymentDialog = sap.ui.xmlfragment(
					"sap.ui.com.project1.fragment.PaymentPage",
					this
				);
				this.getView().addDependent(this._oPaymentDialog);
			}

			// Reset fields every time dialog opens
			const aFields = [
				"idBankName", "idAmount", "idPaymentTypeField", "idTransactionID",
				"idPaymentDate", "idCurrency", "idUPIID", "idCardNumber", "idCardExpiry", "idCardCVV"
			];
			aFields.forEach(id => sap.ui.getCore().byId(id)?.setValue(""));
			sap.ui.getCore().byId("idPaymentTypeGroup").setSelectedIndex(0);

			sap.ui.getCore().byId("idUPISection").setVisible(true);
			sap.ui.getCore().byId("idCardSection").setVisible(false);

			this._oPaymentDialog.open();
		},

		onPaymentTypeSelect: function(oEvent) {
			const selectedIndex = oEvent.getSource().getSelectedIndex();
			sap.ui.getCore().byId("idUPISection").setVisible(selectedIndex === 0);
			sap.ui.getCore().byId("idCardSection").setVisible(selectedIndex === 1);
		},

		onPaymentClose: function() {
			if (this._oPaymentDialog) {
				this._oPaymentDialog.close();
			}

			// Clear all field values on close
			const aFields = [
				"idBankName", "idAmount", "idPaymentTypeField", "idTransactionID",
				"idPaymentDate", "idCurrency", "idUPIID", "idCardNumber", "idCardExpiry", "idCardCVV"
			];
			aFields.forEach(id => sap.ui.getCore().byId(id)?.setValue(""));
		},

		onSubmitPress: async function() {
			const oModel = this.getView().getModel("HostelModel");
			const oData = oModel.getData();

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
				var oroute = this.getOwnerComponent().getRouter();
				oroute.navTo("RouteHostel");
				sap.m.MessageToast.show("Booking successful!");
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

		onFieldValidation: function() {
			var oView = this.getView();
			var oHostelModel = oView.getModel("HostelModel").getData();
			var oBtnModel = oView.getModel("OBTNModel");

			// var sRoomType = oView.byId("idRoomType1")?.getValue() || "";
			// var sPrice = oView.byId("idPrice2")?.getValue() || "";
			var sPayment = oHostelModel.PaymentType || oView.byId("idPaymentMethod1")?.getSelectedKey() || "";
			var sPerson = oHostelModel.Person || oView.byId("id_Noofperson1")?.getSelectedKey() || "";
			var sStartDate = oHostelModel.StartDate || oView.byId("idStartDate1")?.getValue() || "";
			var sEndDate = oHostelModel.EndDate || oView.byId("idEndDate1")?.getValue() || "";
			var bAllFilled = sPayment && sPerson && sStartDate && sEndDate;

			//  Force Boolean (true/false) type — critical fix
			oBtnModel.setProperty("/Next", !!bAllFilled);
			// oBtnModel.setProperty("/PERVIOUSVIS", !!bAllFilled);
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

		onRoomDurationChange: function(oEvent) {
			const sSelectedDuration = oEvent.getParameter("selectedItem").getKey(); // E.g. "Daily", "Monthly", "Yearly" if any
			const oHostelModel = this.getView().getModel("HostelModel");
			const oRoomDetailModel = this.getView().getModel("RoomDetailModel");

			// Get current RoomType value
			const sRoomType = this.getView().byId("GI_Roomtype").getText();

			// Get all RoomDetail entries
			const aRoomDetails = oRoomDetailModel.getData(); // assumes array at root "/"

			// Find matching room detail by BedTypeName == RoomType
			const oMatchingRoom = aRoomDetails.find(item => item.BedTypeName === sRoomType);

			if (oMatchingRoom) {
				let sNewPrice = "";
				if (sSelectedDuration === "Per Day") {
					sNewPrice = oMatchingRoom.Price; // Daily price field
				} else if (sSelectedDuration === "Monthly" || sSelectedDuration === "Per Month") {
					sNewPrice = oMatchingRoom.MonthPrice; // Monthly price field
				} else if (sSelectedDuration === "Yearly" || sSelectedDuration === "Per Year") {
					sNewPrice = oMatchingRoom.YearPrice; // Optional yearly price if exists
				} else {
					sNewPrice = oMatchingRoom.Price; // default fallback
				}

				// Update Price in HostelModel
				oHostelModel.setProperty("/Price", sNewPrice);

			} else {
				// No matching room found - clear price or handle otherwise
				oHostelModel.setProperty("/Price", "");
			}
		}




	});
});