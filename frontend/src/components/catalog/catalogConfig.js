import { PALETTE, hexForName, normalizeHex } from "../../lib/colors";
import { DEFAULT_CATEGORY_OPTIONS, uniqueNames } from "../../lib/categories";

// Backend base URL. Set VITE_API_URL in frontend/.env when you deploy.
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Event types and sleeves are whatever the admin maintains in the console's
// Categories tab; Catalog.jsx injects them into these groups at runtime, so
// the fallbacks below only show before the fetch lands (or if it fails).
// The color group is filled in from the products themselves (see
// colorOptionsFrom below), so a custom shade an admin added also becomes filterable.
export const FILTER_GROUPS = [
    { key: "category", label: "Category", options: ["Gown", "Barong"] },
    {
        key: "eventType",
        label: "Event type",
        options: DEFAULT_CATEGORY_OPTIONS.common.eventType,
    },
    {
        key: "sleeve",
        label: "Sleeve style",
        options: uniqueNames(
            DEFAULT_CATEGORY_OPTIONS.Gown.sleeve,
            DEFAULT_CATEGORY_OPTIONS.Barong.sleeve
        ),
    },
    { key: "color", label: "Color", options: [] }, // filled in from the products, see below
    { key: "size", label: "Size", options: ["XS", "S", "M", "L", "XL", "XXL"] },
];

// Options for the event type / sleeve groups: the admin's list first (in the
// order they keep it in), then anything the products still carry — an option
// deleted from the console shouldn't strand the products that use it from being
// filtered at all.
export const carriedOptionsFrom = (managed = [], carried = []) => {
    const seen = new Set();
    const out = [];
    const add = (name) => {
        const clean = String(name || "").trim();
        if (!clean) return;
        const key = clean.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        out.push(clean);
    };
    managed.forEach(add);
    carried.forEach(add);
    return out;
};

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