// Backend base URL. Set VITE_API_URL in frontend/.env when you deploy.
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// IMPORTANT: these options must match the lists in your admin ProductForm
// (event types, sleeves, colors, sizes). If they differ, filters won't match anything.
export const FILTER_GROUPS = [
    { key: "category", label: "Category", options: ["Gown", "Barong"] },
    {
        key: "eventType",
        label: "Event type",
        options: ["Wedding", "Ninang / Sponsor", "Debut", "Prom / School event", "Party", "Formal"],
    },
    {
        key: "sleeve",
        label: "Sleeve style",
        options: ["Sleeveless", "Cap sleeve", "Short sleeve", "Long sleeve", "Off-shoulder", "Barrel cuff"],
    },
    {
        key: "color",
        label: "Color",
        options: ["Ivory", "Champagne", "Blush", "Slate gray", "Wine", "Emerald", "Navy", "Black"],
    },
    { key: "size", label: "Size", options: ["XS", "S", "M", "L", "XL", "XXL"] },
];

// Only used to draw a small dot next to each color filter.
export const COLOR_DOTS = {
    Ivory: "#FFFFF0",
    Champagne: "#F7E7CE",
    Blush: "#E8B4B8",
    "Slate gray": "#708090",
    Wine: "#722F37",
    Emerald: "#2E8B57",
    Navy: "#1F2A5A",
    Black: "#1A1A1A",
};

export const SORT_OPTIONS = [
    { value: "newest", label: "Newest" },
    { value: "price-asc", label: "Price: low to high" },
    { value: "price-desc", label: "Price: high to low" },
];

export const SHOW_OPTIONS = [8, 16, 24, 32];

export const EMPTY_SELECTION = Object.fromEntries(FILTER_GROUPS.map((g) => [g.key, []]));

export const formatPrice = (value) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value || 0);

// Turns a MongoDB product document into the shape the catalog uses.
// Every filterable field becomes an array so one matching rule works for all.
export const normalizeProduct = (p) => ({
    id: p._id,
    name: p.name,
    price: p.price,
    createdAt: p.createdAt,
    status: p.status,
    fulfillment: p.fulfillment,
    totalStock: p.totalStock,
    image: p.images?.[0]
        ? (/^https?:\/\//i.test(p.images[0]) ? p.images[0] : `${API_URL}${p.images[0]}`)
        : null,
    category: p.category ? [p.category] : [],
    eventType: p.eventTypes || [],
    sleeve: p.sleeve ? [p.sleeve] : [],
    color: (p.colors || []).map((c) => c.name),
    swatches: p.colors || [],
    // Made-to-order items can be requested in any carried size even at 0 stock
    size: (p.sizes || [])
        .filter((s) => p.fulfillment === "Made-to-order" || s.stock > 0)
        .map((s) => s.size),
});