import express from "express";
import mongoose from "mongoose";
import { Favorite } from "../models/favorite.model.js";
import { Product } from "../models/product.model.js";
import { protect } from "../middleware/auth.js";
import { HIDDEN_FROM_PUBLIC } from "../utils/stock.js";

const router = express.Router();
router.use(protect); // favorites belong to a logged-in customer

const sendError = (res, err) => res.status(err.status || 500).json({ message: err.message });

// My favorite products, newest first. Drafts and archived items are hidden
// (the favorite stays saved in case the item comes back).
router.get("/", async (req, res) => {
    try {
        const favorites = await Favorite.find({ user: req.user._id }).sort({ createdAt: -1 }).populate("product");
        res.json(
            favorites
                .filter((f) => f.product && !HIDDEN_FROM_PUBLIC.includes(f.product.status))
                .map((f) => f.product)
        );
    } catch (err) {
        sendError(res, err);
    }
});

// Just the ids, so product pages can show a filled heart (must stay above "/:productId")
router.get("/ids", async (req, res) => {
    try {
        const favorites = await Favorite.find({ user: req.user._id }).select("product");
        res.json(favorites.map((f) => String(f.product)));
    } catch (err) {
        sendError(res, err);
    }
});

// Save a product (safe to call twice)
router.post("/:productId", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.productId)) return res.status(404).json({ message: "Not found" });
        const product = await Product.findOne({ _id: req.params.productId, status: { $nin: HIDDEN_FROM_PUBLIC } });
        if (!product) return res.status(404).json({ message: "That item isn't available." });

        try {
            await Favorite.create({ user: req.user._id, product: product._id });
        } catch (err) {
            if (err.code !== 11000) throw err; // already saved: nothing to do
        }
        res.status(201).json({ favorited: true });
    } catch (err) {
        sendError(res, err);
    }
});

// Remove a product
router.delete("/:productId", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.productId)) return res.status(404).json({ message: "Not found" });
        await Favorite.deleteOne({ user: req.user._id, product: req.params.productId });
        res.json({ favorited: false });
    } catch (err) {
        sendError(res, err);
    }
});

export default router;