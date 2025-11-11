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
        _onRouteMatched: function() {
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

            const oFacilityModel = new sap.ui.model.json.JSONModel({
                ID: "",
                BranchCode: "",
                FacilityName: "",
                Description: ""
            });
            this.getView().setModel(oFacilityModel, "FacilitiesModel");

            const oUploaderDataModel = new sap.ui.model.json.JSONModel({
                attachments: [],
                isFileUploaded: false
            });
            this.getView().setModel(oUploaderDataModel, "UploaderData");

            this.Onsearch();
        },

        FD_RoomDetails: function () {
            const oView = this.getView();

            if (!this.ARD_Dialog) {
                this.ARD_Dialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.FacilitiesDetails", this);
                oView.addDependent(this.ARD_Dialog);
            }

            oView.getModel("FacilitiesModel").setData({
                ID: "",
                BranchCode: "",
                FacilityName: "",
                Description: ""
            });

            oView.getModel("UploaderData").setData({
                attachments: [],
                isFileUploaded: false
            });

            this._resetFacilityValueStates();
            this.ARD_Dialog.open();
        },

        FD_EditDetails: function () {
            const oTable = this.byId("FD_id_facilityTable");
            const oSelected = oTable.getSelectedItem();

            if (!oSelected) {
                sap.m.MessageToast.show("Please select a record to edit.");
                return;
            }

            const oData = oSelected.getBindingContext("Facilities").getObject();
            const oView = this.getView();

            if (!this.ARD_Dialog) {
                this.ARD_Dialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.FacilitiesDetails", this);
                oView.addDependent(this.ARD_Dialog);
            }

            // Prefill attachments if they exist in DB
            const aAttachments = [];
            if (oData.Photo1) aAttachments.push({ filename: oData.Photo1Name, fileType: oData.Photo1Type, content: oData.Photo1 });
            if (oData.Photo2) aAttachments.push({ filename: oData.Photo2Name, fileType: oData.Photo2Type, content: oData.Photo2 });
            if (oData.Photo3) aAttachments.push({ filename: oData.Photo3Name, fileType: oData.Photo3Type, content: oData.Photo3 });

            oView.getModel("FacilitiesModel").setData(oData);
            oView.getModel("UploaderData").setData({ attachments: aAttachments, isFileUploaded: aAttachments.length > 0 });

            this._resetFacilityValueStates();
            this.ARD_Dialog.open();
        },

        FD_onCancelButtonPress: function () {
            const oView = this.getView();

            oView.getModel("FacilitiesModel").setData({
                ID: "",
                BranchCode: "",
                FacilityName: "",
                Description: ""
            });

            oView.getModel("UploaderData").setData({
                attachments: [],
                isFileUploaded: false
            });

            this._resetFacilityValueStates();
            this.byId("FD_id_facilityTable").removeSelections();
            this.ARD_Dialog.close();
        },

        // Handle File Upload
        onFileSelected: function (oEvent) {
            const oFiles = oEvent.getParameter("files");
            const oUploaderModel = this.getView().getModel("UploaderData");
            const aAttachments = oUploaderModel.getProperty("/attachments");

            if (aAttachments.length >= 3) {
                sap.m.MessageToast.show("You can upload a maximum of 3 images only.");
                return;
            }

            Array.from(oFiles).forEach(file => {
                if (file.size > 1048576) { // 1MB
                    sap.m.MessageToast.show("File size exceeds 1 MB: " + file.name);
                    return;
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    aAttachments.push({
                        filename: file.name,
                        fileType: file.type,
                        size: file.size,
                        content: e.target.result.split(",")[1]
                    });
                    oUploaderModel.refresh();
                };
                reader.readAsDataURL(file);
            });
        },

        onAttachmentsTableDelete: function (oEvent) {
            const oContext = oEvent.getParameter("listItem").getBindingContext("UploaderData");
            const oUploaderModel = this.getView().getModel("UploaderData");
            const aAttachments = oUploaderModel.getProperty("/attachments");
            const index = oContext.getPath().split("/").pop();
            aAttachments.splice(index, 1);
            oUploaderModel.refresh();
        },

        FD_onsavebuttonpress: async function () {
            const oView = this.getView();
            const oFacilitiesModel = oView.getModel("FacilitiesModel");
            const oUploaderData = oView.getModel("UploaderData");

            const Payload = oFacilitiesModel.getData();
            const attachments = oUploaderData.getProperty("/attachments") || [];
            const aFacilitiesData = oView.getModel("Facilities").getData();

            if (!Payload.BranchCode || !Payload.FacilityName || !Payload.Description) {
                sap.m.MessageToast.show(this.i18nModel.getText("mandetoryFields") || "Please fill all mandatory fields.");
                return;
            }

            if (attachments.length === 0) {
                MessageBox.error("Please upload at least one attachment.");
                return;
            }

            const bDuplicate = aFacilitiesData.some(facility => {
                if (Payload.ID && facility.ID === Payload.ID) return false;
                return (
                    facility.BranchCode === Payload.BranchCode &&
                    facility.FacilityName.trim().toLowerCase() === Payload.FacilityName.trim().toLowerCase()
                );
            });

            if (bDuplicate) {
                sap.m.MessageToast.show("Facility with same name already exists for this branch.");
                return;
            }

            // Map files to DB columns
            const oData = {
                BranchCode: Payload.BranchCode,
                FacilityName: Payload.FacilityName,
                Description: Payload.Description,
                Photo1: attachments[0]?.content || null,
                Photo1Name: attachments[0]?.filename || "",
                Photo1Type: attachments[0]?.fileType || "",
                Photo2: attachments[1]?.content || null,
                Photo2Name: attachments[1]?.filename || "",
                Photo2Type: attachments[1]?.fileType || "",
                Photo3: attachments[2]?.content || null,
                Photo3Name: attachments[2]?.filename || "",
                Photo3Type: attachments[2]?.fileType || ""
            };

            sap.ui.core.BusyIndicator.show(0);

            try {
                if (Payload.ID) {
                    await this.ajaxUpdateWithJQuery("HM_Facilities", {
                        data: oData,
                        filters: { ID: Payload.ID }
                    });
                    sap.m.MessageToast.show("Facility updated successfully!");
                } else {
                    await this.ajaxCreateWithJQuery("HM_Facilities", { data: oData });
                    sap.m.MessageToast.show("Facility added successfully!");
                }

                sap.ui.core.BusyIndicator.hide();
                await this.Onsearch();
                this.ARD_Dialog.close();

            } catch (err) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show(err.message || err.responseText || "Error while saving data.");
            }
        },

        _resetFacilityValueStates: function () {
            const oView = this.getView();
            ["FDD_id_RoomType123", "FDD_id_FacilityName", "FDD_id_Description"].forEach(id => {
                const oField = sap.ui.getCore().byId(oView.createId(id));
                if (oField?.setValueState) oField.setValueState("None");
            });
        },

        Onsearch: function () {
            sap.ui.core.BusyIndicator.show(0);
            this.ajaxReadWithJQuery("HM_Facilities", "")
                .then(oData => {
                    const aData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    const oModel = new sap.ui.model.json.JSONModel(aData);
                    this.getView().setModel(oModel, "Facilities");
                    sap.ui.core.BusyIndicator.hide();
                })
                .catch(() => sap.ui.core.BusyIndicator.hide());
        },

        // View images in dialog
        FC_viewroom: function (oEvent) {
            const oData = oEvent.getSource().getBindingContext("Facilities").getObject();
            const aImages = [];

            if (oData.Photo1) aImages.push("data:" + (oData.Photo1Type || "image/jpeg") + ";base64," + oData.Photo1);
            if (oData.Photo2) aImages.push("data:" + (oData.Photo2Type || "image/jpeg") + ";base64," + oData.Photo2);
            if (oData.Photo3) aImages.push("data:" + (oData.Photo3Type || "image/jpeg") + ";base64," + oData.Photo3);

            if (aImages.length === 0) {
                MessageBox.error("No photos available for this facility.");
                return;
            }

            const oVBox = new sap.m.VBox({ alignItems: "Center", justifyContent: "Center" });
            aImages.forEach(src => {
                oVBox.addItem(new sap.m.Image({
                    src,
                    width: "100%",
                    height: "auto",
                    densityAware: false,
                    class: "sapUiMediumMarginBottom"
                }));
            });

            const oDialog = new sap.m.Dialog({
                title: "Facility Images",
                contentWidth: "400px",
                contentHeight: "500px",
                verticalScrolling: true,
                content: [oVBox],
                endButton: new sap.m.Button({
                    text: "Close",
                    press: function () { oDialog.close(); }
                }),
                afterClose: function () { oDialog.destroy(); }
            });

            oDialog.open();
        },

        HM_DeleteDetails: async function() {
            var oTable = this.byId("FD_id_facilityTable");
            var oSelectedItem = oTable.getSelectedItem();

            if (!oSelectedItem) {
                sap.m.MessageToast.show("Please select a record to delete.");
                return;
            }

            var oContext = oSelectedItem.getBindingContext("Facilities");
            var oData = oContext.getObject();
            var that = this;

            sap.m.MessageBox.confirm(
                `Are you sure you want to delete the facility ${oData.FacilityName}?`, {
                    icon: sap.m.MessageBox.Icon.WARNING,
                    title: "Confirm Deletion",
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                    emphasizedAction: sap.m.MessageBox.Action.NO,
                    onClose: async function(sAction) {
                        if (sAction === sap.m.MessageBox.Action.YES) {
                            try {
                               sap.ui.core.BusyIndicator.show(0);
                                await that.ajaxDeleteWithJQuery("HM_Facilities", {
                                    filters: {
                                        ID: oData.ID
                                    }
                                });
                                sap.m.MessageToast.show("Facility deleted successfully!");
                                await that.Onsearch(); // refresh table data
                            } catch (err) {
                                console.error("Delete failed:", err);
                                sap.m.MessageBox.error("Error while deleting Facility. Please try again.");
                            } finally {
                                sap.ui.core.BusyIndicator.hide();
                                oTable.removeSelections(true);
                            }
                        } else if (sAction === sap.m.MessageBox.Action.NO) {
                            oTable.removeSelections(true);
                        }
                    }
                }
            );
        }
    });
});