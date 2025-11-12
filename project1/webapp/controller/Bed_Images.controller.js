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
        _onRouteMatched: function (oEvent) {

               var model = new sap.ui.model.json.JSONModel({
                Edit: false,
                save:false
               
            });
            this.getView().setModel(model, "editable")

              var BedImageModel = new sap.ui.model.json.JSONModel({
                  BranchCode: "",
                Name: "",
                ACType: "",
               
            });
            this.getView().setModel(BedImageModel, "BedImageModel")

         this.BedID = oEvent.getParameter("arguments").sPath;
    this.ajaxReadWithJQuery("HM_BedType", {
    ID: this.BedID,
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
                fileType: oBedImages[typeKey]
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

BI_onEditButtonPress:function(){
    this.getView().getModel("editable").setProperty("/Edit",true)
},
BI_onSaveButtonPress:function(){
    this.getView().getModel("editable").setProperty("/Edit",false)

},
BI_onButtonPress:function(){
      var oRouter = this.getOwnerComponent().getRouter();
      oRouter.navTo("RouteBedDetails");
},
POO_onPOTableDelete: function (oEvent) {
    // 🔹 Get table and model
    var oTable = this.byId("idTable");
    var oModel = oTable.getModel("BedImageModel");
    var aData = oModel.getData();

    // 🔹 Get deleted item index
    var oItem = oEvent.getParameter("listItem");
    var sPath = oItem.getBindingContext("BedImageModel").getPath(); // e.g. "/2"
    var iIndex = parseInt(sPath.split("/")[1]);

    // 🔹 Remove the selected item from the data
    aData.splice(iIndex, 1);

    // 🔹 Update model
    oModel.setData(aData);

    // 🔹 Optional feedback
    sap.m.MessageToast.show("Image removed.");
},
   onbranchChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
        },
         onNameInputLiveChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent.getSource(), "ID");
        },
  BT_onsavebuttonpress: async function () {
    var oView = this.getView();
    var Payload = oView.getModel("BedImageModel").getData();

    // var oFileUploader = this.byId("idFileUploader");
    // var aFiles = oFileUploader.oFileUpload.files;

    if (
        utils._LCstrictValidationComboBox(oView.byId("idRoomType12"), "ID") &&
        utils._LCvalidateMandatoryField(oView.byId("idBedType"), "ID") &&
        utils._LCstrictValidationComboBox(oView.byId("idRoomtype"), "ID") &&
        utils._LCvalidateMandatoryField(oView.byId("idR"), "ID") &&

        utils._LCvalidateMandatoryField(oView.byId("id_MaxBeds"), "ID") &&
        utils._LCvalidateMandatoryField(oView.byId("id_Description"), "ID") 

    ) {
        if (aFiles.length === 0 && !Payload.RoomPhotos) {
            sap.m.MessageToast.show("Please select a file before saving.");
            return;
        }

        var aBedDetails = oView.getModel("BedDetails").getData();

        var bDuplicate = aBedDetails.some(function (bed) {
            // skip the same record in edit mode
            if (Payload.ID && bed.ID === Payload.ID) {
                return false;
            }
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

        var oFile = aFiles[0];
        var payloadWithoutID = { ...Payload };
        delete payloadWithoutID.ID;

        try {
            if (oFile) {
                const sBase64 = await this._readFileAsBase64(oFile);
                payloadWithoutID.RoomPhotos = sBase64;
                payloadWithoutID.FileType = oFile.type;
                payloadWithoutID.FileName = oFile.name;
            }else if (Payload.ID) {
                // Edit mode, no new file uploaded – keep original from BedDetails
                var originalRecord = aBedDetails.find(b => b.ID === Payload.ID);
                if (originalRecord) {
                    payloadWithoutID.RoomPhotos = originalRecord.RoomPhotos;
                    payloadWithoutID.FileType = originalRecord.FileType;
                    payloadWithoutID.FileName = originalRecord.FileName;
                }
            }

            if (Payload.ID) {
                await this.ajaxUpdateWithJQuery("HM_BedType", {
                    data: payloadWithoutID,
                    filters: { ID: Payload.ID },
                });
            } else {
                await this.ajaxCreateWithJQuery("HM_BedType", { data: payloadWithoutID });
            }

            await this.Onsearch();
            sap.m.MessageToast.show("Bed saved successfully.");
            this.ARD_Dialog.close();

        } catch (error) {
            console.error("Save failed:", error);
            sap.m.MessageBox.error("Error while saving Bed Details.");
        }

    } else {
        sap.m.MessageToast.show("Please fill all mandatory fields correctly.");
    }
}


       

    });
});