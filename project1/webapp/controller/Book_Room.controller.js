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
            onInit: function () {

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
                Next:false,
                Previous:false,
                Submit:false,
                Cancel:false,
                NXTVis:true,
                PERVIOUSVIS:false,
                

            })
            this.getView().setModel(oBTn,"OBTNModel")
                 
            //       setTimeout(() => {
            //   this.onReadcallforRoom();
            // }, 100);
            },
          _LoadFacilities: async function () {
    const oView = this.getView();
    const Response = await this.ajaxReadWithJQuery("HM_ExtraFacilities", {});

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
        FacilityID: f.FacilityID,
        FacilityName: f.FacilityName,
        Image: convertBase64ToImage(f.FicilityImage, f.FileType),
         Price: Number(f.Price )
    }));

    //  Wrap in object for proper binding
    const oFacilityModel = new JSONModel({ Facilities: aFinalFacilities });
    oView.setModel(oFacilityModel, "FacilityModel");
},

onNoOfPersonSelect: async function (oEvent) {
    var that =this;
    const iPersons = parseInt(oEvent.getSource().getSelectedKey());
    const oVBox = this.getView().byId("idPersonalContainer1");
    const oModel = this.getView().getModel("HostelModel");
    const oFacilityModel = this.getView().getModel("FacilityModel");
    const oData = oModel.getData();


     const oLoginModel = sap.ui.getCore().getModel("LoginModel");
    const sUserID = oLoginModel ? oLoginModel.getData().UserID : (oData.UserID || "");
    // Reset previous data and UI
    oData.Persons = [];
    oVBox.removeAllItems();

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
            Facilities: {
       SelectedFacilities: [] },
            Document: "",
            FileName: "",
            FileType: "",
             TotalRent: parseFloat(oData.Price) || 0,

        });

       // ---- Person Information Form ----
