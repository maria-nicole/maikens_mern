import express from "express";
import mongoose from "mongoose";
import { Order, ORDER_STATUSES } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { Cart } from "../models/cart.model.js";
import { Customization } from "../models/customization.model.js";
import { Message } from "../models/message.model.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { HIDDEN_FROM_PUBLIC, refreshStatuses } from "../utils/stock.js";
import { setOrderStatus } from "../utils/orderStatus.js";

const router = express.Router();
router.use(protect); // every order route needs a login; customer routes come first, admin routes after adminOnly

const DELIVERY_FEE = 150; // must match the fee shown on the cart page
const MAX_ADDRESS = 250;
const PH_MOBILE = /^(09|\+639)\d{9}$/;

const httpError = (status, message) => Object.assign(new Error(message), { status });

/* ----------------------------- CUSTOMER ----------------------------- */

// CUSTOMER: my own orders, newest first
router.get("/mine", async (req, res) => {
  try {
    res.json(await Order.find({ customer: req.user._id }).sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CUSTOMER: turn my cart into an order.
// The cart, prices and stock all come from the database. The browser only sends
// how it should be fulfilled and paid, so prices can't be tampered with.
router.post("/checkout", async (req, res) => {
  const reserved = []; // stock taken so far: { productId, size, quantity }
  let created = false;

  try {
    const { deliveryMethod, address = "", pickupDate, paymentMethod, gcashNumber = "" } = req.body || {};

    if (!["Delivery", "Pick-up"].includes(deliveryMethod)) throw httpError(400, "Choose delivery or pick-up.");

    const cleanAddress = String(address).trim();
    let pickup;
    if (deliveryMethod === "Delivery") {
      if (!cleanAddress) throw httpError(400, "Please enter your delivery address.");
      if (cleanAddress.length > MAX_ADDRESS) throw httpError(400, `Address must be ${MAX_ADDRESS} characters or fewer.`);
    } else {
      pickup = new Date(`${pickupDate}T00:00:00`);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      if (Number.isNaN(pickup.getTime()) || pickup < startOfToday) throw httpError(400, "Please choose a pick-up date from today onward.");
    }

    if (paymentMethod !== "GCash") throw httpError(400, "Choose a payment method.");
    const gcash = String(gcashNumber).replace(/\s/g, "");
    if (!PH_MOBILE.test(gcash)) throw httpError(400, "Please enter a valid GCash number (e.g. 09XX XXX XXXX).");

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart?.items.length) throw httpError(400, "Your cart is empty.");

    const products = await Product.find({ _id: { $in: cart.items.map((i) => i.product) } });
    const byId = new Map(products.map((p) => [String(p._id), p]));

    const lines = [];
    for (const item of cart.items) {
      const p = byId.get(String(item.product));
      if (!p || HIDDEN_FROM_PUBLIC.includes(p.status)) {
        throw httpError(409, "An item in your cart is no longer available. Please remove it and try again.");
      }

      const hasSizes = p.sizes?.length > 0;
      if (hasSizes && !p.sizes.some((s) => s.size === item.size)) {
        throw httpError(409, `${p.name} is no longer offered in size ${item.size}.`);
      }

      const madeToOrder = p.fulfillment === "Made-to-order";
      if (!madeToOrder && hasSizes) {
        // Take the stock in one atomic step, so two customers can't buy the last piece together
        const result = await Product.updateOne(
          { _id: p._id, sizes: { $elemMatch: { size: item.size, stock: { $gte: item.quantity } } } },
          { $inc: { "sizes.$.stock": -item.quantity, totalStock: -item.quantity } }
        );
        if (result.modifiedCount !== 1) {
          throw httpError(409, `Sorry, ${p.name} (${item.size}) doesn't have enough stock for ${item.quantity}. Please update your cart.`);
        }
        reserved.push({ productId: p._id, size: item.size, quantity: item.quantity });
      }

      lines.push({
        product: p._id,
        name: p.name,
        size: item.size,
        quantity: item.quantity,
        unitPrice: p.price,
        image: p.images?.[0] || "",
        madeToOrder,
      });
    }

    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const shippingFee = deliveryMethod === "Delivery" ? DELIVERY_FEE : 0;
    const summary = lines
      .map((l) => `${l.name}${l.size ? ` (${l.size})` : ""}${l.quantity > 1 ? ` ×${l.quantity}` : ""}`)
      .join(", ")
      .slice(0, 300);

    const order = await Order.create({
      customer: req.user._id,
      customerName: req.user.username,
      channel: "Online",
      fulfillment: lines.some((l) => l.madeToOrder) ? "Made-to-order" : "Ready-to-wear",
      item: summary,
      product: lines[0].product,
      items: lines.map(({ madeToOrder, ...line }) => line),
      reserved: reserved.map((r) => ({ productId: r.productId, size: r.size, quantity: r.quantity })),
      total: subtotal + shippingFee,
      shippingFee,
      deliveryMethod,
      address: deliveryMethod === "Delivery" ? cleanAddress : "",
      pickupDate: pickup,
      paymentMethod,
      gcashNumber: gcash,
    });
    created = true;

    await Cart.deleteOne({ _id: cart._id });
    await refreshStatuses(reserved.map((r) => r.productId));

    res.status(201).json(order);
  } catch (err) {
    // Give back any stock we took if the order never got created
    if (!created) {
      for (const r of reserved) {
        await Product.updateOne(
          { _id: r.productId, "sizes.size": r.size },
          { $inc: { "sizes.$.stock": r.quantity, totalStock: r.quantity } }
        ).catch(() => { });
      }
    }
    res.status(err.status || 500).json({ message: err.status ? err.message : "Couldn't place your order. Please try again." });
    if (!err.status) console.error("Checkout failed:", err);
  }
});

/* ------------------------------ ADMIN ------------------------------ */
router.use(adminOnly); // everything below is admin-only

router.get("/", async (req, res) => {
  try {
    res.json(await Order.find().sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Used for walk-in orders
router.post("/", async (req, res) => {
  try {
    const { customerName, customer, channel, fulfillment, item, product, total } = req.body;
    const order = await Order.create({ customerName, customer, channel, fulfillment, item, product, total, reserved: [] });
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Turn an APPROVED customization request into an order at the agreed price.
// The customer sees it under My Orders and gets a message in their chat.
router.post("/from-customization", async (req, res) => {
  try {
    const { customizationId, total } = req.body || {};
    if (!mongoose.isValidObjectId(customizationId)) throw httpError(404, "Design request not found.");
    const design = await Customization.findById(customizationId);
    if (!design) throw httpError(404, "Design request not found.");
    if (design.status !== "Approved") throw httpError(409, "Approve the design before creating an order.");
    if (design.order) throw httpError(409, "This design already has an order.");

    const price = Math.round(Number(total) * 100) / 100;
    if (!(price > 0)) throw httpError(400, "Enter the agreed price.");

    const order = await Order.create({
      customer: design.customer,
      customerName: design.customerName,
      channel: "Online",
      fulfillment: "Made-to-order",
      item: [design.base, design.notes].filter(Boolean).join(": ").slice(0, 300),
      total: price,
      reserved: [],
      items: [{ name: design.base, size: "", quantity: 1, unitPrice: price, image: design.previewImage || "" }],
    });
    design.order = order._id;
    await design.save();

    if (design.customer) {
      const no = `#${String(order._id).slice(-6).toUpperCase()}`;
      await Message.create({
        customer: design.customer,
        sender: "admin",
        read: true,
        body: `Your custom design is now an order. The agreed total is ₱${price.toLocaleString("en-PH")}. You can follow its progress under My Orders.`,
        share: { kind: "order", refId: order._id, title: order.item, subtitle: `${no} · ${order.status}`, detail: `₱${price.toLocaleString("en-PH")}`, image: design.previewImage || "" },
      });
    }

    res.status(201).json({ order, customization: design });
  } catch (err) {
    res.status(err.status || 400).json({ message: err.message });
  }
});

// Move an order through production. Cancelling hands its stock back, and moving an order
// off "Cancelled" takes that stock again (see utils/orderStatus.js).
router.patch("/:id/status", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, "Order not found.");
    if (!ORDER_STATUSES.includes(req.body?.status)) throw httpError(400, "Invalid status.");
    const order = await Order.findById(req.params.id);
    if (!order) throw httpError(404, "Order not found.");

    const result = await setOrderStatus(order, req.body.status);
    if (!result.ok) throw httpError(409, result.message);
    res.json(order);
  } catch (err) {
    if (!err.status) console.error("Order status update failed:", err);
    res.status(err.status || 400).json({ message: err.status ? err.message : "Couldn't update the order. Please try again." });
  }
});

export default router;