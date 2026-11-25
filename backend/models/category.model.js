import mongoose from "mongoose";
import { Product } from "./product.model.js";
import { Customization } from "./customization.model.js";

/* The option lists the owner can edit from the admin console. One document per
   option, grouped by `type` and `garment`.

   `eventType` is a catalog-only list and `length` is shared (garment "All"), but
   both appear on the product form. The other design lists are per garment and
   are the same values the customizer offers: color, silhouette, neckline, sleeve,
   fabric, design and fit. The product form, catalog filters, customizer and AI
   prompt all read these lists. */

// The three product-only lists still live here too, so existing installs keep
// their event filters and lengths.
export const COMMON_TYPES = ["eventType", "length"];

// Keys in Customization.selections (and in the product form's design fields).
export const DESIGN_TYPES = ["color", "silhouette", "neckline", "sleeve", "fabric", "design", "fit"];

export const CATEGORY_TYPES = [...COMMON_TYPES, ...DESIGN_TYPES];
export const GARMENTS = ["All", "Gown", "Barong"];

// Which garment a type belongs to. "All" types are shared by both garments.
export const garmentForType = (type) => (COMMON_TYPES.includes(type) ? "All" : null);

// Starting values. The design lists are copied from the customizer's predefined
// options (frontend/src/components/customize/designOptions.js) and the palette.
export const DEFAULT_CATEGORY_OPTIONS = {
  common: {
    eventType: [
      "Wedding",
      "Ninang / Sponsor",
      "Debut",
      "Prom / School event",
      "Party",
      "Formal",
    ],
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
      "Sleeveless", "Spaghetti Strap", "Off Shoulder", "Cap Sleeve", "Short Sleeve", "Long Sleeve",
      "Puff Sleeve",
    ],
    fabric: ["Satin", "Silk", "Tulle", "Lace", "Chiffon", "Organza", "Velvet", "Crepe", "Taffeta", "Sequin"],
    design: ["Floral lace", "Beaded", "Embroidered", "Sequined", "Ruffled", "Plain / minimal"],
  },
  Barong: {
    color: [
      "White", "Ivory", "Cream", "Champagne", "Sky Blue", "Sage Green", "Navy", "Charcoal", "Black", "Wine",
    ],
    fit: ["Classic fit", "Slim fit", "Relaxed fit"],
    sleeve: ["Long Sleeve", "Short Sleeve"],
    fabric: ["Piña", "Jusi", "Organza", "Cotton blend"],
    design: ["Plain", "Floral embroidery", "Geometric embroidery", "Calado cutwork", "Border embroidery"],
  },
};

const categorySchema = new mongoose.Schema(
  {
    type: { type: String, enum: CATEGORY_TYPES, required: true, index: true },
    name: { type: String, required: true, trim: true, maxLength: 60 },
    // "All" for the shared product-only lists; Gown/Barong for design options.
    garment: { type: String, enum: GARMENTS, default: "All", index: true },
  },
  { timestamps: true }
);

// The same option twice in one list would show up twice in the product form.
categorySchema.index({ garment: 1, type: 1, name: 1 }, { unique: true });

export const Category = mongoose.model("Category", categorySchema);

// "Off-shoulder" and "Off Shoulder" are the same choice as far as the lists go.
const optionKey = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const same = (a, b) => optionKey(a) === optionKey(b);
const keyFor = ({ garment, type, name }) => `${garment}|${type}|${optionKey(name)}`;

const defaultDocs = () => [
  ...Object.entries(DEFAULT_CATEGORY_OPTIONS.common).flatMap(([type, names]) =>
    names.map((name) => ({ garment: "All", type, name }))
  ),
  ...["Gown", "Barong"].flatMap((garment) =>
    Object.entries(DEFAULT_CATEGORY_OPTIONS[garment]).flatMap(([type, names]) =>
      names.map((name) => ({ garment, type, name }))
    )
  ),
];

const MIGRATION_ID = "category-design-options-v2";
const SLEEVE_CLEANUP_ID = "category-sleeve-options-v1";

const canonicalSleeves = Object.fromEntries(
  ["Gown", "Barong"].map((garment) => [
    garment,
    new Map(DEFAULT_CATEGORY_OPTIONS[garment].sleeve.map((name) => [optionKey(name), name])),
  ])
);

// Only this old option is retired. Any other custom sleeve the owner added is
// left alone — it may be a real style we don't ship with.
const RETIRED_SLEEVES = new Set(["barrelcuff"]);

