sap.ui.define([
  "sap/ui/core/format/DateFormat",
  "sap/ui/core/format/FileSizeFormat"
], function (DateFormat, FileSizeFormat)
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

    formatPriorityIcon: function (sPriority)
    {
      switch (sPriority)
      {
        case "1":
        case "2":
          return "sap-icon://high-priority";
        case "3":
        case "4":
          return "sap-icon://alert";
        case "5":
          return "sap-icon://information";
        case "6":
        case "7":
          return "sap-icon://message-information";
        case "8":
        case "9":
          return "sap-icon://master-task-triangle";
        default:
          return "";
      }
    },

    formatPriorityState: function (sPriority)
    {
      switch (sPriority)
      {
        case "1":
        case "2":
          return "Error";
        case "3":
        case "4":
          return "Warning";
        case "5":
          return "Information";
        case "6":
        case "7":
        case "8":
        case "9":
          return "None";
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
      const oInputFormat = DateFormat.getDateInstance({
        pattern: "yyyy-MM-dd",
      });
      const oDate = oInputFormat.parse(sDate);

      if (!oDate)
      {
        return sDate; // Fallback if parse fails
      }

      const oOutputFormat = DateFormat.getDateInstance({
        pattern: "dd/MM/yyyy",
      });
      return oOutputFormat.format(oDate);
    },

    formatFileSize: function (iSizeInBytes)
    {
      var oFileSizeFormat = FileSizeFormat.getInstance({
        binaryFilesize: false,
        decimals: 2
      });

      return oFileSizeFormat.format(iSizeInBytes);
    },

    formatAttachmentIcon: function (sFileExtension)
    {
      switch (sFileExtension.toLowerCase())
      {
        case "png":
        case "jpg":
        case "jpeg":
          return "sap-icon://attachment-photo";
        case "txt":
          return "sap-icon://attachment-text-file";
        case "pdf":
          return "sap-icon://pdf-attachment";
        case "doc":
        case "docx":
          return "sap-icon://doc-attachment";
        case "xls":
        case "xlsx":
          return "sap-icon://excel-attachment";
        case "ppt":
        case "pptx":
          return "sap-icon://ppt-attachment";
        default:
          return "sap-icon://attachment";
      }
    },

    formatCompletionRate: function (sCompleted, sTotal)
    {
      if (!sCompleted || !sTotal || parseInt(sTotal, 10) === 0)
      {
        return "0.00";
      }
      var fCompleted = parseFloat(sCompleted);
      var fTotal = parseFloat(sTotal);

      var fRate = (fCompleted / fTotal) * 100;
      console.log(fRate);

      return fRate.toFixed(2);
    }
  };
});
