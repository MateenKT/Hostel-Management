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
                  var model = new JSONModel({
                CustomerName: "",
                MobileNo: "",
                Gender: "",
                DateOfBirth: "",
                CustomerEmail: "",
                RoomType: "",

            });
            this.getView().setModel(model, "HostelModel");
               
                 
                  setTimeout(() => {
                this._LoadFacilities()
            }, 100);
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

    console.log(" FacilityModel loaded:", oFacilityModel.getData());
},

            onWizardNext: function () {
            const oDialog = this.FCIA_Dialog;
            const oWizard = this.getView().byId("idHostelWizard");
            const oNextButton = this.getView().byId("idWizardNextBtn");
            const oBackButton = this.getView().byId("idWizardBackBtn");
            const oSubmitButton = this.getView().byId("idWizardSubmitBtn");

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

            const oWizard =this.getView().byId("idHostelWizard");
            const oNextButton = this.getView().byId("idWizardNextBtn");
            const oBackButton = this.getView().byId("idWizardBackBtn");
            const oSubmitButton = this.getView().byId("idWizardSubmitBtn");


            oWizard.previousStep();

            const aSteps = oWizard.getSteps();
            const oCurrentStep = oWizard.getCurrentStep();
            const bIsFirst = aSteps[0].getId() === oCurrentStep;

            oBackButton.setEnabled(!bIsFirst);
            oNextButton.setVisible(true);
            oSubmitButton.setVisible(false);
        },
