import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// One axios instance that attaches the login token to every request
export const api = axios.create({ baseURL: `${API_URL}/api` });
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export const errMsg = (err) =>
    err.response?.data?.message ||
    (err.response ? err.message : "Can't reach the server. Check your connection and try again.");

export const assetUrl = (path) => (!path ? "" : /^https?:\/\//i.test(path) ? path : `${API_URL}${path}`);

export const font = {
    display: { fontFamily: "'Fraunces', ui-serif, Georgia, serif" },
    mono: { fontFamily: "'IBM Plex Mono', ui-monospace, monospace" },
};

export const peso = (n) =>
    `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

// Same order number the customer sees (last 6 characters of the id)
export const orderNo = (o) => `#${String(o._id).slice(-6).toUpperCase()}`;
export const shortId = (prefix, id) => `${prefix}-${String(id).slice(-5).toUpperCase()}`;
export const initials = (name = "") =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "ST";

export const balanceOf = (o) => Math.max(0, Math.round(((o.total || 0) - (o.amountPaid || 0)) * 100) / 100);

export const formatTime = (d) => new Date(d).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
export const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
export const formatDateTime = (d) => `${formatDate(d)}, ${formatTime(d)}`;
export const formatWhen = (d) => {
    const date = new Date(d);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return formatTime(d);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
};

// Must match ORDER_STATUSES in backend/models/order.model.js
export const ORDER_STATUSES = [
    "Order Received",
    "In Production",
    "Preparing",
    "Finished Production",
    "Ready for Pick-Up",
    "Ready for Delivery",
    "Completed",
];

export const STATUS_TONE = {
    "Order Received": { dot: "#9C7A3C", bg: "#F4ECDB", text: "#6B5426" },
    "In Production": { dot: "#7C4A4A", bg: "#F3E4E2", text: "#6B3838" },
    Preparing: { dot: "#7C4A4A", bg: "#F3E4E2", text: "#6B3838" },
    "Finished Production": { dot: "#5B6E58", bg: "#E7EDE3", text: "#3E4E3B" },
    "Ready for Pick-Up": { dot: "#3E6E8E", bg: "#E2ECF1", text: "#2C4E64" },
    "Ready for Delivery": { dot: "#3E6E8E", bg: "#E2ECF1", text: "#2C4E64" },
    Completed: { dot: "#5B6E58", bg: "#E7EDE3", text: "#3E4E3B" },
};

export const PAYMENT_TONE = {
    Paid: { bg: "#E7EDE3", text: "#3E4E3B" },
    Partial: { bg: "#F4ECDB", text: "#6B5426" },
    Unpaid: { bg: "#F3E4E2", text: "#6B3838" },
};

// Product.status values from the server (Low stock at 2 or fewer is decided there)
export const STOCK_TONE = {
    Active: { label: "In stock", bg: "#E7EDE3", text: "#3E4E3B", dot: "#5B6E58" },
    "Low stock": { label: "Low stock", bg: "#F4ECDB", text: "#6B5426", dot: "#9C7A3C" },
    "Out of stock": { label: "Out of stock", bg: "#F3E4E2", text: "#6B3838", dot: "#7C4A4A" },
};