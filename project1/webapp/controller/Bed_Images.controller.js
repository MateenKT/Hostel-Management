sap.ui.define([
    "./BaseController",
    "../model/formatter",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "../utils/validation"
], function (
    BaseController,
    Formatter,
    MessageBox,
    JSONModel,
    utils
) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Bed_Images", {
        Formatter: Formatter,
        onInit: function () {

            this.getOwnerComponent().getRouter().getRoute("RouteRoomImages").attachMatched(this._onRouteMatched, this);

        },
        _onRouteMatched: async function (oEvent) {

            var model = new sap.ui.model.json.JSONModel({
                Edit: false,
                save: false

            });
            this.getView().setModel(model, "editable")

            var BedImageModel = new sap.ui.model.json.JSONModel({
                BranchCode: "",
                Name: "",
                ACType: "",

            });
            this.getView().setModel(BedImageModel, "BedImageModel")

            this.BedID = oEvent.getParameter("arguments").sPath;
            await this.refershModel(this.BedID)

            this.Onsearch()
        },
        Onsearch: function () {
            sap.ui.core.BusyIndicator.show(0);

            this.ajaxReadWithJQuery("HM_BedType", "").then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                var model = new sap.ui.model.json.JSONModel(oFCIAerData);
                this.getView().setModel(model, "BedDetails")

                sap.ui.core.BusyIndicator.hide();

            })
        },
        refershModel: function (BEdID) {
            this.ajaxReadWithJQuery("HM_BedType", {
                ID: BEdID,
            }).then((oData) => {
                var oFCIAerData = Array.isArray(oData.data.data) ? oData.data.data : [oData.data.data];
                var oBedData = oFCIAerData[0]; // main data object
                this.getView().getModel("BedImageModel").setData(oBedData)
                var oBedImages = oData.data.bedDetails[0]; // contains Photo1..Photo5

                // Transform Photo fields into array for gallery
                var aDisplayImages = [];
                for (var i = 1; i <= 5; i++) {
                    var photoKey = "Photo" + i;
                    var nameKey = "Photo" + i + "Name";
                    var typeKey = "Photo" + i + "Type";

                    if (oBedImages[photoKey]) {
                        // Ensure base64 string is converted into valid image URI
                        var sImageSrc = "data:" + (oBedImages[typeKey] || "image/jpeg") + ";base64," + oBedImages[photoKey];

                        aDisplayImages.push({
                            src: sImageSrc,
                            fileName: oBedImages[nameKey] || ("Photo " + i),
                            fileType: oBedImages[typeKey],
                            isPlaceholder: false
                        });
                    }
                }
                // Create a model for display
                var oDisplayModel = new sap.ui.model.json.JSONModel({ DisplayImages: aDisplayImages });
                this.getView().setModel(oDisplayModel, "DisplayImagesModel");
            });
        },
        onAddItemButtonPress: function () {
            var oTable = this.byId("idTable");
            var oModel = oTable.getModel("BedImageModel");
            var aData = oModel.getData();

            // Add new empty record for upload
            aData.push({
                FileName: "",
                FileContent: ""
            });

            oModel.setData(aData);
        },

        BI_onEditButtonPress: function () {
            this.getView().getModel("editable").setProperty("/Edit", true)

              const oModel = this.getView().getModel("DisplayImagesModel");
            let aImages = oModel.getProperty("/DisplayImages") || [];

            // Remove the deleted image
            // aImages = aImages.filter(img => img.fileName !== sFileName);

            // ✅ Count non-placeholder images
            const realImagesCount = aImages.filter(img => !img.isPlaceholder).length;

            // ✅ If less than 3, ensure a placeholder exists
            if (realImagesCount < 5 && !aImages.some(img => img.isPlaceholder)) {
            aImages.push({ isPlaceholder: true });
            }

            oModel.setProperty("/DisplayImages", aImages);
        },

        BI_onButtonPress: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteBedDetails");
        },
        // POO_onPOTableDelete: function (oEvent) {
        //     // 🔹 Get table and model
        //     var oTable = this.byId("idTable");
        //     var oModel = oTable.getModel("BedImageModel");
        //     var aData = oModel.getData();

        //     // 🔹 Get deleted item index
        //     var oItem = oEvent.getParameter("listItem");
        //     var sPath = oItem.getBindingContext("BedImageModel").getPath(); // e.g. "/2"
        //     var iIndex = parseInt(sPath.split("/")[1]);

        //     // 🔹 Remove the selected item from the data
        //     aData.splice(iIndex, 1);

        //     // 🔹 Update model
        //     oModel.setData(aData);

        //     // 🔹 Optional feedback
        //     sap.m.MessageToast.show("Image removed.");
        // },
        onbranchChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
        },
        onNameInputLiveChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent.getSource(), "ID");
        },


        BT_onsavebuttonpress: async function () {
            var oView = this.getView();
            var Payload = oView.getModel("BedImageModel").getData();
            var DisplayImagesModel = oView.getModel("DisplayImagesModel").getData();

            if (
                utils._LCstrictValidationComboBox(oView.byId("idRoomType12"), "ID") &&
                utils._LCvalidateMandatoryField(oView.byId("idBedType"), "ID") &&
                utils._LCstrictValidationComboBox(oView.byId("idRoomtype"), "ID") &&
                utils._LCvalidateMandatoryField(oView.byId("idR"), "ID") &&
                utils._LCvalidateMandatoryField(oView.byId("id_MaxBeds"), "ID") &&
                utils._LCvalidateMandatoryField(oView.byId("id_Description"), "ID")
            ) {
                var aBedDetails = oView.getModel("BedDetails").getData();

                var bDuplicate = aBedDetails.some(function (bed) {
                    if (Payload.ID && bed.ID === Payload.ID) return false;
                    return (
                        bed.Name.trim().toLowerCase() === Payload.Name.trim().toLowerCase() &&
                        bed.BranchCode === Payload.BranchCode &&
                        bed.ACType === Payload.ACType
                    );
                });

                if (bDuplicate) {
                    sap.m.MessageToast.show(
                        "A bed with the same Bed Type, Branch Code, and AC Type already exists."
                    );
                    return;
                }

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

                sap.ui.core.BusyIndicator.show(0);
                // Wait for all image conversions
                const convertedImages = await Promise.all(DisplayImagesModel.DisplayImages.map(toBase64));

                // Payload preparation
                const oData = {
                    data: {
                        BranchCode: Payload.BranchCode,
                        Name: Payload.Name,
                        ACType: Payload.ACType,
                        NoOfPerson: Payload.NoOfPerson,
                        MaxBeds: Payload.MaxBeds,
                        Description: Payload.Description,

                    },
                    Attachment: {
                        BranchCode: Payload.BranchCode
                    }
                };

                // Add images (up to 3)
                DisplayImagesModel.DisplayImages.slice(0, 5).forEach((file, index) => {
                    const num = index + 1;
                    oData.Attachment[`Photo${num}`] = convertedImages[index] || "";
                    oData.Attachment[`Photo${num}Name`] = file.fileName || "";
                    oData.Attachment[`Photo${num}Type`] = file.fileType || "";
                });

                // Fill empty placeholders if less than 3
                for (let i = DisplayImagesModel.DisplayImages.length + 1; i <= 5; i++) {
                    oData.Attachment[`Photo${i}`] = "";
                    oData.Attachment[`Photo${i}Name`] = "";
                    oData.Attachment[`Photo${i}Type`] = "";
                }

                var payloadWithoutID = { ...oData };
                delete payloadWithoutID.ID;
                // attachmentObj.BranchCode=Payload.BranchCode

                if (Payload.ID) {
                    await this.ajaxUpdateWithJQuery("HM_BedType", {
                        data: payloadWithoutID,
                        filters: { ID: Payload.ID },
                    });
                    await this.refershModel(Payload.ID)
                    this.getView().getModel("editable").setProperty("/Edit", false)

                } else {
                    await this.ajaxCreateWithJQuery("HM_BedType", { data: payloadWithoutID });
                }

                await this.Onsearch();
                sap.m.MessageToast.show("Bed saved successfully.");
                this.ARD_Dialog.close();

            } else {
                sap.m.MessageToast.show("Please fill all mandatory fields correctly.");
            }
        }
        ,
        onDeleteImage: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext("DisplayImagesModel");
            const sFileName = oContext.getProperty("fileName");
            const oModel = this.getView().getModel("DisplayImagesModel");
            let aImages = oModel.getProperty("/DisplayImages") || [];

            // Remove the deleted image
            aImages = aImages.filter(img => img.fileName !== sFileName);

            // ✅ Count non-placeholder images
            const realImagesCount = aImages.filter(img => !img.isPlaceholder).length;

            // ✅ If less than 3, ensure a placeholder exists
            if (realImagesCount < 5 && !aImages.some(img => img.isPlaceholder)) {
            aImages.push({ isPlaceholder: true });
            }

            oModel.setProperty("/DisplayImages", aImages);
        }
        ,


        onFileSelected: function (oEvent) {
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
                    isPlaceholder: false
                };

                if (iPlaceholderIndex !== -1) {
                    aImages.splice(iPlaceholderIndex, 1, oNewImage);
                } else {
                    aImages.push(oNewImage);
                }

                // ✅ Count only real images (exclude placeholder)
                const realImagesCount = aImages.filter(img => !img.isPlaceholder).length;

                // ✅ If less than 3, keep one placeholder; else remove it
                if (realImagesCount < 5) {
                    if (!aImages.some(img => img.isPlaceholder)) {
                        aImages.push({ isPlaceholder: true });
                    }
                } else {
                    aImages = aImages.filter(img => !img.isPlaceholder);
                }

                oModel.setProperty("/DisplayImages", aImages);
            };

            oReader.readAsDataURL(oFile);
        },








    });
});