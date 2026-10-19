/* ------------------------------------------------------------------------------------------
   ONE color palette for the whole shop.

   It is used by
   - the customizer      (src/components/customize/)   -> a swatch per color, plus a custom shade
   - the admin product form (src/pages/admin/ProductForm.jsx) -> which colors a product comes in
   - the catalog filter  (src/components/catalog/)      -> built from the colors products carry

   The NAMES must match COLORS in backend/utils/designOptions.js. The server only accepts
   those names, plus a "custom shade" which must arrive as a valid #RRGGBB hex. Anything
   else is dropped from the request, so the two lists have to stay in step.
------------------------------------------------------------------------------------------- */

export const PALETTE = [
    { name: "White", hex: "#FFFFFF" },
    { name: "Ivory", hex: "#F5F2EB" },
    { name: "Cream", hex: "#F2E8D5" },
    { name: "Champagne", hex: "#E6D7C3" },
    { name: "Blush", hex: "#F3CFC6" },
    { name: "Dusty Rose", hex: "#C99B96" },
    { name: "Peach", hex: "#F3B88C" },
    { name: "Coral", hex: "#E8785A" },
    { name: "Red", hex: "#B3232E" },
    { name: "Wine", hex: "#6B1F2A" },
    { name: "Mauve", hex: "#9C7A8C" },
    { name: "Lavender", hex: "#D8B4FE" },
    { name: "Lilac", hex: "#C6A8D8" },
    { name: "Sky Blue", hex: "#8EC5E8" },
    { name: "Royal Blue", hex: "#2148A3" },
    { name: "Navy", hex: "#1B2A4A" },
    { name: "Sage Green", hex: "#A8B79C" },
    { name: "Emerald", hex: "#1E6E52" },
    { name: "Mustard", hex: "#D9A441" },
    { name: "Gold", hex: "#C9A24B" },
    { name: "Slate gray", hex: "#8A8D91" },
    { name: "Charcoal", hex: "#3A3A3A" },
    { name: "Black", hex: "#111111" },
];

export const COLOR_NAMES = PALETTE.map((c) => c.name);

// Shade the customer uses if they add a custom color without typing a name
export const DEFAULT_SHADE = "#9C7A3C";

const HEX_RE = /^#[0-9a-f]{6}$/i;

export const isHex = (value) => HEX_RE.test(String(value || "").trim());

export const normalizeHex = (value) => (isHex(value) ? String(value).trim().toUpperCase() : "");

const same = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

// The preset shade for a name, "" when the name isn't one of ours
export const hexForName = (name) => PALETTE.find((c) => same(c.name, name))?.hex || "";

// The dot drawn next to a stored selection (products and design requests both store name + hex)
export const swatchFor = (color, colorHex) => normalizeHex(colorHex) || (isHex(color) ? normalizeHex(color) : hexForName(color));

// A readable label: a preset name stays as it is, a custom shade gains a "Custom" tag
export const colorLabel = (color, colorHex) => {
    const name = String(color || "").trim();
    const hex = swatchFor(name, colorHex);
    if (!name) return hex ? `Custom (${hex})` : "";
    if (isHex(name)) return `Custom (${normalizeHex(name)})`;
    return name;
};

// The choices a customer made, in a readable order. colorHex describes the color
// rather than being a choice of its own, so it is never listed as one.
export const SELECTION_KEYS = ["color", "silhouette", "fit", "neckline", "sleeve", "fabric", "design"];

export const selectionList = (selections = {}) =>
    [
        ...SELECTION_KEYS.map((key) => ({ key, value: selections[key] })),
        ...Object.keys(selections)
            .filter((key) => !SELECTION_KEYS.includes(key) && key !== "colorHex")
            .map((key) => ({ key, value: selections[key] })),
    ].filter((entry) => entry.value);
