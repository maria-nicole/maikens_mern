/* ------------------------------------------------------------------------------------------
   Shared pieces for the My Account page (src/pages/customer_profile/Profile.jsx).

   Profile, orders, designs, favorites and the cart all live on that one page now, so the
   panels under src/components/account/ import the API client, formatters, status maps and
   class strings from here instead of each keeping their own copy.

   The status strings must match backend/models/order.model.js and customization.model.js.
------------------------------------------------------------------------------------------- */

import { Calendar, Heart, MapPin, Package, Settings, ShoppingBag, Smartphone, Sparkles, User } from "lucide-react";
import { colorLabel, selectionList, swatchFor } from "../../lib/colors";

// Backend base URL. Set VITE_API_URL in frontend/.env when you deploy.
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// The boutique's Facebook page — where the saved order slips get sent.
// (Same link the Contact page uses.)
export const MESSENGER_URL = "https://www.facebook.com/share/18GpBdBoog";

export const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
export const assetUrl = (path) => (!path ? "" : /^https?:\/\//i.test(path) ? path : `${API_URL}${path}`);
export const isLoggedIn = () => !!localStorage.getItem("token");

/* Every place that changes the cart announces the new cart on window, so the
   navbar badge follows along without asking the server again. */
export const CART_EVENT = "maikens:cart";
export const announceCart = (cart) =>
  window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: cart || { items: [] } }));

export const asArray = (value) => (Array.isArray(value) ? value : []);

export const fmt = (n) => `₱${Number(n || 0).toLocaleString("en-PH")}`;
export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
export const orderNo = (o) => `#${String(o._id).slice(-6).toUpperCase()}`;

export const MAX_AVATAR_MB = 2;
export const PH_PHONE = /^(09|\+639)\d{9}$/;
export const MAX_ADDRESS = 250;
// Display only: the server sets the real fee when the order is placed.
export const DELIVERY_FEE = 150;

export const FULFILLMENT_OPTIONS = [
  { key: "Delivery", label: "Delivery", sub: "+₱150 shipping", icon: MapPin },
  { key: "Pick-up", label: "Pick-up", sub: "Free · Schedule a date", icon: Calendar },
];

export const PAYMENT_OPTIONS = [{ key: "GCash", label: "GCash", sub: "Mobile wallet", icon: Smartphone }];

// What the server returns for an empty cart
export const EMPTY_CART = { items: [], itemCount: 0, subtotal: 0, hasIssues: false };

// Local date as YYYY-MM-DD, the earliest date the pick-up picker allows
export const today = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

// Order stages. "step" is how far along production the order is (1 to 5), for the progress bar.
export const ORDER_STATUS = {
  "Order Received": { step: 1, color: "text-gray-700 bg-gray-50 border-gray-200" },
  "In Production": { step: 2, color: "text-blue-700 bg-blue-50 border-blue-200" },
  Preparing: { step: 3, color: "text-amber-700 bg-amber-50 border-amber-200" },
  "Finished Production": { step: 4, color: "text-purple-700 bg-purple-50 border-purple-200" },
  "Ready for Pick-Up": { step: 5, color: "text-teal-700 bg-teal-50 border-teal-200" },
  "Ready for Delivery": { step: 5, color: "text-teal-700 bg-teal-50 border-teal-200" },
  Completed: { step: 5, color: "text-green-700 bg-green-50 border-green-200" },
};
export const FALLBACK_STATUS = { step: 1, color: "text-gray-700 bg-gray-50 border-gray-200" };

export const DESIGN_STATUS = {
  "Pending review": "text-amber-700 bg-amber-50 border-amber-200",
  "In discussion": "text-blue-700 bg-blue-50 border-blue-200",
  Approved: "text-green-700 bg-green-50 border-green-200",
};
export const EDITABLE = ["Pending review", "In discussion"];

/* Same look as the rest of the shop */
export const cardClass = "bg-white rounded-lg border border-gray-200";

export const inputClass =
  "w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm text-neutral-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-yellow-500/89 focus:border-yellow-600/89 disabled:bg-gray-50 disabled:text-gray-400";

export const primaryLink =
  "inline-flex items-center justify-center gap-2 px-6 py-3 bg-yellow-600/89 text-white text-sm font-semibold rounded-md border border-yellow-600/89 hover:bg-white hover:text-yellow-600/89 duration-200";

export const primaryBtn =
  "flex items-center justify-center gap-2 bg-yellow-600/89 text-white text-sm font-semibold rounded-md border border-yellow-600/89 hover:bg-white hover:text-yellow-600/89 duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-yellow-600/89 disabled:hover:text-white";

export const ghostBtn =
  "inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md px-6 py-2.5 hover:bg-gray-50 transition-colors";

/* The one list of sections. Each one is a URL, so any section can be linked to. */
export const SECTIONS = [
  { key: "overview", label: "Overview", icon: User },
  { key: "orders", label: "Orders", icon: Package },
  { key: "designs", label: "Designs", icon: Sparkles },
  { key: "favorites", label: "Favorites", icon: Heart },
  { key: "cart", label: "Cart", icon: ShoppingBag },
  { key: "settings", label: "Settings", icon: Settings },
];

const SECTION_KEYS = SECTIONS.map((s) => s.key);

// Old links (/profile?tab=history, /favorites?tab=custom) still land somewhere sensible
const SECTION_ALIASES = { history: "orders", custom: "designs", saved: "favorites" };

export const normalSection = (key) => {
  const wanted = SECTION_ALIASES[key] || key;
  return SECTION_KEYS.includes(wanted) ? wanted : "overview";
};

export const sectionHref = (key) => (key === "overview" ? "/profile" : `/profile?tab=${key}`);

/* Design helpers: the choices a customer made, in a readable order.
   (colorHex describes the color rather than being a choice, so it is never listed.) */
export const chosenOptions = (selections = {}) => selectionList(selections);

export const selectionChip = (key, value, colorHex) => {
  const dot = key === "color" ? swatchFor(value, colorHex) : "";
  return { dot, label: key === "color" ? colorLabel(value, colorHex) : value };
};