onNoOfPersonSelect:async function (oEvent) {
            // const Response = await this.ajaxReadWithJQuery("HM_ExtraFacilities", {})

    var iPersons = parseInt(oEvent.getSource().getSelectedKey());
    var oVBox = this.getView().byId("idPersonalContainer");
    var oModel = this.getView().getModel("HostelModel");
    var oData = oModel.getData();

    // Initialize array
    oData.Persons = [];

    // Clear previous content
    oVBox.removeAllItems();

    for (var i = 0; i < iPersons; i++) {
        // Create data structure per person
        oData.Persons.push({
            FullName: "",
            DateOfBirth: "",
            Gender: "",
            MobileNo: "",
            CustomerEmail: "",
            Country: "",
            State: "",
            City: "",
            Facilities: {
                RoomType: "",
                SelectedFacilities: [],
                MealPlan: ""
            },
            Document: "",
            FileName: "",
            FileType: ""
        });

        // Person Details Form
        var oForm = new sap.ui.layout.form.SimpleForm({
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
                    displayFormat: "dd/MM/yyyy",
                    placeholder: "Select date of birth"
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
                new sap.m.ComboBox({
                    selectedKey: "{HostelModel>/Persons/" + i + "/State}",
                    placeholder: "Select State",
                    items: [
                        new sap.ui.core.ListItem({ key: "Karnataka", text: "Karnataka" }),
                        new sap.ui.core.ListItem({ key: "Andhra Pradesh", text: "Andhra Pradesh" }),
                        new sap.ui.core.ListItem({ key: "Other", text: "Other" })
                    ]
                }),
                new sap.m.Label({ text: "City", required: true }),
                new sap.m.ComboBox({
                    selectedKey: "{HostelModel>/Persons/" + i + "/City}",
                    placeholder: "Select City",
                    items: [
                        new sap.ui.core.ListItem({ key: "Gulbarga", text: "Gulbarga" }),
                        new sap.ui.core.ListItem({ key: "Hyderabad", text: "Hyderabad" }),
                        new sap.ui.core.ListItem({ key: "Other", text: "Other" })
                    ]
                })
            ]
        });

     
      // --- Facilities Section ---
var oFacilitiesBox = new sap.m.VBox({
    width: "100%",
    items: [
        new sap.m.Label({
            text: "Select Facilities",
            design: "Bold"
        }),
        new sap.m.FlexBox({
            id: "idFacilitiesContainer_" + i,
            wrap: "Wrap",
            alignItems: "Center",
            justifyContent: "Start",
            items: {
                path: "FacilityModel>/Facilities",
                template: new sap.m.VBox({
                    width: "220px",
                    height: "160px",
                    alignItems: "Center",
                    justifyContent: "Center",
                    styleClass: "facilityBox",
                    customData: [
                        new sap.ui.core.CustomData({
                            key: "facilityName",
                            value: "{FacilityModel>FacilityName}"
                        }),
                        new sap.ui.core.CustomData({
                            key: "facilityID",
                            value: "{FacilityModel>FacilityID}"
                        })
                    ],
                    items: [
                        new sap.m.Image({
                            src: "{FacilityModel>Image}",
                            width: "220px",
                            height: "160px",
                            densityAware: false
                        }),
                        new sap.m.Button({  
                            text: "{FacilityModel>FacilityName}",
                            type: "Transparent",
                            width: "220px",
                             height: "160px",
                              alignItems: "Center",
                            press: function (oEvent) {
                                var that = this;
                                const sName = oEvent.getSource().getText();
                                const sContainerId = oEvent.getSource().getParent().getParent().getId();
                                const iPersonIndex = parseInt(sContainerId.split("_").pop());
                                const oHostelModel = that.getView().getModel("HostelModel");
                                const aPersons = oHostelModel.getProperty("/Persons");

                                if (!aPersons[iPersonIndex].Facilities.SelectedFacilities.includes(sName)) {
                                    aPersons[iPersonIndex].Facilities.SelectedFacilities.push(sName);
                                    sap.m.MessageToast.show(sName + " added for Person " + (iPersonIndex + 1));
                                }
                                
                                oHostelModel.refresh(true);
                            }.bind(this)
                        })
                    ]
                }).addStyleClass("facilityDynamicBox")
            }
        })
    ]
});



        // Document Upload Form
        var oDocument = new sap.ui.layout.form.SimpleForm({
            editable: true,
            title: "Document Upload",
            layout: "ColumnLayout",
            content: [
                new sap.m.Label({ text: "Upload Document" }),
                new sap.ui.unified.FileUploader({
                    name: "file",
                    uploadUrl: "",
                    uploadOnChange: false,
                    width: "100%",
                    customData: [new sap.ui.core.CustomData({ key: "index", value: i })],
                    change: function (oEvent) {
                        var index = parseInt(oEvent.getSource().data("index"));
                        var oFile = oEvent.getParameter("files")[0];
                        if (oFile) {
                            var reader = new FileReader();
                            reader.onload = function (e) {
                                var sBase64 = e.target.result.split(",")[1];
                                var oModel1 = oModel;
                                var oData = oModel1.getData();
                                oData.Persons[index].Document = sBase64;
                                oData.Persons[index].FileName = oFile.name;
                                oData.Persons[index].FileType = oFile.type;
                                oModel.refresh(true);
                            }.bind(this);
                            reader.readAsDataURL(oFile);
                        }
                    }
                })
            ]
        });

        // Add all forms to the container
      oVBox.addItem(oForm);
oVBox.addItem(oFacilitiesBox);
oVBox.addItem(oDocument);

    }

    oModel.refresh(true);
},
// onNoOfPersonSelect: async function (oEvent) {
//     // 1. Fetch Extra Facilities Data
//     const Response = await this.ajaxReadWithJQuery("HM_ExtraFacilities", {});
//     const aExtraFacilities = Response.data[4].FicilityImage || []; // Assuming data is in Response.d.results

//     var iPersons = parseInt(oEvent.getSource().getSelectedKey());
//     var oVBox = this.getView().byId("idPersonalContainer");
//     var oModel = this.getView().getModel("HostelModel");
//     var oData = oModel.getData();

//     // Initialize array
//     oData.Persons = [];

//     // Clear previous content
//     oVBox.removeAllItems();

//     for (var i = 0; i < iPersons; i++) {
//         // Create data structure per person
//         oData.Persons.push({
//             FullName: "",
//             DateOfBirth: "",
//             // ... other person properties ...
//             Gender: "",
//             MobileNo: "",
//             CustomerEmail: "",
//             Country: "",
//             State: "",
//             City: "",
//             Facilities: {
//                 RoomType: "",
//                 SelectedFacilities: [], // Array of keys, e.g., ["WiFi", "AC"]
//                 MealPlan: "",
//                 AvailableFacilities: aExtraFacilities // Store the available facilities for binding
//             },
//             Document: "",
//             FileName: "",
//             FileType: ""
//         });

