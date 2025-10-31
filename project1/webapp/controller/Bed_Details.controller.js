sap.ui.define([
    "./BaseController",
    "sap/ui/core/mvc/Controller"
], function (
    BaseController
) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Bed_Details", {

        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteBedDetails").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function () {
            var model = new sap.ui.model.json.JSONModel({
                BranchCode: "",
                Name: "",
                ACType: "",
            });
            this.getView().setModel(model, "BedModel")
            this.Onsearch()
        },

        HM_RoomDetails: function (oEvent) {
            var oView = this.getView();

            if (!this.ARD_Dialog) {
                this.ARD_Dialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.Bed_Type", this);
                oView.addDependent(this.ARD_Dialog);
            }
            // oView.byId("idRoomNumber").setVisible(false);
            // oView.byId("idActype").setVisible(false);

            this.ARD_Dialog.open();
        },
        BT_onsavebuttonpress: function () {
            var oView = this.getView();
            var Payload = oView.getModel("BedModel").getData();
            var oFileUploader = this.byId("idFileUploader");
            var aFiles = oFileUploader.oFileUpload.files;

            if (aFiles.length === 0) {
                sap.m.MessageBox.error("Please select a file before saving.");
                return;
            }

            var oFile = aFiles[0];
            var reader = new FileReader();
            var that = this; // capture 'this' for use inside FileReader callback

            reader.onload = function (e) {
                var sBase64 = e.target.result.split(",")[1];
                Payload.RoomPhotos = sBase64;
                Payload.FileType = oFile.type;


                that.ajaxCreateWithJQuery("HM_BedType", { data: Payload });
                this.Onsearch()
            this.ARD_Dialog.close();

            };

            reader.readAsDataURL(oFile);
        },
        BT_onCancelButtonPress: function () {
            this.ARD_Dialog.close();
        },
          onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
        },
           onHome: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },
        Onsearch:function(){
             this.ajaxReadWithJQuery("HM_BedType","").then((oData) => {
                    var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                      var model = new sap.ui.model.json.JSONModel(oFCIAerData);
               this.getView().setModel(model, "BedDetails")
               })
        },
         BD_viewroom: function (oEvent) {
    var oContext = oEvent.getSource().getBindingContext("BedDetails");
    var oData = oContext.getObject();

    if (!oData.
RoomPhotos || !oData.
RoomPhotos.length) {
        sap.m.MessageBox.error("No document found for this room!");
        return;
    }

    var sBase64 = oData.RoomPhotos;

    if (!sBase64) {
        sap.m.MessageBox.error("No document found for this room!");
        return;
    }

    sBase64 = sBase64.replace(/\s/g, "");

    try {
        if (!sBase64.startsWith("iVB") && !sBase64.startsWith("data:image")) {
            var decoded = atob(sBase64);
            if (decoded.startsWith("iVB")) {
                sBase64 = decoded;
            }
        }
    } catch (e) {
        console.error("Base64 decode failed:", e);
    }

    if (!sBase64.startsWith("data:image")) {
        sBase64 = "data:image/jpeg;base64," + sBase64;
    }

    var oImage = new sap.m.Image({
        src: sBase64,
        width: "100%",
        height: "auto"
    });

    var oDialog = new sap.m.Dialog({
        title: "View Document",
        contentWidth: "400px",
        contentHeight: "500px",
        verticalScrolling: true,
        content: [oImage],
        endButton: new sap.m.Button({
            text: "Close",
            press: function () {
                oDialog.close();
            }
        }),
        afterClose: function () {
            oDialog.destroy();
        }
    });

    oDialog.open();
}

    });
});