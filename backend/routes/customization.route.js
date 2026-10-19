import express from "express";
import mongoose from "mongoose";
import { Customization, CUSTOMIZATION_STATUSES } from "../models/customization.model.js";
import { Product } from "../models/product.model.js";
import { Message } from "../models/message.model.js";
import { protect, adminOnly } from "../middleware/auth.js";
import {
  normalizeCategory,
  sanitizeSelections,
  missingRequired,
  describeSelections,
} from "../utils/designOptions.js";
import { uploadExists } from "../utils/uploads.js";

const router = express.Router();

// A customer can still change a request until the owner approves it (before production)
const EDITABLE = ["Pending review", "In discussion"];

const httpError = (status, message) => Object.assign(new Error(message), { status });
const sendError = (res, err) => res.status(err.status || 400).json({ message: err.message });

// Turns the request body into the fields we store. Everything is re-checked here
// because the browser's data can't be trusted.
async function buildFields(body) {
  const mode = body.mode === "redesign" ? "redesign" : "scratch";
  let category = normalizeCategory(body.category);

  let product = null;
  if (mode === "redesign") {
    if (!mongoose.isValidObjectId(body.productId)) throw httpError(400, "Pick a gown to redesign first.");
    product = await Product.findById(body.productId);
    if (!product) throw httpError(400, "That design no longer exists.");
    category = normalizeCategory(product.category);
  }

  const selections = sanitizeSelections(category, body.selections);
  const missing = missingRequired(category, selections);
  if (missing.length) throw httpError(400, `Choose a ${missing.join(" and a ")} first.`);

  const customerNotes = String(body.notes || "").trim().slice(0, 500);

  // Only images this server saved itself
  const previewImage = (await uploadExists(body.previewImage)) ? body.previewImage : "";
  const refs = body.references || {};
  const references = {
    content: (await uploadExists(refs.content)) ? refs.content : "",
    style: (await uploadExists(refs.style)) ? refs.style : "",
  };
  const refCount = [references.content, references.style].filter(Boolean).length;

  return {
    category,
    mode,
    product: product?._id,
    base: product ? `Redesign: ${product.name}` : `Full custom ${category.toLowerCase()} design`,
    // Single readable line for the admin console
    notes: [describeSelections(category, selections).join(" · "), customerNotes && `Customer notes: ${customerNotes}`]
      .filter(Boolean)
      .join(" | "),
    source:
      [previewImage && "AI-generated preview", refCount && `${refCount} reference photo${refCount > 1 ? "s" : ""}`]
        .filter(Boolean)
        .join(" + ") || "Selections only",
    selections,
    customerNotes,
    previewImage,
    references,
  };
}

// ADMIN: list all requests
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    res.json(await Customization.find().sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CUSTOMER: my own requests (must stay above "/:id")
router.get("/mine", protect, async (req, res) => {
  try {
    res.json(await Customization.find({ customer: req.user._id }).sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CUSTOMER: one of my requests (admins can open any). Used to reopen a design for editing.
router.get("/:id", protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Request not found." });
    const item = await Customization.findById(req.params.id);
    const mine = item && String(item.customer) === String(req.user._id);
    if (!item || (!mine && req.user.role !== "admin")) return res.status(404).json({ message: "Request not found." });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CUSTOMER: send a design to the boutique for review
router.post("/", protect, async (req, res) => {
  try {
    const fields = await buildFields(req.body || {});
    const created = await Customization.create({
      ...fields,
      customer: req.user._id,
      customerName: req.user.username,
    });
    res.status(201).json(created);
  } catch (err) {
    sendError(res, err);
  }
});

// CUSTOMER: edit my request, allowed until it is approved
router.put("/:id", protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Request not found." });
    const item = await Customization.findOne({ _id: req.params.id, customer: req.user._id });
    if (!item) return res.status(404).json({ message: "Request not found." });
    if (!EDITABLE.includes(item.status)) {
      return res.status(409).json({
        message: "This design is already approved and can't be edited. Message the boutique if you need a change.",
      });
    }

    item.set({ ...(await buildFields(req.body || {})), status: "Pending review" }); // edited, so it needs another look
    await item.save();
    res.json(item);
  } catch (err) {
    sendError(res, err);
  }
});

// CUSTOMER: delete my request, allowed until it is approved
router.delete("/:id", protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Request not found." });
    const item = await Customization.findOne({ _id: req.params.id, customer: req.user._id });
    if (!item) return res.status(404).json({ message: "Request not found." });
    if (!EDITABLE.includes(item.status)) {
      return res.status(409).json({ message: "This design is already approved and can't be deleted. Message the boutique if you need a change." });
    }
    await item.deleteOne();
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN: approve / request changes. An optional `note` is sent to the customer in their chat.
router.patch("/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const { status, note } = req.body;
    if (!CUSTOMIZATION_STATUSES.includes(status)) return res.status(400).json({ message: "Invalid status." });
    const item = await Customization.findByIdAndUpdate(req.params.id, { status }, { returnDocument: "after" });
    if (!item) return res.status(404).json({ message: "Request not found." });

    const text = String(note || "").trim().slice(0, 1000);
    if (text && item.customer) {
      await Message.create({
        customer: item.customer,
        sender: "admin",
        body: text,
        read: true,
        share: {
          kind: "customization",
          refId: item._id,
          title: item.base,
          subtitle: `${item.source || "Custom design"} · ${item.status}`,
          detail: (item.notes || "").slice(0, 160),
          image: item.previewImage || "",
        },
      });
    }
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;