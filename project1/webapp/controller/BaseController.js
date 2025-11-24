sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "../model/formatter",
  "sap/ui/core/BusyIndicator",
  "sap/ui/unified/CalendarLegend",
  "sap/ui/unified/CalendarLegendItem",
  "sap/ui/unified/DateTypeRange"
], function (Controller, JSONModel, jsPDF, Formatter, BusyIndicator, CalendarLegend, CalendarLegendItem, DateTypeRange) {
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
          success: function (data) {
            resolve(data);
          },
          error: function (error) {
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
          success: function (data) {
            resolve(data);
          },
          error: function (error) {
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
          success: function (data) {
            resolve(data);
          },
          error: function (error) {
            reject(error);
          }
        });
      });
    },

  
    //fragment date picker function
    _FragmentDatePickersReadOnly: function (aIds) {
      aIds.forEach(function (sId) {
        var oDatePicker = sap.ui.getCore().byId(sId);
        if (oDatePicker) {
          oDatePicker.addEventDelegate({
            onAfterRendering: function () {
              var oInputDom = oDatePicker.getDomRef("inner");
              if (oInputDom) {
                oInputDom.setAttribute("readonly", true); // Prevent typing
                oInputDom.style.cursor = "pointer";
              }
            }
          }, oDatePicker);
          // Open calendar on click
          oDatePicker.attachBrowserEvent("click", function () {
            var oIconDomRef = oDatePicker.getDomRef("icon");
            if (oIconDomRef) {
              oIconDomRef.click(); // simulate icon click to open calendar
            }
          });
        }
      });
    },
    _ViewDatePickersReadOnly: function (aIds, oView) {
      aIds.forEach(function (sId) {
        var oDatePicker = oView.byId(sId);
        if (oDatePicker) {
          oDatePicker.addEventDelegate({
            onAfterRendering: function () {
              var oInputDom = oDatePicker.getDomRef("inner");
              if (oInputDom) {
                oInputDom.setAttribute("readonly", true); // Prevent typing
                oInputDom.style.cursor = "pointer";
              }
            }
          }, oDatePicker);
          // Open calendar on click
          oDatePicker.attachBrowserEvent("click", function () {
            var oIconDomRef = oDatePicker.getDomRef("icon");
            if (oIconDomRef) {
              oIconDomRef.click(); // simulate icon click to open calendar
            }
          });
        }
      });
    },

   
   
    getBusyDialog: function () {
      if (!this._pBusyDialog) {
        this._pBusyDialog = sap.ui.core.Fragment.load({
          name: "sap.kt.com.minihrsolution.fragment.BusyIndicator",
          controller: this
        }).then(function (oBusyDialog) {
          this.getView().addDependent(oBusyDialog);
          return oBusyDialog;
        }.bind(this));
      }

      this._pBusyDialog.then(function (oBusyDialog) {
        this.oBusyDialog = oBusyDialog;
        this.oBusyDialog.open();

      }.bind(this));
    },

    closeBusyDialog: function () {
      if (this.oBusyDialog) {
        this.oBusyDialog.close();

      }
    },
    
    _fetchCommonData: async function (entityName, modelName, filter = "") {
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
            success: function (data) {
              if (data) {
                var oModel = new JSONModel(data.data);
                this.getOwnerComponent().setModel(oModel, modelName);
              }
              resolve(data);
              if (flag === "TraineeFlag") {
                this.closeBusyDialog();
              }
            }.bind(this),
            error: function (err) {
              reject(err);
            }
          });
        });

      } catch (error) {
        sap.m.MessageToast.show(error.responseJSON?.message || "Technical error, please contact the administrator");
      }
    },

     onClearAndSearch: function (sFilterBarId) {
      var oFilterBar = this.byId(sFilterBarId);
      if (oFilterBar) {
        oFilterBar.clear(); // Clear all filters in the FilterBar
      }
    },
    _startAllCarouselsAutoSlide: function (iDelay = 3000) {
      try {
        const oView = this.getView();
        const aCarousels = oView.findAggregatedObjects(true, control => control.isA("sap.m.Carousel"));

        aCarousels.forEach(carousel => {
          if (!carousel || carousel.bIsDestroyed) return;

          const iSlideCount = carousel.getPages().length;
          if (iSlideCount <= 1) return;

          // Clear old interval if exists
          if (carousel._autoSlideInterval) {
            clearInterval(carousel._autoSlideInterval);
          }

          let currentIndex = carousel.getActivePageIndex ? carousel.getActivePageIndex() : 0;

          carousel._autoSlideInterval = setInterval(() => {
            if (!carousel || carousel.bIsDestroyed) return;
            currentIndex = (currentIndex + 1) % iSlideCount;
            carousel.setActivePage(carousel.getPages()[currentIndex]);
          }, iDelay);
        });
      } catch (err) {
        console.error("Carousel Auto Slide Error:", err);
      }
    },

  })
});