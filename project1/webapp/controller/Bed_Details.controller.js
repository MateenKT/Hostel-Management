sap.ui.define([
    "./BaseController",
    "../utils/validation"
], function (
    BaseController,
    utils
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
           this.byId("id_BedTable").removeSelections();
            var oView = this.getView();

            if (!this.ARD_Dialog) {
                this.ARD_Dialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.Bed_Type", this);
                oView.addDependent(this.ARD_Dialog);
            }
            // oView.byId("idRoomNumber").setVisible(false);
            // oView.byId("idActype").setVisible(false);
            oView.getModel("BedModel").setData({})
         this.byId("idFileUploader").setValue("");
           var aControls = this.ARD_Dialog.findAggregatedObjects(true, function (oControl) {
        return oControl instanceof sap.m.Input ||
               oControl instanceof sap.m.ComboBox ||
               oControl instanceof sap.m.Select;
    });

    aControls.forEach(function (oControl) {
        oControl.setValueState("None");
    });


            this.ARD_Dialog.open();
        },

        HM_EditDetails: function () {
            var table = this.byId("id_BedTable");
            var selected = table.getSelectedItem();
            if (!selected) {
                sap.m.MessageToast.show("Please select a record to Edit room.");
                return;
            }
            var Model = selected.getBindingContext("BedDetails");
            var data = Model.getObject();
            var oView = this.getView();

            if (!this.ARD_Dialog) {
                this.ARD_Dialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.Bed_Type", this);
                oView.addDependent(this.ARD_Dialog);
            }
           var oClonedData = JSON.parse(JSON.stringify(data));
          oView.getModel("BedModel").setData(oClonedData);
            var oFileNameText = oView.byId("idFileUploader");
            if (data.FileType) {
                oFileNameText.setValue(data.FileType);
            }
   var aControls = this.ARD_Dialog.findAggregatedObjects(true, function (oControl) {
        return oControl instanceof sap.m.Input ||
               oControl instanceof sap.m.ComboBox ||
               oControl instanceof sap.m.Select;
    });
     aControls.forEach(function (oControl) {
        oControl.setValueState("None");
    });
            // oView.byId("idCity").setVisible(false);


            // Open the dialog
            this.ARD_Dialog.open();
        },
      BT_onsavebuttonpress: async function () {
    var oView = this.getView();
    var Payload = oView.getModel("BedModel").getData();

    var oFileUploader = this.byId("idFileUploader");
    var aFiles = oFileUploader.oFileUpload.files;

    if (
        utils._LCstrictValidationComboBox(oView.byId("idRoomType12"), "ID") &&
        utils._LCvalidateMandatoryField(oView.byId("idBedType"), "ID") &&
        utils._LCstrictValidationComboBox(oView.byId("idRoomtype"), "ID") &&
        utils._LCvalidateMandatoryField(oView.byId("idR"), "ID") &&

        utils._LCvalidateMandatoryField(oView.byId("id_MaxBeds"), "ID")
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
            sap.m.MessageToast.show("Record saved successfully.");
            this.ARD_Dialog.close();

        } catch (error) {
            console.error("Save failed:", error);
            sap.m.MessageBox.error("Error while saving Bed Details.");
        }

    } else {
        sap.m.MessageToast.show("Please fill all mandatory fields correctly.");
    }
}
,

        _readFileAsBase64: function (file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result.split(",")[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
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
        Onsearch: function () {
            sap.ui.core.BusyIndicator.show(0);

            this.ajaxReadWithJQuery("HM_BedType", "").then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                var model = new sap.ui.model.json.JSONModel(oFCIAerData);
                this.getView().setModel(model, "BedDetails")
                this._populateUniqueFilterValues(oFCIAerData);

                sap.ui.core.BusyIndicator.hide();

            })
        },
        _populateUniqueFilterValues: function (data) {
            let uniqueValues = {
                PO_id_CustomerName: new Set(),
                PO_id_CompanyName: new Set(),

            };

            data.forEach(item => {
                uniqueValues.PO_id_CustomerName.add(item.Name);
                uniqueValues.PO_id_CompanyName.add(item.BranchCode);
            });

            let oView = this.getView();
            ["PO_id_CustomerName", "PO_id_CompanyName"].forEach(field => {
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
        HM_onSearch: function () {
            var oView = this.getView();

            var oFilterBar = oView.byId("PO_id_FilterbarEmployee");

            var oTable = oView.byId("id_BedTable");
            var oBinding = oTable.getBinding("items");

            var sCustomerName = oView.byId("PO_id_CustomerName").getSelectedKey() || oView.byId("PO_id_CustomerName").getValue();
            var sCustomerID = oView.byId("PO_id_CompanyName").getSelectedKey() || oView.byId("PO_id_CompanyName").getValue();

            var aFilters = [];

            if (sCustomerName) {
                aFilters.push(new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.Contains, sCustomerName));
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
        PO_onPressClear: function () {
            this.getView().byId("PO_id_CustomerName").setSelectedKey("")
            this.getView().byId("PO_id_CompanyName").setSelectedKey("")
        },
       BD_viewroom: function (oEvent) {
    var oContext = oEvent.getSource().getBindingContext("BedDetails");
    var oData = oContext.getObject();

    // Check if RoomPhotos exists and is non-empty
    if (!oData.RoomPhotos || !oData.RoomPhotos.trim()) {
        sap.m.MessageBox.error("No document found for this room!");
        return;
    }

    var sBase64 = oData.RoomPhotos.trim();

    try {
        // If not a proper data URI, try decoding
        if (!sBase64.startsWith("data:image")) {
            var decoded = atob(sBase64);
            if (decoded.startsWith("iVB")) {
                sBase64 = decoded;
            }
            sBase64 = "data:image/jpeg;base64," + sBase64;
        }
    } catch (e) {
        console.error("Base64 decode failed:", e);
        sap.m.MessageBox.error("Invalid image data.");
        return;
    }

    // Create and open the dialog with image
    var oImage = new sap.m.Image({
        src: sBase64,
        width: "100%",
        height: "auto",
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
,
        onbranchChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
        },
        onNameInputLiveChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent.getSource(), "ID");
        },
            HM_DeleteDetails: function () {
            var table = this.byId("id_BedTable");
            var selected = table.getSelectedItem();

            if (!selected) {
                sap.m.MessageToast.show("Please select a record to delete.");
                return;
            }

            var Model = selected.getBindingContext("BedDetails");
            var data = Model.getObject();

            // Confirmation popup
            sap.m.MessageBox.confirm(
                "Are you sure you want to delete this Bed?",
                {
                    title: "Confirm Deletion",
                    actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
                    onClose: function (sAction) {
                        if (sAction === sap.m.MessageBox.Action.OK) {
                            var oBody = {
                                filters: {
                                    ID: data.ID
                                }
                            };

                            $.ajax({
                                url: "https://rest.kalpavrikshatechnologies.com/HM_BedType",
                                method: "DELETE",
                                contentType: "application/json",
                                data: JSON.stringify(oBody),
                                headers: {
                                    name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                                    password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
                                },
                                success: function (response) {
                                    sap.m.MessageToast.show("Room deleted successfully!");
                                    this.Onsearch();
                                    table.removeSelections();

                                }.bind(this),
                                error: function (xhr) {
                                    sap.m.MessageToast.show("Error: " + xhr.statusText);
                                }
                            });
                        }
                    }.bind(this)
                }
            );
        }
    });
});