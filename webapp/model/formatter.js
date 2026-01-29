sap.ui.define([], function ()
{
    "use strict";

    return {
        technicalStatusState: function (sStatus)
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
    };
});