/* The first version of the product option lists had "Off-shoulder" and
   "Barrel cuff" alongside the customizer's "Off Shoulder". Fold the old
   spellings onto the customizer's values in both the option list and anything
   already saved on a product or design request, and drop the obsolete cuff
   option. Saved values for a dropped option are left alone (no data loss). */
async function cleanSleeveOptions() {
  const docs = await Category.find({ type: "sleeve" }).lean();
  const kept = new Set();
  for (const doc of docs) {
    if (doc.garment !== "Gown" && doc.garment !== "Barong") continue;
    const canonical = canonicalSleeves[doc.garment].get(optionKey(doc.name));
    if (!canonical) {
      // Only the known obsolete option is retired; custom additions stay.
      if (RETIRED_SLEEVES.has(optionKey(doc.name))) await Category.deleteOne({ _id: doc._id });
      continue;
    }
    const uniqueKey = `${doc.garment}|${optionKey(canonical)}`;
    // The canonical document may appear later in `docs`, so check the DB too
    // before renaming — otherwise the unique index rejects the update.
    const canonicalExists = await Category.exists({
      garment: doc.garment,
      type: "sleeve",
      name: canonical,
      _id: { $ne: doc._id },
    });
    if (kept.has(uniqueKey) || canonicalExists) {
      // A duplicate spelling: keep one canonical document for this garment.
      await Category.deleteOne({ _id: doc._id });
    } else {
      kept.add(uniqueKey);
      if (doc.name !== canonical) await Category.updateOne({ _id: doc._id }, { $set: { name: canonical } });
    }
    // Old products and saved designs get the customizer's spelling too.
    if (doc.name !== canonical) {
      await Promise.all([
        Product.updateMany({ category: doc.garment, sleeve: doc.name }, { $set: { sleeve: canonical } }),
        Customization.updateMany(
          { category: doc.garment, "selections.sleeve": doc.name },
          { $set: { "selections.sleeve": canonical } }
        ),
      ]);
    }
  }
}

/* Seeds a fresh install and upgrades an existing one exactly once.

   Older databases have sleeve options with no garment and a unique index on
   {type, name}, which would block the new per-garment lists (both garments
   offer "Long Sleeve"). Those old sleeve values are moved to Gown so products
   already using them keep matching the form and the filters. An upgrade marker
   keeps later admin deletions from being silently re-seeded. */
export async function ensureDefaultCategories() {
  // Mongoose creates the new index, but won't remove the old one by itself.
  await Category.collection.dropIndex({ type: 1, name: 1 }).catch(() => {});

  const migrations = mongoose.connection.db.collection("app_migrations");
  const done = await migrations.findOne({ _id: MIGRATION_ID });
  if (!done) {
    const count = await Category.countDocuments();
    if (count > 0) {
      const existing = await Category.find({
        $or: [{ garment: { $exists: false } }, { garment: "All" }],
      }).lean();
      const gownSleeves = new Set(
        (await Category.find({ type: "sleeve", garment: "Gown" }).lean()).map((d) => optionKey(d.name))
      );
      for (const item of existing) {
        if (item.type !== "sleeve") continue;
        const key = optionKey(item.name);
        // A previous, interrupted upgrade may already have seeded this value.
        if (gownSleeves.has(key)) {
          await Category.deleteOne({ _id: item._id });
          continue;
        }
        gownSleeves.add(key);
        await Category.updateOne({ _id: item._id }, { $set: { garment: "Gown" } });
      }
      await Category.updateMany({ garment: { $exists: false } }, { $set: { garment: "All" } });
    }

    const existing = await Category.find({}).lean();
    const have = new Set(existing.map(keyFor));
    const missing = defaultDocs().filter((doc) => !have.has(keyFor(doc)));
    if (missing.length) await Category.insertMany(missing, { ordered: false }).catch(() => {});
    await migrations.updateOne({ _id: MIGRATION_ID }, { $set: { doneAt: new Date() } }, { upsert: true });
  }

  // Runs even on installs that already finished the earlier upgrade.
  const cleaned = await migrations.findOne({ _id: SLEEVE_CLEANUP_ID });
  if (!cleaned) {
    await cleanSleeveOptions();
    await migrations.updateOne({ _id: SLEEVE_CLEANUP_ID }, { $set: { doneAt: new Date() } }, { upsert: true });
  }
}
