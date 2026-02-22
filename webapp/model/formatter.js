sap.ui.define([], function ()
{
  "use strict";

  return {
    formatTechnicalStatus: function (sStatus)
    {
      if (!sStatus) return "None";

      switch (sStatus)
      {
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
     * Formatter for days to deadline text
     * @param {string} sNumberOfDays 
     * @returns {string} Formatted text for days to deadline
     */
    formatDaysToDeadlineText: function (sNumberOfDays)
    {
      if (!sNumberOfDays) return "N/A";

      if (sNumberOfDays > '1000')
      {
        return "Infinity";
      } else if (sNumberOfDays < '0')
      {
        return "Overdue";
      }

      return sNumberOfDays + " Days";
    },

    /**
     * Formatter for status text
     * @param {string} sStatus - The status value (e.g., "Active", "Inactive")
     */
    formatStatusText: function (sStatus)
    {
      return sStatus;
    },

    /**
     * Formatter for status state (ObjectStatus color)
     * @param {string} sStatus - The status value (e.g., "Active", "Inactive", "Cancelled")
     * @returns {string} - The corresponding ObjectStatus state ("Success", "Error", "None")
     */
    formatStatusState: function (sStatus)
    {
      if (!sStatus)
      {
        return "None";
      }

      // Check case-insensitive
      switch (sStatus.toUpperCase())
      {
        case "ACTIVE":
          return "Success";
        case "INACTIVE":
        case "CANCELLED":
          return "Error";
        default:
          return "None";
      }
    },

    /**
     * Formatter for status icon
     * @param {string} sStatus - The status value (e.g., "Active", "Inactive")
     * @returns {string} - The corresponding SAP icon URI
     */
    formatStatusIcon: function (sStatus)
    {
      if (!sStatus)
      {
        return "";
      }
      if (sStatus.toUpperCase() === "ACTIVE")
      {
        return "sap-icon://status-positive";
      }
      return "sap-icon://status-inactive";
    },

    formatDaysToStartText: function (sRuleStatus, iDays)
    {
      if (
        sRuleStatus === "Inactive" &&
        iDays !== null &&
        iDays !== undefined
      )
      {
        const oResourceBundle = this.getView()
          .getModel("i18n")
          .getResourceBundle();
        // Hàm getText có hỗ trợ truyền mảng tham số để thế vào {0}, {1}...
        return oResourceBundle.getText("txtStartsInDays", [iDays]);
      }
      return "";
    },

    formatDateOrNA: function (sType, sDate)
    {
      if (!sDate)
      {
        return "N/A";
      }

      // parse date format
      const oInputFormat = sap.ui.core.format.DateFormat.getDateInstance({
        pattern: "yyyy-MM-dd",
      });
      const oDate = oInputFormat.parse(sDate);

      if (!oDate)
      {
        return sDate; // Fallback if parse fails
      }

      const oOutputFormat = sap.ui.core.format.DateFormat.getDateInstance({
        pattern: "dd/MM/yyyy",
      });
      return oOutputFormat.format(oDate);
    },
  };
});