const oForm = new sap.ui.layout.form.SimpleForm({
    editable: true,
    title: "Person " + (i + 1) + " Details",
    layout: "ColumnLayout",
    labelSpanXL: 4,
    labelSpanL: 3,
    labelSpanM: 4,
    labelSpanS: 12,
    columnsXL: 2,
    columnsL: 2,
    columnsM: 1,
    content: [
        //  Only show the checkbox for the first person
        ...(i === 0
            ? [
                new sap.m.Label({ text: "Fill Yourself" }),
                new sap.m.CheckBox({
                    id: "IDSelfCheck",
                   select: function (oEvent) {
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
            ]
            : []),

        // Person Info Fields
        new sap.m.Label({ text: "Full Name", required: true }),
        new sap.m.ComboBox({
            selectedKey: "{HostelModel>/Persons/" + i + "/Salutation}",
            items: [
                new sap.ui.core.ListItem({ key: "Mr", text: "Mr" }),
                new sap.ui.core.ListItem({ key: "Mrs", text: "Mrs" })
            ]
        }),
        new sap.m.Input({
            value: "{HostelModel>/Persons/" + i + "/FullName}",
            placeholder: "Enter full name"
        }),

        new sap.m.Label({ text: "UserID", required: true }),
        new sap.m.Input({
            value: "{HostelModel>/Persons/" + i + "/UserID}",
            editable: false
        }),

        new sap.m.Label({ text: "Date of Birth", required: true }),
        new sap.m.DatePicker({
            value: "{HostelModel>/Persons/" + i + "/DateOfBirth}",
            valueFormat: "dd/MM/yyyy",
            displayFormat: "dd/MM/yyyy"
        }),

        new sap.m.Label({ text: "Gender", required: true }),
        new sap.m.ComboBox({
            selectedKey: "{HostelModel>/Persons/" + i + "/Gender}",
            items: [
                new sap.ui.core.ListItem({ key: "Male", text: "Male" }),
                new sap.ui.core.ListItem({ key: "Female", text: "Female" }),
                new sap.ui.core.ListItem({ key: "Other", text: "Other" })
            ]
        }),

        new sap.m.Label({ text: "Mobile Number", required: true }),
        new sap.m.ComboBox({
            selectedKey: "{HostelModel>/Persons/" + i + "/StdCode}",
            items: [new sap.ui.core.ListItem({ key: "+91", text: "+91" })]
        }),
        new sap.m.Input({
            value: "{HostelModel>/Persons/" + i + "/MobileNo}",
            placeholder: "Enter 10-digit mobile number",
            maxLength: 10
        }),

        new sap.m.Label({ text: "Email", required: true }),
        new sap.m.Input({
            value: "{HostelModel>/Persons/" + i + "/CustomerEmail}",
            placeholder: "Enter email"
        }),

        new sap.m.Label({ text: "Country", required: true }),
        new sap.m.ComboBox({
            selectedKey: "{HostelModel>/Persons/" + i + "/Country}",
            placeholder: "Select Country",
            items: [
                new sap.ui.core.ListItem({ key: "India", text: "India" }),
                new sap.ui.core.ListItem({ key: "USA", text: "USA" }),
                new sap.ui.core.ListItem({ key: "Other", text: "Other" })
            ]
        }),

        new sap.m.Label({ text: "State", required: true }),
        new sap.m.Input({
            value: "{HostelModel>/Persons/" + i + "/State}",
            placeholder: "Enter State"
        }),

        new sap.m.Label({ text: "City", required: true }),
        new sap.m.Input({
            value: "{HostelModel>/Persons/" + i + "/City}",
            placeholder: "Enter City"
        }),

        new sap.m.Label({ text: "Address", required: true }),
        new sap.m.TextArea({
            value: "{HostelModel>/Persons/" + i + "/Address}",
            placeholder: "Enter Permanent Address",
            rows: 3
        })
    ]
});



       // ---- Facilities Section ----
const oFacilitiesBox = new sap.m.VBox({
    width: "100%",
    style: "margin-top: 2rem;", // Adds spacing from top
    visible: "{= ${FacilityModel>/Facilities}.length > 0 }", // Hide section if no facilities
    items: [
        // Header
        new sap.m.Toolbar({
            content: [
                new sap.m.Title({
                    text: "Select the Facilities",
                    level: "H4",
                    design: "Bold",
                })
            ],
            design: "Solid",
            styleClass: "facilityHeader"
        }),

        // Facility cards container
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
        new sap.m.VBox({
            width: "264px",
            height: "178px",
            styleClass: "imageContainer",
            items: [
                // Facility image
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
                        let bAlreadySelected = aSelected.find(f => f.FacilityName === oFacilityObj.FacilityName);

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

                // Facility name overlay
                (() => {
                    const oHTML = new sap.ui.core.HTML({
                        content: `
                            <div class="facility-overlay">
                                <a href="#" class="facility-overlay-link">{FacilityModel>FacilityName}</a>
                            </div>
                        `
                    }).bindElement("FacilityModel>");
                    return oHTML;
                })()
            ]   
        }),

        //  Facility Price (below the image)
        new sap.m.Text({
            text: "{= '₹ ' + ${FacilityModel>Price}}",
            class: "facilityPriceText"
        })
    ]
})
 }
  })
    ]
});

        // ---- Document Upload Section ----
        const oDocument = new sap.ui.layout.form.SimpleForm({
            editable: true,
            title: "Document Upload",
            layout: "ColumnLayout",
            content: [
                new sap.m.Label({ text: "Upload ID Proof" }),
                new sap.ui.unified.FileUploader({
                    width: "100%",
                    customData: [new sap.ui.core.CustomData({ key: "index", value: i })],
                    change: function (oEvent) {
                        const index = parseInt(oEvent.getSource().data("index"));
                        const oFile = oEvent.getParameter("files")[0];
                        if (oFile) {
                            const reader = new FileReader();
                            reader.onload = function (e) { 
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

        // Append everything
        oVBox.addItem(oForm);
        oVBox.addItem(oFacilitiesBox);
        oVBox.addItem(oDocument);
    }

    oModel.refresh(true);
    //  Do NOT move to next step here.
},

TC_onDialogNextButton: function () {
    const oView = this.getView();
    const oWizard = oView.byId("TC_id_wizard");
    const oCurrentStep = oWizard.getCurrentStep();
    const oHostelModel = oView.getModel("HostelModel");
    const oBtnModel = oView.getModel("OBTNModel");

    oBtnModel.setProperty("/PERVIOUSVIS", true);

    if (oCurrentStep === this.createId("idStepPersonal1")) {
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

        const aMandatoryFields = ["FullName", "DateOfBirth"];
        let bAllValid = true;
        let bFacilityValid = true;
        let bDocumentValid = true;

        // Validate per person mandatory fields and documents
        aPersons.forEach((oPerson, iIndex) => {
            aMandatoryFields.forEach((sField) => {
                const sValue = oPerson[sField];
                const sFieldPath = `/Persons/${iIndex}/${sField}`;
                const aInputs = oView.findElements(true, (oControl) => {
                    return (
                        oControl.getBinding("value") &&
                        oControl.getBinding("value").getPath() === sFieldPath
                    );
                });
                const oInput = aInputs[0];
                if (!sValue || sValue.trim() === "") {
                    bAllValid = false;
                    if (oInput) {
                        oInput.setValueState("Error");
                        oInput.setValueStateText(`${sField} is required`);
                    }
                } else if (oInput) {
                    oInput.setValueState("None");
                }
            });

            if (!oPerson.Document || oPerson.Document === "") {
                bDocumentValid = false;
            }
        });

        // if (!bAllValid) {
        //     sap.m.MessageToast.show("Please fill all mandatory fields.");
        //     return;
        // }
        // if (!bDocumentValid) {
        //     sap.m.MessageToast.show("Please upload all required documents.");
        //     return;
        // }

        // Compute totals and populate summary arrays
        const totals = this.calculateTotals(aPersons, sStartDate, sEndDate, roomRentPrice);

        if (!totals) {
            return; 
        }

        // Assign per person their facility summary arrays
        aPersons.forEach((oPerson, iIndex) => {
            const aFacilities = oPerson.Facilities?.SelectedFacilities || [];
            const aPersonFacilitiesSummary = totals.AllSelectedFacilities.filter(item => item.PersonName === (oPerson.FullName || `Person ${iIndex + 1}`));
            oHostelModel.setProperty(`/Persons/${iIndex}/PersonFacilitiesSummary`, aPersonFacilitiesSummary);
        });

        // Set totals to model
        oHostelModel.setProperty("/TotalDays", totals.TotalDays);
        oHostelModel.setProperty("/TotalFacilityPrice", totals.TotalFacilityPrice);
        oHostelModel.setProperty("/GrandTotal", totals.GrandTotal);
        oHostelModel.setProperty("/AllSelectedFacilities", totals.AllSelectedFacilities);
        oHostelModel.refresh(true);
    }

    // Move to next step
    oWizard.nextStep();

    // Update buttons visibility
    const oNextStep = oWizard.getCurrentStep();
    if (oNextStep === this.createId("id_Summary")) {
        oBtnModel.setProperty("/Submit", true);
        oBtnModel.setProperty("/Cancel", true);
        oBtnModel.setProperty("/NXTVis", false);
        oBtnModel.setProperty("/PERVIOUSVIS", false);
    } else {
        oBtnModel.setProperty("/Submit", false);
        oBtnModel.setProperty("/Cancel", false);
        oBtnModel.setProperty("/NXTVis", true);
    }
},

// Separated calculation function
calculateTotals: function (aPersons, sStartDate, sEndDate, roomRentPrice) {
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

TC_onDialogBackButton: function () {
    const oWizard = this.getView().byId("TC_id_wizard");
    oWizard.previousStep();
},

onOpenProceedtoPay: function () {
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

onPaymentTypeSelect: function (oEvent) {
    const selectedIndex = oEvent.getSource().getSelectedIndex();
    sap.ui.getCore().byId("idUPISection").setVisible(selectedIndex === 0);
    sap.ui.getCore().byId("idCardSection").setVisible(selectedIndex === 1);
},

onPaymentClose: function () {
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

onSubmitPress: async function () {
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
                Documents: p.Document
                    ? [
                        {
                            DocumentType: p.DocumentType || "ID Proof",
                            File: p.Document,
                            FileName: p.FileName || "Document",
                            FileType: p.FileType || "application/pdf"
                        }
                    ]
                    : [],
                Booking: bookingData,
                FacilityItems: facilityData ,
                PaymentDetails:[oData.PaymentDetails]  
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
}
,

onCancelPress:function(){
     var oRouter  = this.getOwnerComponent().getRouter()
     oRouter.navTo("RouteHostel")
},

onFieldValidation: function () {
    var oView = this.getView();
    var oHostelModel = oView.getModel("HostelModel").getData();
    var oBtnModel = oView.getModel("OBTNModel");

    var sRoomType = oView.byId("idRoomType1")?.getValue() || "";
    // var sPrice = oView.byId("idPrice2")?.getValue() || "";
    var sPayment = oHostelModel.PaymentType || oView.byId("idPaymentMethod1")?.getSelectedKey() || "";
    var sPerson = oHostelModel.Person || oView.byId("id_Noofperson1")?.getSelectedKey() || "";
    var sStartDate = oHostelModel.StartDate || oView.byId("idStartDate1")?.getValue() || "";
    var sEndDate = oHostelModel.EndDate || oView.byId("idEndDate1")?.getValue() || "";

    var bAllFilled = sRoomType  && sPayment && sPerson && sStartDate && sEndDate;

    //  Force Boolean (true/false) type — critical fix
    oBtnModel.setProperty("/Next", !!bAllFilled);
    // oBtnModel.setProperty("/PERVIOUSVIS", !!bAllFilled);
},
  onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },

     

});
});