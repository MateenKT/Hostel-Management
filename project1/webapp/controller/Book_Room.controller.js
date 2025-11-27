sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "../model/formatter",
  "../utils/validation",
  "sap/ui/core/BusyIndicator",
], function (
  BaseController,
  JSONModel,
  Formatter, utils,
  BusyIndicator
) {
  "use strict";

  return BaseController.extend("sap.ui.com.project1.controller.Book_Room", {
    Formatter: Formatter,
    onInit: function () {
       this.getOwnerComponent().getRouter().getRoute("RouteBookRoom").attachMatched(this._onRouteMatched, this);
    },
    _onRouteMatched: function(){
      const oUserModel = sap.ui.getCore().getModel("LoginModel");
      if (oUserModel) {
        this._oLoggedInUser = oUserModel.getData();
      } else {
        this._oLoggedInUser = {}; // fallback
      }
      let oHostelModel = sap.ui.getCore().getModel("HostelModel");
      if (!oHostelModel.getProperty("/SelectedMonths")) {
    oHostelModel.setProperty("/SelectedMonths", "1");
  }
  
      if (!oHostelModel) {
        // If not found, create a fallback model
        oHostelModel = new JSONModel({
          UserID: "",
          BedType: "",
          ACType: "",
          Price: "",
          PaymentType: "",
          Person: "",
          StartDate: "",
          EndDate: "",
          FinalPrice: "",
          SelectedPriceType: "",
          Capacity: "",
          StopPriceRecalculateByPerson:false,
        });
        sap.ui.getCore().setModel(oHostelModel, "HostelModel");
      }

      this.getView().setModel(new JSONModel({
        Amount: "",
        PaymentType: "UPI",
        PaymentDate: new Date()
      }),"PaymentModel");

      //  Ensure defaults come from previous step (HostelModel)
    
      const oData = oHostelModel.getData();

// 🟦 RESET VALUES EVERY TIME ROUTE LOADS
oHostelModel.setProperty("/StartDate", "");
oHostelModel.setProperty("/EndDate", "");
oHostelModel.setProperty("/Salutation", "");
oHostelModel.setProperty("/FullName", "");
oHostelModel.setProperty("/SelectedMonths", "1");
oHostelModel.setProperty("/SelectedPerson", "1");


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

      if (oData.SelectedPriceType && !["per day", "per month", "per year"].includes(oData.SelectedPriceType)) {
     
        const map = {
          "Per Day": "Per Day",
          "Per Month": "Per Month",
          "Per Year": "Per Year"
        };
        oData.SelectedPriceType = map[oData.SelectedPriceType] || "Per Month";
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
        Month: false,
        Year: false
      })
      this.getView().setModel(oBTn, "OBTNModel")
      var oEndDatePicker = this.getView().byId("idEndDate1")
      const sSelectedType = oData.SelectedPriceType?.toLowerCase() || "";

      if (sSelectedType === "per day") {
        oBTn.setProperty("/Month", false);

        oEndDatePicker.setEditable(true)
      } else if (sSelectedType === "per month") {
        oBTn.setProperty("/Month", true);
        oEndDatePicker.setEditable(false)
      } else if (sSelectedType === "per year") {
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

			this._fetchCommonData("Country", "CountryModel","");
			this._fetchCommonData("State", "StateModel");
            this._fetchCommonData("City", "CityModel");    

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
      oHostelModel.setProperty("/TodayDate", oToday);
      this.oWizard = this.byId("TC_id_wizard");
      this.oWizard.discardProgress(this.byId("TC_id_stepGeneralInfo"));
      this.oWizard.goToStep(this.byId("TC_id_stepGeneralInfo"));
      this.oWizard.getSteps()[0].setValidated(true);
      this.oWizard.getSteps()[1].setValidated(false);
      this.oWizard.getSteps()[2].setValidated(false);
      // this.resetAllBookingData()
       this.getView().setModel(new JSONModel({
                isOtpSelected: false,
                isPasswordSelected: true,
                authFlow: "signin" ,  // [signin, forgot, otp, reset]
                isOtpBoxVisible: false
            }), "LoginViewModel");
    },
    Roomdetails: async function () {
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
    _LoadFacilities: async function () {
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
        PricePerHour:f.PerHourPrice,
        PricePerDay: f.PerDayPrice,
    PricePerMonth: f.PerMonthPrice,
    PricePerYear: f.PerYearPrice,
        UnitText: f.UnitText,
        Currency: f.Currency,
        BranchCode:f.BranchCode
      }));

      //  Wrap in object for proper binding
      const oFacilityModel = new JSONModel({
        Facilities: aFinalFacilities
      });
      oView.setModel(oFacilityModel, "FacilityModel");
    },
  
    _checkMandatoryFields: function () {
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
          { key: "State", label: "State" },
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

    _checkMandatoryFields: function () {
    const oModel = this.getView().getModel("HostelModel");
    const aPersons = oModel.getProperty("/Persons") || [];
    let aMissingFields = [];

    aPersons.forEach((person, index) => {
        let prefix = "Person " + (index + 1) + ": ";

        if (!person.FullName) aMissingFields.push(prefix + "Full Name");
        if (!person.DateOfBirth) aMissingFields.push(prefix + "Date of Birth");
        if (!person.Gender) aMissingFields.push(prefix + "Gender");
        if (!person.CustomerEmail) aMissingFields.push(prefix + "Email");
        if (!person.Country) aMissingFields.push(prefix + "Country");
        if (!person.State) aMissingFields.push(prefix + "State");
        if (!person.City) aMissingFields.push(prefix + "City");
        if (!person.MobileNo) aMissingFields.push(prefix + "Mobile No");
        if (!person.Address) aMissingFields.push(prefix + "Address");
    });

    return aMissingFields;
},
onNoOfPersonSelect: function (oEvent) {
    const oModel = this.getView().getModel("HostelModel");

    let sKey = "";
    if (oEvent && oEvent.getSource && oEvent.getSource().getSelectedKey) {
        sKey = oEvent.getSource().getSelectedKey();
    }

    if (!sKey) {
        sKey = oModel.getProperty("/SelectedPerson");
    }

    const iPersons = parseInt(sKey) || 1;

    // Store only the number of persons
    oModel.setProperty("/SelectedPerson", iPersons);
},

_createDynamicPersonsUI: function () {
  var that =this
    const oModel = this.getView().getModel("HostelModel");
    const oFacilityModel = this.getView().getModel("FacilityModel");
    const oLoginModel = sap.ui.getCore().getModel("LoginModel");
    const sUserID = oLoginModel?.getData().UserID || "";
    const iPersons = oModel.getProperty("/SelectedPerson") || 1;

    const oVBox = this.getView().byId("idPersonalContainer1");
    const oData = oModel.getData();

    // Reset container & model array
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
          adjustLabelSpan: false,
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
                  width: "100%",
                  id: that.createId("IDSelfCheck_" + i),
                 select: function (oEvent) {
    const oView = that.getView();
    const oModel = oView.getModel("HostelModel");
    const aPersons = oModel.getProperty("/Persons") || [];
    const bSelected = oEvent.getParameter("selected");

    const oLoginModel = sap.ui.getCore().getModel("LoginModel");
    const oUser = oLoginModel ? oLoginModel.getData() : null;

    if (bSelected) {
        // No login yet → open dialog
        if (!oUser || !oUser.UserID) {
            if (!that._oLoginAlertDialog) {
                that._oLoginAlertDialog = sap.ui.xmlfragment(
                    that.createId("LoginAlertDialog"),
                    "sap.ui.com.project1.fragment.SignInSignup",
                    that
                );
                oView.addDependent(that._oLoginAlertDialog);
            }
            that._oLoginAlertDialog.open();
              sap.ui.core.Fragment.byId(that.createId("LoginAlertDialog"), "signInusername").setValue("").setValueState("None");
				                                     sap.ui.core.Fragment.byId(that.createId("LoginAlertDialog"), "signinPassword").setValue("").setValueState("None");
				                                     sap.ui.core.Fragment.byId(that.createId("LoginAlertDialog"), "signInuserid").setValue("").setValueState("None");
													   sap.ui.core.Fragment.byId(that.createId("LoginAlertDialog"), "signupvisible").setVisible(false)
            oEvent.getSource().setSelected(false);
            return;
        }
         const DOB =that.Formatter.DateFormat(oUser.DateOfBirth)
        // Already logged in → auto-fill
        aPersons[0].Salutation = oUser.Salutation || "";
        aPersons[0].FullName = oUser.UserName || "";
        aPersons[0].CustomerEmail = oUser.EmailID || "";
        aPersons[0].MobileNo = oUser.MobileNo || "";
        aPersons[0].UserID = oUser.UserID || "";
        aPersons[0].DateOfBirth = DOB|| "";
        aPersons[0].Gender = oUser.Gender || "";
        aPersons[0].Country = oUser.Country || "";
        aPersons[0].State = oUser.State || "";
        aPersons[0].City = oUser.City || "";
        aPersons[0].Address = oUser.Address || "";
        aPersons[0].STDCode = oUser.STDCode || "";
    } else {
        // Only clear if user unchecks manually
        aPersons[0].FullName = "";
        aPersons[0].CustomerEmail = "";
        aPersons[0].MobileNo = "";
        aPersons[0].UserID = "";
        aPersons[0].Salutation = "";
        aPersons[0].DateOfBirth ="";
        aPersons[0].Gender="";
        aPersons[0].State = "";
        aPersons[0].Country  = "";
        aPersons[0].City = "";
        aPersons[0].Address = "";
        aPersons[0].STDCode ="";
    }

    oModel.refresh(true);
}

                })
              ] :
              []),
            new sap.m.Label({
              text: "Full Name",
              required: true,
              maxLength:40
            }),
            new sap.m.Select({
              width: "100%",
              selectedKey: "{HostelModel>/Persons/" + i + "/Salutation}",
              items: [
                 new sap.ui.core.ListItem({
                  key: "",
                  text: ""
                }),
                new sap.ui.core.ListItem({
                  key: "Mr.",
                  text: "Mr"
                }), new sap.ui.core.ListItem({
                  key: "Mrs.",
                  text: "Mrs"
                })
                
              ]
            }),
            new sap.m.Input({
              width: "100%",
              value: "{HostelModel>/Persons/" + i + "/FullName}",
              maxLength:40
            }),
            new sap.m.Label({
              text: "UserID",
              required: true
            }),
            new sap.m.Input({
            
              value: "{HostelModel>/Persons/" + i + "/UserID}",
              editable: false,
              visible: false
            }),

            new sap.m.Label({
              text: "Date of Birth",
              required: true
            }),
            new sap.m.DatePicker({
              width: "100%",
              value: "{HostelModel>/Persons/" + i + "/DateOfBirth}",
              formatter: that.DateFormat,
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
            new sap.m.Select({
              width: "100%",
              selectedKey: "{HostelModel>/Persons/" + i + "/Gender}",
              items: [
                 new sap.ui.core.ListItem({
                  key: "",
                  text: ""
                }),
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
							text: "Email",
              required: true,
              type:"Email"
						}),
						new sap.m.Input({
              width: "100%",
							value: "{HostelModel>/Persons/" + i + "/CustomerEmail}"
						}),

						new sap.m.Label({
							text: "Country",
              required: true,
						}),

						 new sap.m.ComboBox({
              width: "100%",
            selectedKey: "{HostelModel>/Persons/" + i + "/Country}",
            items: {
                path: "CountryModel>/",
				length:1000, showSecondaryValues:true,
                template: new sap.ui.core.ListItem({
                    key: "{CountryModel>countryName}",
                    text: "{CountryModel>countryName}",
                    additionalText: "{CountryModel>code}"  // country code
                })
            },
            change: function (oEv) {
    const oSel = oEv.getSource().getSelectedItem();
    const aPersons = oModel.getProperty("/Persons");

    // Clear dependents
    aPersons[i].State = "";
    aPersons[i].City = "";
    aPersons[i].STDCode = "";
    aPersons[i].MobileMax = undefined; // reset

    if (!oSel) {
        oModel.refresh(true);
        return;
    }

    const oCountryObj = oSel.getBindingContext("CountryModel").getObject();
    const sCountryCode = oCountryObj.code;
    const sSTDCode = oCountryObj.stdCode;

    aPersons[i].Country = oCountryObj.countryName;
    aPersons[i].STDCode = sSTDCode;

    // Decide mobile max based on country (store on model)
    if (oCountryObj.countryName === "India") {
        aPersons[i].MobileMax = 10;
    } else {
        aPersons[i].MobileMax = 20; // or any other rule
    }

    // Filter states (existing logic)
    const oStateCombo = sap.ui.getCore().byId(that.createId("ID_State_" + i));
    oStateCombo.getBinding("items").filter([
        new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, sCountryCode)
    ]);

    // Also set UI input maxLength for immediate UX feedback if input exists
    const oMobileInput = sap.ui.getCore().byId(that.createId("ID_Mobile_" + i));
    if (oMobileInput) {
        oMobileInput.setMaxLength(aPersons[i].MobileMax);
        // applyChanges is optional — not relied on by liveChange because we read from model
        sap.ui.getCore().applyChanges();
    }

    // Persist change to model
    oModel.setProperty("/Persons", aPersons);
    oModel.refresh(true);
}
    }),

		new sap.m.Label({
							text: "State",
              required: true, 
						}),
        new sap.m.ComboBox({
          width: "100%",
            id: that.createId("ID_State_" + i),
            selectedKey: "{HostelModel>/Persons/" + i + "/State}",
            items: {
                path: "StateModel>/", length:1000, showSecondaryValues:true,
                template: new sap.ui.core.ListItem({
                    key: "{StateModel>stateName}",
                    text: "{StateModel>stateName}",
					 additionalText:"{StateModel>countryCode}"
                })
            },
            change: function (oEv) {
            const oSel = oEv.getSource().getSelectedItem();
            const aPersons = oModel.getProperty("/Persons");
            aPersons[i].State = "";

            if (!oSel) {
                oModel.refresh(true);
                return;
            }

            const sStateName = oSel.getText();
            aPersons[i].State = sStateName;
            const oCountryName = aPersons[i].Country;
            const oCountryData = that.getView().getModel("CountryModel").getData();
            const oCountryObj = oCountryData.find(x => x.countryName === oCountryName);

            // Filter cities
            const oCityCombo = sap.ui.getCore().byId(that.createId("ID_City_" + i));
            oCityCombo.getBinding("items").filter([
                new sap.ui.model.Filter("stateName", sap.ui.model.FilterOperator.EQ, sStateName),
                new sap.ui.model.Filter("countryCode", sap.ui.model.FilterOperator.EQ, oCountryObj?.code)
            ]);
            oModel.refresh(true);
        }
		}),

		new sap.m.Label({
							text: "City",
              required: true, 
						}),

        new sap.m.ComboBox({
          width: "100%",
            id: that.createId("ID_City_" + i),
            selectedKey: "{HostelModel>/Persons/" + i + "/City}",
            items: {
                path: "CityModel>/", length:1000, showSecondaryValues:true,
                template: new sap.ui.core.ListItem({
                    key: "{CityModel>cityName}",
                    text: "{CityModel>cityName}",
                    additionalText: "{CityModel>branchCode}"
                })
            },
            change: function (oEv) {
                const oSel = oEv.getSource().getSelectedItem();
                const aPersons = oModel.getProperty("/Persons");
                aPersons[i].City = oSel ? oSel.getText() : "";
                oModel.refresh(true);
            }
        }),

		new sap.m.Label({
							text: "Mobile No",
              required: true, 
						}),

		 new sap.m.Input({
      
            value: "{HostelModel>/Persons/" + i + "/STDCode}",
        }),

             new sap.m.Input({
              width: "100%",
            id: that.createId("ID_Mobile_" + i),
            value: "{HostelModel>/Persons/" + i + "/MobileNo}",
            type: "Number", maxLength: 20,
            liveChange: function (oEv) {
            const oInput = oEv.getSource();
            let sValue = oInput.getValue() || "";
            sValue = sValue.replace(/\D/g, ""); // allow only digits

            const aPersons = oModel.getProperty("/Persons") || [];
            const person = aPersons[i] || {};
            const maxLengthFromModel = person.MobileMax || oInput.getMaxLength() || 20; // fallback

            if (sValue.length > maxLengthFromModel) {
                sValue = sValue.substring(0, maxLengthFromModel);
            }

            oInput.setValue(sValue);
            oInput.setValueState("None");
            oInput.setValueStateText("");

            const sCountry = person.Country || "";

            // Country-specific validations
            if (sCountry === "India") {
                // exact 10 digits required
                if (sValue.length !== 10) {
                    oInput.setValueState("Error");
                    oInput.setValueStateText("Mobile No must be exactly 10 digits");
                }
                // update model value for MobileNo
                oModel.setProperty("/Persons/" + i + "/MobileNo", sValue);
                return;
            }

            // Other countries: minimum 4 digits (example rule)
            if (sValue.length < 4) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Mobile number must be at least 4 digits");
            }

            // update model value for MobileNo
            oModel.setProperty("/Persons/" + i + "/MobileNo", sValue);
        }
        }),


            new sap.m.Label({
              text: "Address",
              required: true
            }),
            new sap.m.TextArea({
              width: "100%",
              value: "{HostelModel>/Persons/" + i + "/Address}",
              placeholder: "Enter Permanent Address",
              rows: 3,
              maxLength:100
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
               fileType: ["pdf", "jpg", "jpeg", "png"],
               mimeType: ["application/pdf", "image/jpeg", "image/png"],
               multiple: false,
              customData: [new sap.ui.core.CustomData({
                key: "index",
                value: i
              })],
            change: function (oEvent) {
    const index = parseInt(oEvent.getSource().data("index"));
    const oFile = oEvent.getParameter("files")[0];

    if (oFile) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const sBase64 = e.target.result;

            // Always overwrite old document
            oData.Persons[index].Documents = [];

            // Auto-thumbnail logic
            let sThumbnail = sBase64;
            if (oFile.type === "application/pdf") {
                sThumbnail = "sap-icon://pdf-attachment";
            }

            // Push new document
            oData.Persons[index].Documents.push({
                FileName: oFile.name,
                FileType: oFile.type,
                Document: sBase64,
                Thumbnail: sThumbnail
            });

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
            ...(i === 0 && iPersons > 1 ? [
                    new sap.m.CheckBox({
    text: "Select For All Person",
    selected: !!oData.ForBothSelected,
    select: function (e) {
        const bSel = e.getParameter("selected");
        oData.ForBothSelected = bSel;

        if (bSel) {
            // copy person 0 to all
            const master = oData.Persons[0].Facilities.SelectedFacilities.map(f => ({ ...f }));
            for (let p = 1; p < iPersons; p++) {
                oData.Persons[p].Facilities.SelectedFacilities = master.map(f => ({ ...f }));
            }
        } else {
            // unselected → clear all others
            for (let p = 1; p < iPersons; p++) {
                oData.Persons[p].Facilities.SelectedFacilities = [];
            }

            // 🟢 Reset UI selection classes
            setTimeout(() => {
                $(".serviceCardSelected").removeClass("serviceCardSelected");
            }, 50);
        }

        oModel.refresh(true);
    }
})

                ] : []),

            new sap.m.FlexBox({
              wrap: "Wrap",
              alignItems: "Start",
              justifyContent: "SpaceAround",
              items: {
                path: "FacilityModel>/Facilities",
              filters: [
            new sap.ui.model.Filter(
                "BranchCode",
                sap.ui.model.FilterOperator.EQ,
                oModel.getProperty("/BranchCode")
            )
        ],
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
    const oFacility = oCtx.getObject();
    const aPersons = oModel.getProperty("/Persons");
    const aSelected = aPersons[i].Facilities.SelectedFacilities;

    const oCard = oEvent.getSource().getParent().getParent();
    const idx = aSelected.findIndex(f => f.FacilityName === oFacility.FacilityName);

    // toggle
    if (idx > -1) {
        aSelected.splice(idx, 1);
        oCard.removeStyleClass("serviceCardSelected");
    } else {
        aSelected.push({
            FacilityName: oFacility.FacilityName,
            BranchCode: oFacility.BranchCode,
            PricePerDay: oFacility.PricePerDay,
            PricePerMonth: oFacility.PricePerMonth,
            PricePerYear: oFacility.PricePerYear,
            Currency: oFacility.Currency,
            UnitText: oModel.getProperty("/SelectedPriceType"),
            Image: oFacility.Image
        });
        oCard.addStyleClass("serviceCardSelected");
    }

    if (oData.ForBothSelected && i === 0) {
        // sync to all
        for (let p = 1; p < iPersons; p++) {
            oData.Persons[p].Facilities.SelectedFacilities = aPersons[0].Facilities.SelectedFacilities.map(f => ({ ...f }));
        }

    }


    oModel.refresh(true);
      that._currentPersonIndex = i;
    that._applyFacilitySelectionUI();
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
    text: "{= " +
          "   ${HostelModel>/SelectedPriceType} === 'Per Day' ? '₹ ' + ${FacilityModel>PricePerDay} + ' ' + ${FacilityModel>Currency} +' '+ ${HostelModel>/SelectedPriceType}:" +
          "   ${HostelModel>/SelectedPriceType} === 'Per Month' ? '₹ ' + ${FacilityModel>PricePerMonth} + ' ' + ${FacilityModel>Currency} +' '+ ${HostelModel>/SelectedPriceType}:" +
          "   ${HostelModel>/SelectedPriceType} === 'Per Year' ? '₹ ' + ${FacilityModel>PricePerYear} + ' ' + ${FacilityModel>Currency} +' '+ ${HostelModel>/SelectedPriceType}:" +
          "   '₹ ' + ${FacilityModel>PricePerDay} + ' ' + ${FacilityModel>Currency}" +
          "}"
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
oFacilityModel.refresh(true);
      oModel.refresh(true);
},
_applyFacilitySelectionUI: function () {
    setTimeout(() => {
        const oHostelModel = this.getView().getModel("HostelModel");
        const aPersons = oHostelModel.getProperty("/Persons");
        const person = aPersons[this._currentPersonIndex];

        if (!person) return;

        // remove all selection UI
        $(".serviceCard").removeClass("serviceCardSelected");

        // reapply correct selection
        person.Facilities.SelectedFacilities.forEach(f => {
            $(`img[src='${f.Image}']`)
                .closest(".serviceCard")
                .addClass("serviceCardSelected");
        });
    }, 50);
}
,
    onDialogNextButton: async function () {

        if (this._iSelectedStepIndex === 0) {
        this._createDynamicPersonsUI();
    }
        if (this._iSelectedStepIndex === 1) {
    const aMissing = this._checkMandatoryFields();
    if (aMissing.length > 0) {
        sap.m.MessageBox.error(
            "Please fill the following mandatory fields:\n\n" + aMissing.join("\n")
        );
        return; // STOP navigation
    }
}

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

    onDialogBackButton: function () {
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
    handleNavigationChange: function (oEvent) {
      this._oSelectedStep = oEvent.getParameter("step");
      this._iSelectedStepIndex = this._oWizard.getSteps().indexOf(this._oSelectedStep);
      this.handleButtonsVisibility();
    },

    handleButtonsVisibility: function () {
      var oModel = this.getView().getModel("OBTNModel");
      const oHostelModel = this.getView().getModel("HostelModel")
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
              this.onNoOfPersonSelect({ getSource: function () { return oSelect; } });
            } else {
              // fallback: call handler without event so it uses model value
              this.onNoOfPersonSelect();
            }
          } catch (e) {
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

  // Keep summary price bound
  const oPriceSummary = oView.byId("idPrice3");
  if (oPriceSummary) {
    oPriceSummary.bindText("HostelModel>/FinalPrice");
  }

  const oHostelModel = oView.getModel("HostelModel");
  const aPersons = oHostelModel.getProperty("/Persons") || [];

  const sStartDate = oHostelModel.getProperty("/StartDate");
  const sEndDate = oHostelModel.getProperty("/EndDate");

  // perUnitPrice is the current stored FinalPrice (could be base or already per-person)
  const perUnitPrice = parseFloat(oHostelModel.getProperty("/FinalPrice")) || 0;

  // Convert dates
  const oStartDate = this._parseDate(sStartDate);
  const oEndDate = this._parseDate(sEndDate);

  const iDays = Math.ceil((oEndDate - oStartDate) / (1000 * 3600 * 24));
  if (iDays <= 0) {
    sap.m.MessageToast.show("End Date must be after Start Date");
    return;
  }
  
  // ALWAYS GET ORIGINAL BASE PRICE
const baseRoomRent = parseFloat(oHostelModel.getProperty("/FinalPrice")) || 0;

// Number of months selected
const monthsOrYears = parseInt(oHostelModel.getProperty("/SelectedMonths") || "1", 10);

// Always calculate correct rent
let roomRentPerPerson = baseRoomRent * monthsOrYears;

  // Reset flags
  oHostelModel.setProperty("/StopPriceRecalculate", false);
  oHostelModel.setProperty("/StopPriceRecalculateByPerson", false);

  // Continue your existing logic...
  const totals = this.calculateTotals(aPersons, sStartDate, sEndDate, perUnitPrice);
  if (!totals) return;

  const aUpdatedPersons = aPersons.map((oPerson, iIndex) => {
    //const personName = oPerson.FullName || `Person ${iIndex + 1}`;
    const aPersonFacilities = (totals.AllSelectedFacilities || []).filter(
      f => f.ID === iIndex
    );

    const totalAmount = aPersonFacilities.reduce((sum, facility) => {
        return sum + (facility.TotalAmount || 0);
    }, 0);

    const facilityTotal = aPersonFacilities.reduce((sum, f) => {
      const iPrice = parseFloat(f.Price) || 0;
      const iDays = parseFloat(f.TotalDays) || 0;
      return sum + (iPrice * iDays);
    }, 0);

    return {
      ...oPerson,
      // Facility details per person
       Documents: oPerson.Documents || [],
      PersonFacilitiesSummary: aPersonFacilities,
      AllSelectedFacilities: aPersonFacilities,

      // Per-person facility cost
      TotalFacilityPrice: totalAmount,

      // Per-person room rent (now uses the safely-declared variable)
      RoomRentPerPerson: roomRentPerPerson,

      // Per-person total
      GrandTotal: roomRentPerPerson + totalAmount,

      TotalDays: iDays
    };
  });

  const totalFacilitySum = aUpdatedPersons.reduce((sum, obj) => sum + obj.TotalFacilityPrice, 0);
  const grandTotalSum = aUpdatedPersons.reduce((sum, obj) => sum + obj.GrandTotal, 0);

  oHostelModel.setProperty("/Persons", aUpdatedPersons);
  oHostelModel.setProperty("/TotalDays", iDays);
  oHostelModel.setProperty("/TotalFacilityPrice", totalFacilitySum);
  oHostelModel.setProperty("/GrandTotal", grandTotalSum);
  oHostelModel.setProperty("/OverallTotalCost", grandTotalSum);
  oHostelModel.updateBindings(true);
  oHostelModel.refresh(true);
},

    // Separated calculation function
calculateTotals: function (aPersons, sStartDate, sEndDate, roomRentPrice) {
  const oStartDate = this._parseDate(sStartDate);
  const oEndDate = this._parseDate(sEndDate);
  const diffTime = oEndDate - oStartDate;

  const iDays = Math.ceil(diffTime / (1000 * 3600 * 24));
  const diffHours = Math.ceil(diffTime / (1000 * 60 * 60)); // ⭐ NEW: Total Hours

  if (iDays <= 0 && diffHours <= 0) {
    sap.m.MessageToast.show("End Date must be after Start Date");
    return null;
  }

  const iMonths =
    (oEndDate.getFullYear() - oStartDate.getFullYear()) * 12 +
    (oEndDate.getMonth() - oStartDate.getMonth()) || 1;

  const iYears = oEndDate.getFullYear() - oStartDate.getFullYear() || 1;

  let totalFacilityPrice = 0;
  let aAllFacilities = [];

  aPersons.forEach((oPerson, iIndex) => {
    const aFacilities = oPerson.Facilities?.SelectedFacilities || [];

    aFacilities.forEach((f) => {
      var faciliti =  oPerson.AllSelectedFacilities?.filter(d =>  d.FacilityName === f.FacilityName);
      if(faciliti?.length>0){
        aAllFacilities.push(faciliti[0])
      }else{
      let fPrice = 0;
const sType = this.getView().getModel("HostelModel").getProperty("/SelectedPriceType");

if (sType === "Per Day") fPrice = f.PricePerDay;
if (sType === "Per Month") fPrice = f.PricePerMonth;
if (sType === "Per Year") fPrice = f.PricePerYear;


     let fTotal = 0;
switch (sType) {
  case "Per Day":   fTotal = fPrice * iDays;     break;
  case "Per Month": fTotal = fPrice * iMonths;   break;
  case "Per Year":  fTotal = fPrice * iYears;    break;
}


      totalFacilityPrice += fTotal;

      aAllFacilities.push({
        ID: iIndex,
        PersonName: oPerson.FullName || `Person ${iIndex + 1}`,
        FacilityName: f.FacilityName,
        Price: fPrice,
        StartDate: sStartDate,
        EndDate: sEndDate,
        TotalHours: diffHours,       // ⭐ NEW
        TotalDays: iDays,
        TotalMonths: iMonths,
        TotalYears: iYears,
        TotalAmount: fTotal,
        Image: f.Image,
        Currency: f.Currency,
        Branch:f.BranchCode,
        UnitText: f.UnitText
      });
    }
    });
  });

  const grandTotal = totalFacilityPrice + Number(roomRentPrice || 0);

  return {
    TotalHours: diffHours,           // ⭐ NEW
    TotalDays: iDays,
    TotalMonths: iMonths,
    TotalYears: iYears,
    TotalFacilityPrice: totalFacilityPrice,
    GrandTotal: grandTotal,
    AllSelectedFacilities: aAllFacilities
  };
},

    // Helper function to parse date
 _parseDate: function (sDate) {
      const aParts = sDate.split("/");
      return new Date(aParts[2], aParts[1] - 1, aParts[0]);
    }
,

    // TC_onDialogBackButton: function () {
    //   const oWizard = this.getView().byId("TC_id_wizard");
    //   oWizard.previousStep();
    // },

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
      if (sStartDate) {
        var date = this._parseDate(sStartDate);
        let oStart = new Date(date);
    
        // Add 1 day in LOCAL timezone
        oStart.setDate(oStart.getDate() + 1);
    
        // Convert to yyyy-MM-dd WITHOUT timezone conversion
        const sMinEndDate = [
            oStart.getFullYear(),
            String(oStart.getMonth() + 1).padStart(2, "0"),
            String(oStart.getDate()).padStart(2, "0")
        ].join("-");
    
        oEndDatePicker.setMinDate(new Date(sMinEndDate));
    }

      // ✅ Auto-calculate End Date if plan is "monthly" and Start Date selected
      if (oEvent.getSource().getId().includes("idStartDate1") && sStartDate && sPaymentType === "Per Month") {
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
       if (oEvent.getSource().getId().includes("idStartDate1") && sStartDate && sPaymentType === "Per Year") {
        const oStart = this._parseDate(sStartDate);
        if (oStart instanceof Date && !isNaN(oStart)) {
          const oNewEnd = new Date(oStart);
          // Add 365 days per month
          oNewEnd.setDate(oStart.getDate() + (365 * iSelectedMonths));
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

    // Selected duration: Per Month / Per Year / Per Day
    const sDuration = oHostelModel.getProperty("/SelectedPriceType");

    // Selected number (1–11)
    const iSelectedMonths = parseInt(oEvent.getSource().getSelectedKey() || "1", 10);
    oHostelModel.setProperty("/SelectedMonths", iSelectedMonths.toString());

    const sStartDate = oView.byId("idStartDate1")?.getValue() || "";

    if (!sStartDate) {
        sap.m.MessageToast.show("Please select Start Date first.");
        return;
    }

    // Convert dd/MM/yyyy → Date object
    const oStart = this._parseDate(sStartDate);
    if (!(oStart instanceof Date) || isNaN(oStart)) {
        sap.m.MessageToast.show("Invalid Start Date.");
        return;
    }

    // Work on a copy
    let oEnd = new Date(oStart);

    // ⭐ REAL DATE LOGIC (CALENDAR ACCURATE)
    if (sDuration === "Per Month") {
        oEnd.setMonth(oEnd.getMonth() + iSelectedMonths);
    }
    else if (sDuration === "Per Year") {
        oEnd.setFullYear(oEnd.getFullYear() + iSelectedMonths);
    }
    else if (sDuration === "Per Day") {
        sap.m.MessageToast.show("Duration is per day. No month/year selection needed.");
        return;
    }

    // Convert to dd/MM/yyyy
    const sEndDate = this._formatDateToDDMMYYYY(oEnd);

    // Update model and UI
    oHostelModel.setProperty("/EndDate", sEndDate);
    oView.byId("idEndDate1")?.setValue(sEndDate);
},
    _formatDateToDDMMYYYY: function (oDate) {
      if (!(oDate instanceof Date)) return "";
      const dd = String(oDate.getDate()).padStart(2, "0");
      const mm = String(oDate.getMonth() + 1).padStart(2, "0");
      const yyyy = oDate.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    },

    onNavBack: function () {
      var oRouter = this.getOwnerComponent().getRouter();
      oRouter.navTo("RouteHostel");
    },

    TC_handleNavigationChange: function (oEvent) {
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

    onRoomDurationChange: function (oEvent) {
    const oView = this.getView();
    const oHostelModel = oView.getModel("HostelModel");
    const oRoomDetailModel = oView.getModel("RoomDetailModel");
    const oBTN = oView.getModel("OBTNModel");

    if (!oHostelModel || !oRoomDetailModel || !oBTN) return;

    // Reset all selected facilities
    const aPersons = oHostelModel.getData().Persons;
    aPersons?.forEach(p => p.AllSelectedFacilities = []);

    // ⭐ Now we read value instead of key
    const sValue = oEvent.getSource().getValue();  
    // sValue = "Per Day" / "Per Month" / "Per Year"

    const iMonths = parseInt(oHostelModel.getProperty("/SelectedMonths") || "1", 10);
    const sStartDate = oHostelModel.getProperty("/StartDate");

    // Update selected type
    oHostelModel.setProperty("/SelectedPriceType", sValue);

    const oEndDatePicker = oView.byId("idEndDate1");
    const sBranchCode = oHostelModel.getProperty("/BranchCode") || "";

    /** ⭐ Price Calculation */
    const sRoomType = oView.byId("GI_Roomtype")?.getText()?.trim() || "";
    const aRoomDetails = oRoomDetailModel.getData();

    const normalize = v => (v ? String(v).trim().toLowerCase() : "");
    const oMatchingRoom = aRoomDetails.find(item =>
        normalize(item.BedTypeName) === normalize(sRoomType) &&
        normalize(item.BranchCode) === normalize(sBranchCode)
    );

    if (!oMatchingRoom) {
        oHostelModel.setProperty("/FinalPrice", "");
        return;
    }

    // ⭐ Set price by VALUE
    if (sValue === "Per Day") {
        oHostelModel.setProperty("/FinalPrice", oMatchingRoom.Price);
    }
    else if (sValue === "Per Month") {
        oHostelModel.setProperty("/FinalPrice", oMatchingRoom.MonthPrice);
    }
    else if (sValue === "Per Year") {
        oHostelModel.setProperty("/FinalPrice", oMatchingRoom.YearPrice);
    }

    /** ⭐ Per Day → user selects date manually */
    if (sValue === "Per Day") {
        oBTN.setProperty("/Month", false);
        oHostelModel.setProperty("/StartDate", "");
        oHostelModel.setProperty("/EndDate", "");
        oEndDatePicker.setEditable(true);
        oBTN.setProperty("/Next", false);
        return;
    }

    /** ⭐ Per Month / Per Year → automatic end date */
    if (sValue === "Per Month" || sValue === "Per Year") {
        oBTN.setProperty("/Month", true);
        oHostelModel.setProperty("/SelectedMonths", "1");
        oHostelModel.setProperty("/StartDate", "");
        oHostelModel.setProperty("/EndDate", "");

        oEndDatePicker.setEditable(false);
        oBTN.setProperty("/Next", false);
        return;
    }

    /** ⭐ Need Start Date to calculate */
    if (!sStartDate) {
        oHostelModel.setProperty("/EndDate", "");
        oEndDatePicker.setValue("");
        return;
    }

    const oStart = this._parseDate(sStartDate);
    if (!(oStart instanceof Date) || isNaN(oStart)) return;

    let iDaysAdd = 0;

    // ⭐ Now based on VALUE
    if (sValue === "Per Month") {
        iDaysAdd = iMonths * 30;
    }
    else if (sValue === "Per Year") {
        iDaysAdd = iMonths * 365;
    }

    const oEnd = new Date(oStart);
    oEnd.setDate(oEnd.getDate() + iDaysAdd);

    const sEnd = this._formatDateToDDMMYYYY(oEnd);

    oHostelModel.setProperty("/EndDate", sEnd);
    oEndDatePicker.setValue(sEnd);

    oBTN.refresh(true);
    oHostelModel.refresh(true);
},

//login
  _validateFPFields: function () {
            let id = sap.ui.getCore().byId("fpUserId").getValue();
            let name = sap.ui.getCore().byId("fpUserName").getValue();
            let btn = this._oForgotDialog.getBeginButton();

            btn.setEnabled(id !== "" && name !== "");
        },

        onSelectLoginMode: function () {
            const vm = this.getView().getModel("LoginViewModel");
            const pass = vm.getProperty("/isPasswordSelected");
            vm.setProperty("/isOtpSelected", !pass);
            vm.setProperty("/isPasswordSelected", !vm.getProperty("/isOtpSelected"));
        },
        _clearAllAuthFields: function () {
            const ids = [
                "signInuserid", "signInusername", "signinPassword",
                "fpUserId", "fpUserName", "fpOTP",
                "newPass", "confPass", "loginOTP"
            ];
            ids.forEach(id => {
                const c = sap.ui.getCore().byId(id);
                if (c) { c.setValue(""); c.setValueState("None"); }
            });
            this._storedLoginCreds = null;
            this._oResetUser = null;
        },
        onFPValidate: function () {
            const id = sap.ui.getCore().byId("fpUserId").getValue().trim();
            const name = sap.ui.getCore().byId("fpUserName").getValue().trim();
            sap.ui.getCore().byId("btnFPNext").setEnabled(id !== "" && name !== "");
        },

        onOtpLive: function (e) {
            const v = e.getParameter("value").trim();
            sap.ui.getCore().byId("btnOtpVerify").setEnabled(v !== "");
        },
    // Sign In
    onSignIn: async function () {
      var oLoginModel = this.getView().getModel("LoginModel");
      var oLoginViewModel = this.getView().getModel("LoginViewModel");
      var oFragment = this._oLoginAlertDialog; // Correct reference to fragment dialog
       
      var sUserid = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInuserid").getValue();
      var sUsername = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInusername").getValue();
      var sPassword = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signinPassword").getValue();

      // Validation
      if (
        !utils._LCvalidateMandatoryField(sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInuserid"), "ID") ||
        !utils._LCvalidateMandatoryField(sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInusername"), "ID") ||
        !utils._LCvalidatePassword(sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signinPassword"), "ID")

      ) {
        sap.m.MessageToast.show("Make sure all the mandatory fields are filled/validate the entered value");
        return;
      }

      try {
      
        const payload = { UserID: sUserid, UserName: sUsername, Password: btoa(sPassword)};
          BusyIndicator.show(0)
        const oResponse = await this.ajaxReadWithJQuery("HM_Login", payload);

       
       let aUsers = [];

if (Array.isArray(oResponse.data)) {
    if (Array.isArray(oResponse.data[0])) {
        aUsers = oResponse.data[0];
    } else {
        aUsers = oResponse.data;
    }
} else {
    console.error("Unexpected backend response format", oResponse);
}

          BusyIndicator.hide()
       const oMatchedUser = aUsers.find(user =>
    user.UserID === sUserid &&
    user.UserName === sUsername
);


        if (!oMatchedUser) {
          sap.m.MessageToast.show("Invalid credentials. Please try again.");
          return;
        }

        // Update LoginModel
        oLoginModel.setProperty("/UserID", oMatchedUser.UserID);
        oLoginModel.setProperty("/UserName", oMatchedUser.UserName);
        oLoginModel.setProperty("/EmailID", oMatchedUser.EmailID);
        oLoginModel.setProperty("/MobileNo", oMatchedUser.MobileNo);
        oLoginModel.setProperty("/Status", oMatchedUser.Status);
        oLoginModel.setProperty("/DateOfBirth", oMatchedUser.DateOfBirth);
        oLoginModel.setProperty("/Gender", oMatchedUser.Gender);
        oLoginModel.setProperty("/Country", oMatchedUser.Country);
        oLoginModel.setProperty("/State", oMatchedUser.State);
        oLoginModel.setProperty("/City", oMatchedUser.City);
        oLoginModel.setProperty("/Address", oMatchedUser.Address);
        oLoginModel.setProperty("/STDCode", oMatchedUser.STDCode);
        oLoginModel.setProperty("/Salutation", oMatchedUser.Salutation);
      
              
         this._oLoggedInUser = oMatchedUser;
        // Clear input fields
        sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInusername").setValue("");
        sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signinPassword").setValue("");

        // Close dialog
        if (oFragment) oFragment.close();

        // Handle UI visibility based on role
        const oView = this.getView();
       if (oMatchedUser.Role === "Customer") {

    const oHostelModel = this.getView().getModel("HostelModel");
    const aPersons = oHostelModel.getProperty("/Persons");

    // Ensure Persons array exists
    if (aPersons && aPersons.length > 0) {
        const DOB =this.Formatter.DateFormat(oMatchedUser.DateOfBirth)
        // Fill Person 1 details
        aPersons[0].Salutation      = oMatchedUser.Salutation || "";
        aPersons[0].FullName        = oMatchedUser.UserName || "";
        aPersons[0].DateOfBirth     = DOB;
        aPersons[0].Gender          = oMatchedUser.Gender || "";
        aPersons[0].MobileNo        = oMatchedUser.MobileNo || "";
        aPersons[0].CustomerEmail   = oMatchedUser.EmailID || "";
        aPersons[0].Country         = oMatchedUser.Country || "";
        aPersons[0].State           = oMatchedUser.State || "";
        aPersons[0].City            = oMatchedUser.City || "";
        aPersons[0].Address         = oMatchedUser.Address || "";
        aPersons[0].STDCode         = oMatchedUser.STDCode || "";

       aPersons.forEach(p => {
    p.UserID = oMatchedUser.UserID;
        });


        oHostelModel.refresh(true);

        // Auto-check the "Fill Yourself" checkbox
        const oCheck = sap.ui.getCore().byId(this.createId("IDSelfCheck_0"));
        if (oCheck) {
            oCheck.setSelected(true);
        }
    }
       }
      } catch (err) {
        console.error("Login Error:", err);
        sap.m.MessageToast.show("Failed to fetch login data: " + err);
      }
    },
    //   onValidateUser: async function () {
    //         let sUserId = sap.ui.getCore().byId("fpUserId").getValue().trim();
    //         let sUserName = sap.ui.getCore().byId("fpUserName").getValue().trim();

    //         const payload = { UserID: sUserId, UserName: sUserName, Type: "OTP" };

    //         sap.ui.core.BusyIndicator.show(0);
    //         try {
    //             const oResp = await $.ajax({
    //                 url: "https://rest.kalpavrikshatechnologies.com/HostelSendOTP",
    //                 method: "POST",
    //                 contentType: "application/json",
    //                 headers: {
    //                     name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
    //                     password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
    //                 },
    //                 data: JSON.stringify(payload)
    //             });

    //             if (oResp?.success) {
    //                 this._oResetUser = { UserID: sUserId, UserName: sUserName };

    //                 // 👇 MUST stay “forgot” until OTP verified
    //                 this.getView().getModel("LoginViewModel").setProperty("/authFlow", "forgot");

    //                 this._showPanel("otpVerifyPanel");
    //             } else {
    //                 sap.m.MessageToast.show("User not found or OTP failed");
    //             }
    //         } catch (err) {
    //             sap.m.MessageToast.show("Unable to send OTP, try again later.");
    //         } finally {
    //             sap.ui.core.BusyIndicator.hide();
    //         }
    //     },

    //     _verifyOTPWithBackend: async function (otp) {
    //         sap.ui.core.BusyIndicator.show(0);
    //         try {
    //             const oResp = await $.ajax({
    //                 url: "https://rest.kalpavrikshatechnologies.com/HM_Login",
    //                 method: "GET",
    //                 contentType: "application/json",
    //                 headers: {
    //                     name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
    //                     password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
    //                 },
    //                 data: {
    //                     UserID: this._oResetUser.UserID,
    //                     UserName: this._oResetUser.UserName,
    //                     OTP: otp.trim()
    //                 }
    //             });
    //             console.log("OTP SENT FOR VERIFICATION:", otp.trim());

    //             console.log("Verify OTP Response:", oResp);
    //             return oResp?.success === true;

    //         } catch (err) {
    //             console.error("OTP Verify Error:", err);
    //             return false;

    //         } finally {
    //             sap.ui.core.BusyIndicator.hide();
    //         }
    //     },
    //  onPressOTP: async function () {
    //     var sUserId = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInuserid").getValue();
    //     var  sUserName = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInusername").getValue();
           
    //          if (
    //     !utils._LCvalidateMandatoryField(sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInuserid"), "ID") ||
    //     !utils._LCvalidateMandatoryField(sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInusername"), "ID") 
    //   ) {
    //     sap.m.MessageToast.show(" Enter valid User ID and User Name");
    //     return;
    //   }

          
    //         sap.ui.core.BusyIndicator.show(0);
    //              const oPayload = {
    //         UserID: sUserId,
    //         UserName: sUserName,
    //         Type: "OTP"
    //               };
    //         try {
    //          var Response =  await this.ajaxCreateWithJQuery("HostelSendOTP", oPayload)
    //             if (Response?.success) {
    //                 sap.m.MessageToast.show("OTP sent! Check your email");
    //                 // this._openOTPLoginDialog(sUserId, sUserName);
    //                 BusyIndicator.hide()
    //                 this._oResetUser = { UserID: sUserId, UserName: sUserName };
    //                 this.getView().getModel("LoginViewModel").setProperty("/authFlow", "otp");
    //                 this._showPanel("otpVerifyPanel");

    //             } else {
    //                 sap.m.MessageToast.show("User not found or cannot send OTP.");
    //             }

    //         } catch (err) {
    //             sap.m.MessageToast.show("OTP sending failed!");
    //         } finally {
    //             BusyIndicator.hide();
    //         }
    //     },
    //      onForgotPassword: function () {
    //         this.getView().getModel("LoginViewModel").setProperty("/authFlow", "forgot");
    //         this._showPanel("forgotPasswordPanel");
    //         this._clearAllAuthFields();
    //     },
    //     _sendOTPToBackend: function (id, name) {
    //         let url = "https://rest.kalpavrikshatechnologies.com/HostelSendOTP";

    //         let payload = {
    //             UserID: id,
    //             UserName: name,
    //             Type: "OTP"
    //         };
           
    //         $.ajax({
    //             url: url,
    //             method: "POST",
    //             contentType: "application/json",
    //             headers: {                 // as provided
    //                 name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
    //                 password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
    //             },
    //             data: JSON.stringify(payload),
    //             success: function () {
    //                 sap.m.MessageToast.show("OTP sent to email");
    //                 this._oForgotDialog.close();
    //                 this._openOTPDialog(id, name);
    //             }.bind(this),
    //             error: function () {
    //                 sap.m.MessageToast.show("Failed to send OTP");
    //             }
    //         });
    //     },


    //     _openOTPDialog: function () {
    //         this._oOTPDialog = new sap.m.Dialog({
    //             title: "Enter OTP",
    //             type: "Message",
    //             content: [
    //                 new sap.m.Label({ text: "OTP", required: true }),
    //                 new sap.m.Input("fpOTP", { placeholder: "Enter OTP" })
    //             ],
    //             beginButton: new sap.m.Button({
    //                 text: "Verify",
    //                 type: "Accept",
    //                 press: this._onVerifyOTP.bind(this)
    //             }),
    //             endButton: new sap.m.Button({
    //                 text: "Cancel",
    //                 press: function () { this._oOTPDialog.close(); }.bind(this)
    //             })
    //         });
    //         let btn = this._oOTPDialog.getBeginButton();
    //         btn.setEnabled(false);

    //         sap.ui.getCore().byId("fpOTP").attachLiveChange(function (oEvt) {
    //             btn.setEnabled(oEvt.getParameter("value").trim() !== "");
    //         });


    //         this._oOTPDialog.open();
    //     },
    //        _onVerifyOTP: async function () {
    //         const otp = sap.ui.getCore().byId("fpOTP").getValue().trim();
    //         if (!otp) { sap.m.MessageToast.show("Enter OTP"); return; }

    //         const vm = this.getView().getModel("LoginViewModel");
    //         const flow = vm.getProperty("/authFlow");

    //         const isValid = await this._verifyOTPWithBackend(otp);
    //         if (!isValid) { sap.m.MessageToast.show("Incorrect OTP"); return; }

    //         // 👉 CASE 1: Forgot Password → Go to Reset Panel
    //         if (flow === "forgot") {
    //             vm.setProperty("/authFlow", "reset");
    //             this._showPanel("resetPasswordPanel");
    //             return; // ❗ STOP HERE
    //         }

    //         // 👉 CASE 2: Normal OTP Login → Login User
    //         if (flow === "otp") {
    //             const resp = await $.ajax({
    //                 url: "https://rest.kalpavrikshatechnologies.com/HM_Login",
    //                 method: "GET",
    //                 contentType: "application/json",
    //                 headers: {
    //                     name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
    //                     password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
    //                 },
    //                 data: {
    //                     UserID: this._oResetUser.UserID,
    //                     UserName: this._oResetUser.UserName,
    //                     OTP: otp
    //                 }
    //             });

    //             sap.m.MessageToast.show("Login Successful!");
    //             this._setLoggedInUser(resp.data[0]);
    //             this._resetAllAuthFields();
    //             this._oSignDialog.close();
    //             return;
    //         }
    //     },

    //     onForgotPassword: function () {
    //         this.getView().getModel("LoginViewModel").setProperty("/authFlow", "forgot");
    //         this._showPanel("forgotPasswordPanel");
    //         this._clearAllAuthFields();
    //     },
    //     _showPanel: function (panelId) {
    //         ["signInPanel", "forgotPasswordPanel", "otpVerifyPanel", "resetPasswordPanel"].forEach(id => {
    //             const c = sap.ui.getCore().byId(id);
    //             if (c) c.setVisible(id === panelId);
    //         });
    //     },

     SM_onTogglePasswordVisibility: function (oEvent) {
            var oInput = oEvent.getSource();
            var sType = oInput.getType() === "Password" ? "Text" : "Password";
            oInput.setType(sType);
            // Toggle the value help icon properly without losing the value
            var sIcon =
                sType === "Password" ? "sap-icon://show" : "sap-icon://hide";
            oInput.setVaMakelueHelpIconSrc(sIcon);
            // Ensure the current value of the password is retained
            var sCurrentValue = oInput.getValue();
            oInput.setValue(sCurrentValue);
        },
        SM_onChnageSetAndConfirm: function (oEvent) {
            utils._LCvalidatePassword(oEvent);
        },
		onUserlivechange: function (oEvent) {
			utils._LCvalidateMandatoryField(oEvent);
		},
	
    onOpenProceedtoPay: function () {
    if (!this._oPaymentDialog) {
        this._oPaymentDialog = sap.ui.xmlfragment(
            "sap.ui.com.project1.fragment.PaymentPage",
            this
        );
        this.getView().addDependent(this._oPaymentDialog);
    }

    var oPaymentModel = this.getView().getModel("PaymentModel");
    var oHostelModel = this.getView().getModel("HostelModel");

    // Set default values
    oPaymentModel.setProperty("/PaymentDate", this.Formatter.formatDate(new Date()));
    oPaymentModel.setProperty("/PaymentType", "UPI");
    oPaymentModel.setProperty("/Amount", oHostelModel.getProperty("/OverallTotalCost")
    );

    this._oPaymentDialog.open();
},

   onPaymentTypeSelect: function (oEvent) {
    const index = oEvent.getSource().getSelectedIndex();
    const isUPI = index === 0;
    this._togglePaymentSections(isUPI);

    var oPaymentModel = this.getView().getModel("PaymentModel");
    var oHostelModel = this.getView().getModel("HostelModel");

    oPaymentModel.setProperty("/PaymentType", isUPI ? "UPI" : "CARD");
    oPaymentModel.setProperty("/PaymentDate", this.Formatter.formatDate(new Date()));
    oPaymentModel.setProperty("/Amount", oHostelModel.getProperty("/OverallTotalCost"));
},

    _togglePaymentSections: function(isUPI) {
        sap.ui.getCore().byId("idUPISection").setVisible(isUPI);
        sap.ui.getCore().byId("idCardSection").setVisible(!isUPI);

        const aFields = [
           "idAmount", "idPaymentTypeField", "idTransactionID",
            "idPaymentDate", "idCardNumber", "idCardExpiry", "idCardCVV"
        ];
        aFields.forEach(id => sap.ui.getCore().byId(id)?.setValue(""));
    },

    onAmountChange: function(oEvent) {
        const oInput = oEvent.getSource();
        utils._LCvalidateAmount(oEvent);
        if (oInput.getValue() === "") oInput.setValueState("None");

        const value = (oInput.getValue());
        const total = (this.getView().getModel("HostelModel").getProperty("/OverallTotalCost"));

        if (value > total) {
            oInput.setValueState("Error");
            oInput.setValueStateText("Amount cannot be greater than Grand Total");
        } else {
            oInput.setValueState("None");
        }
    },

    _clearAllPaymentFields: function() {
        [
             "idAmount", "idPaymentTypeField", "idTransactionID",
            "idPaymentDate", "idCardNumber",
            "idCardExpiry", "idCardCVV"
        ].forEach(id => {
            const c = sap.ui.getCore().byId(id);
            if (!c) return;
            if (c.setValue) c.setValue("");
            if (c.setSelectedKey) c.setSelectedKey("");
            c.setValueState("None");
        });
    },

    onPaymentClose: function() {
        if (this._oPaymentDialog) {
            this._oPaymentDialog.close();
        }

        const aFields = [
             "idAmount", "idPaymentTypeField", "idTransactionID",
            "idPaymentDate", "idCardNumber", "idCardExpiry", "idCardCVV"
        ];
        aFields.forEach(id => sap.ui.getCore().byId(id)?.setValue(""));
    },

    onBankNameChange: function(oEvent) {
        const oInput = oEvent.getSource();
        utils._LCvalidateMandatoryField(oEvent);
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
         utils._LCvalidateMandatoryField(sap.ui.getCore().byId("idPaymentTypeField"), "ID") &&
         utils._LCvalidateMandatoryField(sap.ui.getCore().byId("idTransactionID"), "ID") &&
         utils._LCvalidateDate(sap.ui.getCore().byId("idPaymentDate"), "ID")
     );

     if (!isMandatoryValid) {
         sap.m.MessageToast.show("Please fill all mandatory fields.");
         return;
     }

     const oAmountInput = sap.ui.getCore().byId("idAmount");
     const enteredAmount = Number(oAmountInput.getValue());
     const grandTotal = Number(this.getView().getModel("HostelModel").getProperty("/OverallTotalCost"));

     if (enteredAmount > grandTotal) {
         oAmountInput.setValueState("Error");
         oAmountInput.setValueStateText("Amount cannot be greater than Grand Total");
         sap.m.MessageToast.show("Amount cannot be greater than Grand Total");
         return; // STOP further processing
     } else {
         oAmountInput.setValueState("None");
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
                     RoomPrice: oData.FinalPrice,
                     NoOfPersons: oData.Person || oData.Persons.length,
                     StartDate: oData.StartDate ? oData.StartDate.split("/").reverse().join("-") : "",
                     EndDate: oData.EndDate ? oData.EndDate.split("/").reverse().join("-") : "",
                     Status: "New",
                     PaymentType: oData.SelectedPriceType || "",
                     BedType: `${oData.BedType} - ${oData.ACType}`,
                     BranchCode:oData.BranchCode
                 });
             }
             const paymentDetails = {
                //  BankName: sap.ui.getCore().byId("idBankName").getValue(),
                 Amount: sap.ui.getCore().byId("idAmount").getValue(),
                 PaymentType: sap.ui.getCore().byId("idPaymentTypeField").getValue(),
                 BankTransactionID: sap.ui.getCore().byId("idTransactionID").getValue(),
                 Date: sap.ui.getCore().byId("idPaymentDate").getValue() ? sap.ui.getCore().byId("idPaymentDate").getValue().split("/").reverse().join("-") : "",
                //  Currency: sap.ui.getCore().byId("idCurrency").getValue()
             };

             // Store in model temporarily
             oData.PaymentDetails = paymentDetails;

             //  Handle both object and string facility formats
           const aSelectedFacilities = p.AllSelectedFacilities || [];

aSelectedFacilities.forEach(fac => {
    let facilityPrice = 0;

    if (fac.UnitText === "Per Day") facilityPrice = fac.Price
 || 0;
    else if (fac.UnitText === "Per Month") facilityPrice = fac.Price
 || 0;
    else if (fac.UnitText === "Per Year") facilityPrice = fac.Price
 || 0;
    else if (fac.UnitText === "Per Hour") facilityPrice = fac.Price || 0;

    facilityData.push({
        PaymentID: "",
        FacilityName: fac.FacilityName,
        FacilitiPrice: facilityPrice,
        StartDate: fac.StartDate ? fac.StartDate.split("/").reverse().join("-") : "",
        EndDate: fac.EndDate ? fac.EndDate.split("/").reverse().join("-") : "",
        PaidStatus: "Pending",
        UnitText: fac.UnitText,
        StartTime: fac.StartTime || "",
        EndTime: fac.EndTime || "",
        TotalHour: fac.TotalTime || "",
        Currency: fac.Currency
    });
});


             // Return formatted entry
             return {
                 Salutation: p.Salutation,
                 CustomerName: p.FullName,
                 UserID: p.UserID,
                 STDCode: p.STDCode,
                 MobileNo: p.MobileNo,
                 Gender: p.Gender,
                 DateOfBirth: p.DateOfBirth ? p.DateOfBirth.split("/").reverse().join("-") : "",
                 CustomerEmail: p.CustomerEmail,
                 Country: p.Country,
                 State: p.State,
                 City: p.City,
                 PermanentAddress: p.Address,
                 Documents: (p.Documents && p.Documents.length > 0)
                  ? p.Documents.map(doc => ({
                      DocumentType: "ID Proof",
                      File: doc.Document,
                      FileName: doc.FileName,
                      FileType: doc.FileType
                  }))
                  : [],

                 Booking: bookingData,
                 FacilityItems: facilityData,
                 PaymentDetails: [oData.PaymentDetails]
             };
         });

         // Final payload structure
         const oPayload = {
             data: formattedPayload
         };

         // AJAX call
         const oResponse = await this.ajaxCreateWithJQuery("HM_Customer", oPayload);

         // Extract BookingDetails array
         const aBookingDetails = oResponse.BookingDetails || [];

         // Prepare message text
         let sMessage = "Booking Successful!\n\n";

         aBookingDetails.forEach((item, index) => {
             sMessage += "Booking ID: " + item.BookingID + "\n";
         });

         // Show success box
         sap.m.MessageBox.success(sMessage, {
             title: "Success",
             actions: [sap.m.MessageBox.Action.OK],
          onClose: function () {

                // Navigate to hostel page
                var oRoute = this.getOwnerComponent().getRouter();
                oRoute.navTo("RouteHostel");

                setTimeout(function () {
                  this.resetAllBookingData()
                    this.openProfileDialog();
                }.bind(this), 500);
                // --- SHOW AVATAR AUTOMATICALLY ---
                const oAvatar = sap.ui.getCore().byId("ProfileAvatar");
                if (oAvatar) {
                    oAvatar.setVisible(true);   
                }
            }.bind(this)
         });
        } catch (err) {
            sap.m.MessageBox.error("Error while booking: " + err);
        }
    },
      openProfileDialog: function () {
      this.onPressAvatar()
      },
       onPressAvatar: async function () {
            const oUser = this._oLoggedInUser || {};
            try {
                const sUserID = oUser.UserID || "";
                if (!sUserID) {
                    sap.m.MessageToast.show("User not logged in.");
                    return;
                }
                const filter = {
                    UserID: sUserID
                };
                sap.ui.core.BusyIndicator.show(0);
                //  Fetch only the logged-in user's data
                const response = await this.ajaxReadWithJQuery("HM_Customer", filter);

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
                    const oDialog = await sap.ui.core.Fragment.load({
                        name: "sap.ui.com.project1.fragment.ManageProfile",
                        controller: this
                    });
                    this._oProfileDialog = oDialog;
                    this.getView().addDependent(oDialog);
                }

                //  Create and bind the Profile Model
                const oProfileModel = new JSONModel({
                    photo: oUser.FileContent,
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

            } catch (err) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },
            onCancelPress: function () {
            this.resetAllBookingData()
      var oRouter = this.getOwnerComponent().getRouter()
      oRouter.navTo("RouteHostel")
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
             this.getOwnerComponent().getRouter().navTo("RouteAdminDetails", {
                sPath: encodeURIComponent(sCustomerID)
            });
        },

resetAllBookingData: function () {

    const oHostelModel = this.getView().getModel("HostelModel");

    // ---- RESET MODEL COMPLETELY ----
    oHostelModel.setData({
        Persons: [],
        SelectedPerson: "",
        SelectedMonths: "",
        SelectedPriceType: "",
        StartDate: "",
        EndDate: "",
        Price: "",
        FinalPrice: "",
        GrandTotal: "",
        TotalFacilityPrice: "",
        TotalDays: "",
        OverallTotalCost: "",
        ForBothSelected: false,
        Facilities: [],
        Documents: [],
        PaymentDetails: {}
    });

    oHostelModel.refresh(true);


    // ---- RESET UI ELEMENTS ----
    // Personal container (remove all generated forms)
    const oVBox = this.getView().byId("idPersonalContainer1");
    if (oVBox) {
        oVBox.destroyItems();
    }

    // Clear room type, branch, UPI, bank, amount etc
    const clearIds = [
        "GI_Roomtype", "idStartDate1", "idEndDate1", "idUPIID",
        "idBankName", "idAmount", "idPaymentTypeField", "idTransactionID",
        "idPaymentDate", "idCurrency"
    ];

    clearIds.forEach(id => {
        const ctrl = sap.ui.getCore().byId(id) || this.getView().byId(id);
        if (ctrl?.setValue) ctrl.setValue("");
        if (ctrl?.setSelectedKey) ctrl.setSelectedKey("");
    });

    // Reset summary page text fields
    const summaryFields = ["idPrice3", "idGrandTotal", "idTotalDays"];
    summaryFields.forEach(id => {
        const fld = this.getView().byId(id);
        if (fld?.setText) fld.setText("");
    });

    // ---- RESET WIZARD (IF USING) ----
    const oWizard = this.byId("BookRoomWizard");
    if (oWizard) {
        oWizard.discardProgress(oWizard.getSteps()[0]);
        oWizard.goToStep(oWizard.getSteps()[0]);
    }

    console.log("✔ All booking data fully reset!");
},
 onEditBooking: function () {

    var oTable = sap.ui.getCore().byId("IdProfileaTable");
    var oSelectedItem = oTable.getSelectedItem();

    if (!oSelectedItem) {
        sap.m.MessageToast.show("Please select a booking to edit.");
        return;
    }

    // Get selected booking record
    var oContext = oSelectedItem.getBindingContext("profileData");
    var oBookingData = oContext.getObject();

    // -------------------------------
    // 1️⃣ STATUS VALIDATION (STOP HERE)
    // -------------------------------
    var sStatus = (oBookingData.status || "").trim().toLowerCase();

    if (sStatus !== "new") {
        sap.m.MessageToast.show("Only bookings with status 'New' can be edited.");
        return;  // ❗ STOP — DO NOT NAVIGATE
    }
    // -------------------------------

    // Retrieve models
    var oProfileModel = this._oProfileDialog.getModel("profileData");
    var aCustomers = oProfileModel.getProperty("/aCustomers");
    var aFacilities = oProfileModel.getProperty("/facility");

    // Customer ID
    var sCustomerID = oBookingData.cutomerid || oBookingData.CustomerID || "";

    if (!sCustomerID) {
        sap.m.MessageToast.show("Customer ID not found for this booking.");
        return;
    }

    // Find customer
    var oCustomer = aCustomers.find(cust => cust.customerID === sCustomerID);
    if (!oCustomer) {
        sap.m.MessageToast.show("No customer details found for this booking.");
        return;
    }

    // Customer facilities
    var aCustomerFacilities = aFacilities.filter(fac => fac.customerid === sCustomerID);

    // Calculate totals
    var oTotals = this.calculateTotals(
        [{ FullName: oCustomer.customerName, Facilities: { SelectedFacilities: aCustomerFacilities } }],
        oBookingData.Startdate,
        oBookingData.EndDate,
        oBookingData.RoomPrice
    );

    if (!oTotals) {
        return; // Invalid dates — do not navigate
    }

    // Prepare data for edit page
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
        GrandTotal: oTotals.GrandTotal,
        HasFacilities: oTotals.AllSelectedFacilities.length > 0
    };
    // oFullCustomerData.HasFacilities = oTotals.AllSelectedFacilities.length > 0;


    // Set model & Navigate
    var oHostelModel = new JSONModel(oFullCustomerData);
    this.getOwnerComponent().setModel(oHostelModel, "HostelModel");

    var oRouter = this.getOwnerComponent().getRouter();
    oRouter.navTo("EditBookingDetails");
}
,
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
            onPressEditSave: async function (oEvent) {
    var oButton = oEvent.getSource();
    var oViewModel = this.getView().getModel("viewModel");
    var bEditMode = oViewModel.getProperty("/editMode");
    var oHostelModel = this.getView().getModel("HostelModel");
    var oData = oHostelModel.getData();

    if (!bEditMode) {
        // Before entering edit mode, ensure bed types are loaded
        await this.BedTypedetails();

        // Switch to edit mode
        oViewModel.setProperty("/editMode", true);
        oButton.setText("Save");
    } else {
      
        oViewModel.setProperty("/editMode", false);
        oButton.setText("Edit");

        try {
            //  Build Booking data
            const bookingData = [{
                BookingDate: oData.StartDate ? oData.StartDate.split("/").reverse().join("-") : "",
                RentPrice: oData.GrandTotal ? oData.GrandTotal.toString() : "0",
                RoomPrice: oData.RoomPrice || "0",
                NoOfPersons: oData.noofperson || 1,
                Customerid:oData.CustomerId,
                StartDate: oData.StartDate ? oData.StartDate.split("/").reverse().join("-") : "",
                EndDate: oData.EndDate ? oData.EndDate.split("/").reverse().join("-") : "",
                Status: "Updated",
                PaymentType: oData.PaymentType || "",
                BedType: oData.BedType || ""
            }];

            //  Build Facility data
            const facilityData = [];
            if (oData.AllSelectedFacilities && oData.AllSelectedFacilities.length > 0) {
                oData.AllSelectedFacilities.forEach(fac => {
                    facilityData.push({
                        PaymentID: "",
                        FacilityName: fac.FacilityName,
                        FacilitiPrice: fac.Price,
                        StartDate: oData.StartDate ? oData.StartDate.split("/").reverse().join("-") : "",
                        EndDate: oData.EndDate ? oData.EndDate.split("/").reverse().join("-") : "",
                        PaidStatus: "Pending"
                    });
                });
            }

            //  Build Payment data (optional)
            // const paymentDetails = {
            //     BankName: sap.ui.getCore().byId("idBankName")?.getValue() || "",
            //     Amount: sap.ui.getCore().byId("idAmount")?.getValue() || oData.GrandTotal,
            //     PaymentType: oData.PaymentType || "",
            //     BankTransactionID: sap.ui.getCore().byId("idTransactionID")?.getValue() || "",
            //     Date: sap.ui.getCore().byId("idPaymentDate")?.getValue() || "",
            //     Currency: sap.ui.getCore().byId("idCurrency")?.getValue() || "INR"
            // };

            //  Build Personal Information
            const personData = [{
                Salutation: oData.Salutation || "",
                CustomerName: oData.FullName || "",
                UserID: oData.UserID || "",
                CustomerID: oData.CustomerID || "",
                STDCode: oData.STDCode || "",
                MobileNo: oData.MobileNo || "",
                Gender: oData.Gender || "",
                DateOfBirth: oData.DateOfBirth ? oData.DateOfBirth.split("/").reverse().join("-") : "",
                CustomerEmail: oData.CustomerEmail || "",
                Country: oData.Country || "",
                State: oData.State || "",
                City: oData.City || "",
                PermanentAddress: oData.Address || "",
                Booking: bookingData,
                FacilityItems: facilityData,
               //  PaymentDetails: [paymentDetails]
            }];

            //  Final payload structure
            const oPayload = personData;
            var custid = bookingData[0].Customerid
            // --- AJAX CALL (Update to backend) ---
            await this.ajaxUpdateWithJQuery("HM_Customer",{
                data:oPayload,
                filters:{
                    CustomerID:custid
                }
            });
            sap.m.MessageToast.show("Booking details updated successfully!");

        } catch (err) {
            console.error("Error during update:", err);
            sap.m.MessageBox.error("Failed to update booking details: " + err.message);
        }
    }
},
onSelectionChange: function (oEvent) {
    var oSelectedItem = oEvent.getParameter("selectedItem");
    if (!oSelectedItem) return;

    var sSelectedBedTypeID = oSelectedItem.getKey();

    var oBedTypeModel = this.getView().getModel("BedTypeModel");
    var aBedTypes = oBedTypeModel.getData();

    // Find selected bed type object
    var oSelectedBedType = aBedTypes.find(function (item) {
        return item.BedTypeID === sSelectedBedTypeID;
    });

    if (oSelectedBedType) {
        var oHostelModel = this.getView().getModel("HostelModel");

        // Update both RoomType and RoomPrice
        oHostelModel.setProperty("/RoomType", oSelectedBedType.BedTypeName);
        oHostelModel.setProperty("/RoomPrice", oSelectedBedType.Price);

        sap.m.MessageToast.show("Room Type changed to " + oSelectedBedType.BedTypeName);
    }
},
 onProfileDialogClose: function () {
            this._oProfileDialog.close()
        },
         onProfileclose: function () {
            // Close the dialog and perform logout logic
            if (this._oProfileDialog) this._oProfileDialog.close();
        },
  onCancelPress: function () {
            this.resetAllBookingData()
      var oRouter = this.getOwnerComponent().getRouter()
      oRouter.navTo("RouteHostel")
    },
 onHome:function(){
    var oRouter = this.getOwnerComponent().getRouter()
      oRouter.navTo("RouteHostel")
 }

  });
});