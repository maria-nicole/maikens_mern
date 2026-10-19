import express from "express";
import mongoose from "mongoose";
import { Review } from "../models/review.model.js";
import { Product } from "../models/product.model.js";
import { Order } from "../models/order.model.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { HIDDEN_FROM_PUBLIC } from "../utils/stock.js";
import { canReview, findPurchased, reviewablePurchases, summarizeReviews, REVIEWABLE_STATUS } from "../utils/reviews.js";

const router = express.Router();

// Public routes are not wrapped in protect, so each protected route says so itself.
const sendError = (res, err) => res.status(err.status || 500).json({ message: err.message });

const MAX_TITLE = 80;
const MAX_BODY = 1000;
const MIN_BODY = 2;
const PAGE_SIZE = 20;

// A rating is required and must be a whole star
const readRating = (raw) => {
    const rating = Math.round(Number(raw));
    return Number.isFinite(rating) && rating >= 1 && rating <= 5 ? rating : null;
};

// The written part is required, so a review is more than a number
const readBody = (raw) => {
    const value = String(raw ?? "").trim();
    if (value.length < MIN_BODY) return { error: "Please write a few words about the product." };
    if (value.length > MAX_BODY) return { error: `Your review must be ${MAX_BODY} characters or fewer.` };
    return { value };
};

const readTitle = (raw) => String(raw ?? "").trim().slice(0, MAX_TITLE);

/* ---------------------------- PUBLIC ---------------------------- */

// Everything the product page shows: the visible reviews plus their average.
router.get("/product/:productId", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.productId)) return res.status(404).json({ message: "Not found" });
        const reviews = await Review.find({ product: req.params.productId, hidden: false })
            .sort({ createdAt: -1 })
            .limit(100)
            // Only what a shopper needs — never the reviewer's account or order id
            .select("authorName rating title body createdAt");
        res.json({ reviews, summary: summarizeReviews(reviews) });
    } catch (err) {
        sendError(res, err);
    }
});

/* ------------------------- ADMIN (owner) ------------------------- */
// Registered before the "/:id" routes below purely so the intent reads top-down.

// Every review, in the order the console lists them
router.get("/admin/all", protect, adminOnly, async (req, res) => {
    try {
        const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
        const filter = {};
        if (req.query.hidden === "true") filter.hidden = true;
        if (req.query.hidden === "false") filter.hidden = false;

        const [reviews, total] = await Promise.all([
            Review.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * PAGE_SIZE)
                .limit(PAGE_SIZE)
                // The product may have been removed; the console shows that as "Removed item"
                .populate("product", "name images"),
            Review.countDocuments(filter),
        ]);
        res.json({ reviews, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) });
    } catch (err) {
        sendError(res, err);
    }
});

// Hide or un-hide one review
router.patch("/admin/:id", protect, adminOnly, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Not found" });
        if (typeof req.body?.hidden !== "boolean") return res.status(400).json({ message: "Nothing to update." });
        const review = await Review.findByIdAndUpdate(
            req.params.id,
            { hidden: req.body.hidden },
            { returnDocument: "after" }
        // The console swaps this row in place, so it needs the same populated item
        // the list gives it — otherwise the name and photo would vanish on toggling.
        ).populate("product", "name images");
        if (!review) return res.status(404).json({ message: "Not found" });
        res.json(review);
    } catch (err) {
        sendError(res, err);
    }
});

router.delete("/admin/:id", protect, adminOnly, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Not found" });
        const result = await Review.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ message: "Not found" });
        res.json({ deleted: true });
    } catch (err) {
        sendError(res, err);
    }
});

/* --------------------------- CUSTOMER --------------------------- */

// What this customer may review, and what they already reviewed, so the order card can
// label each button "Write a review" or "Edit your review".
router.get("/reviewable", protect, async (req, res) => {
    try {
        const [orders, reviews] = await Promise.all([
            // Only handed-over orders can justify a review, so only ask for those.
            Order.find({ customer: req.user._id, status: REVIEWABLE_STATUS }).sort({ createdAt: -1 }),
            Review.find({ user: req.user._id }),
        ]);
        res.json(reviewablePurchases({ orders, reviews }));
    } catch (err) {
        sendError(res, err);
    }
});

// Leave a review. The server decides whether this customer earned the right to.
router.post("/", protect, async (req, res) => {
    try {
        const productId = String(req.body?.product || "");
        if (!mongoose.isValidObjectId(productId)) return res.status(404).json({ message: "Not found" });

        const orders = await Order.find({ customer: req.user._id, status: REVIEWABLE_STATUS }).sort({ createdAt: -1 });
        if (!canReview(orders, productId)) {
            return res.status(403).json({ message: "You can review this once your order for it is complete." });
        }

        const product = await Product.findOne({ _id: productId, status: { $nin: HIDDEN_FROM_PUBLIC } });
        if (!product) return res.status(404).json({ message: "That item isn't available." });

        const rating = readRating(req.body?.rating);
        if (!rating) return res.status(400).json({ message: "Choose a rating from 1 to 5 stars." });
        const body = readBody(req.body?.body);
        if (body.error) return res.status(400).json({ message: body.error });

        const order = findPurchased(orders, productId);
        const review = await Review.create({
            user: req.user._id,
            product: product._id,
            order: order._id,
            rating,
            title: readTitle(req.body?.title),
            body: body.value,
            authorName: req.user.username,
        });
        res.status(201).json(review);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: "You've already reviewed this item. Edit your review instead." });
        }
        sendError(res, err);
    }
});

// Edit your own review
router.put("/:id", protect, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Not found" });
        const review = await Review.findOne({ _id: req.params.id, user: req.user._id });
        if (!review) return res.status(404).json({ message: "Not found" });

        const rating = readRating(req.body?.rating);
        if (!rating) return res.status(400).json({ message: "Choose a rating from 1 to 5 stars." });
        const body = readBody(req.body?.body);
        if (body.error) return res.status(400).json({ message: body.error });

        review.rating = rating;
        review.title = readTitle(req.body?.title);
        review.body = body.value;
        // A hidden review stays hidden: editing it must not put it back in the window.
        await review.save();
        res.json(review);
    } catch (err) {
        sendError(res, err);
    }
});

// Delete your own review
router.delete("/:id", protect, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Not found" });
        const result = await Review.deleteOne({ _id: req.params.id, user: req.user._id });
        if (!result.deletedCount) return res.status(404).json({ message: "Not found" });
        res.json({ deleted: true });
    } catch (err) {
        sendError(res, err);
    }
});

export default router;
