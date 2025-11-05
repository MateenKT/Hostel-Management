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
            this.byId("id_facilityTable").removeSelections()
            var oView = this.getView();

            if (!this.ARD_Dialog) {
                this.ARD_Dialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.Facilities", this);
                oView.addDependent(this.ARD_Dialog);
            }
            // oView.byId("idRoomNumber").setVisible(false);
            // oView.byId("idActype").setVisible(false);
            oView.byId("idFileUploderFacility").setValue("");
             var oRoomModel = oView.getModel("FacilitiesModel");
            if (oRoomModel) {
                oRoomModel.setData({
                    BranchCode: "",
                    FacilityName: "",
                    Price: "",
                    Type: "",
                  
                });
            }

            this.ARD_Dialog.open();
        },
        FD_EditDetails:function(){
           var table = this.byId("id_facilityTable");
            var selected = table.getSelectedItem();
            if (!selected) {
                sap.m.MessageToast.show("Please select a record to Edit facility.");
                return;
            }
            var Model = selected.getBindingContext("Facilities");
            var data = Model.getObject();
            var oView = this.getView();
            if (!this.ARD_Dialog) {

                this.ARD_Dialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.Facilities", this);
                oView.addDependent(this.ARD_Dialog);
            }
            this.getView().getModel("FacilitiesModel").setData(data);

      
            // oView.byId("idCity").setVisible(false);
             var oFileNameText = oView.byId("idFileUploderFacility");
            if (data.FileType) {
                oFileNameText.setValue(data.FileName);
            }

            // Open the dialog
            this.ARD_Dialog.open();
            
            },
        FD_onCancelButtonPress: function () {
            this.ARD_Dialog.close();
        },
  FD_onsavebuttonpress: async function () {
    var oView = this.getView();
    var Payload = oView.getModel("FacilitiesModel").getData();
    var aFacilitiesData = oView.getModel("Facilities").getData();

    // Validate price field
    Payload.Price = parseFloat(Payload.Price);
    if (isNaN(Payload.Price)) {
        sap.m.MessageBox.error("Please enter a valid price.");
        return;
    }

    var bDuplicate = aFacilitiesData.some(function (facility) {
        // Skip current record if editing
        if (Payload.ID && facility.ID === Payload.ID) {
            return false;
        }
        return (
            facility.BranchCode === Payload.BranchCode &&
            facility.FacilityName.trim().toLowerCase() === Payload.FacilityName.trim().toLowerCase()
        );
    });

    if (bDuplicate) {
        sap.m.MessageToast.show("Facility already exists for this branch.");
        return;
    }

    // File uploader
    var oFileUploader = this.byId("idFileUploderFacility");
    var aFiles = oFileUploader.oFileUpload.files;

    // File validation (only for create)
    if (!Payload.ID && aFiles.length === 0) {
        sap.m.MessageBox.error("Please select a file before saving.");
        return;
    }

    var that = this;
    var payloadWithoutID = { ...Payload };
    delete payloadWithoutID.ID;

    // Convert FileReader into a Promise-based helper
    function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            var reader = new FileReader();
            reader.onload = function (e) {
                resolve(e.target.result.split(",")[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    try {
        if (aFiles.length > 0) {
            var oFile = aFiles[0];
            payloadWithoutID.FicilityImage = await readFileAsBase64(oFile);
            payloadWithoutID.FileType = oFile.type;
            payloadWithoutID.FileName = oFile.name;
        }else if (Payload.ID) {
            // Editing and no new file chosen — keep old file info
            payloadWithoutID.FicilityImage = Payload.FicilityImage;
            payloadWithoutID.FileType = Payload.FileType;
            payloadWithoutID.FileName = Payload.FileName;
        }

        if (Payload.ID) {
            await that.ajaxUpdateWithJQuery("HM_ExtraFacilities", {
                data: payloadWithoutID,
                filters: { ID: Payload.ID },
            });
            sap.m.MessageToast.show("Facility updated successfully!");
        } else {
            await that.ajaxCreateWithJQuery("HM_ExtraFacilities", {
                data: payloadWithoutID,
            });
            sap.m.MessageToast.show("Facility added successfully!");
        }

        // Refresh and close
        await that.Onsearch();
        that.ARD_Dialog.close();

        //   oFileUploader.clear();

    } catch (err) {
        console.error("Save failed:", err);
        sap.m.MessageBox.error("Error while saving Facility data. Please try again.");
    }
},

        Onsearch: function () {
            sap.ui.core.BusyIndicator.show(0);

            this.ajaxReadWithJQuery("HM_ExtraFacilities", "").then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                var model = new sap.ui.model.json.JSONModel(oFCIAerData);

                this.getView().setModel(model, "Facilities")
                    this._populateUniqueFilterValues(oFCIAerData);

                                    sap.ui.core.BusyIndicator.hide();

            })
        },
        _populateUniqueFilterValues: function (data) {
            let uniqueValues = {
                FN_id_FacilityName: new Set(),
                FN_id_BranchCode: new Set(),

            };

            data.forEach(item => {
                uniqueValues.FN_id_FacilityName.add(item.FacilityName);
                uniqueValues.FN_id_BranchCode.add(item.BranchCode);
            });

            let oView = this.getView();
            ["FN_id_FacilityName", "FN_id_BranchCode"].forEach(field => {
                let oComboBox = oView.byId(field);
                oComboBox.destroyItems();
                Array.from(uniqueValues[field]).sort().forEach(value => {
                    oComboBox.addItem(new sap.ui.core.Item({
                        key: value,
                        text: value
                    }));
                });
            });
        },
        FC_onSearch:function(){
             var oView = this.getView();

            var oFilterBar = oView.byId("PO_id_FilterbarEmployee");

            var oTable = oView.byId("id_facilityTable");
            var oBinding = oTable.getBinding("items");

            var sCustomerName = oView.byId("FN_id_FacilityName").getSelectedKey() || oView.byId("FN_id_FacilityName").getValue();
            var sCustomerID = oView.byId("FN_id_BranchCode").getSelectedKey() || oView.byId("FN_id_BranchCode").getValue();

            var aFilters = [];

            if (sCustomerName) {
                aFilters.push(new sap.ui.model.Filter("FacilityName", sap.ui.model.FilterOperator.Contains, sCustomerName));
            }

            if (sCustomerID) {
                aFilters.push(new sap.ui.model.Filter("BranchCode", sap.ui.model.FilterOperator.Contains, sCustomerID));
            }

            var oCombinedFilter = new sap.ui.model.Filter({
                filters: aFilters,
                and: true
            });

            oBinding.filter(oCombinedFilter); 
        },
         FC_onPressClear:function(){
            this.getView().byId("FN_id_FacilityName").setSelectedKey("")
             this.getView().byId("FN_id_BranchCode").setSelectedKey("")
        },
        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
        },
        onHome: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },
         FC_viewroom: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("Facilities");
            var oData = oContext.getObject();

            if (!oData.FicilityImage || !oData.FicilityImage.length) {
                sap.m.MessageBox.error("No document found for this room!");
                return;
            }

            var sBase64 = oData.FicilityImage;

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