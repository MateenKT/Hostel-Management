/* MaintainData.controller.js (updated to use sap.ui.layout.form.Form) */
sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "sap/ui/export/Spreadsheet",
    "sap/m/MessageToast",
    "sap/ui/unified/FileUploader",
    "sap/ui/model/json/JSONModel",
    "../utils/validation",
    "sap/ui/layout/form/FormContainer",
    "sap/ui/layout/form/FormElement"
], function (BaseController, MessageBox, Spreadsheet, MessageToast, FileUploader, JSONModel, utils, FormContainer, FormElement) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.MaintainData", {

        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteMaintainData").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function () {
            const omodel = new sap.ui.model.json.JSONModel({
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

            // core models
            this.getView().setModel(new JSONModel([]), "dataModel");
            this.getView().setModel(new JSONModel({}), "MDmodel");

            var aEntities = [
                { Entity: "HM_Branch", DisplayName: "Branch", unikey: "BranchID" },
                { Entity: "HM_HostelFeatures", DisplayName: "Hostel Features", unikey: "ID" }
            ];
            this.getView().setModel(new JSONModel(aEntities), "EntityModel");
            this.getView().setModel(this.getOwnerComponent().getModel("CountryModel"), "CountryModel");
            // Force full update & fix binding truncation
            setTimeout(() => {
                let data = this.getView().getModel("CountryModel").getData() || [];

                const normalized = data.map(item => {
                    return {
                        ...item,    // ⬅ DO THIS FIRST
                        countryName: item.countryName || item.CountryName || item.country || item.Country || "",
                        stdCode: item.stdCode || item.STDCode || item.std || item.ISD || ""
                    };
                }).filter(i => i.countryName);

                normalized.sort((a, b) => a.countryName.localeCompare(b.countryName));

                this.getView().getModel("CountryModel").setData(normalized);

                console.log("Normalized Country count:", normalized.length);
            }, 50);

            this.getView().setModel(this.getOwnerComponent().getModel("StateModel"), "StateModel");
            this.getView().setModel(this.getOwnerComponent().getModel("CityModel"), "CityModel");
            // // load masters (graceful fallback to empty array)
            // try {
            //     let countries = await this.ajaxReadWithJQuery("Country", "");
            //     this.getView().setModel(new JSONModel(countries.data || []), "CountryModel");
            // } catch (e) {
            //     this.getView().setModel(new JSONModel([]), "CountryModel");
            // }
            // try {
            //     let states = await this.ajaxReadWithJQuery("StateMaster", "");
            //     this.getView().setModel(new JSONModel(states.data || []), "StateModel");
            // } catch (e) {
            //     this.getView().setModel(new JSONModel([]), "StateModel");
            // }
            // try {
            //     let cities = await this.ajaxReadWithJQuery("CityMaster", "");
            //     this.getView().setModel(new JSONModel(cities.data || []), "CityModel");
            // } catch (e) {
            //     this.getView().setModel(new JSONModel([]), "CityModel");
            // }

            // filtered models
            this.getView().setModel(new JSONModel([]), "FilteredStateModel");
            this.getView().setModel(new JSONModel([]), "FilteredCityModel");

            // start on Branch view
            this.onEntitySelect(null, "Branch");
        },

        // ─────────────────────────────────────────────────────────
        // Build dynamic table for selected entity
        // ─────────────────────────────────────────────────────────
        onEntitySelect: async function (oEvent, entity) {
            var that = this;
            var name;
            if (oEvent && oEvent.getParameter && oEvent.getParameter("listItem")) {
                name = oEvent.getParameter("listItem").getTitle();
            } else {
                name = entity;
            }

            this.sTitle = this.getView().getModel("EntityModel").getData().filter(e => e.DisplayName === name)[0].Entity;

            var oDetailContainer = this.byId("detailContainer");
            if (oDetailContainer && oDetailContainer.removeAllItems) {
                oDetailContainer.removeAllItems();
            } else {
                // safe fallback
                while (oDetailContainer.getItems && oDetailContainer.getItems().length) {
                    oDetailContainer.removeItem(oDetailContainer.getItems()[0]);
                }
            }

            this.getBusyDialog();
            let data = await this.ajaxReadWithJQuery(this.sTitle, "");
            let BmodelData = (data && data.data) ? data.data : [];
            this.closeBusyDialog();

            this.getView().setModel(new JSONModel(BmodelData), "dataModel");

            // fallback for hostel features if no rows
            var sampleRow = BmodelData[0];
            if (!sampleRow && this.sTitle === "HM_HostelFeatures") {
                sampleRow = {
                    FacilityName: "",
                    Description: "",
                    Photo1: "",
                    Photo1Name: "",
                    Photo1Type: "",
                    Photo2: "",
                    Photo2Name: "",
                    Photo2Type: ""
                };
            }

            this.oTable = new sap.m.Table({
                inset: false,
                growing: true,
                growingScrollToLoad: true,
                mode: sap.m.ListMode.SingleSelectLeft,
                sticky: ["ColumnHeaders"],
                autoPopinMode: true,
                demandPopin: true,
                fitContainer: true,
                width: "100%",
            });

            let aFields = sampleRow ? Object.keys(sampleRow) : [];
            // remove internal photo meta columns from table display if desired
            if (this.sTitle === "HM_HostelFeatures") {
                aFields = aFields.filter(f => {
                    const L = f.toLowerCase();
                    return !(L.includes("hoto1name") || L.includes("photo1type") || L.includes("photo2name") || L.includes("photo2type"));
                });
            }

            aFields.forEach(function (sField) {
                that.oTable.addColumn(new sap.m.Column({
                    header: new sap.m.Label({ text: sField.toUpperCase() })
                }));
            });

            var aCells = [];
            aFields.forEach(function (sField) {
                // show 'View' link for Photo1/Photo2 (exact column names Photo1 / Photo2)
                if (sField === "Photo1" || sField === "Photo2") {
                    aCells.push(new sap.m.Link({
                        text: "View",
                        visible: "{= ${dataModel>" + sField + "} ? true : false }",
                        press: function () {
                            let imgBase64 = this.getBindingContext("dataModel").getProperty(sField);
                            that._openImagePopup(imgBase64);
                        }
                    }));
                } else {
                    aCells.push(new sap.m.Text({ text: "{dataModel>" + sField + "}" }));
                }
            });

            var oTemplate = new sap.m.ColumnListItem({ cells: aCells });
            this.oTable.bindItems({ path: "dataModel>/", template: oTemplate });
            oDetailContainer.addItem(this.oTable);
        },

        MD_onAddButtonPress: function (oData, flag) {
            let oView = this.getView();
            let isEdit = !!flag;

            // Always clear payload in ADD mode
            this.oPayload = isEdit ? oData : null;

            // Always reset temp image store
            this._imageData = {
                img1: null, img1name: null, img1type: null,
                img2: null, img2name: null, img2type: null
            };

            // Load fragment once
            if (!this.oUpdatePass) {
                sap.ui.core.Fragment.load({
                    name: "sap.ui.com.project1.fragment.MaintainData",
                    controller: this,
                }).then(function (oFrag) {
                    this.oUpdatePass = oFrag;
                    oView.addDependent(this.oUpdatePass);

                    this._openAddOrEdit(flag);
                }.bind(this));
            } else {
                this._openAddOrEdit(flag);
            }
        },

        _openAddOrEdit: function (isEdit) {
            if (!isEdit) {
                // ADD MODE → always fresh model
                this.oUpdatePass.setModel(new JSONModel({
                    FacilityName: "",
                    Description: "",
                    Photo1: null,
                    Photo1Name: null,
                    Photo1Type: null,
                    Photo2: null,
                    Photo2Name: null,
                    Photo2Type: null
                }), "formModel");
            } else {
                // EDIT MODE → load existing row
                this.oUpdatePass.setModel(new JSONModel(this.oPayload), "formModel");
            }

            // Reset upload controls (clear values)
            let u1 = sap.ui.getCore().byId("imageUpload1");
            let u2 = sap.ui.getCore().byId("imageUpload2");
            if (u1) try { u1.setValue(""); } catch (e) { }
            if (u2) try { u2.setValue(""); } catch (e) { }

            // open dialog
            this.oUpdatePass.open();

            this.commonFragmentButtonsHandle(isEdit);
            this.commonFiledInput();
        },

        MD_onSubmitButtonPress: function () {
            var that = this;
            let formData = this.oUpdatePass.getModel("formModel");
            let myfragmentData = formData.getData();
            let cleanedData = this.normalizeData(myfragmentData);

            if (!cleanedData || Object.keys(cleanedData).length === 0) {
                sap.m.MessageToast.show("Please fill the details");
                return;
            }

            let entityMeta = this.getView().getModel("EntityModel").getData().find(e => e.Entity === this.sTitle);
            let keys = (entityMeta && entityMeta.unikey) ? entityMeta.unikey.split(",") : [];
            // Do NOT validate ID for HostelFeatures (auto-generated)
            if (this.sTitle === "HM_HostelFeatures") {
                keys = keys.filter(k => k !== "ID");
            }

            let missingFields = keys.filter(k => !cleanedData[k] || cleanedData[k].toString().trim() === "");

            if (missingFields.length > 0) {
                sap.m.MessageToast.show("Please fill mandatory Field - " + missingFields.join(", "));
                return;
            }

            // HOSTEL FEATURES: handle images and DO NOT send ID on create
            if (this.sTitle === "HM_HostelFeatures") {
                cleanedData.Photo1 = this._imageData?.img1 || cleanedData.Photo1 || null;
                cleanedData.Photo1Name = this._imageData?.img1name || cleanedData.Photo1Name || null;
                cleanedData.Photo1Type = this._imageData?.img1type || cleanedData.Photo1Type || null;

                cleanedData.Photo2 = this._imageData?.img2 || cleanedData.Photo2 || null;
                cleanedData.Photo2Name = this._imageData?.img2name || cleanedData.Photo2Name || null;
                cleanedData.Photo2Type = this._imageData?.img2type || cleanedData.Photo2Type || null;

                if (cleanedData.ID) {
                    delete cleanedData.ID;
                }
            }

            let oPayload = { data: cleanedData };
            this.getBusyDialog();
            that.ajaxCreateWithJQuery(this.sTitle, oPayload).then(async (res) => {
                that.MD_onCancelButtonPress();
                let oModel = that.getView().getModel("dataModel");
                const tableUpdateData = await that.ajaxReadWithJQuery(that.sTitle, "");
                oModel.setData(tableUpdateData.data);
                that.closeBusyDialog();
                sap.m.MessageToast.show("Data saved successfully");
            })
                .catch((err) => {
                    that.closeBusyDialog();
                    if (err && err.responseText) {
                        sap.m.MessageToast.show("Create failed: " + err.responseText);
                    } else {
                        sap.m.MessageToast.show("Data already exist");
                    }
                    that.MD_onCancelButtonPress();
                });

            this.oTable.removeSelections();
        },

        normalizeData: function (obj) {
            let result = {};
            for (let key in obj) {
                if (Object.hasOwn(obj, key)) {
                    let val = obj[key];
                    if (typeof val === "string" && val.trim() === "") {
                        result[key] = null;
                    } else {
                        result[key] = val;
                    }
                }
            }
            return result;
        },

        commonFragmentButtonsHandle: function (flag) {
            if (flag) {
                sap.ui.getCore().byId("MD_id_saveButoon").setVisible(true);
                sap.ui.getCore().byId("MD_id_submitButoon").setVisible(false);
                this.oUpdatePass.setTitle("Update Record");
            } else {
                sap.ui.getCore().byId("MD_id_saveButoon").setVisible(false);
                sap.ui.getCore().byId("MD_id_submitButoon").setVisible(true);
                this.oUpdatePass.setTitle("Add New Record");
            }
        },

        MD_onCancelButtonPress: function () {
            if (this.oUpdatePass) { this.oUpdatePass.close(); }

            // destroy form containers/elements to avoid stale controls on reopen
            var oForm = sap.ui.getCore().byId("dynamicForm");
            if (oForm && oForm.removeAllFormContainers) {
                var aRemoved = oForm.removeAllFormContainers(); // returns array of removed containers
                if (Array.isArray(aRemoved) && aRemoved.length) {
                    aRemoved.forEach(function (oContainer) {
                        try {
                            // destroy nested elements/controls
                            oContainer.destroy();
                        } catch (e) { /* ignore */ }
                    });
                }
            }

            this.oTable && this.oTable.removeSelections();
            // clear temp images & uploader values
            this._imageData = { img1: null, img2: null, img1name: null, img2name: null, img1type: null, img2type: null };

            // Also try to clear uploader controls if they exist (harmless if not)
            var u1 = sap.ui.getCore().byId("imageUpload1");
            var u2 = sap.ui.getCore().byId("imageUpload2");
            if (u1 && u1.setValue) { try { u1.setValue(""); u1.destroy(); } catch (e) { } }
            if (u2 && u2.setValue) { try { u2.setValue(""); u2.destroy(); } catch (e) { } }
        },

        commonFiledInput: function () {
            let getModel = this.getView().getModel("dataModel");
            let aData = getModel && getModel.getData ? getModel.getData() : [];
            let entity = this.sTitle;

            var oForm = sap.ui.getCore().byId("dynamicForm");
            if (!oForm) { console.error("dynamicForm not found"); return; }

            // ───────────────────────────────────────────────
            // HOSTEL FEATURES
            // ───────────────────────────────────────────────
            if (entity === "HM_HostelFeatures") {
                let isEdit = !!this.oPayload;

                var fixedModel = new JSONModel({
                    FacilityName: isEdit ? this.oPayload.FacilityName : "",
                    Description: isEdit ? this.oPayload.Description : "",
                    Photo1: isEdit ? this.oPayload.Photo1 : null,
                    Photo1Name: isEdit ? this.oPayload.Photo1Name : null,
                    Photo1Type: isEdit ? this.oPayload.Photo1Type : null,
                    Photo2: isEdit ? this.oPayload.Photo2 : null,
                    Photo2Name: isEdit ? this.oPayload.Photo2Name : null,
                    Photo2Type: isEdit ? this.oPayload.Photo2Type : null
                });

                this.getView().setModel(fixedModel, "formModel");

                this._imageData = { img1: null, img1name: null, img1type: null, img2: null, img2name: null, img2type: null };

                oForm.removeAllFormContainers();
                var oContainer = new FormContainer({ title: "" });

                oContainer.addFormElement(new FormElement({
                    label: new sap.m.Label({ text: "FacilityName" }),
                    fields: [new sap.m.Input({ value: "{formModel>/FacilityName}" })]
                }));

                oContainer.addFormElement(new FormElement({
                    label: new sap.m.Label({ text: "Description" }),
                    fields: [new sap.m.Input({ value: "{formModel>/Description}" })]
                }));

                // Image 1
                oContainer.addFormElement(new FormElement({
                    label: new sap.m.Label({ text: "Add Image 1 *" }),
                    fields: [
                        new sap.m.Image({
                            src: "{= ${formModel>/Photo1} ? 'data:' + (${formModel>/Photo1Type} || 'image/*') + ';base64,' + ${formModel>/Photo1} : '' }",
                            width: "10rem",
                            visible: "{= ${formModel>/Photo1} ? true : false }"
                        }),
                        new sap.ui.unified.FileUploader({
                            id: "imageUpload1",
                            change: this._onImageSelect.bind(this, 1)
                        })
                    ]
                }));

                // Image 2
                oContainer.addFormElement(new FormElement({
                    label: new sap.m.Label({ text: "Add Image 2 *" }),
                    fields: [
                        new sap.m.Image({
                            src: "{= ${formModel>/Photo2} ? 'data:' + (${formModel>/Photo2Type} || 'image/*') + ';base64,' + ${formModel>/Photo2} : '' }",
                            width: "10rem",
                            visible: "{= ${formModel>/Photo2} ? true : false }"
                        }),
                        new sap.ui.unified.FileUploader({
                            id: "imageUpload2",
                            change: this._onImageSelect.bind(this, 2)
                        })
                    ]
                }));

                oForm.addFormContainer(oContainer);
                return;
            }

            // ───────────────────────────────────────────────
            // GENERIC DYNAMIC FORM (HM_Branch)
            // ───────────────────────────────────────────────
            let oFields = [];
            if (aData && aData.length > 0) {
                oFields = Object.keys(aData[0]);
                this._lastFields = oFields;
            } else if (this._lastFields) {
                oFields = this._lastFields;
            } else {
                sap.m.MessageToast.show("No fields available");
                return;
            }

            oForm.removeAllFormContainers();

            var oDynamicData = {};
            oFields.forEach(sField => {
                let v = "";
                if (this.oUpdatePass?.getModel("formModel")?.getProperty("/" + sField)) {
                    v = this.oUpdatePass.getModel("formModel").getProperty("/" + sField);
                } else if (this.oPayload && this.oPayload[sField] != null) {
                    v = this.oPayload[sField];
                } else {
                    v = "";
                }
                oDynamicData[sField] = v;
            });

            var oDynamicModel = new JSONModel(oDynamicData);

            // Prefer to attach the formModel to the fragment/dialog so controls inside it resolve the same named model.
            // Fall back to view model only if fragment/dialog not available.
            if (this.oUpdatePass && this.oUpdatePass.setModel) {
                this.oUpdatePass.setModel(oDynamicModel, "formModel");
            } else {
                this.getView().setModel(oDynamicModel, "formModel");
            }

            this._imageData = { img1: null, img2: null };

            var oContainerDyn = new FormContainer({ title: "" });
            let that = this;

            oFields.forEach(function (sField) {

                let oInputControl;

                // ───────── HM_Branch special fields ─────────
                if (that.sTitle === "HM_Branch") {

                    // COUNTRY → ComboBox
                    if (sField === "Country") {
                        oInputControl = new sap.m.ComboBox({
                            id: "id_Country",
                            selectedKey: "{formModel>/Country}",
                            width: "100%",
                            showSecondaryValues: true,
                            items: {
                                path: "CountryModel>/",
                                templateShareable: false,
                                template: new sap.ui.core.ListItem({
                                    key: "{CountryModel>countryName}",
                                    text: "{CountryModel>countryName}"
                                })
                            },
                            selectionChange: function (oEvent) {
                                const selectedCountry = oEvent.getSource().getSelectedKey();

                                const all = that.getView().getModel("CountryModel").getData() || [];

                                // ALWAYS match correctly (case trimmed)
                                const obj = all.find(c =>
                                    String(c.countryName).trim() === String(selectedCountry).trim()
                                );

                                const std =
                                    (obj && (obj.stdCode || obj.STDCode || obj.std || obj.ISD || obj.code)) || "";

                                // choose model owner: fragment (if open) otherwise view
                                const targetModel = (that.oUpdatePass && that.oUpdatePass.getModel("formModel"))
                                    ? that.oUpdatePass.getModel("formModel")
                                    : that.getView().getModel("formModel");

                                if (targetModel) {
                                    targetModel.setProperty("/STD", std);
                                } else {
                                    console.warn("formModel not found to set STD");
                                }

                                // Reset state + city always on the same model
                                if (targetModel) {
                                    targetModel.setProperty("/State", "");
                                    targetModel.setProperty("/City", "");
                                }

                                that._filterStatesByCountry(selectedCountry);
                                // keep filtered city cleared on view-level model (we set new empty model)
                                that.getView().setModel(new JSONModel([]), "FilteredCityModel");
                            }

                        });

                        // STATE → ComboBox
                    } else if (sField === "State") {
                        oInputControl = new sap.m.ComboBox({
                            selectedKey: "{formModel>/State}",
                            width: "100%",
                            items: {
                                path: "FilteredStateModel>/",
                                template: new sap.ui.core.ListItem({
                                    key: "{FilteredStateModel>stateName}",
                                    text: "{FilteredStateModel>stateName}"
                                })
                            },
                            selectionChange: function (oEvent) {
                                let sel = oEvent.getSource().getSelectedKey();
                                that.getView().getModel("formModel").setProperty("/City", "");
                                that._filterCitiesByState(sel);
                            }
                        });

                        // CITY → ComboBox
                    } else if (sField === "City") {
                        oInputControl = new sap.m.ComboBox({
                            selectedKey: "{formModel>/City}",
                            width: "100%",
                            items: {
                                path: "FilteredCityModel>/",
                                template: new sap.ui.core.ListItem({
                                    key: "{FilteredCityModel>cityName}",
                                    text: "{FilteredCityModel>cityName}"
                                })
                            }
                        });

                        // STD → read only
                    } else if (sField === "STD") {
                        oInputControl = new sap.m.Input({
                            value: "{formModel>/STD}",
                            editable: false
                        });

                        // OTHERS
                    } else {
                        oInputControl = new sap.m.Input({ value: "{formModel>/" + sField + "}" });
                    }

                } else {
                    oInputControl = new sap.m.Input({ value: "{formModel>/" + sField + "}" });
                }

                oContainerDyn.addFormElement(new FormElement({
                    label: new sap.m.Label({ text: sField.toUpperCase() }),
                    fields: [oInputControl]
                }));
            });

            oForm.addFormContainer(oContainerDyn);

            // Pre-filter for EDIT
            try {
                let selCountry = this.getView().getModel("formModel").getProperty("/Country") || "";
                if (selCountry) {
                    this._filterStatesByCountry(selCountry);
                    let selState = this.getView().getModel("formModel").getProperty("/State");
                    if (selState) this._filterCitiesByState(selState);
                }
            } catch (e) { }
        },

        _filterStatesByCountry: function (countryName) {
            let allStates = this.getView().getModel("StateModel").getData() || [];
            let filtered = [];
            if (countryName) {
                filtered = allStates.filter(s => s.countryName === countryName || s.country === countryName);
            }
            this.getView().setModel(new JSONModel(filtered), "FilteredStateModel");
        },

        _filterCitiesByState: function (stateName) {
            let allCities = this.getView().getModel("CityModel").getData() || [];
            let filtered = [];
            if (stateName) {
                filtered = allCities.filter(c => c.stateName === stateName || c.state === stateName);
            }
            this.getView().setModel(new JSONModel(filtered), "FilteredCityModel");
        },

        MD_onDownloadButtonPress: function () {
            var aData = this.getView().getModel("dataModel").getData();
            if (!aData.length) return MessageToast.show("No data to download");

            var sCSV = Object.keys(aData[0]).join(",") + "\n";
            aData.forEach(function (obj) {
                sCSV += Object.values(obj).join(",") + "\n";
            });
            var blob = new Blob([sCSV], { type: "text/csv;charset=utf-8;" });
            var link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = this.sTitle + ".csv";
            link.click();
        },

        _onImageSelect: function (index, oEvent) {
            let file = oEvent.getParameter("files")[0];
            if (!file) return;
            let reader = new FileReader();

            reader.onload = (e) => {
                let base64 = e.target.result.split(",")[1];

                // store in temp holder to use on submit
                if (index === 1) {
                    this._imageData.img1 = base64;
                    this._imageData.img1name = file.name;
                    this._imageData.img1type = file.type;

                    // update formModel (so preview binding shows new image)
                    if (this.oUpdatePass && this.oUpdatePass.getModel("formModel")) {
                        this.oUpdatePass.getModel("formModel").setProperty("/Photo1", base64);
                        this.oUpdatePass.getModel("formModel").setProperty("/Photo1Name", file.name);
                        this.oUpdatePass.getModel("formModel").setProperty("/Photo1Type", file.type);
                    }
                }

                if (index === 2) {
                    this._imageData.img2 = base64;
                    this._imageData.img2name = file.name;
                    this._imageData.img2type = file.type;

                    if (this.oUpdatePass && this.oUpdatePass.getModel("formModel")) {
                        this.oUpdatePass.getModel("formModel").setProperty("/Photo2", base64);
                        this.oUpdatePass.getModel("formModel").setProperty("/Photo2Name", file.name);
                        this.oUpdatePass.getModel("formModel").setProperty("/Photo2Type", file.type);
                    }
                }
            };

            reader.readAsDataURL(file);
        },

        _openImagePopup: function (base64) {
            if (!base64) {
                sap.m.MessageToast.show("Image not available");
                return;
            }
            let dialog = new sap.m.Dialog({
                title: "Image Preview",
                contentWidth: "40rem",
                content: [
                    new sap.m.Image({
                        src: "data:image/*;base64," + base64,
                        width: "100%"
                    })
                ],
                endButton: new sap.m.Button({
                    text: "Close",
                    press: function () { dialog.close(); }
                })
            });
            dialog.open();
        },

        // ─────────────────────────────────────────────────────────
        // EDIT -> open with existing payload (keeps images if not changed)
        // ─────────────────────────────────────────────────────────
        MD_onEditButtonPress: function () {
            var that = this;
            var aSelectedItem = this.oTable.getSelectedItem();

            if (!aSelectedItem) {
                sap.m.MessageToast.show(that.i18nModel.getText("selectRowUpdate"));
                return;
            }
            let oData = aSelectedItem.getBindingContext("dataModel").getObject();
            let flag = true;
            this.MD_onAddButtonPress(oData, flag);
            this.oTable.removeSelections();
        },

        MD_onUpdateButtonPress: async function () {
            sap.ui.getCore().byId("MD_id_submitButoon").setVisible(false);
            var that = this;
            let datafromlocalEntity = that.getView().getModel("EntityModel").getData();
            let formData = this.oUpdatePass.getModel("formModel");
            let myfragmentData = formData.getData();
            let entityMeta = this.getView().getModel("EntityModel").getData().find(e => e.Entity === this.sTitle);

            let keys = (entityMeta && entityMeta.unikey) ? entityMeta.unikey.split(",") : [];
            let missingFields = keys.filter(k => !myfragmentData[k] || myfragmentData[k].toString().trim() === "");

            if (missingFields.length > 0) {
                sap.m.MessageToast.show("Please fill mandatory details");
                return;
            }

            for (let i = 0; i < datafromlocalEntity.length; i++) {
                if (datafromlocalEntity[i].Entity === that.sTitle) {
                    let keys = datafromlocalEntity[i].unikey.split(",");
                    let filters = {};
                    keys.forEach((k) => {
                        // use oPayload (original row keys) to build filter for update
                        filters[k] = this.oPayload ? this.oPayload[k] : myfragmentData[k];
                    });
                    let resultfinak = {
                        data: { ...myfragmentData },
                        filters: filters,
                    };

                    // HOSTELFEATURES: ensure images preserved if not replaced
                    if (this.sTitle === "HM_HostelFeatures") {
                        resultfinak.data.Photo1 = this._imageData.img1 || resultfinak.data.Photo1 || null;
                        resultfinak.data.Photo1Name = this._imageData.img1name || resultfinak.data.Photo1Name || null;
                        resultfinak.data.Photo1Type = this._imageData.img1type || resultfinak.data.Photo1Type || null;

                        resultfinak.data.Photo2 = this._imageData.img2 || resultfinak.data.Photo2 || null;
                        resultfinak.data.Photo2Name = this._imageData.img2name || resultfinak.data.Photo2Name || null;
                        resultfinak.data.Photo2Type = this._imageData.img2type || resultfinak.data.Photo2Type || null;
                    }

                    this.getBusyDialog();
                    that.ajaxUpdateWithJQuery(this.sTitle, resultfinak).then(async (res) => {
                        let oModel = that.getView().getModel("dataModel");
                        that.MD_onCancelButtonPress();
                        const tableUpdateData = await that.ajaxReadWithJQuery(that.sTitle, "");
                        oModel.setData(tableUpdateData.data);
                        that.closeBusyDialog();
                        sap.m.MessageToast.show("Data updated successfully");
                    })
                        .catch((error) => {
                            that.closeBusyDialog();
                            sap.m.MessageToast.show("Update failed");
                            that.MD_onCancelButtonPress();
                        });
                    this.oTable.removeSelections();
                }
            }
        },

        MD_onDeleteButtonPress: async function () {
            var that = this;
            var aSelectedItems = this.oTable.getSelectedItems();

            if (aSelectedItems.length === 0) {
                sap.m.MessageToast.show(that.i18nModel.getText("selctRowtoDelete"));
                return;
            }
            sap.m.MessageBox.confirm("Are you sure you want to delete the selected record?", {
                title: "Confirm Deletion",
                onClose: function (oAction) {
                    if (oAction === sap.m.MessageBox.Action.OK) {
                        that.getBusyDialog();
                        aSelectedItems.forEach(function (oItem) {
                            var oContext = oItem.getBindingContext("dataModel");
                            var oRowData = oContext.getObject();
                            let datafromlocalEntity = that.getView().getModel("EntityModel").getData();
                            for (let i = 0; i < datafromlocalEntity.length; i++) {
                                if (datafromlocalEntity[i].Entity === that.sTitle) {
                                    let keys = datafromlocalEntity[i].unikey.split(",");
                                    let filters = {};
                                    keys.forEach((k) => {
                                        if (!filters[k]) {
                                            filters[k] = [];
                                        }
                                        filters[k].push(oRowData[k]);
                                    });

                                    let resultfinak = { filters: filters };
                                    that.ajaxDeleteWithJQuery(that.sTitle, resultfinak).then(async (res) => {
                                        let oModel = that.getView().getModel("dataModel");
                                        const tableUpdateData = await that.ajaxReadWithJQuery(that.sTitle, "");
                                        oModel.setData(tableUpdateData.data);
                                        that.closeBusyDialog();
                                        sap.m.MessageToast.show(that.i18nModel.getText("dataDelteSucces"));
                                    });
                                }
                            }
                        });
                        that.oTable.removeSelections();
                    } else {
                        that.oTable.removeSelections();
                    }
                }
            });
        },

        // _normalizeCountryModel: function () {
        //     let model = this.getView().getModel("CountryModel");
        //     if (!model) return;

        //     let data = model.getData() || [];

        //     const normalized = data.map(item => {
        //         const countryName = item.countryName || item.CountryName || item.country ||
        //             item.Country || item.name || item.Name ||
        //             item.country_name || item.countryname || "";

        //         const stdCode = item.stdCode || item.STDCode || item.std ||
        //             item.std_code || item.ISD || "";

        //         return Object.assign({}, item, {
        //             countryName: String(countryName).trim(),
        //             stdCode: stdCode
        //         });
        //     }).filter(it => it.countryName);

        //     normalized.sort((a, b) => a.countryName.localeCompare(b.countryName));

        //     model.setData(normalized);

        //     console.info("CountryModel normalized:", normalized.length, "items");
        // },

        // _normalizeStateModel: function () {
        //     let model = this.getView().getModel("StateModel");
        //     if (!model) return;

        //     let data = model.getData() || [];

        //     const normalized = data.map(item => {
        //         const stateName = item.stateName || item.StateName || item.state || item.State || "";
        //         const countryName = item.countryName || item.Country || item.country || "";

        //         return Object.assign({}, item, {
        //             stateName: stateName,
        //             countryName: countryName
        //         });
        //     });

        //     normalized.sort((a, b) => a.stateName.localeCompare(b.stateName));

        //     model.setData(normalized);
        // },

        // _normalizeCityModel: function () {
        //     let model = this.getView().getModel("CityModel");
        //     if (!model) return;

        //     let data = model.getData() || [];

        //     const normalized = data.map(item => {
        //         const cityName = item.cityName || item.CityName || item.city || item.City || "";
        //         const stateName = item.stateName || item.State || item.state || "";

        //         return Object.assign({}, item, {
        //             cityName: cityName,
        //             stateName: stateName
        //         });
        //     });

        //     normalized.sort((a, b) => a.cityName.localeCompare(b.cityName));

        //     model.setData(normalized);
        // },

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