//         // --- Person Details Form (Unchanged, so shortened) ---
//         var oForm = new sap.ui.layout.form.SimpleForm({
//             editable: true,
//             title: "Person " + (i + 1) + " Details",
//             layout: "ColumnLayout",
//             labelSpanXL: 4,
//             labelSpanL: 3,
//             labelSpanM: 4,
//             labelSpanS: 12,
//             columnsXL: 2,
//             columnsL: 2,
//             columnsM: 1,
//             content: [
//                 new sap.m.Label({ text: "Full Name", required: true }),
//                 new sap.m.Input({
//                     value: "{HostelModel>/Persons/" + i + "/FullName}",
//                     placeholder: "Enter full name"
//                 }),
//                 new sap.m.Label({ text: "Date of Birth", required: true }),
//                 new sap.m.DatePicker({
//                     value: "{HostelModel>/Persons/" + i + "/DateOfBirth}",
//                     valueFormat: "dd/MM/yyyy",
//                     displayFormat: "dd/MM/yyyy",
//                     placeholder: "Select date of birth"
//                 }),
//                 new sap.m.Label({ text: "Gender", required: true }),
//                 new sap.m.ComboBox({
//                     selectedKey: "{HostelModel>/Persons/" + i + "/Gender}",
//                     items: [
//                         new sap.ui.core.ListItem({ key: "Male", text: "Male" }),
//                         new sap.ui.core.ListItem({ key: "Female", text: "Female" }),
//                         new sap.ui.core.ListItem({ key: "Other", text: "Other" })
//                     ]
//                 }),
//                 new sap.m.Label({ text: "Mobile Number", required: true }),
//                 new sap.m.Input({
//                     value: "{HostelModel>/Persons/" + i + "/MobileNo}",
//                     placeholder: "Enter 10-digit mobile number",
//                     maxLength: 10
//                 }),
//                 new sap.m.Label({ text: "Email", required: true }),
//                 new sap.m.Input({
//                     value: "{HostelModel>/Persons/" + i + "/CustomerEmail}",
//                     placeholder: "Enter email"
//                 }),
//                 new sap.m.Label({ text: "Country", required: true }),
//                 new sap.m.ComboBox({
//                     selectedKey: "{HostelModel>/Persons/" + i + "/Country}",
//                     placeholder: "Select Country",
//                     items: [
//                         new sap.ui.core.ListItem({ key: "India", text: "India" }),
//                         new sap.ui.core.ListItem({ key: "USA", text: "USA" }),
//                         new sap.ui.core.ListItem({ key: "Other", text: "Other" })
//                     ]
//                 }),
//                 new sap.m.Label({ text: "State", required: true }),
//                 new sap.m.ComboBox({
//                     selectedKey: "{HostelModel>/Persons/" + i + "/State}",
//                     placeholder: "Select State",
//                     items: [
//                         new sap.ui.core.ListItem({ key: "Karnataka", text: "Karnataka" }),
//                         new sap.ui.core.ListItem({ key: "Andhra Pradesh", text: "Andhra Pradesh" }),
//                         new sap.ui.core.ListItem({ key: "Other", text: "Other" })
//                     ]
//                 }),
//                 new sap.m.Label({ text: "City", required: true }),
//                 new sap.m.ComboBox({
//                     selectedKey: "{HostelModel>/Persons/" + i + "/City}",
//                     placeholder: "Select City",
//                     items: [
//                         new sap.ui.core.ListItem({ key: "Gulbarga", text: "Gulbarga" }),
//                         new sap.ui.core.ListItem({ key: "Hyderabad", text: "Hyderabad" }),
//                         new sap.ui.core.ListItem({ key: "Other", text: "Other" })
//                     ]
//                 })
//             ]
//         });

