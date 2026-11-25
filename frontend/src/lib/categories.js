import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/* The lists the backend seeds the first time it runs (see
   backend/models/category.model.js). They are only a fallback for when the
   server can't be reached (or is still running the old API) — the owner edits
   the real lists in the admin console's Categories tab.

   The design lists are exactly the customizer's predefined options, grouped by
   garment, so the product form, customizer and AI prompt all stay in step. */
export const DEFAULT_CATEGORY_OPTIONS = {
    common: {
        eventType: ["Wedding", "Ninang / Sponsor", "Debut", "Prom / School event", "Party", "Formal"],
        length: ["Mini", "Knee", "Midi", "Maxi", "Floor-length", "Cathedral train"],
    },
    Gown: {
        color: [
            "White", "Ivory", "Cream", "Champagne", "Blush", "Dusty Rose", "Peach", "Coral", "Red", "Wine",
            "Mauve", "Lavender", "Lilac", "Sky Blue", "Royal Blue", "Navy", "Sage Green", "Emerald", "Mustard",
            "Gold", "Slate gray", "Charcoal", "Black",
        ],
        silhouette: [
            "A-Line", "Ball Gown", "Mermaid", "Trumpet", "Sheath", "Empire Waist", "Fit and Flare", "Column",
            "Tea Length", "High Low",
        ],
        neckline: ["Sweetheart", "V-Neck", "Scoop Neck", "Square Neck", "Halter", "High Neck", "Boat Neck"],
        sleeve: [
            "Sleeveless", "Spaghetti Strap", "Off Shoulder", "Cap Sleeve", "Short Sleeve", "Long Sleeve", "Puff Sleeve",
        ],
        fabric: ["Satin", "Silk", "Tulle", "Lace", "Chiffon", "Organza", "Velvet", "Crepe", "Taffeta", "Sequin"],
        design: ["Floral lace", "Beaded", "Embroidered", "Sequined", "Ruffled", "Plain / minimal"],
    },
    Barong: {
        color: ["White", "Ivory", "Cream", "Champagne", "Sky Blue", "Sage Green", "Navy", "Charcoal", "Black", "Wine"],
        fit: ["Classic fit", "Slim fit", "Relaxed fit"],
        sleeve: ["Long Sleeve", "Short Sleeve"],
        fabric: ["Piña", "Jusi", "Organza", "Cotton blend"],
        design: ["Plain", "Floral embroidery", "Geometric embroidery", "Calado cutwork", "Border embroidery"],
    },
};

const copy = (options) => ({
    common: Object.fromEntries(Object.entries(options.common).map(([k, v]) => [k, [...v]])),
    Gown: Object.fromEntries(Object.entries(options.Gown).map(([k, v]) => [k, [...v]])),
    Barong: Object.fromEntries(Object.entries(options.Barong).map(([k, v]) => [k, [...v]])),
});

const optionKey = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const LEGACY_SLEEVES = new Set(["barrelcuff"]);

// Old spellings ("Off-shoulder") are shown with the customizer's spelling
// ("Off Shoulder") so the two lists don't look duplicated before the DB is cleaned.
const canonicalName = (scope, type, name) =>
    (DEFAULT_CATEGORY_OPTIONS[scope]?.[type] || []).find((v) => optionKey(v) === optionKey(name)) || name;

// GET /api/categories is public and returns a flat array of
// { _id, garment, type, name }. Group it into the shape above. An older server
// (no per-garment lists) falls back to the defaults rather than an empty form.
export async function fetchCategoryOptions() {
    try {
        const { data } = await axios.get(`${API_URL}/api/categories`);
        if (!Array.isArray(data)) return copy(DEFAULT_CATEGORY_OPTIONS);
        if (!data.some((item) => item.garment === "Gown" || item.garment === "Barong")) {
            return copy(DEFAULT_CATEGORY_OPTIONS);
        }
        const byType = {
            common: { eventType: [], length: [] },
            Gown: Object.fromEntries(Object.keys(DEFAULT_CATEGORY_OPTIONS.Gown).map((k) => [k, []])),
            Barong: Object.fromEntries(Object.keys(DEFAULT_CATEGORY_OPTIONS.Barong).map((k) => [k, []])),
        };
        for (const item of data) {
            const scope = item.garment === "Gown" || item.garment === "Barong" ? item.garment : "common";
            if (!Array.isArray(byType[scope]?.[item.type])) continue;
            let name = item.name;
            if (scope !== "common" && item.type === "sleeve") {
                if (LEGACY_SLEEVES.has(optionKey(name))) continue;
                name = canonicalName(scope, "sleeve", name);
            }
            byType[scope][item.type].push(name);
        }
        // Collapse any remaining duplicate spellings, keeping one per garment.
        for (const scope of ["Gown", "Barong"]) {
            for (const type of Object.keys(byType[scope])) byType[scope][type] = uniqueNames(byType[scope][type]);
        }
        return byType;
    } catch {
        return copy(DEFAULT_CATEGORY_OPTIONS);
    }
}

// The design options for one garment, with the defaults as a safety net.
export const optionsForGarment = (options, garment) =>
    options?.[garment] && Object.keys(options[garment]).length ? options[garment] : DEFAULT_CATEGORY_OPTIONS[garment];

// Case-insensitive de-duplication that preserves the caller's spelling.
export const uniqueNames = (...lists) => {
    const seen = new Set();
    const out = [];
    for (const name of lists.flat()) {
        const clean = String(name || "").trim();
        const key = optionKey(clean);
        if (!clean || seen.has(key)) continue;
        seen.add(key);
        out.push(clean);
    }
    return out;
};

// A value saved on a product keeps its place even after the option was removed
// from the console's list.
export const withCurrent = (options, current) =>
    current && !options.some((o) => optionKey(o) === optionKey(current))
        ? [current, ...options]
        : options;
