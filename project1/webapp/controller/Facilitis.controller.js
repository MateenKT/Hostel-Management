sap.ui.define([
    "./BaseController",
    "sap/ui/core/mvc/Controller"
], function (
    BaseController
) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Facilitis", {


        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteFacilitis").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function () {
            var model = new sap.ui.model.json.JSONModel({
                BranchCode: "",
                Type: "",
                Price: "",
                FacilityName: ""
            });
            this.getView().setModel(model, "FacilitiesModel")
            this.Onsearch()
        },
        FD_RoomDetails: function (oEvent) {
            var oView = this.getView();

            if (!this.ARD_Dialog) {
                this.ARD_Dialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.Facilities", this);
                oView.addDependent(this.ARD_Dialog);
            }
            // oView.byId("idRoomNumber").setVisible(false);
            // oView.byId("idActype").setVisible(false);

            this.ARD_Dialog.open();
        },
        FD_onCancelButtonPress: function () {
            this.ARD_Dialog.close();
        },
        FD_onsavebuttonpress: function () {
            var oView = this.getView();
            var Payload = oView.getModel("FacilitiesModel").getData();

            //  Validate price field
            Payload.Price = parseFloat(Payload.Price);
            if (isNaN(Payload.Price)) {
                sap.m.MessageBox.error("Please enter a valid price.");
                return;
            }

            //  Get FileUploader control
            var oFileUploader = this.byId("idFileUploderFacility");
            var aFiles = oFileUploader.oFileUpload.files;

            if (aFiles.length === 0) {
                sap.m.MessageBox.error("Please select a file before saving.");
                return;
            }

            var oFile = aFiles[0];
            var reader = new FileReader();
            var that = this; // preserve 'this' inside FileReader callback

            reader.onload = function (e) {
                //  Extract Base64 content from file
                var sBase64 = e.target.result.split(",")[1];

                //  Add file details to payload
                Payload.FicilityImage = sBase64;
                Payload.FileType = oFile.type;

                //  Save to backend using reusable helper
                that.ajaxCreateWithJQuery("HM_ExtraFacilities", { data: Payload });

                //  Refresh table / reload list
                that.Onsearch();

                //  Close dialog
                that.ARD_Dialog.close();

                //  Success message
                sap.m.MessageToast.show("Facility added successfully!");
            };

            //  Start reading file as Base64
            reader.readAsDataURL(oFile);
        },

        Onsearch: function () {

            this.ajaxReadWithJQuery("HM_ExtraFacilities", "").then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                var model = new sap.ui.model.json.JSONModel(oFCIAerData);
                this.getView().setModel(model, "Facilities")
            })
        },
        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
        },
        onHome: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },
    });
});