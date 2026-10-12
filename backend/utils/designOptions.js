// Single source of truth for what a customer is allowed to pick, on the server.
// The frontend (Customize.jsx) shows the same values with thumbnails: if you add
// or rename an option here, change it there too. Anything not listed is dropped,
// so a customer can't put arbitrary text into the AI prompt through the options.

export const CATEGORIES = ["Gown", "Barong"];

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
export function sanitizeSelections(category, raw) {
  const allowed = CATEGORY_OPTIONS[normalizeCategory(category)];
  const out = {};
  for (const [key, values] of Object.entries(allowed)) {
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

// ["Color: Ivory", "Silhouette: A-Line", ...] in a stable, readable order
export function describeSelections(category, selections) {
  return Object.keys(CATEGORY_OPTIONS[normalizeCategory(category)])
    .filter((key) => selections[key])
    .map((key) => `${LABELS[key]}: ${selections[key]}`);
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