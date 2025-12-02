sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "sap/ui/core/BusyIndicator",
    "sap/ui/unified/CalendarLegend",
    "sap/ui/unified/CalendarLegendItem",
    "sap/ui/unified/DateTypeRange"
], function(Controller, JSONModel, jsPDF, Formatter, BusyIndicator, CalendarLegend, CalendarLegendItem, DateTypeRange) {
    "use strict";

    return Controller.extend("sap.ui.com.project1.controller.BaseController", {
        Formatter: Formatter,
        // Router Code 

        //Common read call for all the app
        async ajaxReadWithJQuery(sUrl, filter) {
            const queryString = new URLSearchParams(filter).toString();
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: this.getOwnerComponent().getModel("LoginModel").getData().url + sUrl + "?" + queryString,
                    method: "GET",
                    headers: this.getOwnerComponent().getModel("LoginModel").getData().headers,
                    success: (data) => {
                        resolve(data);
                    },
                    error: (error) => {
                        reject(error);
                    }
                });
            });
        },

        //Common create call for all the app
        async ajaxCreateWithJQuery(sUrl, oPayLoad) {
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: this.getView().getModel("LoginModel").getData().url + sUrl,
                    method: "POST",
                    data: JSON.stringify(oPayLoad),
                    headers: this.getView().getModel("LoginModel").getData().headers,
                    success: function(data) {
                        resolve(data);
                    },
                    error: function(error) {
                        reject(error);
                    }
                });
            });
        },

        //Common update call for all the app
        async ajaxUpdateWithJQuery(sUrl, oPayLoad) {
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: this.getView().getModel("LoginModel").getData().url + sUrl,
                    method: "PUT",
                    data: JSON.stringify(oPayLoad),
                    headers: this.getView().getModel("LoginModel").getData().headers,
                    success: function(data) {
                        resolve(data);
                    },
                    error: function(error) {
                        reject(error);
                    }
                });
            });
        },

        //Common delete call for all the app
        async ajaxDeleteWithJQuery(sUrl, oPayLoad) {
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: this.getView().getModel("LoginModel").getData().url + sUrl,
                    method: "DELETE",
                    contentType: "application/json",
                    dataType: "json",
                    data: JSON.stringify(oPayLoad),
                    headers: this.getView().getModel("LoginModel").getData().headers,
                    success: function(data) {
                        resolve(data);
                    },
                    error: function(error) {
                        reject(error);
                    }
                });
            });
        },

        //fragment date picker function
        _FragmentDatePickersReadOnly: function(aIds) {
            aIds.forEach(function(sId) {
                var oDatePicker = sap.ui.getCore().byId(sId);
                if (oDatePicker) {
                    oDatePicker.addEventDelegate({
                        onAfterRendering: function() {
                            var oInputDom = oDatePicker.getDomRef("inner");
                            if (oInputDom) {
                                oInputDom.setAttribute("readonly", true); // Prevent typing
                                oInputDom.style.cursor = "pointer";
                            }
                        }
                    }, oDatePicker);
                    // Open calendar on click
                    oDatePicker.attachBrowserEvent("click", function() {
                        var oIconDomRef = oDatePicker.getDomRef("icon");
                        if (oIconDomRef) {
                            oIconDomRef.click(); // simulate icon click to open calendar
                        }
                    });
                }
            });
        },

        _ViewDatePickersReadOnly: function(aIds, oView) {
            aIds.forEach(function(sId) {
                var oDatePicker = oView.byId(sId);
                if (oDatePicker) {
                    oDatePicker.addEventDelegate({
                        onAfterRendering: function() {
                            var oInputDom = oDatePicker.getDomRef("inner");
                            if (oInputDom) {
                                oInputDom.setAttribute("readonly", true); // Prevent typing
                                oInputDom.style.cursor = "pointer";
                            }
                        }
                    }, oDatePicker);
                    // Open calendar on click
                    oDatePicker.attachBrowserEvent("click", function() {
                        var oIconDomRef = oDatePicker.getDomRef("icon");
                        if (oIconDomRef) {
                            oIconDomRef.click(); // simulate icon click to open calendar
                        }
                    });
                }
            });
        },

        getBusyDialog: function() {
            if (!this._pBusyDialog) {
                this._pBusyDialog = sap.ui.core.Fragment.load({
                    name: "sap.kt.com.minihrsolution.fragment.BusyIndicator",
                    controller: this
                }).then(function(oBusyDialog) {
                    this.getView().addDependent(oBusyDialog);
                    return oBusyDialog;
                }.bind(this));
            }

            this._pBusyDialog.then(function(oBusyDialog) {
                this.oBusyDialog = oBusyDialog;
                this.oBusyDialog.open();

            }.bind(this));
        },

        closeBusyDialog: function() {
            if (this.oBusyDialog) {
                this.oBusyDialog.close();
            }
        },

        _fetchCommonData: async function(entityName, modelName, filter = "") {
            if (modelName.split(" ")[1] === "TraineeFlag") {
                var flag = modelName.split(" ")[1]
                modelName = modelName.split(" ")[0];
            }
            if (!this.getOwnerComponent().getModel("LoginModel")) {
                BusyIndicator.hide();
                return;
            }
            let url = this.getOwnerComponent().getModel("LoginModel").getData().url + entityName;
            try {
                await new Promise((resolve, reject) => {
                    $.ajax({
                        url: url,
                        method: "GET",
                        headers: this.getOwnerComponent().getModel("LoginModel").getData().headers,
                        data: filter,
                        success: function(data) {
                            if (data) {
                                var oModel = new JSONModel(data.data);
                                this.getOwnerComponent().setModel(oModel, modelName);
                            }
                            resolve(data);
                            if (flag === "TraineeFlag") {
                                this.closeBusyDialog();
                            }
                        }.bind(this),
                        error: function(err) {
                            reject(err);
                        }
                    });
                });

            } catch (error) {
                sap.m.MessageToast.show(error.responseJSON?.message || "Technical error, please contact the administrator");
            }
        },

        onClearAndSearch: function(sFilterBarId) {
            var oFilterBar = this.byId(sFilterBarId);
            if (oFilterBar) {
                oFilterBar.clear(); // Clear all filters in the FilterBar
            }
        },
       
        _carouselTimers: new Map(),

        /* Start auto-slide + interaction handling */
        _startAllCarouselsAutoSlide: function(iDelay = 3000) {
            try {
                const oView = this.getView();
                if (!oView) return;

                const aCarousels = oView.findAggregatedObjects(true, c => c?.isA("sap.m.Carousel"));

                aCarousels.forEach(carousel => {
                    if (!carousel || carousel.bIsDestroyed) return;

                    const pages = carousel.getPages();
                    if (!pages || pages.length <= 1) return;

                    /* Stop any old timers for this carousel */
                    this._clearCarouselTimer(carousel.getId());

                    /* Safe current index */
                    let index = carousel.indexOfPage(carousel.getActivePage());

                    /* Start interval autoplay */
                    const autoTimer = setInterval(() => {
                        if (carousel.bIsDestroyed) return;
                        index = (index + 1) % pages.length;
                        carousel.setActivePage(pages[index]);
                    }, iDelay);

                    this._carouselTimers.set(carousel.getId(), autoTimer);

                    /* ------------ USER INTERACTION LOGIC ------------- */

                    /* Pause immediately when user touches/clicks */
                    const fnPause = () => {
                        this._pauseCarouselAutoSlide(carousel);
                        carousel._userTouched = true;
                    };

                    carousel.attachBrowserEvent("touchstart", fnPause);
                    carousel.attachBrowserEvent("mousedown", fnPause);

                    /* If the user swipes to the next image → resume after delay */
                    if (carousel.onAfterSwipe) {
                        const origSwipeFn = carousel.onAfterSwipe.bind(carousel);

                        carousel.onAfterSwipe = (e) => {
                            origSwipeFn?.(e);
                            clearTimeout(carousel._resumeTimer);

                            carousel._resumeTimer = setTimeout(() => {
                                this._resumeCarouselAutoSlide(carousel, iDelay);
                            }, 2000); // resume 2 sec after swipe
                        };
                    }

                    /* If user just taps without swiping → resume later */
                    const fnEnd = () => {
                        clearTimeout(carousel._resumeTimer);
                        carousel._resumeTimer = setTimeout(() => {
                            this._resumeCarouselAutoSlide(carousel, iDelay);
                        }, 3000); // resume after 3 sec idle
                    };

                    carousel.attachBrowserEvent("touchend", fnEnd);
                    carousel.attachBrowserEvent("mouseup", fnEnd);

                    /* ------------ END INTERACTION LOGIC ------------- */
                });

            } catch (err) {
                console.error("Auto Slide Error:", err);
            }
        },

        /* Stop autoplay for one carousel */
        _pauseCarouselAutoSlide: function(carousel) {
            const id = carousel.getId();
            if (this._carouselTimers.has(id)) {
                clearInterval(this._carouselTimers.get(id));
                this._carouselTimers.delete(id);
            }
        },

        /* Resume autoplay safely */
        _resumeCarouselAutoSlide: function(carousel, iDelay = 3000) {
            if (!carousel || carousel.bIsDestroyed) return;

            const pages = carousel.getPages();
            if (!pages || pages.length <= 1) return;

            let index = carousel.indexOfPage(carousel.getActivePage());

            const interval = setInterval(() => {
                if (carousel.bIsDestroyed) return;
                index = (index + 1) % pages.length;
                carousel.setActivePage(pages[index]);
            }, iDelay);

            this._carouselTimers.set(carousel.getId(), interval);
        },

        /* Kill all autoplay timers */
        _clearCarouselTimer: function(id) {
            if (this._carouselTimers.has(id)) {
                clearInterval(this._carouselTimers.get(id));
                this._carouselTimers.delete(id);
            }
        },

        _clearAllCarouselTimers: function() {
            this._carouselTimers.forEach(interval => clearInterval(interval));
            this._carouselTimers.clear();
        },

        /* Auto cleanup with View destruction */
        onExit: function() {
            this._clearAllCarouselTimers();
        },

        scrollToSection: function (pageId, sectionId) {
        var page = this.byId(pageId);
        if (page && sectionId) {
            page.scrollToSection(this.byId(sectionId).getId());
        }
        },

         //Date picker common function 
    _makeDatePickersReadOnly: function (aIds) {
      var oView = this.getView();
      aIds.forEach(function (sId) {
        var oControl = oView.byId(sId);
        if (oControl) {
          var bIsValueHelp = oControl.getMetadata().getName() === "sap.m.Input" && oControl.getShowValueHelp && oControl.getShowValueHelp();

          oControl.addEventDelegate({
            onAfterRendering: function () {
              var oDomRef = oControl.getDomRef("inner");
              if (oDomRef) {
                oDomRef.setAttribute("readonly", true); // block typing
                oDomRef.style.cursor = "pointer";
              }
            }
          }, oControl);

          oControl.attachBrowserEvent("click", function () {
            var oIcon = oControl.getDomRef("icon");
            if (oIcon) {
              oIcon.click(); // open calendar or value help
            }
          });

          // Optional: prevent typing via keypress too (extra safe)
          oControl.attachBrowserEvent("keydown", function (oEvent) {
            oEvent.preventDefault();
          });
        }
      });
    },
    })
});