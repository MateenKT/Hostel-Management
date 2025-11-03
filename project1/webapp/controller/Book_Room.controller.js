sap.ui.define([
        "./BaseController",
      "sap/ui/model/json/JSONModel",
], function(
	BaseController,
    JSONModel
) {
	"use strict";

	return BaseController.extend("sap.ui.com.project1.controller.Book_Room", {

            onInit: function () {
               var oModel = new JSONModel({
        RoomType: "Single Bed",
        Price: "10000",
        PaymentType: "",
        Person: "",
        StartDate: "",
        EndDate: ""
    });
    this.getView().setModel(oModel, "HostelModel");
               
                  setTimeout(() => {
                this._LoadFacilities()
            }, 100);
            var oBTn = new JSONModel({
                Next:false,
                Previous:false,
                Submit:false,
                Cancel:false,
                NXTVis:true,
                PERVIOUSVIS:false

            })
            this.getView().setModel(oBTn,"OBTNModel")

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
        Image: convertBase64ToImage(f.FicilityImage, f.FileType)
    }));

    //  Wrap in object for proper binding
    const oFacilityModel = new sap.ui.model.json.JSONModel({ Facilities: aFinalFacilities });
    oView.setModel(oFacilityModel, "FacilityModel");
},

onNoOfPersonSelect: async function (oEvent) {
    const iPersons = parseInt(oEvent.getSource().getSelectedKey());
    const oVBox = this.getView().byId("idPersonalContainer1");
    const oModel = this.getView().getModel("HostelModel");
    const oFacilityModel = this.getView().getModel("FacilityModel");
    const oData = oModel.getData();

    // Reset previous data and UI
    oData.Persons = [];
    oVBox.removeAllItems();

    for (let i = 0; i < iPersons; i++) {
        oData.Persons.push({
            FullName: "",
            DateOfBirth: "",
            Gender: "",
            MobileNo: "",
            CustomerEmail: "",
            Country: "",
            State: "",
            City: "",
            Facilities: { RoomType: "", SelectedFacilities: [], MealPlan: "" },
            Document: "",
            FileName: "",
            FileType: ""
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
                new sap.m.Label({ text: "Full Name", required: true }),
                new sap.m.Input({
                    value: "{HostelModel>/Persons/" + i + "/FullName}",
                    placeholder: "Enter full name"
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
                })
            ]
        });

        // ---- Facilities Section ----
const oFacilitiesBox = new sap.m.VBox({
    width: "100%",
    items: [
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

        new sap.m.FlexBox({
            wrap: "Wrap",
            alignItems: "Start",
            justifyContent: "SpaceAround",
            items: {
                path: "FacilityModel>/Facilities",
             template: new sap.m.VBox({
    width: "264px",
    height: "178px",
    alignItems: "Center",
    justifyContent: "Center",
    styleClass: "serviceCard",
    items: [
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
                        const sFacility = oEvent.getSource().getBindingContext("FacilityModel").getObject().FacilityName;
                        const aPersons = oModel.getProperty("/Persons");
                        const aSelected = aPersons[i].Facilities.SelectedFacilities;
                        const oCard = oEvent.getSource().getParent().getParent();

                        const bAlreadySelected = aSelected.includes(sFacility);
                        if (bAlreadySelected) {
                            const idx = aSelected.indexOf(sFacility);
                            aSelected.splice(idx, 1);
                            oCard.removeStyleClass("serviceCardSelected");
                            sap.m.MessageToast.show(sFacility + " removed for Person " + (i + 1));
                        } else {
                            aSelected.push(sFacility);
                            oCard.addStyleClass("serviceCardSelected");
                            sap.m.MessageToast.show(sFacility + " added for Person " + (i + 1));
                        }

                        oModel.refresh(true);
                    }
                }),

                // Facility name over image using HTML control
                new sap.ui.core.HTML({
                    content:
                        `<div class="serviceLabel">{FacilityModel>FacilityName}</div>`
                }).bindElement("FacilityModel>")
            ]
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
                new sap.m.Label({ text: "Upload Document" }),
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
                })
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
    const oWizard = this.getView().byId("TC_id_wizard");
    const oCurrentStep = oWizard.getCurrentStep();
    const oBtnModel = this.getView().getModel("OBTNModel");
    const oGeneralModel = this.getView().getModel("HostelModel");

    oBtnModel.setProperty("/PERVIOUSVIS", true);

    if (oCurrentStep === this.createId("TC_id_stepGeneralInfo")) {
        const oData = oGeneralModel.getData();

        if (!oData.PaymentType || !oData.Person) {
            sap.m.MessageToast.show("Please fill all required fields before continuing");
            return;
        }

        // Default values if empty
        if (!oData.RoomType) oData.RoomType = "Single Bed";
        if (!oData.Price) oData.Price = "10000";
    }

    oWizard.nextStep();
},


TC_onDialogBackButton: function () {
    const oWizard = this.getView().byId("TC_id_wizard");
    oWizard.previousStep();
},

// Save function
onSaveDialog: function () {
    var oModel = this.getView().getModel("HostelModel");
    var Data = oModel.getData();

    var formattedPayload = Data.Persons.map(function (p) {
        return {
            CustomerName: p.FullName,
            MobileNo: p.MobileNo,
            Gender: p.Gender,
            DateOfBirth: p.DateOfBirth ? p.DateOfBirth.split("/").reverse().join("-") : "",
            CustomerEmail: p.CustomerEmail,
            Country: p.Country,
            State: p.State,
            City: p.City,
            Booking: [
                {
                    NoOfPersons: Data.Person,
                    PaymentType: Data.PaymentType,
                    StartDate: Data.StartDate.split("/").reverse().join("-"),
                    EndDate: Data.EndDate.split("/").reverse().join("-"),
                    RentPrice: Data.Price,
                    Status: "New"
                }
            ],
            Documents: p.Document ? [
                {
                    DocumentType: "ID Proof",
                    File: p.Document,
                    FileName: p.FileName || "Document",
                    FileType: p.FileType || "application/pdf"
                }
            ] : []
        };
    });

    $.ajax({
        url: "https://rest.kalpavrikshatechnologies.com/HM_Customer",
        method: "POST",
        contentType: "application/json",
        headers: {
            name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
            password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
        },
        data: JSON.stringify({ data: formattedPayload }),
        success: function () {
            sap.m.MessageToast.show("Booking successful!");

            // Clear all file uploaders
            Data.Persons.forEach(function (_, idx) {
                var uploader = sap.ui.getCore().byId("idFileUploader_" + idx);
                if (uploader) uploader.setValue("");
            });
        },
        error: function () {
            sap.m.MessageBox.error("Error uploading data or file.");
        }
    });

    this.FCIA_Dialog.close();
},

onFieldValidation: function () {
    var oView = this.getView();
    var oHostelModel = oView.getModel("HostelModel").getData();
    var oBtnModel = oView.getModel("OBTNModel");

    var sRoomType = oView.byId("idRoomType1")?.getValue() || "";
    var sPrice = oView.byId("idPrice2")?.getValue() || "";
    var sPayment = oHostelModel.PaymentType || oView.byId("idPaymentMethod1")?.getSelectedKey() || "";
    var sPerson = oHostelModel.Person || oView.byId("id_Noofperson1")?.getSelectedKey() || "";
    var sStartDate = oHostelModel.StartDate || oView.byId("idStartDate1")?.getValue() || "";
    var sEndDate = oHostelModel.EndDate || oView.byId("idEndDate1")?.getValue() || "";

    var bAllFilled = sRoomType && sPrice && sPayment && sPerson && sStartDate && sEndDate;

    //  Force Boolean (true/false) type — critical fix
    oBtnModel.setProperty("/Next", !!bAllFilled);
    // oBtnModel.setProperty("/PERVIOUSVIS", !!bAllFilled);
},



	});
});