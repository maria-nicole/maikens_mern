import { PALETTE, hexForName, normalizeHex } from "../../lib/colors";

// Backend base URL. Set VITE_API_URL in frontend/.env when you deploy.
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// IMPORTANT: these options must match the lists in your admin ProductForm
// (event types, sleeves, sizes). If they differ, filters won't match anything.
// The color group is filled in at runtime from the products themselves (see
// colorOptionsFrom below), so a custom shade an admin added also becomes filterable.
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
    { key: "color", label: "Color", options: [] }, // filled in from the products, see below
    { key: "size", label: "Size", options: ["XS", "S", "M", "L", "XL", "XXL"] },
];

// The color filter lists the colors the shop actually carries: every product's own
// swatches, in palette order, then any custom shade the admin added. Falls back to the
// palette itself before the products have loaded, so the filter is never empty.
export const colorOptionsFrom = (products = []) => {
    const seen = new Map();
    for (const product of products) {
        for (const c of product.swatches || []) {
            const name = String(c.name || "").trim();
            const hex = normalizeHex(c.hex) || hexForName(c.name);
            if (!name && !hex) continue;
            const key = (hex || name).toLowerCase();
            if (!seen.has(key)) seen.set(key, { name: name || hex, hex });
        }
    }
    const rank = (name) => {
        const i = PALETTE.findIndex((c) => c.name.toLowerCase() === name.toLowerCase());
        return i === -1 ? PALETTE.length : i;
    };
    return [...seen.values()].sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
};

// Before the catalog loads (or when nothing carries a color yet) the filter shows the palette
export const PALETTE_OPTIONS = PALETTE.map(({ name, hex }) => ({ name, hex }));

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
    color: (p.colors || []).map((c) => c.name || c.hex).filter(Boolean),
    swatches: p.colors || [],
    // Made-to-order items can be requested in any carried size even at 0 stock
    size: (p.sizes || [])
        .filter((s) => p.fulfillment === "Made-to-order" || s.stock > 0)
        .map((s) => s.size),
});