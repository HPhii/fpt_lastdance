sap.ui.define([], function () {
  "use strict";

  return {
    technicalStatusState: function (sStatus) {
      if (!sStatus) return "None";

      switch (sStatus) {
        // --- POSITIVE GROUP ---
        case "COMPLETED":
        case "CHECKED":
        case "COMMITTED":
          return "Success";

        // --- WARNING GROUP ---
        case "WAITING":
          return "Warning";

        // --- INFORMATION GROUP ---
        case "STARTED":
        case "SELECTED":
        case "READY":
          return "Information";

        // --- NEGATIVE GROUP ---
        case "ERROR":
        case "CANCELLED":
          return "Error";

        // --- DEFAULT ---
        default:
          return "None";
      }
    },

    /**
     * Formatter for substitution status state
     * @param {boolean} bActive - Active status
     * @returns {string} State value for ObjectStatus
     */
    substState: function (bActive) {
      return bActive ? "Success" : "Indication03";
    },

    /**
     * Formatter for substitution type text
     * @param {string} sType - Type code ('P' or 'U')
     * @returns {string} Formatted type text
     */
    substType: function (sType) {
      if (!sType) return "";

      const oResourceBundle = this.getView()
        ?.getModel("i18n")
        ?.getResourceBundle();
      if (!oResourceBundle) return sType;

      switch (sType.toUpperCase()) {
        case "P":
          return oResourceBundle.getText("substTypePlanned");
        case "U":
          return oResourceBundle.getText("substTypeUnplanned");
        default:
          return sType;
      }
    },
  };
});
