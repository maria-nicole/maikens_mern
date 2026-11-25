import express from "express";
import { getSettings } from "../models/settings.model.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = express.Router();

const httpError = (status, message) => Object.assign(new Error(message), { status });

const SIZE_FIELDS = ["waistline", "bust", "hips"];

const normalizeSizeGuide = (raw) => {
  if (!Array.isArray(raw)) throw httpError(400, "Size guide must be a list of rows.");
  if (raw.length === 0) throw httpError(400, "Add at least one size row.");
  if (raw.length > 30) throw httpError(400, "A size guide can have at most 30 rows.");

  const seen = new Set();
  return raw.map((row, index) => {
    const size = String(row?.size ?? "").trim().toUpperCase();
    if (!size) throw httpError(400, `Row ${index + 1} needs a size label.`);
    if (size.length > 10) throw httpError(400, `Size labels must be 10 characters or fewer.`);
    if (seen.has(size)) throw httpError(400, `${size} appears more than once. Size labels must be unique.`);
    seen.add(size);

    const clean = { size };
    for (const field of SIZE_FIELDS) {
      const value = row?.[field];
      if (value === null || value === undefined || value === "") {
        clean[field] = null;
        continue;
      }
      const number = Number(value);
      if (!Number.isFinite(number) || number < 0 || number > 200) {
        throw httpError(400, `${field} for ${size} must be between 0 and 200, or blank.`);
      }
      clean[field] = Math.round(number * 100) / 100;
    }
    return clean;
  });
};

/* The shop settings.

   Everyone can read them — the delivery fee is what the customer pays, and the
   storefront may want to show it before they sign in. Only the owner/admin changes them. */

router.get("/", async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({ deliveryFee: settings.deliveryFee, sizeGuide: settings.sizeGuide });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// The size guide shown on every product page. Blank measurements are allowed
// (they render as "—"), but size labels must be present and unique.
router.put("/size-guide", protect, adminOnly, async (req, res) => {
  try {
    const settings = await getSettings();
    settings.sizeGuide = normalizeSizeGuide(req.body?.sizeGuide);
    await settings.save();
    res.json({ sizeGuide: settings.sizeGuide });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// The delivery fee charged on new online delivery orders.
router.put("/", protect, adminOnly, async (req, res) => {
  try {
    const raw = Number(req.body?.deliveryFee);
    if (!Number.isFinite(raw) || raw < 0 || raw > 100000) {
      throw httpError(400, "Enter a delivery fee of 0 or more.");
    }
    const settings = await getSettings();
    settings.deliveryFee = Math.round(raw * 100) / 100;
    await settings.save();
    res.json({ deliveryFee: settings.deliveryFee });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.status ? err.message : err.message });
  }
});

export default router;
