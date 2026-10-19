// Single source of truth for what a customer is allowed to pick, on the server.
// The frontend (Customize.jsx) shows the same values with thumbnails: if you add
// or rename an option here, change it there too. Anything not listed is dropped,
// so a customer can't put arbitrary text into the AI prompt through the options.
//
// Colors are the one exception: besides the named shade below, a customer may send a
// shade of their own. A custom color is accepted as a valid #RRGGBB hex (selections.colorHex)
// plus an optional short name (selections.color). Anything else is dropped.

export const CATEGORIES = ["Gown", "Barong"];

// Must match PALETTE in frontend/src/lib/colors.js
const COLORS = [
  "White", "Ivory", "Cream", "Champagne", "Blush", "Dusty Rose", "Peach", "Coral", "Red", "Wine",
  "Mauve", "Lavender", "Lilac", "Sky Blue", "Royal Blue", "Navy", "Sage Green", "Emerald", "Mustard",
  "Gold", "Slate gray", "Charcoal", "Black",
];

export const CATEGORY_OPTIONS = {
  Gown: {
    color: COLORS,
    silhouette: [
      "A-Line", "Ball Gown", "Mermaid", "Trumpet", "Sheath", "Empire Waist", "Fit and Flare", "Column",
      "Tea Length", "High Low",
    ],
    neckline: ["Sweetheart", "V-Neck", "Scoop Neck", "Square Neck", "Halter", "High Neck", "Boat Neck"],
    sleeve: [
      "Sleeveless", "Spaghetti Strap", "Off Shoulder", "Cap Sleeve", "Short Sleeve", "Long Sleeve",
      "Puff Sleeve", "Bishop Sleeve",
    ],
    fabric: ["Satin", "Silk", "Tulle", "Lace", "Chiffon", "Organza", "Velvet", "Crepe", "Taffeta", "Sequin"],
    design: ["Floral lace", "Beaded", "Embroidered", "Sequined", "Ruffled", "Plain / minimal"],
  },
  Barong: {
    color: COLORS,
    fit: ["Classic fit", "Slim fit", "Relaxed fit"],
    sleeve: ["Long Sleeve", "Short Sleeve"],
    fabric: ["Piña", "Jusi", "Organza", "Cotton blend"],
    design: ["Plain", "Floral embroidery", "Geometric embroidery", "Calado cutwork", "Border embroidery"],
  },
};

// Minimum a customer must choose before the AI can produce something useful
export const REQUIRED = {
  Gown: ["color", "silhouette"],
  Barong: ["color", "fit"],
};

export const LABELS = {
  color: "Color",
  silhouette: "Silhouette",
  fit: "Fit",
  neckline: "Neckline",
  sleeve: "Sleeve",
  fabric: "Fabric",
  design: "Design details",
};

export const normalizeCategory = (value) => (CATEGORIES.includes(value) ? value : "Gown");

// Keeps only keys/values that exist for this category
const HEX_RE = /^#[0-9a-f]{6}$/i;

// "#7b2d26" -> "#7B2D26", anything else -> ""
const cleanHex = (value) => {
  const hex = String(value ?? "").trim();
  return HEX_RE.test(hex) ? hex.toUpperCase() : "";
};

// A custom shade name is customer text, so keep it short and plain: letters, digits and a
// few punctuation marks only. Empty when nothing usable is left.
const cleanName = (value) =>
  String(value ?? "")
    .replace(/[^\w .#'-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);

// A color is either one of our named shades, or a custom shade the customer picked
// (which must come with a valid hex). null means "not something we can use".
function sanitizeColor(raw) {
  const hex = cleanHex(raw?.colorHex);
  const wanted = String(raw?.color ?? "").trim().toLowerCase();
  const preset = COLORS.find((name) => name.toLowerCase() === wanted);
  if (preset) return hex ? { color: preset, colorHex: hex } : { color: preset };
  if (!hex) return null;
  const name = cleanName(raw?.color);
  return { color: name || hex, colorHex: hex };
}

// Keeps only keys/values that exist for this category
export function sanitizeSelections(category, raw) {
  const allowed = CATEGORY_OPTIONS[normalizeCategory(category)];
  const out = {};
  for (const [key, values] of Object.entries(allowed)) {
    // Color is validated on its own, so a custom shade can come through too
    if (key === "color") {
      const color = sanitizeColor(raw);
      if (color) Object.assign(out, color);
      continue;
    }
    const v = String(raw?.[key] ?? "").trim();
    if (v && values.includes(v)) out[key] = v;
  }
  return out;
}

export function missingRequired(category, selections) {
  return REQUIRED[normalizeCategory(category)]
    .filter((key) => !selections[key])
    .map((key) => LABELS[key].toLowerCase());
}

// "Color: Dusty Teal (#7B2D26); Silhouette: A-Line" - one readable pair per choice.
// Custom shades carry their hex, so the prompt knows the exact color, not just a name.
export function describeSelections(category, selections) {
  return Object.keys(CATEGORY_OPTIONS[normalizeCategory(category)])
    .filter((key) => selections[key])
    .map((key) => {
      const hex = key === "color" ? cleanHex(selections.colorHex) : "";
      if (!hex) return `${LABELS[key]}: ${selections[key]}`;
      if (selections[key] === hex) return `${LABELS[key]}: ${hex} (custom shade)`;
      return `${LABELS[key]}: ${selections[key]} (${hex})`;
    });
}

// roles = { base: bool, content: bool, style: bool } tells the model which images are attached.
// The images themselves are added by the route, in the order base, content, style.
export function buildPrompt({ category, mode, baseName, selections, notes, roles }) {
  const garment = category === "Barong" ? "Barong Tagalog (traditional Filipino formal shirt)" : "gown";
  const specs = describeSelections(category, selections).join("; ");

  const subject =
    mode === "redesign" && roles.base
      ? `Redesign the existing ${garment} "${baseName}" shown in the base reference image. Keep its overall construction and proportions, and change only what the specifications below call for.`
      : `Design a ${garment} that follows the specifications below.`;

  const lines = [subject, `Specifications: ${specs}.`];
  if (roles.content) lines.push("Follow the overall shape and proportions of the shape reference image.");
  if (roles.style) lines.push("Borrow the pattern, embellishment and fabric look of the style reference image, but not its shape.");
  if (notes) lines.push(`Extra details from the customer: ${notes}`);

  lines.push(
    "Output one photorealistic, front-facing, full-length studio photograph of the finished garment worn by a model standing straight, facing the camera, arms relaxed at the sides.",
    "Plain light-gray seamless background, soft even lighting, no harsh shadows.",
    "Show the entire garment from shoulder to hem with no cropping.",
    "This image is a construction reference for tailors, so accuracy to the specifications matters more than artistic effect: no side or back view, no props, no text, watermarks or logos."
  );
  return lines.join(" ");
}