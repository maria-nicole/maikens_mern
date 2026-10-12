// Backend base URL. Set VITE_API_URL in frontend/.env when you deploy.
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const imageUrl = (path) => (!path ? "" : /^https?:\/\//i.test(path) ? path : `${API_URL}${path}`);

export const formatPrice = (v) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(v || 0);

/* Same look as the other pages */
export const primaryBtn =
    "text-white bg-yellow-600/89 border border-yellow-600/89 rounded-md font-medium hover:bg-white hover:text-yellow-600/89 duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-yellow-600/89 disabled:hover:text-white";

export const ghostBtn =
    "border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

export const chipClass = (active) =>
    `px-3.5 py-2 rounded-full text-sm border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${active
        ? "bg-yellow-600/89 text-white border-yellow-600/89"
        : "bg-white text-gray-600 border-gray-200 hover:border-yellow-200/89 hover:text-yellow-600/89"
    }`;

export const inputClass =
    "w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm text-neutral-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-yellow-500/89 focus:border-yellow-600/89 disabled:bg-gray-50";