//         // 2. Facilities Form - Replacing MultiComboBox with Image Selection
//         var oFacilitiesForm = new sap.ui.layout.form.SimpleForm({
//             editable: true,
//             title: "Facilities",
//             layout: "ColumnLayout",
//             content: [
//                 new sap.m.Label({ text: "Facilities" }),
//                 // Start of New Facility Selection Logic
//                 new sap.m.FlexBox({
//                     justifyContent: sap.m.FlexJustifyContent.Start,
//                     wrap: sap.m.FlexWrap.Wrap,
//                     items: {
//                         path: "HostelModel>/Persons/" + i + "/Facilities/AvailableFacilities",
//                         template: new sap.m.VBox({ // Use VBox for Image and Label combo
//                             alignItems: sap.m.FlexAlignItems.Center,
//                             width: "120px", // Set a fixed width for the tile
//                             items: [
//                                 new sap.m.Image({
//                                     src: "data:image/jpeg;base64,{HostelModel>FacilityImage}", // Bind to base64 image field
//                                     width: "80px",
//                                     height: "80px",
//                                     tooltip: "{HostelModel>FacilityName}", // Assuming FacilityName is the key/text
//                                     // Custom property to track selection state visually and logically
//                                     customData: [
//                                         new sap.ui.core.CustomData({ key: "facilityKey", value: "{HostelModel>FacilityKey}" }), // Assuming FacilityKey is the unique identifier (e.g., "WiFi")
//                                         new sap.ui.core.CustomData({ key: "personIndex", value: i })
//                                     ],
//                                     // Add CSS class for styling the border/selection
//                                     // Check if the current facility key is in the SelectedFacilities array for initial styling
//                                     // You might need a formatter here for dynamic styling based on initial model state
//                                     // For simplicity, we'll rely on the press handler to set the initial state.
//                                     // In a real scenario, you'd use an Expression Binding or Formatter.
                                    
//                                     // Implement the press event handler
//                                     press: this.onFacilityImagePress.bind(this)
//                                 }).addStyleClass("facilityImageTile"), // Custom CSS class for styling
//                                 new sap.m.Label({
//                                     text: "{HostelModel>FacilityName}" // Assuming this is the display name
//                                 })
//                             ]
//                         })
//                     }
//                 }),
//                 // End of New Facility Selection Logic
//                 new sap.m.Label({ text: "Meal Plan" }),
//                 new sap.m.ComboBox({
//                     selectedKey: "{HostelModel>/Persons/" + i + "/Facilities/MealPlan}",
//                     items: [
//                         new sap.ui.core.ListItem({ key: "Veg", text: "Veg" }),
//                         new sap.ui.core.ListItem({ key: "Non-Veg", text: "Non-Veg" }),
//                         new sap.ui.core.ListItem({ key: "None", text: "No Meal" })
//                     ]
//                 })
//             ]
//         });

//         // --- Document Upload Form (Unchanged, so shortened) ---
//         var oDocument = new sap.ui.layout.form.SimpleForm({
//             editable: true,
//             title: "Document Upload",
//             layout: "ColumnLayout",
//             content: [
//                 new sap.m.Label({ text: "Upload Document" }),
//                 new sap.ui.unified.FileUploader({
//                     name: "file",
//                     uploadUrl: "",
//                     uploadOnChange: false,
//                     width: "100%",
//                     customData: [new sap.ui.core.CustomData({ key: "index", value: i })],
//                     change: function (oEvent) {
//                         var index = parseInt(oEvent.getSource().data("index"));
//                         var oFile = oEvent.getParameter("files")[0];
//                         if (oFile) {
//                             var reader = new FileReader();
//                             reader.onload = function (e) {
//                                 var sBase64 = e.target.result.split(",")[1];
//                                 var oModel1 = oModel;
//                                 var oData = oModel1.getData();
//                                 oData.Persons[index].Document = sBase64;
//                                 oData.Persons[index].FileName = oFile.name;
//                                 oData.Persons[index].FileType = oFile.type;
//                                 oModel.refresh(true);
//                             }.bind(this);
//                             reader.readAsDataURL(oFile);
//                         }
//                     }
//                 })
//             ]
//         });;

//         // Add all forms to the container
//         oVBox.addItem(oForm);
//         oVBox.addItem(oFacilitiesForm);
//         oVBox.addItem(oDocument);
//     }

//     oModel.refresh(true);
// },

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
}
	});
});