import express from "express";
import mongoose from "mongoose";
import { Product } from "../models/product.model.js";
import { Review } from "../models/review.model.js";
import { Cart } from "../models/cart.model.js";
import { Favorite } from "../models/favorite.model.js";
import { upload, fileUrl } from "../middleware/upload.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { computeStock, HIDDEN_FROM_PUBLIC } from "../utils/stock.js";

const router = express.Router();

// PUBLIC: catalog (never shows drafts or archived items)
router.get("/", async (req, res) => {
  try {
    const filter = { status: { $nin: HIDDEN_FROM_PUBLIC } };
    if (req.query.category) filter.category = req.query.category;
    res.json(await Product.find(filter).sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN: everything, including drafts and archived. Must stay above "/:id".
router.get("/admin/all", protect, adminOnly, async (req, res) => {
  try {
    res.json(await Product.find().sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN: one product including drafts and archived, for the edit form. Must stay above "/:id".
router.get("/admin/:id", protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Not found" });
    const p = await Product.findById(req.params.id);
    p ? res.json(p) : res.status(404).json({ message: "Not found" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUBLIC: one product for the product page.
// Drafts and archived items are treated as "not found" so customers can't
// open them by guessing or keeping an old link.
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Not found" });
    }
    const p = await Product.findOne({
      _id: req.params.id,
      status: { $nin: HIDDEN_FROM_PUBLIC },
    });
    p ? res.json(p) : res.status(404).json({ message: "Not found" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN: create / update / archive / delete
router.post("/", protect, adminOnly, upload.array("images", 5), async (req, res) => {
  try {
    const data = JSON.parse(req.body.data);
    const images = (req.files || []).map(fileUrl);
    const product = await Product.create({ ...data, ...computeStock(data), images });
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// body: multipart with `data` (JSON) and new `images`.
// data.imageOrder = final photo order: an existing photo's path, or "new:0", "new:1"
// (the index of a newly uploaded file). Existing paths must already belong to this product.
router.put("/:id", protect, adminOnly, upload.array("images", 5), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Not found" });
    const current = await Product.findById(req.params.id);
    if (!current) return res.status(404).json({ message: "Not found" });

    const data = JSON.parse(req.body.data);
    const files = (req.files || []).map(fileUrl);
    const owned = new Set(current.images);
    const order = Array.isArray(data.imageOrder)
      ? data.imageOrder
      : [...(data.keepImages || []), ...files.map((_, i) => `new:${i}`)];
    const images = order
      .map((t) => (typeof t === "string" && t.startsWith("new:") ? files[Number(t.slice(4))] : owned.has(t) ? t : null))
      .filter(Boolean)
      .slice(0, 5);

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { ...data, ...computeStock(data), images },
      { returnDocument: "after", runValidators: true }
    );
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ADMIN: archive / restore. "Active" re-derives Low stock / Out of stock from the sizes.
router.patch("/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Archived", "Active", "Draft"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Not found" });
    product.status = status === "Active" ? computeStock({ sizes: product.sizes, status }).status : status;
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Not found" });
    await Product.findByIdAndDelete(req.params.id);
    // Nothing should keep pointing at a product that no longer exists: its reviews have no
    // page left to show on, and any saved cart line or favourite would be a dead link.
    await Promise.all([
      Review.deleteMany({ product: req.params.id }),
      Favorite.deleteMany({ product: req.params.id }),
      Cart.updateMany({}, { $pull: { items: { product: req.params.id } } }),
    ]);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;