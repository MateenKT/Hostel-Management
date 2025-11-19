sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "../model/formatter",
  "../utils/validation",
], function (
  BaseController,
  JSONModel,
  Formatter, utils
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
          Capacity: "",
          StopPriceRecalculateByPerson:false,
        });
        sap.ui.getCore().setModel(oHostelModel, "HostelModel");
      }

      // Set it on the view

      //  Ensure defaults come from previous step (HostelModel)
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
        Month: false,
        Year: false
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
        Price: f.Price,
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


    onNoOfPersonSelect: function (oEvent) {
      var that = this
      var sKey = "";
      if (oEvent && oEvent.getSource && oEvent.getSource().getSelectedKey) {
        sKey = oEvent.getSource().getSelectedKey();
      }
      // fallback to model value (in case we call this without an event)
      var oModel = this.getView().getModel("HostelModel");
      // oModel.setProperty("/StopPriceRecalculateByPerson", true);   
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

        // Already logged in → auto-fill
        aPersons[0].FullName = oUser.UserName || "";
        aPersons[0].CustomerEmail = oUser.EmailID || "";
        aPersons[0].MobileNo = oUser.MobileNo || "";
        aPersons[0].UserID = oUser.UserID || "";

    } else {
        // Only clear if user unchecks manually
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
              required: true,
              maxLength:40
            }),
            new sap.m.Select({
              selectedKey: "{HostelModel>/Persons/" + i + "/Salutation}",
              items: [
                 new sap.ui.core.ListItem({
                  key: "",
                  text: ""
                }),
                new sap.ui.core.ListItem({
                  key: "Mr",
                  text: "Mr"
                }), new sap.ui.core.ListItem({
                  key: "Mrs",
                  text: "Mrs"
                })
                
              ]
            }),
            new sap.m.Input({
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
            new sap.m.Select({
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
							value: "{HostelModel>/Persons/" + i + "/CustomerEmail}"
						}),

						new sap.m.Label({
							text: "Country",
              required: true,
						}),

						 new sap.m.ComboBox({
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
                        text: "For All",
                        selected: true,
                        select: function (e) {
                            const bSel = e.getParameter("selected");
                            oData.ForBothSelected = bSel;

                            if (bSel) {
                                const firstPersonName = oData.Persons[0].PersonName;

                                // Assign personName to first person facilities
                                oData.Persons[0].Facilities.SelectedFacilities =
                                    oData.Persons[0].Facilities.SelectedFacilities.map(f => ({
                                        ...f,
                                        PersonName: firstPersonName
                                    }));

                                // Copy to all persons
                                for (let p = 1; p < iPersons; p++) {
                                    const personName = oData.Persons[p].PersonName;

                                    oData.Persons[p].Facilities.SelectedFacilities =
                                        oData.Persons[0].Facilities.SelectedFacilities.map(f => ({
                                            ...f,
                                            PersonName: personName
                                        }));
                                }
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
                                Image: oFacilityObj.Image,
                                Currency: oFacilityObj.Currency,
                                UnitText: oFacilityObj.UnitText
                              });
                              
                              oCard.addStyleClass("serviceCardSelected");
                            }

                            // If "For Both" is selected, copy selected facilities to second person
                            if (oData.ForBothSelected && iPersons > 1 && i === 0) {
                                            for (let p = 1; p < iPersons; p++) {
                                                const personName = oData.Persons[p].PersonName;
                                                oData.Persons[p].Facilities.SelectedFacilities =
                                                    oData.Persons[0].Facilities.SelectedFacilities.map(f => ({
                                                        ...f,
                                                        PersonName: personName
                                                    }));
                                            }
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
                      text: "{= '₹ ' + ${FacilityModel>Price} + ' ' + ${FacilityModel>Currency} + ' ' + ${FacilityModel>UnitText} }"
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
//     onSignIn: async function () {
//       const oLoginModel = this.getView().getModel("LoginModel");

//       // Access the fragment inputs safely
//       const sUserId = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInuserid")?.getValue();
//       const sUserName = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInusername")?.getValue();
//       const sPassword = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signinPassword")?.getValue();

//       // Basic validation
//       if (!sUserId || !sUserName || !sPassword) {
//         sap.m.MessageToast.show("Please fill in all fields.");
//         return;
//       }

//       try {
//         const oResponse = await this.ajaxReadWithJQuery("HM_Login", "");
//         const aUsers = oResponse?.commentData || [];

//         const oMatchedUser = aUsers.find(user =>
//           user.UserID === sUserId &&
//           user.UserName === sUserName &&
//           (user.Password === sPassword || user.Password === btoa(sPassword))
//         );

//         if (!oMatchedUser) {
//           sap.m.MessageToast.show("Invalid credentials. Please try again.");
//           return;
//         }

//         oLoginModel.setProperty("/EmployeeID", oMatchedUser.UserID);
//         oLoginModel.setProperty("/EmployeeName", oMatchedUser.UserName);
//         oLoginModel.setProperty("/EmailID", oMatchedUser.EmailID);
//         oLoginModel.setProperty("/Role", oMatchedUser.Role);
//         oLoginModel.setProperty("/BranchCode", oMatchedUser.BranchCode || "");
//         oLoginModel.setProperty("/MobileNo", oMatchedUser.MobileNo || "");

//        // After successful login
// if (oMatchedUser.Role === "Customer") {

//     const oHostelModel = this.getView().getModel("HostelModel");
//     const aPersons = oHostelModel.getProperty("/Persons");

//     // Ensure Persons array exists
//     if (aPersons && aPersons.length > 0) {

//         // Fill Person 1 details
//         aPersons[0].FullName = oMatchedUser.UserName || "";
//         aPersons[0].CustomerEmail = oMatchedUser.EmailID || "";
//         aPersons[0].MobileNo = oMatchedUser.MobileNo || "";
//         aPersons[0].UserID = oMatchedUser.UserID || "";

//         oHostelModel.refresh(true);

//         // Auto-check the "Fill Yourself" checkbox
//         const oCheck = sap.ui.getCore().byId(this.createId("IDSelfCheck_0"));
//         if (oCheck) {
//             oCheck.setSelected(true);
//         }
//     }
// } else {
//           sap.m.MessageToast.show("Invalid credentials.");
//         }

//       } catch (err) {
//         console.error("Login Error:", err);
//         sap.m.MessageToast.show("Failed to fetch login data: " + err);
//       }
//     }
    // ,
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
}
,
    onDialogNextButton: async function () {
//         if (this._iSelectedStepIndex === 1) {
//     const aMissing = this._checkMandatoryFields();

//     if (aMissing.length > 0) {
//         sap.m.MessageBox.error(
//             "Please fill the following mandatory fields:\n\n" + aMissing.join("\n")
//         );
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
}
,
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
      const fPrice = parseFloat(f.Price || 0);
      let fTotal = 0;

      switch ((f.UnitText || "").toLowerCase()) {
        case "per hour":          // ⭐ NEW
        case "hour":
          fTotal = fPrice * diffHours;
          break;

        case "per day":
          fTotal = fPrice * iDays;
          break;

        case "per month":
        case "month":
          fTotal = fPrice * (iMonths <= 0 ? 1 : iMonths);
          break;

        case "per year":
        case "year":
          fTotal = fPrice * (iYears <= 0 ? 1 : iYears);
          break;

        default:
          fTotal = fPrice * iDays;
          break;
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

    TC_onDialogBackButton: function () {
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
       if (oEvent.getSource().getId().includes("idStartDate1") && sStartDate && sPaymentType === "yearly") {
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

    oHostelModel.setProperty("/StopPriceRecalculate", true);

    const sStartDate = oView.byId("idStartDate1")?.getValue() || "";
    const iSelectedNumber = parseInt(oEvent.getSource().getSelectedKey() || "1", 10);
    const sDuration = oHostelModel.getProperty("/SelectedPriceType"); 

    oHostelModel.setProperty("/SelectedMonths", iSelectedNumber.toString());

    if (!sStartDate) {
        sap.m.MessageToast.show("Please select Start Date first.");
        return;
    }

    const oStart = this._parseDate(sStartDate);
    if (!(oStart instanceof Date) || isNaN(oStart)) {
        sap.m.MessageToast.show("Invalid Start Date.");
        return;
    }

    let oEnd = new Date(oStart);

    // REAL DATE LOGIC
    switch (sDuration) {

        case "monthly":
            // Add exact number of months respecting Feb, 30/31 days
            oEnd.setMonth(oEnd.getMonth() + iSelectedNumber);
            break;

        case "yearly":
            // Add exact years (handles leap years automatically)
            oEnd.setFullYear(oEnd.getFullYear() + iSelectedNumber);
            break;

        case "daily":
            sap.m.MessageToast.show("Duration is per day. No month/year selection needed.");
            return;
    }

    const sEndDate = this._formatDateToDDMMYYYY(oEnd);

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

      const aPersons = oHostelModel.getData().Persons;

      aPersons?.forEach(person => {
          person.AllSelectedFacilities = [];
      });

      const sSelectedKey = oEvent.getParameter("selectedItem").getKey(); // daily / monthly / yearly
      const iSelectedValue = parseInt(oHostelModel.getProperty("/SelectedMonths") || "1", 10);  // <-- HOW MANY MONTH/YEAR
      const sStartDate = oHostelModel.getProperty("/StartDate");
      const sBranchCode = oHostelModel.getProperty("/BranchCode") || ""
      // ⭐ UPDATE PRICE (same as your code)
      const sRoomType = oView.byId("GI_Roomtype")?.getText()?.trim() || "";
      const aRoomDetails = oRoomDetailModel.getData();
      const normalize = v => (v ? String(v).trim().toLowerCase() : "");
      const oMatchingRoom = aRoomDetails.find(item => normalize(item.BedTypeName) === normalize(sRoomType) &&  normalize(item.BranchCode) === normalize(sBranchCode));

      if (!oMatchingRoom) {
        oHostelModel.setProperty("/FinalPrice", "");
        return;
      }

      let sNewPrice = "";
      switch (sSelectedKey) {
        case "daily": sNewPrice = oMatchingRoom.Price; break;
        case "monthly": sNewPrice = oMatchingRoom.MonthPrice; break;
        case "yearly": sNewPrice = oMatchingRoom.YearPrice; break;
      }

      oHostelModel.setProperty("/FinalPrice", sNewPrice);
      oHostelModel.setProperty("/SelectedPriceType", sSelectedKey);

      const oEndDatePicker = oView.byId("idEndDate1");

      // ⭐ DAILY → user selects end date manually
      if (sSelectedKey === "daily") {
        oBTN.setProperty("/Month", false);
        oHostelModel.setProperty("/StartDate","");
        oHostelModel.setProperty("/EndDate","");
        oEndDatePicker.setEditable(true);
        return;
      }
          if (sSelectedKey === "monthly") {
          oBTN.setProperty("/Month", true);
          oHostelModel.setProperty("/SelectedMonths","1");
          oHostelModel.setProperty("/StartDate","");
          oHostelModel.setProperty("/EndDate","");
          oEndDatePicker.setEditable(false); 
          return;
        }
        if (sSelectedKey === "yearly") {
          oBTN.setProperty("/Month", true);
          oHostelModel.setProperty("/SelectedMonths","1");
          oHostelModel.setProperty("/StartDate","");
          oHostelModel.setProperty("/EndDate","");
          oEndDatePicker.setEditable(false);
          return;
        }

      //  MONTHLY or YEARLY → need “How Many Month/Year”
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
    },
  
 
    onSwitchToSignIn: function () {
      var oSignInPanel = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInPanel");
      var oSignUpPanel = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpPanel");

      oSignInPanel.setVisible(true);
      oSignUpPanel.setVisible(false);

      this.getView().getModel("LoginViewModel").setProperty("/selectedAccountType", "personal");
    },

    onSwitchToSignUp: function () {
      var oSignInPanel = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInPanel");
      var oSignUpPanel = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpPanel");

      oSignInPanel.setVisible(false);
      oSignUpPanel.setVisible(true);

      this.getView().getModel("LoginViewModel").setProperty("/selectedAccountType", "biz");
    },

    // Sign In
    onSignIn: async function () {
      var oLoginModel = this.getView().getModel("LoginModel");
      var oLoginViewModel = this.getView().getModel("LoginViewModel");
      var oFragment = this._oLoginAlertDialog; // Correct reference to fragment dialog

      // Get input values using Fragment.byId
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

        // Update LoginModel
        oLoginModel.setProperty("/EmployeeID", oMatchedUser.UserID);
        oLoginModel.setProperty("/EmployeeName", oMatchedUser.UserName);
        oLoginModel.setProperty("/EmailID", oMatchedUser.EmailID);
        oLoginModel.setProperty("/Role", oMatchedUser.Role);
        oLoginModel.setProperty("/BranchCode", oMatchedUser.BranchCode || "");
        oLoginModel.setProperty("/MobileNo", oMatchedUser.MobileNo || "");
              
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

        // Fill Person 1 details
        aPersons[0].FullName = oMatchedUser.UserName || "";
        aPersons[0].CustomerEmail = oMatchedUser.EmailID || "";
        aPersons[0].MobileNo = oMatchedUser.MobileNo || "";
        aPersons[0].UserID = oMatchedUser.UserID || "";

        oHostelModel.refresh(true);

        // Auto-check the "Fill Yourself" checkbox
        const oCheck = sap.ui.getCore().byId(this.createId("IDSelfCheck_0"));
        if (oCheck) {
            oCheck.setSelected(true);
        }
    }
} else if (oMatchedUser.Role === "Admin" || oMatchedUser.Role === "Employee") {
          this.getOwnerComponent().getRouter().navTo("TilePage");
        } else {
          sap.m.MessageToast.show("Invalid credentials. Please try again.");
        }

      } catch (err) {
        console.error("Login Error:", err);
        sap.m.MessageToast.show("Failed to fetch login data: " + err);
      }
    },

		// Sign Up
		// onSignUp: async function () {
		// 	var oDialog = this._oLoginAlertDialog; // Fragment dialog reference
		// 	var oModel = this.getView().getModel("LoginMode");
		// 	var oData = oModel.getData();
		// 	var oFragment = this._oLoginAlertDialog;
		// 	const oConfirmInput = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpConfirmPassword");

		// 	// Validate
		// 	if (
		// 		!utils._LCvalidateMandatoryField(sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpName"), "ID") ||
		// 		!utils._LCvalidateEmail(sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpEmail"), "ID") ||
		// 		!utils._LCvalidateMobileNumber(sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpPhone"), "ID") ||
		// 		!utils._LCvalidatePassword(sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpPassword"), "ID") ||
		// 		!utils._LCvalidatePassword(sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpConfirmPassword"), "ID")



		// 	) {
		// 		sap.m.MessageToast.show("Make sure all the mandatory fields are filled/validate the entered value");
		// 		return;
		// 	}
		// 	if (oData.password !== oData.comfirmpass) {
		// 		oConfirmInput.setValueState("Error");
		// 		sap.m.MessageToast.show("Password Mismatch");
		// 		return; // Stop signup
		// 	} else {
		// 		oConfirmInput.setValueState("None");
		// 	}

		// 	// Timestamp
		// 	var oNow = new Date();
		// 	var sTimeDate = `${oNow.getFullYear()}-${String(oNow.getMonth() + 1).padStart(2, "0")}-${String(oNow.getDate()).padStart(2, "0")} ` +
		// 		`${String(oNow.getHours()).padStart(2, "0")}:${String(oNow.getMinutes()).padStart(2, "0")}:${String(oNow.getSeconds()).padStart(2, "0")}`;

		// 	// Payload
		// 	var oPayload = {
		// 		data: {
		// 			UserName: oData.fullname,
		// 			EmailID: oData.Email,
		// 			MobileNo: oData.Mobileno,
		// 			Password: btoa(oData.password),
		// 			Role: "Customer",
		// 			TimeDate: sTimeDate,
		// 			Status: "Active"
		// 		}
		// 	};

		// 	try {
		// 		await this.ajaxCreateWithJQuery("HM_Login", oPayload);
		// 		sap.m.MessageToast.show("Sign Up successful!");

		// 		// Reset model
		// 		oModel.setData({
		// 			salutation: "Mr.",
		// 			fullname: "",
		// 			Email: "",
		// 			STDCode: "+91",
		// 			Mobileno: "",
		// 			password: "",
		// 			comfirmpass: ""
		// 		});

		// 		// if (oDialog) oDialog.close();
		// 		sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInPanel").setVisible(true)
		// 		sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpPanel").setVisible(false)


		// 	} catch (err) {
		// 		sap.m.MessageToast.show("Error in Sign Up: " + err);
		// 	}
		// },
		onUserlivechange: function (oEvent) {
			utils._LCvalidateMandatoryField(oEvent);
		},
		onEmailliveChange: function (oEvent) {
			utils._LCvalidateEmail(oEvent);
		},
		onMobileLivechnage: function (oEvent) {
			utils._LCvalidateMobileNumber(oEvent)
		},
		SM_onChnageSetAndConfirm: function (oEvent) {
			utils._LCvalidatePassword(oEvent);
		},
		FSM_onConfirm: function () {
			const oFragModel = this.getView().getModel("LoginMode");

      const sPassword = oFragModel.getProperty("/password");
      const sConfirm = oFragModel.getProperty("/comfirmpass");

      // Get the input using Fragment.byId
      const oConfirmInput = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpConfirmPassword");

      if (sPassword !== sConfirm) {
        oConfirmInput.setValueState("Error");
        sap.m.MessageToast.show("Password Mismatch");
        return;
      } else {
        oConfirmInput.setValueState("None");
      }
    },

      onOpenProceedtoPay: function() {
        if (!this._oPaymentDialog) {
            this._oPaymentDialog = sap.ui.xmlfragment(
                "sap.ui.com.project1.fragment.PaymentPage",
                this
            );
            this.getView().addDependent(this._oPaymentDialog);
        }

        this._clearAllPaymentFields();

        sap.ui.getCore().byId("idPaymentTypeGroup").setSelectedIndex(0);
        this._togglePaymentSections(true);
        sap.ui.getCore().byId("idPaymentTypeField").setValue("UPI");

        var oDatePicker = sap.ui.getCore().byId("idPaymentDate");
        oDatePicker.setDateValue(new Date());

        this._oPaymentDialog.open();
    },

    onPaymentTypeSelect: function(oEvent) {
        const index = oEvent.getSource().getSelectedIndex();
        const isUPI = index === 0;

        this._togglePaymentSections(isUPI);
        sap.ui.getCore().byId("idPaymentTypeField").setValue(isUPI ? "UPI" : "CARD");
    },

    _togglePaymentSections: function(isUPI) {
        sap.ui.getCore().byId("idUPISection").setVisible(isUPI);
        sap.ui.getCore().byId("idCardSection").setVisible(!isUPI);

        const aFields = [
            "idBankName", "idAmount", "idPaymentTypeField", "idTransactionID",
            "idPaymentDate", "idCurrency", "idUPIID", "idCardNumber", "idCardExpiry", "idCardCVV"
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
            "idBankName", "idAmount", "idPaymentTypeField", "idTransactionID",
            "idPaymentDate", "idCurrency", "idUPIID", "idCardNumber",
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
         utils._LCstrictValidationComboBox(sap.ui.getCore().byId("idCurrency"), "ID") &&
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
                 BankName: sap.ui.getCore().byId("idBankName").getValue(),
                 Amount: sap.ui.getCore().byId("idAmount").getValue(),
                 PaymentType: sap.ui.getCore().byId("idPaymentTypeField").getValue(),
                 BankTransactionID: sap.ui.getCore().byId("idTransactionID").getValue(),
                 Date: sap.ui.getCore().byId("idPaymentDate").getValue() ? sap.ui.getCore().byId("idPaymentDate").getValue().split("/").reverse().join("-") : "",
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
                 Documents: p.Document ? [{
                     DocumentType: p.DocumentType || "ID Proof",
                     File: p.Document,
                     FileName: p.FileName || "Document",
                     FileType: p.FileType || "application/pdf"
                 }] : [],
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
             sMessage +=
                //  "Customer :" +  (index + 1) +"\n"+
                //  "Customer ID: " + item.CustomerID + "\n" +
                 "Booking ID: " + item.BookingID;
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
                    Startdate: booking.StartDate ? new Date(booking.StartDate) : null,
                    EndDate: booking.EndDate ? new Date(booking.EndDate) : null,
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
            onCancelPress: function () {
            this.resetAllBookingData()
      var oRouter = this.getOwnerComponent().getRouter()
      oRouter.navTo("RouteHostel")
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
  onCancelPress: function () {
            this.resetAllBookingData()
      var oRouter = this.getOwnerComponent().getRouter()
      oRouter.navTo("RouteHostel")
    },


  });
});