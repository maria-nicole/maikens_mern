// Single source of truth for what a customer is allowed to pick, on the server.
// The default values come from backend/models/category.model.js, which the owner
// can edit from the admin console. Requests are checked against the current DB
// lists, so an option added there is accepted here too; anything else is dropped.
//
// Colors are the one exception: besides the named shade, a customer may send a
// shade of their own as a valid #RRGGBB hex (selections.colorHex) plus an optional
// short name (selections.color).

import { Category, DEFAULT_CATEGORY_OPTIONS, ensureDefaultCategories } from "../models/category.model.js";

export const CATEGORIES = ["Gown", "Barong"];

// Static fallback: identical to what a fresh install seeds, so the shop still
// works before the first DB read (or if the DB is briefly unreachable).
// Length is a shared list, but customers can pick it in the customizer too.
const withLength = (garment) => ({
  length: [...DEFAULT_CATEGORY_OPTIONS.common.length],
  ...Object.fromEntries(Object.entries(DEFAULT_CATEGORY_OPTIONS[garment])),
});

export const CATEGORY_OPTIONS = {
  Gown: withLength("Gown"),
  Barong: withLength("Barong"),
};

// Minimum a customer must choose before the AI can produce something useful
export const REQUIRED = {
  Gown: ["color", "silhouette"],
  Barong: ["color", "fit"],
};

export const LABELS = {
  color: "Color",
  length: "Length",
  silhouette: "Silhouette",
  fit: "Fit",
  neckline: "Neckline",
  sleeve: "Sleeve",
  fabric: "Fabric",
  design: "Design details",
};

export const normalizeCategory = (value) => (CATEGORIES.includes(value) ? value : "Gown");

const copyOptions = (options) => Object.fromEntries(Object.entries(options).map(([k, v]) => [k, [...v]]));

/* Reads the current option lists for one garment. Missing/DB errors fall back
   to the seeded defaults rather than blocking a design request. */
export async function getDesignOptions(category) {
  const garment = normalizeCategory(category);
  try {
    await ensureDefaultCategories();
    const out = Object.fromEntries(Object.keys(CATEGORY_OPTIONS[garment]).map((key) => [key, []]));
    // Design lists belong to the garment; `length` is shared ("All"). Filtering
    // by the keys above keeps `eventType` out of the customer's choices.
    const docs = await Category.find({
      garment: { $in: [garment, "All"] },
      type: { $in: Object.keys(out) },
    }).sort({ type: 1, createdAt: 1 }).lean();
    for (const doc of docs) {
      if (Array.isArray(out[doc.type]) && doc.name) out[doc.type].push(doc.name);
    }
    return out;
  } catch {
    return copyOptions(CATEGORY_OPTIONS[garment]);
  }
}

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
function sanitizeColor(raw, allowedColors = []) {
  const hex = cleanHex(raw?.colorHex);
  const wanted = String(raw?.color ?? "").trim().toLowerCase();
  const preset = allowedColors.find((name) => name.toLowerCase() === wanted);
  if (preset) return hex ? { color: preset, colorHex: hex } : { color: preset };
  if (!hex) return null;
  const name = cleanName(raw?.color);
  return { color: name || hex, colorHex: hex };
}

export function sanitizeSelections(category, raw, options) {
  const allowed = options || CATEGORY_OPTIONS[normalizeCategory(category)];
  const out = {};
  for (const [key, values] of Object.entries(allowed)) {
    // Color is validated on its own, so a custom shade can come through too
    if (key === "color") {
      const color = sanitizeColor(raw, values);
      if (color) Object.assign(out, color);
      continue;
    }
    const v = String(raw?.[key] ?? "").trim();
    if (v && values.some((name) => String(name).toLowerCase() === v.toLowerCase())) {
      out[key] = values.find((name) => String(name).toLowerCase() === v.toLowerCase());
    }
  }
  return out;
}

export function missingRequired(category, selections, options) {
  return REQUIRED[normalizeCategory(category)]
    // A list the owner emptied out can't be required any more.
    .filter((key) => !options || (options[key] || []).length > 0)
    .filter((key) => !selections[key])
    .map((key) => LABELS[key].toLowerCase());
}

// "Color: Dusty Teal (#7B2D26); Silhouette: A-Line" - one readable pair per choice.
// Custom shades carry their hex, so the prompt knows the exact color, not just a name.
export function describeSelections(category, selections, options) {
  const allowed = options || CATEGORY_OPTIONS[normalizeCategory(category)];
  return Object.keys(allowed)
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
export async function buildPrompt({ category, mode, baseName, selections, notes, roles, options }) {
  const garment = category === "Barong" ? "Barong Tagalog (traditional Filipino formal shirt)" : "gown";
  const specs = describeSelections(category, selections, options || (await getDesignOptions(category))).join("; ");

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
