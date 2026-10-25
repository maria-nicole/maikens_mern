import express from "express";
import mongoose from "mongoose";
import { Product } from "../models/product.model.js";
import { Customization } from "../models/customization.model.js";
import { protect } from "../middleware/auth.js";
import { uploadTryOnPhoto } from "../middleware/upload.js";
import { readUpload } from "../utils/uploads.js";
import { HIDDEN_FROM_PUBLIC } from "../utils/stock.js";
import { generateWithGemini, createLimiter } from "../utils/gemini.js";

const router = express.Router();
const limiter = createLimiter({ max: Number(process.env.TRYON_MAX_PER_HOUR) || 6 });

const parsePhoto = (req, res, next) =>
    uploadTryOnPhoto.single("photo")(req, res, (err) => {
        if (!err) return next();
        const message = err.code === "LIMIT_FILE_SIZE" ? "Your photo must be under 5 MB." : err.message;
        res.status(400).json({ message });
    });

// The browser's mimetype can be faked, so check the file's first bytes instead
function sniffMime(buf) {
    if (!buf || buf.length < 12) return null;
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
    if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
    if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") {
        return "image/webp";
    }
    return null;
}

function buildPromptForProduct(product) {
    const garment = product.category === "Barong" ? "barong" : "gown";
    return [
        `Virtual try-on. The first image is a photo of a real person. The second image shows a ${garment} called "${product.name}".`,
        `Produce a photorealistic photo of the SAME person from the first image wearing the ${garment} from the second image.`,
        "Keep the person's face, hair, skin tone, body shape, pose, and the background exactly as in the first photo.",
        `Reproduce the ${garment} faithfully: same color, fabric, neckline, sleeves, silhouette, length, and embellishments as the second image, fitted naturally to the person's body with realistic drape and shadows.`,
        "Replace whatever the person is currently wearing. Do not add text, watermarks, logos, or extra people.",
    ].join(" ");
}

function buildPromptForCustomization(customization) {
    const garment = customization.category === "Barong" ? "barong" : "gown";
    const name = customization.base || customization.customerName ? `${customization.base || "custom"} design` : "custom design";
    return [
        `Virtual try-on. The first image is a photo of a real person. The second image shows a custom ${garment} design called "${name}".`,
        `Produce a photorealistic photo of the SAME person from the first image wearing this custom ${garment}.`,
        "Keep the person's face, hair, skin tone, body shape, pose, and the background exactly as in the first photo.",
        `Reproduce the ${garment} faithfully based on the second image: match its design, color, fabric, neckline, sleeves, silhouette, length, and embellishments, fitted naturally to the person's body with realistic drape and shadows.`,
        "Replace whatever the person is currently wearing. Do not add text, watermarks, logos, or extra people.",
    ].join(" ");
}

// multipart/form-data: photo (file), productId OR customizationId, imageIndex (optional)
router.post("/", protect, parsePhoto, async (req, res) => {
    const userId = String(req.user._id);
    let counted = false;

    const fail = (status, message) => {
        if (counted) limiter.giveBack(userId);
        return res.status(status).json({ message });
    };

    try {
        if (!process.env.GEMINI_API_KEY) {
            console.error("GEMINI_API_KEY is missing from .env");
            return fail(503, "Virtual try-on is temporarily unavailable.");
        }
        if (!req.file) return fail(400, "Please upload a full-body photo.");

        const mimeType = sniffMime(req.file.buffer);
        if (!mimeType) return fail(400, "Please use a JPG, PNG or WebP photo.");

        const { productId, customizationId } = req.body;
        let garment;
        let prompt;

        if (customizationId) {
            if (!mongoose.isValidObjectId(customizationId)) return fail(404, "That design isn't available.");
            const customization = await Customization.findOne({ _id: customizationId });
            if (!customization) return fail(404, "That design isn't available.");
            // Allow owner or admin/staff? For now require ownership
            if (String(customization.customer) !== userId && req.user.role !== "admin" && req.user.role !== "staff") {
                return fail(403, "You don't have permission to try on this design.");
            }
            if (!customization.previewImage) return fail(400, "This design has no AI preview to try on yet.");
            garment = await readUpload(customization.previewImage);
            if (!garment) return fail(400, "This design's preview isn't available to try on.");
            prompt = buildPromptForCustomization(customization);
        } else if (productId) {
            if (!mongoose.isValidObjectId(productId)) return fail(404, "That item isn't available.");
            const product = await Product.findOne({ _id: productId, status: { $nin: HIDDEN_FROM_PUBLIC } });
            if (!product) return fail(404, "That item isn't available.");

            const idx = Number.parseInt(req.body.imageIndex, 10);
            const garmentPath = product.images?.[idx >= 0 ? idx : 0] || product.images?.[0];
            garment = garmentPath ? await readUpload(garmentPath) : null;
            if (!garment) return fail(400, "This item has no photo to try on yet.");
            prompt = buildPromptForProduct(product);
        } else {
            return fail(400, "Please select an item or design to try on.");
        }

        const slot = limiter.take(userId);
        if (!slot.ok) {
            return fail(429, `You've reached the try-on limit for now. Try again in about ${slot.minutes} minute${slot.minutes === 1 ? "" : "s"}.`);
        }
        counted = true;

        const result = await generateWithGemini([
            { text: prompt },
            { text: "Person photo:" },
            { inlineData: { mimeType, data: req.file.buffer.toString("base64") } },
            { text: customizationId ? "Custom design to wear:" : "Item to wear:" },
            { inlineData: { mimeType: garment.mimeType, data: garment.data } },
        ]);

        // Returned inline and never stored
        res.json({
            imageData: `data:${result.mimeType};base64,${result.data}`,
            remaining: slot.remaining,
        });
    } catch (err) {
        console.error("Try-on failed:", err.message);
        fail(err.status || 500, err.status ? err.message : "Something went wrong while creating your preview.");
    }
});

export default router;