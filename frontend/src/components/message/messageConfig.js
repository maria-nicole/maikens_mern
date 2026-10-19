// Shared bits for the chat page: the API client, constants and small helpers.
// Same pattern as Admin.jsx — attaches the login token to every request.
import axios from "axios";
import { Shirt, Palette, Package } from "lucide-react";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const api = axios.create({ baseURL: `${API_URL}/api` });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const errMsg = (err) =>
  err.response?.data?.message ||
  (err.response ? err.message : "Can't reach the server. Check your connection and try again.");

export const POLL_MS = 5000; // how often to check for the owner's replies
export const MAX_PHOTOS = 4;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// Ids must match backend/utils/quickReplies.js (the answers live on the server)
export const QUICK_REPLIES = [
  { id: "hours", label: "Store hours" },
  { id: "pricing", label: "Pricing" },
  { id: "order-status", label: "Order status" },
  { id: "rush", label: "Rush orders" },
];

export const WELCOME = {
  _id: "welcome",
  sender: "admin",
  body: "Hi! Welcome to MAIKENS Gown & Barong 👋 Ask us anything about designs, pricing, or your order. You can also share a photo, one of your customizations, or an order. Or tap a quick question below.",
  createdAt: null,
};

export const SHARE_LABEL = { product: "Product", customization: "My customization", order: "My order" };
export const SHARE_ICON = { product: Shirt, customization: Palette, order: Package };

// Thumbnail height per kind, all 3:4 like the product photos. Orders are the biggest.
export const SHARE_THUMB = { product: "h-16", customization: "h-20", order: "h-24" };

export const fileUrl = (path) => (!path ? "" : /^https?:\/\//i.test(path) ? path : `${API_URL}${path}`);
export const peso = (n) => `₱${Number(n || 0).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;

// Adds only messages we don't already have (polling and sending can overlap)
export const mergeMessages = (prev, incoming) => {
  const seen = new Set(prev.map((m) => m._id));
  const fresh = incoming.filter((m) => !seen.has(m._id));
  return fresh.length ? [...prev, ...fresh] : prev;
};

export const clockTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export const dayLabel = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
};

// Store is open Tue–Sun, 9 AM–6 PM, Philippine time
export const getShopStatus = (now) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const day = parts.find((p) => p.type === "weekday")?.value;
  const hour = Number(parts.find((p) => p.type === "hour")?.value) % 24;
  return day !== "Mon" && hour >= 9 && hour < 18;
};

export const productToShare = (p) => ({
  kind: "product",
  refId: p._id,
  title: p.name,
  subtitle: [p.category, p.eventTypes?.[0]].filter(Boolean).join(" · "),
  detail: peso(p.price),
  image: p.images?.[0] || "",
});
