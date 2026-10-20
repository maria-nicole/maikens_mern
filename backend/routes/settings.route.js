import express from "express";
import { getSettings } from "../models/settings.model.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = express.Router();

const httpError = (status, message) => Object.assign(new Error(message), { status });

/* The shop settings.

   Everyone can read them — the delivery fee is what the customer pays, and the
   storefront may want to show it before they sign in. Only the owner/admin changes them. */

router.get("/", async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({ deliveryFee: settings.deliveryFee });
  } catch (err) {
    res.status(500).json({ message: err.message });
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
