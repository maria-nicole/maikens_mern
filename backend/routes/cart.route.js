import express from "express";
import mongoose from "mongoose";
import { Cart } from "../models/cart.model.js";
import { Product } from "../models/product.model.js";
import { protect } from "../middleware/auth.js";
import { HIDDEN_FROM_PUBLIC } from "../utils/stock.js";

const router = express.Router();
router.use(protect); // every cart route needs a logged-in customer

const MAX_QTY = 10;

const httpError = (status, message) => Object.assign(new Error(message), { status });
const sendError = (res, err) => res.status(err.status || 500).json({ message: err.message });

// How many of this size can still be bought. Infinity = no limit (made-to-order, or no sizes tracked).
function stockFor(product, size) {
    if (product.fulfillment === "Made-to-order" || !product.sizes?.length) return Infinity;
    return product.sizes.find((s) => s.size === size)?.stock ?? 0;
}

// Turns the stored cart into what the cart page needs: product details, live prices,
// and a plain-language "issue" for any line that can't be bought right now.
async function present(cart) {
    const items = cart?.items || [];
    const products = await Product.find({ _id: { $in: items.map((i) => i.product) } });
    const byId = new Map(products.map((p) => [String(p._id), p]));

    const lines = items.map((i) => {
        const p = byId.get(String(i.product));
        const listed = p && !HIDDEN_FROM_PUBLIC.includes(p.status);
        let issue = "";
        let maxQty = MAX_QTY;

        if (!listed) {
            issue = "No longer available";
            maxQty = i.quantity;
        } else {
            const stock = stockFor(p, i.size);
            maxQty = Math.min(MAX_QTY, stock);
            if (stock === 0) issue = "Out of stock";
            else if (i.quantity > stock) issue = `Only ${stock} left`;
        }

        const unitPrice = listed ? p.price : 0;
        return {
            _id: i._id,
            productId: i.product,
            name: p?.name || "Unavailable item",
            category: p?.category || "",
            image: p?.images?.[0] || "",
            fulfillment: p?.fulfillment || "",
            size: i.size,
            quantity: i.quantity,
            unitPrice,
            lineTotal: unitPrice * i.quantity,
            maxQty,
            issue,
        };
    });

    return {
        items: lines,
        itemCount: lines.reduce((s, l) => s + l.quantity, 0),
        subtotal: lines.reduce((s, l) => s + l.lineTotal, 0),
        hasIssues: lines.some((l) => l.issue),
    };
}

// My cart
router.get("/", async (req, res) => {
    try {
        res.json(await present(await Cart.findOne({ user: req.user._id })));
    } catch (err) {
        sendError(res, err);
    }
});

// Add an item (adds to the quantity if the same product and size is already in the cart)
router.post("/", async (req, res) => {
    try {
        const { productId, size = "", quantity = 1 } = req.body || {};
        if (!mongoose.isValidObjectId(productId)) throw httpError(400, "Pick a product first.");

        const product = await Product.findOne({ _id: productId, status: { $nin: HIDDEN_FROM_PUBLIC } });
        if (!product) throw httpError(404, "That item isn't available.");

        const hasSizes = product.sizes?.length > 0;
        const chosenSize = hasSizes ? String(size) : "";
        if (hasSizes && !product.sizes.some((s) => s.size === chosenSize)) throw httpError(400, "Please choose a size.");

        const stock = stockFor(product, chosenSize);
        if (stock === 0) throw httpError(400, "Sorry, that size is out of stock.");

        const qty = Math.min(MAX_QTY, Math.max(1, Math.floor(Number(quantity)) || 1));

        const cart = (await Cart.findOne({ user: req.user._id })) || new Cart({ user: req.user._id, items: [] });
        const existing = cart.items.find((i) => String(i.product) === String(product._id) && i.size === chosenSize);
        if (existing) existing.quantity = Math.min(MAX_QTY, stock, existing.quantity + qty);
        else cart.items.push({ product: product._id, size: chosenSize, quantity: Math.min(qty, stock) });

        await cart.save();
        res.status(201).json(await present(cart));
    } catch (err) {
        sendError(res, err);
    }
});

// Change one line's quantity
router.patch("/:itemId", async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id });
        const item = cart?.items.id(req.params.itemId);
        if (!item) throw httpError(404, "That item isn't in your cart.");

        const product = await Product.findById(item.product);
        const stock = product ? stockFor(product, item.size) : MAX_QTY;
        const qty = Math.floor(Number(req.body?.quantity));
        if (!(qty >= 1)) throw httpError(400, "Quantity must be at least 1.");

        item.quantity = Math.min(qty, MAX_QTY, stock === Infinity ? MAX_QTY : Math.max(1, stock));
        await cart.save();
        res.json(await present(cart));
    } catch (err) {
        sendError(res, err);
    }
});

// Remove one line
router.delete("/:itemId", async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) return res.json(await present(null));
        cart.items.pull({ _id: req.params.itemId });
        await cart.save();
        res.json(await present(cart));
    } catch (err) {
        sendError(res, err);
    }
});

export default router;