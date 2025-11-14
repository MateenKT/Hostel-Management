sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "../utils/validation",
], function(BaseController, MessageBox, utils) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.FacilitiesDetails", {
        onInit: function() {
            this.getOwnerComponent().getRouter().getRoute("RouteFacilitiesDetails").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: async function(oEvent) {
                var Layout = this.byId("FD_id_ObjectPageLayout");
      Layout.setSelectedSection(this.byId("FD_id_OrderHeaderSection1"));
            // const omodel = new sap.ui.model.json.JSONModel({
            //     // for Database connection
            //     url: "https://rest.kalpavrikshatechnologies.com/",
            //     headers: {
            //         name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
            //         password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
            //         "Content-Type": "application/json",
            //     },
            //     isRadioVisible: false,
            // });
            // this.getOwnerComponent().setModel(omodel, "LoginModel");

            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            // Editable control model
            const oEditableModel = new sap.ui.model.json.JSONModel({
                Edit: false,
                Save: false
            });
            this.getView().setModel(oEditableModel, "editable");

            // Reset facility model
            const oFacilityModel = new sap.ui.model.json.JSONModel({
                BranchCode: "",
                Type: "",
                Price: "",
                FacilityName: "",
                Currency: "",
                UnitText: ""
            });
            this.getView().setModel(oFacilityModel, "FacilitiesModel");

            sap.ui.core.BusyIndicator.show(0);
            await this.ajaxReadWithJQuery("Currency", "").then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                var model = new sap.ui.model.json.JSONModel(oFCIAerData);
                this.getView().setModel(model, "CurrencyModel");
            });

            this.BedID = oEvent.getParameter("arguments").sPath;
            await this._refreshFacilityDetails(this.BedID);
            await this.Onsearch()
            sap.ui.core.BusyIndicator.hide();
        },

        // BI_onEditButtonPress: function() {
        //     const oView = this.getView();
        //     oView.getModel("editable").setProperty("/Edit", true);
        //     const oDisplayModel = oView.getModel("DisplayImagesModel");
        //     if (!oDisplayModel) return;
        //     const aImages = oDisplayModel.getProperty("/DisplayImages") || [];
        //     const realImagesCount = aImages.filter(img => !img.isPlaceholder).length;
        //     oDisplayModel.setProperty("/CanAddMore", realImagesCount < 3);
        //     if (realImagesCount < 3 && !aImages.some(img => img.isPlaceholder)) {
        //         aImages.push({
        //             isPlaceholder: true
        //         });
        //         oDisplayModel.setProperty("/DisplayImages", aImages);
        //     }
        // },
          BI_onEditButtonPress: function () {
    const oView = this.getView();
    oView.getModel("editable").setProperty("/Edit", true);

    const oModel = oView.getModel("DisplayImagesModel");
    let aImages = oModel.getProperty("/DisplayImages") || [];

    // Count actual images (non-placeholder)
    const realImagesCount = aImages.filter(img => !img.isPlaceholder).length;
              oModel.setProperty("/CanAddMore", realImagesCount < 3);

    // Decide how many placeholders to show
    const maxImages = 3; // total slots to show
    let placeholdersNeeded = maxImages - realImagesCount;

    // Remove existing placeholders
    aImages = aImages.filter(img => !img.isPlaceholder);

    // Add required placeholders
    for (let i = 0; i < placeholdersNeeded; i++) {
        aImages.push({ isPlaceholder: true });
    }

    // Update the model
    oModel.setProperty("/DisplayImages", aImages);
},

        BI_onButtonPress: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteFacilitis");
        },

        onFacilitybranchChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCstrictValidationComboBox(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        onFacilityNameChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        onFacilityTypeChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateMandatoryField(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        onFacilityRateChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCstrictValidationComboBox(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        onFacilityPriceChange: function(oEvent) {
            var oInput = oEvent.getSource();
            utils._LCvalidateAmount(oEvent);
            if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        // onDeleteImage: function(oEvent) {
        //     const oContext = oEvent.getSource().getBindingContext("DisplayImagesModel");
        //     if (!oContext) return;

        //     const sFileName = oContext.getProperty("fileName");
        //     const oModel = this.getView().getModel("DisplayImagesModel");
        //     let aImages = oModel.getProperty("/DisplayImages") || [];
        //     aImages = aImages.filter(img => img.fileName !== sFileName);
        //     const realImagesCount = aImages.filter(img => !img.isPlaceholder).length;
        //     if (realImagesCount < 3 && !aImages.some(img => img.isPlaceholder)) {
        //         aImages.push({
        //             isPlaceholder: true
        //         });
        //     }
        //     oModel.setProperty("/DisplayImages", aImages);
        //     oModel.setProperty("/CanAddMore", realImagesCount < 3);
        // },
            onDeleteImage: function (oEvent) {
    const oContext = oEvent.getSource().getBindingContext("DisplayImagesModel");
    const sFileName = oContext.getProperty("fileName");
    const oModel = this.getView().getModel("DisplayImagesModel");
    let aImages = oModel.getProperty("/DisplayImages") || [];

    // Remove the deleted image
    aImages = aImages.filter(img => img.fileName !== sFileName);

    // Count non-placeholder images
    const realImagesCount = aImages.filter(img => !img.isPlaceholder).length;

    // Decide how many placeholders are needed to reach 5 slots
    const maxImages = 3;
    let placeholdersNeeded = maxImages - realImagesCount;

    // Remove existing placeholders
    aImages = aImages.filter(img => !img.isPlaceholder);

    // Add required placeholders
    for (let i = 0; i < placeholdersNeeded; i++) {
        aImages.push({ isPlaceholder: true });
    }

    // Update the model
    oModel.setProperty("/DisplayImages", aImages);
     oModel.setProperty("/CanAddMore", realImagesCount < 3);
},

        onFileSelected: function(oEvent) {
            const oFileUploader = oEvent.getSource();
            const oFile = oEvent.getParameter("files")[0];
            if (!oFile) return;

            const oReader = new FileReader();
            oReader.onload = (oLoadEvent) => {
                const sBase64 = oLoadEvent.target.result;
                const oModel = this.getView().getModel("DisplayImagesModel");
                let aImages = oModel.getProperty("/DisplayImages") || [];

                const iPlaceholderIndex = aImages.findIndex(img => img.isPlaceholder);

                const oNewImage = {
                    src: sBase64,
                    fileName: oFile.name,
                    fileType: oFile.type,
                    isPlaceholder: false
                };

                if (iPlaceholderIndex !== -1) {
                    aImages.splice(iPlaceholderIndex, 1, oNewImage);
                } else {
                    aImages.push(oNewImage);
                }

                // Count only real images (exclude placeholder)
                const realImagesCount = aImages.filter(img => !img.isPlaceholder).length;

                // If less than 3, keep one placeholder; else remove it
                if (realImagesCount < 3) {
                    if (!aImages.some(img => img.isPlaceholder)) {
                        aImages.push({
                            isPlaceholder: true
                        });
                    }
                } else {
                    aImages = aImages.filter(img => !img.isPlaceholder);
                }

                oModel.setProperty("/DisplayImages", aImages);
            };

            oReader.readAsDataURL(oFile);
        },

         Onsearch: function() {
            sap.ui.core.BusyIndicator.show(0);
            this.ajaxReadWithJQuery("HM_ExtraFacilities", "").then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                var model = new sap.ui.model.json.JSONModel(oFCIAerData);
                this.getView().setModel(model, "Facilities")
                sap.ui.core.BusyIndicator.hide();
            })
        },

        BT_onsavebuttonpress: async function() {
            var oView = this.getView();
            var Payload = oView.getModel("FacilitiesModel").getData();
             var aFacilitiesData = oView.getModel("Facilities").getData();

            // Field validations
            if (
                utils._LCstrictValidationComboBox(oView.byId("FD_id_RoomType123"), "ID") &&
                utils._LCvalidateMandatoryField(oView.byId("FD_id_FacilityName"), "ID") &&
                utils._LCvalidateMandatoryField(oView.byId("FD_id_FacilityName1"), "ID") &&
                utils._LCvalidateMandatoryField(oView.byId("FD_id_Price"), "ID") &&
                utils._LCstrictValidationComboBox(oView.byId("FD_id_Rate"), "ID") &&
                utils._LCstrictValidationComboBox(oView.byId("FD_id_Currency"), "ID")
            ) {
                var attachments = oView.getModel("DisplayImagesModel").getData().DisplayImages || [];

                // Image validations
                if (attachments.length === 0) {
                    sap.m.MessageBox.error("Please upload at least one image.");
                    return;
                }
                if (attachments.length > 3) {
                    sap.m.MessageBox.error("You can upload a maximum of 3 images only.");
                    return;
                }

                //  Duplicate check
            var bDuplicate = aFacilitiesData.some(function(facility) {
                if (Payload.ID && facility.ID === Payload.ID) return false; // Skip comparing the same record during update
                return (
                    facility.BranchCode === Payload.BranchCode &&
                    facility.FacilityName.trim().toLowerCase() === Payload.FacilityName.trim().toLowerCase() &&
                    facility.UnitText === Payload.UnitText
                );
            });

            if (bDuplicate) {
                sap.m.MessageToast.show("Facility with the same rate type already exists for this branch.");
                return;
            }

                // Convert image files to Base64
                const toBase64 = (file) => {
                    return new Promise((resolve, reject) => {
                        if (file.src && file.src.startsWith("data:")) {
                            // Already base64
                            resolve(file.src.split(",")[1]);
                        } else if (file.file && file.file instanceof File) {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result.split(",")[1]);
                            reader.onerror = (error) => reject(error);
                            reader.readAsDataURL(file.file);
                        } else {
                            resolve(null);
                        }
                    });
                };

                try {
                    const convertedImages = await Promise.all(attachments.map(toBase64));

                    // Payload 
                    const oData = {
                        data: {
                            BranchCode: Payload.BranchCode,
                            FacilityName: Payload.FacilityName,
                            Type: Payload.Type,
                            Price: Payload.Price,
                            Currency: Payload.Currency,
                            UnitText: Payload.UnitText,
                        },
                        Attachment: {
                            FacilityName: Payload.FacilityName,
                            BranchCode: Payload.BranchCode
                        }
                    };

                    // Add images (up to 3)
                    attachments.slice(0, 3).forEach((file, index) => {
                        const num = index + 1;
                        oData.Attachment[`Photo${num}`] = convertedImages[index] || "";
                        oData.Attachment[`Photo${num}Name`] = file.fileName || "";
                        oData.Attachment[`Photo${num}Type`] = file.fileType || "";
                    });

                    // Fill empty placeholders if less than 3
                    for (let i = attachments.length + 1; i <= 3; i++) {
                        oData.Attachment[`Photo${i}`] = "";
                        oData.Attachment[`Photo${i}Name`] = "";
                        oData.Attachment[`Photo${i}Type`] = "";
                    }

                    // Send AJAX update
                     sap.ui.core.BusyIndicator.show(0);
                    await this.ajaxUpdateWithJQuery("HM_ExtraFacilities", {
                        data: oData,
                        filters: {
                            ID: Payload.ID
                        }
                    });

                    await this._refreshFacilityDetails(Payload.ID);
                    this.getView().getModel("editable").setProperty("/Edit", false)
                    sap.m.MessageToast.show("Facility updated successfully!");
                } catch (err) {
                    sap.m.MessageToast.show(err.message || err.responseText);
                } finally {
                    sap.ui.core.BusyIndicator.hide();
                }
            }
        },

        _refreshFacilityDetails: async function(sFacilityID) {
            try {
                const oData = await this.ajaxReadWithJQuery("HM_ExtraFacilities", {
                    ID: sFacilityID
                });
                const oFacilityDetails = oData.data.data[0];
                const oImageDetails = oData.data.FactDeta[0] || {};

                this.getView().getModel("FacilitiesModel").setData(oFacilityDetails);

                const aDisplayImages = [];
                for (let i = 1; i <= 3; i++) {
                    const sPhoto = oImageDetails[`Photo${i}`];
                    const sName = oImageDetails[`Photo${i}Name`];
                    const sType = oImageDetails[`Photo${i}Type`];
                    if (sPhoto) {
                        aDisplayImages.push({
                            src: `data:${sType || "image/jpeg"};base64,${sPhoto}`,
                            fileName: sName || `Photo${i}`,
                            fileType: sType || "image/jpeg",
                            isPlaceholder: false
                        });
                    }
                }

                //  Add model flag for uploader visibility
                const bCanAddMore = aDisplayImages.length < 3;
                this.getView().setModel(new sap.ui.model.json.JSONModel({
                    DisplayImages: aDisplayImages,
                    CanAddMore: bCanAddMore
                }), "DisplayImagesModel");

            } catch (err) {
                sap.m.MessageToast.show("Error refreshing facility details");
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },
     onImagePress: function (oEvent) {
    var oSource = oEvent.getSource(); // the clicked image
    var sImageSrc = oSource.getSrc(); // get the image src

    // Get the filename from binding context if available
    var oContext = oSource.getBindingContext("DisplayImagesModel");
    var sFileName = oContext ? oContext.getProperty("fileName") : "Image Preview";

    // Check if dialog already exists
    if (!this._oImageDialog) {
        this._oImageDialog = new sap.m.Dialog({
            title: sFileName, // set dynamic title
            contentWidth: "80%",
            contentHeight: "80%",
            resizable: true,
            draggable: true,
            content: [
                new sap.m.Image({
                    id: this.createId("previewImage"),
                    width: "100%",
                    height: "100%",
                    densityAware: false
                })
            ],
            beginButton: new sap.m.Button({
                text: "Close",
                press: function () {
                    this._oImageDialog.close();
                }.bind(this)
            })
        });

        // Add dialog to the view for lifecycle handling
        this.getView().addDependent(this._oImageDialog);
    } else {
        // If dialog already exists, update the title dynamically
        this._oImageDialog.setTitle(sFileName);
    }

    // Set the image source dynamically
    this.byId("previewImage").setSrc(sImageSrc);

    // Open the dialog
    this._oImageDialog.open();
}

    });
});