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
             const omodel = new sap.ui.model.json.JSONModel({
                // for Database connection
                url: "https://rest.kalpavrikshatechnologies.com/",
                headers: {
                    name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                    password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
                    "Content-Type": "application/json",
                },
                isRadioVisible: false,
            });
            this.getOwnerComponent().setModel(omodel, "LoginModel");

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

            // Get facility ID from route parameter
            this.BedID = oEvent.getParameter("arguments").sPath;

           
            // Fetch data from backend
            await this.ajaxReadWithJQuery("HM_ExtraFacilities", {
                ID: this.BedID
            }).then((oData) => {
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
                            fileType: sType || "image/jpeg"
                        });
                    }
                }
                const oDisplayModel = new sap.ui.model.json.JSONModel({
                    DisplayImages: aDisplayImages
                });
                this.getView().setModel(oDisplayModel, "DisplayImagesModel");
                 sap.ui.core.BusyIndicator.hide();
            });
        },

        onAddItemButtonPress: function() {
            var oTable = this.byId("idTable");
            var oModel = oTable.getModel("FacilitiesModel");
            var aData = oModel.getData();

            // Add new empty record for upload
            aData.push({
                FileName: "",
                FileContent: ""
            });

            oModel.setData(aData);
        },

        BI_onEditButtonPress: function() {
            this.getView().getModel("editable").setProperty("/Edit", true)
        },
        BI_onSaveButtonPress: function() {
            this.getView().getModel("editable").setProperty("/Edit", false)
        },
        BI_onButtonPress: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteFacilitis");
        },
        POO_onPOTableDelete: function(oEvent) {
            var oTable = this.byId("idTable");
            var oModel = oTable.getModel("FacilitiesModel");
            var aData = oModel.getData();

            // 🔹 Get deleted item index
            var oItem = oEvent.getParameter("listItem");
            var sPath = oItem.getBindingContext("FacilitiesModel").getPath(); // e.g. "/2"
            var iIndex = parseInt(sPath.split("/")[1]);

            // 🔹 Remove the selected item from the data
            aData.splice(iIndex, 1);

            // 🔹 Update model
            oModel.setData(aData);

            // 🔹 Optional feedback
            sap.m.MessageToast.show("Image removed.");
        },
        onbranchChange: function(oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
        },
        onNameInputLiveChange: function(oEvent) {
            utils._LCvalidateMandatoryField(oEvent.getSource(), "ID");
        },
        onPressImageDelete: function(oEvent) {
            const oContext = oEvent.getSource().getBindingContext("DisplayImagesModel");
            if (!oContext) return;
            const sFileName = oContext.getProperty("fileName");
            const oDisplayModel = this.getView().getModel("DisplayImagesModel");
            const aImages = oDisplayModel.getProperty("/DisplayImages") || [];
            const aUpdatedImages = aImages.filter(oImg => oImg.fileName !== sFileName);
            oDisplayModel.setProperty("/DisplayImages", aUpdatedImages);
            this._deleteImageFromBackend(sFileName);
        },

        _deleteImageFromBackend: function(sFileName) {
            const oPayload = {
                ID: this.BedID, // Facility ID from route
                FileName: sFileName // File name to delete
            };

            this.ajaxDeleteWithJQuery("HM_ExtraFacilitiesImage", oPayload)
                .then(() => sap.m.MessageToast.show(`${sFileName} deleted successfully`))
                .catch(() => sap.m.MessageBox.error("Failed to delete image"));
        },
        BT_onsavebuttonpress: async function() {
            var oView = this.getView();
            var Payload = oView.getModel("FacilitiesModel").getData();

            // Field validations
            if (
                utils._LCstrictValidationComboBox(oView.byId("FD_id_RoomType123"), "ID") &&
                utils._LCvalidateMandatoryField(oView.byId("FD_id_FacilityName"), "ID") &&
                utils._LCvalidateMandatoryField(oView.byId("FD_id_FacilityName1"), "ID") &&
                utils._LCvalidateMandatoryField(oView.byId("FD_id_Price"), "ID") &&
                utils._LCstrictValidationComboBox(oView.byId("FD_id_Rate"), "ID") &&
                utils._LCstrictValidationComboBox(oView.byId("FD_id_Currency"), "ID")
            ) {
                var aFacilitiesData = oView.getModel("FacilitiesModel").getData(); // ✅ added missing variable reference
                var attachments = oView.getModel("UploaderData").getData().attachments || []; // ✅ added to ensure attachments is defined

                // Duplicate check
                var bDuplicate = aFacilitiesData.some(function(facility) {
                    if (Payload.ID && facility.ID === Payload.ID) return false; // Skip same record during update
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

                // Image validations
                if (attachments.length === 0) {
                    sap.m.MessageBox.error("Please upload at least one image.");
                    return;
                }

                if (attachments.length > 3) {
                    sap.m.MessageBox.error("You can upload a maximum of 3 images only.");
                    return;
                }

                // Payload preparation
                const oData = {
                    data: {
                        BranchCode: Payload.BranchCode,
                        FacilityName: Payload.FacilityName,
                        Type: Payload.Type,
                        Price: Payload.Price,
                        Currency: Payload.Currency,
                        UnitText: Payload.UnitText,
                    },
                    Attachment: {}
                };

                // Add facility and branch info to attachment
                oData.Attachment.FacilityName = Payload.FacilityName;
                oData.Attachment.BranchCode = Payload.BranchCode;

                // Add images (up to 3)
                attachments.slice(0, 3).forEach((file, index) => {
                    const num = index + 1;
                    oData.Attachment[`Photo${num}`] = file.content || null;
                    oData.Attachment[`Photo${num}Name`] = file.filename || "";
                    oData.Attachment[`Photo${num}Type`] = file.fileType || "";
                });

                // Fill empty placeholders if less than 3 images
                for (let i = attachments.length + 1; i <= 3; i++) {
                    oData.Attachment[`Photo${i}`] = null;
                    oData.Attachment[`Photo${i}Name`] = "";
                    oData.Attachment[`Photo${i}Type`] = "";
                }

                sap.ui.core.BusyIndicator.show(0);
                try {
                    await this.ajaxUpdateWithJQuery("HM_ExtraFacilities", {
                        data: oData,
                        filters: {
                            ID: Payload.ID
                        } // ✅ fixed: oData.ID → Payload.ID (oData has no ID)
                    });

                    sap.m.MessageToast.show("Facility added successfully!");

                    // Reset models after success
                    oView.getModel("UploaderData").setData({
                        attachments: []
                    });
                    oView.getModel("tokenModel").setData({
                        tokens: []
                    });

                    await this.Onsearch();
                    this.ARD_Dialog.close();
                } catch (err) {
                    sap.m.MessageToast.show(err.message || err.responseText);
                } finally {
                    sap.ui.core.BusyIndicator.hide();
                }
            }
        }
    });
});