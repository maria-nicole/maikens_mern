import express from "express";
import mongoose from "mongoose";
import { Product } from "../models/product.model.js";
import { protect } from "../middleware/auth.js";
import { upload, fileUrl } from "../middleware/upload.js";
import {
  normalizeCategory,
  sanitizeSelections,
  missingRequired,
  buildPrompt,
} from "../utils/designOptions.js";
import { readUpload, saveImage, removeUpload } from "../utils/uploads.js";
import { generateWithGemini, httpError, createLimiter } from "../utils/gemini.js";

const router = express.Router();

const limiter = createLimiter({ max: Number(process.env.GEMINI_MAX_PER_HOUR) || 10 });

/* ------------------------------ Route ------------------------------ */
// multipart/form-data. Fields: category, mode ("scratch" | "redesign"), productId (redesign only),
// selections (JSON), notes, plus the reference photos as files "content" / "style"
// or, for photos already saved by an earlier preview, "contentUrl" / "styleUrl".
const parseRefs = (req, res, next) =>
  upload.fields([{ name: "content", maxCount: 1 }, { name: "style", maxCount: 1 }])(req, res, (err) => {
    if (!err) return next();
    const message = err.code === "LIMIT_FILE_SIZE" ? "Each photo must be under 5 MB." : err.message;
    res.status(400).json({ message });
  });

router.post("/generate-gown", protect, parseRefs, async (req, res) => {
  const uploaded = Object.values(req.files || {}).flat().map(fileUrl);
  let counted = false;

  const fail = (status, message) => {
    uploaded.forEach(removeUpload); // don't keep photos from a failed attempt
    if (counted) limiter.giveBack(String(req.user._id))
    return res.status(status).json({ message });
  };

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is missing from .env");
      return fail(503, "Image generation is temporarily unavailable.");
    }

    const input = req.body || {};
    const mode = input.mode === "redesign" ? "redesign" : "scratch";
    let category = normalizeCategory(input.category);

    // Redesign: look the product up ourselves rather than trusting the browser
    let product = null;
    if (mode === "redesign") {
      if (!mongoose.isValidObjectId(input.productId)) return fail(400, "Pick a gown to redesign first.");
      product = await Product.findOne({ _id: input.productId, status: { $nin: ["Draft", "Archived"] } });
      if (!product) return fail(400, "That design isn't available to redesign.");
      category = normalizeCategory(product.category);
    }

    let rawSelections = {};
    try {
      rawSelections = JSON.parse(input.selections || "{}");
    } catch {
      return fail(400, "Your selections couldn't be read. Please try again.");
    }
    const selections = sanitizeSelections(category, rawSelections);
    const missing = missingRequired(category, selections);
    if (missing.length) return fail(400, `Choose a ${missing.join(" and a ")} first.`);

    // Images, in the order the prompt describes them: base, shape reference, style reference
    const base = product?.images?.[0] ? await readUpload(product.images[0]) : null;

    const loadRef = async (role) => {
      const file = req.files?.[role]?.[0];
      const url = file ? fileUrl(file) : input[`${role}Url`];
      if (!url) return null;
      const image = await readUpload(url);
      if (!image && file) throw httpError(400, "Please use a JPG, PNG or WebP photo.");
      return image;
    };
    const content = await loadRef("content");
    const style = await loadRef("style");

    const slot = limiter.take(String(req.user._id))
    if (!slot.ok) {
      return fail(429, `You've reached the preview limit for now. Try again in about ${slot.minutes} minute${slot.minutes === 1 ? "" : "s"}.`);
    }
    counted = true;

    const notes = String(input.notes || "").trim().slice(0, 300);
    const prompt = buildPrompt({
      category,
      mode,
      baseName: product?.name,
      selections,
      notes,
      roles: { base: !!base, content: !!content, style: !!style },
    });

    const parts = [{ text: prompt }];
    [
      [base, "Base reference image (the existing garment to redesign):"],
      [content, "Shape reference image:"],
      [style, "Style reference image:"],
    ].forEach(([image, label]) => {
      if (!image) return;
      parts.push({ text: label });
      parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
    });

    const result = await generateWithGemini(parts);
    const imageUrl = await saveImage(result.data, result.mimeType);

    res.json({
      imageUrl,
      references: { content: content?.url || null, style: style?.url || null },
      remaining: slot.remaining,
    });
  } catch (err) {
    console.error("Generate failed:", err.message);
    fail(err.status || 500, err.status ? err.message : "Something went wrong while generating your preview.");
  }
});

export default router;