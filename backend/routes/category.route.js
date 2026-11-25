import express from "express";
import mongoose from "mongoose";
import {
  Category,
  CATEGORY_TYPES,
  GARMENTS,
  COMMON_TYPES,
  ensureDefaultCategories,
} from "../models/category.model.js";
import { Product } from "../models/product.model.js";
import { Customization } from "../models/customization.model.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = express.Router();

const httpError = (status, message) => Object.assign(new Error(message), { status });

const TYPE_LABELS = {
  eventType: "Event type",
  length: "Length",
  color: "Color",
  silhouette: "Silhouette",
  neckline: "Neckline",
  sleeve: "Sleeve style",
  fabric: "Fabric",
  design: "Design detail",
  fit: "Fit",
};

/* Event types, lengths and the customizer's design options are maintained in
   the console's Categories tab. Everyone can read them — the catalog filters,
   the product form, the customizer and the AI prompt need them too — but only
   the owner/admin can change them. */

// Same tidy-up the product form applies to names: collapse runs of whitespace
const cleanName = (raw) => String(raw ?? "").replace(/\s+/g, " ").trim();
// "Off-shoulder" and "Off Shoulder" count as the same option.
const same = (a, b) =>
  String(a || "").replace(/[^a-z0-9]/gi, "").toLowerCase() ===
  String(b || "").replace(/[^a-z0-9]/gi, "").toLowerCase();

// Common lists are shared; design lists belong to one garment.
function garmentFor(type, garment) {
  if (COMMON_TYPES.includes(type)) return "All";
  return GARMENTS.includes(garment) && garment !== "All" ? garment : null;
}

// The lists are small, so a scan in JS keeps "Wedding" and "wedding" from
// sneaking in as two options without regex-escaping the name.
async function nameTaken(type, garment, name, exceptId = null) {
  const others = await Category.find({ type, garment }).lean();
  return others.some((c) => same(c.name, name) && String(c._id) !== String(exceptId));
}

// When an option is renamed, records that already carry the value are updated
// too, so filters, saved designs and the customizer keep matching it.
const PRODUCT_FIELDS = {
  eventType: "eventTypes",
  length: "length",
  color: "colors",
  sleeve: "sleeve",
  fabric: "material",
  silhouette: "silhouette",
  neckline: "neckline",
  design: "design",
  fit: "fit",
};

const SELECTION_FIELDS = {
  color: "color",
  silhouette: "silhouette",
  neckline: "neckline",
  sleeve: "sleeve",
  fabric: "fabric",
  design: "design",
  fit: "fit",
};

async function renameInProducts(type, garment, oldName, name) {
  const field = PRODUCT_FIELDS[type];
  if (!field) return;
  const products = await Product.find(garment === "All" ? {} : { category: garment }).lean();
  const updates = [];
  for (const product of products) {
    const current = product[field];
    let value;
    let changed = false;
    if (type === "eventType") {
      if (!Array.isArray(current)) continue;
      value = current.map((item) => (same(item, oldName) ? name : item));
      changed = current.some((item, i) => item !== value[i]);
    } else if (type === "color") {
      if (!Array.isArray(current)) continue;
      value = current.map((c) => (same(c.name, oldName) ? { ...c, name } : c));
      changed = current.some((c, i) => c.name !== value[i].name);
    } else {
      if (typeof current !== "string" || !same(current, oldName)) continue;
      value = name;
      changed = true;
    }
    if (changed) updates.push(Product.updateOne({ _id: product._id }, { $set: { [field]: value } }));
  }
  if (updates.length) await Promise.all(updates);
}

async function renameInCustomizations(type, garment, oldName, name) {
  const key = SELECTION_FIELDS[type];
  if (!key) return;
  const requests = await Customization.find(garment === "All" ? {} : { category: garment }).lean();
  const updates = [];
  for (const request of requests) {
    if (!same(request.selections?.[key], oldName)) continue;
    updates.push(Customization.updateOne({ _id: request._id }, { $set: { [`selections.${key}`]: name } }));
  }
  if (updates.length) await Promise.all(updates);
}

// PUBLIC: every option, as flat documents grouped by `garment` and `type`.
// ?type=eventType|... and/or ?garment=Gown|Barong|All narrow it down.
router.get("/", async (req, res) => {
  try {
    await ensureDefaultCategories();
    const filter = {};
    if (CATEGORY_TYPES.includes(req.query.type)) filter.type = req.query.type;
    if (GARMENTS.includes(req.query.garment)) filter.garment = req.query.garment;
    res.json(await Category.find(filter).sort({ type: 1, createdAt: 1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN: add an option. body: { type, garment, name }
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const type = req.body?.type;
    if (!CATEGORY_TYPES.includes(type)) {
      throw httpError(400, "Pick which list to add it to.");
    }
    const garment = garmentFor(type, req.body?.garment);
    if (!garment) throw httpError(400, "Pick whether this is for gowns or barongs.");
    const name = cleanName(req.body?.name);
    if (name.length < 2) throw httpError(400, "Enter a name of 2 characters or more.");
    if (name.length > 60) throw httpError(400, "Names are at most 60 characters.");
    if (await nameTaken(type, garment, name)) {
      throw httpError(409, `${TYPE_LABELS[type] || type} "${name}" already exists.`);
    }
    await ensureDefaultCategories();
    res.status(201).json(await Category.create({ type, garment, name }));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// ADMIN: rename an option. body: { name }
// Products and saved design requests already carrying it are updated too.
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw httpError(404, "That option no longer exists.");
    }
    const item = await Category.findById(req.params.id);
    if (!item) throw httpError(404, "That option no longer exists.");

    const name = cleanName(req.body?.name);
    if (name.length < 2) throw httpError(400, "Enter a name of 2 characters or more.");
    if (name.length > 60) throw httpError(400, "Names are at most 60 characters.");
    if (name === item.name) return res.json(item);
    if (await nameTaken(item.type, item.garment, name, item._id)) {
      throw httpError(409, `${TYPE_LABELS[item.type] || item.type} "${name}" already exists.`);
    }

    const oldName = item.name;
    item.name = name;
    await item.save();

    await Promise.all([
      renameInProducts(item.type, item.garment, oldName, name),
      renameInCustomizations(item.type, item.garment, oldName, name),
    ]);
    res.json(item);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// ADMIN: remove an option from a list. Products, saved designs and catalog
// filters keep their stored value; this only stops it being offered going forward.
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw httpError(404, "That option no longer exists.");
    }
    const item = await Category.findByIdAndDelete(req.params.id);
    if (!item) throw httpError(404, "That option no longer exists.");
    res.json({ message: "Deleted", id: item._id, type: item.type, garment: item.garment, name: item.name });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

export default router;
