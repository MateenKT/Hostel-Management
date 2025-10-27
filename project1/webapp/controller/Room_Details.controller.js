sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function(
	Controller
) {
	"use strict";

	return Controller.extend("sap.ui.com.project1.controller.Room_Details", {
        onInit: function () {

        },
          HM_AddRoom: function (oEvent) {
            //  var table = this.byId("idPOTable");
            // var selected = table.getSelectedItem();
            // if(!selected){
            //     sap.m.MessageToast.show("Please select a record to assign room.");
            //     return;
            // }
            //       var Model = selected.getBindingContext("HostelModel");
            // var data = Model.getObject();

            if (!this.AR_Dialog) {
                var oView = this.getView();
                this.AR_Dialog = sap.ui.xmlfragment("sap.ui.com.project1.fragment.Add_Room_Details", this);
                oView.addDependent(this.AR_Dialog);

                // sap.ui.getCore().byId("idCustomerNameText").setText(data.CustomerName);
                this.AR_Dialog.open();
            } else {
                //  sap.ui.getCore().byId("idCustomerNameText").setText(data.CustomerName);
                this.AR_Dialog.open();
            }
        },
            AR_onCancelButtonPress: function () {
            this.AR_Dialog.close();
        },
	});
});