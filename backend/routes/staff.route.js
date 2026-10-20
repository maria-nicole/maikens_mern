import express from "express";
import mongoose from "mongoose";
import {
    Order,
    ORDER_STATUSES,
    CANCELLED,
    PAYMENT_STATUSES,
    PAYMENT_METHODS,
    SHIPPING_METHOD,
    paymentStatusFor,
} from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { Message } from "../models/message.model.js";
import { protect, staffOrAdmin } from "../middleware/auth.js";
import { HIDDEN_FROM_PUBLIC, reserveStock, restoreStock, refreshStatuses } from "../utils/stock.js";
import { setOrderStatus } from "../utils/orderStatus.js";
import { setShippingFee, cleanShippingFee } from "../utils/shipping.js";
import { conversationSummaries } from "../utils/conversations.js";

const router = express.Router();
router.use(protect, staffOrAdmin); // staff and the owner/admin can use everything below

const MAX_LINES = 20;
const MAX_QTY = 20; // per line
const PAGE_SIZE = 20;

const httpError = (status, message) => Object.assign(new Error(message), { status });
const sendError = (res, err) => {
    if (!err.status) console.error("Staff route failed:", err);
    res.status(err.status || 500).json({ message: err.status ? err.message : "Something went wrong. Please try again." });
};

const money = (n) => Math.round(Number(n) * 100) / 100;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};
const parseDay = (value, endOfDay) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
    const d = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}`);
    return Number.isNaN(d.getTime()) ? null : d;
};

// Cash handed over (optional). Must cover what is being paid.
const cleanTender = (method, raw, paid) => {
    if (method !== "Cash" || raw === undefined || raw === null || raw === "") return undefined;
    const tendered = money(raw);
    if (!(tendered >= paid)) throw httpError(400, "The cash received is less than the amount being paid.");
    return tendered;
};

/* ------------------------------ Dashboard ------------------------------ */
router.get("/dashboard", async (req, res) => {
    try {
        const since = startOfToday();
        const [walkIns, collected, toProcess, inProgress, balances, lowStock, recent] = await Promise.all([
            Order.aggregate([
                { $match: { channel: "Walk-in", createdAt: { $gte: since }, status: { $ne: CANCELLED } } },
                { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$total" } } },
            ]),
            // Money actually received today (deposits and balances included)
            Order.aggregate([
                { $unwind: "$payments" },
                { $match: { "payments.at": { $gte: since } } },
                { $group: { _id: "$payments.method", total: { $sum: "$payments.amount" }, count: { $sum: 1 } } },
            ]),
            Order.countDocuments({ channel: "Online", status: "Order Received" }),
            Order.countDocuments({ status: { $in: ["In Production", "Preparing"] } }),
            Order.aggregate([
                { $match: { paymentStatus: { $ne: "Paid" }, status: { $ne: CANCELLED } } },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        due: { $sum: { $subtract: ["$total", { $ifNull: ["$amountPaid", 0] }] } },
                    },
                },
            ]),
            Product.find({ status: { $in: ["Low stock", "Out of stock"] } })
                .select("name category totalStock status images")
                .sort({ totalStock: 1 })
                .limit(8),
            Order.find().sort({ createdAt: -1 }).limit(6),
        ]);

        const by = (method) => collected.find((c) => c._id === method)?.total || 0;
        res.json({
            walkIns: { count: walkIns[0]?.count || 0, total: walkIns[0]?.total || 0 },
            collected: { cash: by("Cash"), gcash: by("GCash"), total: by("Cash") + by("GCash") },
            toProcess,
            inProgress,
            balances: { count: balances[0]?.count || 0, due: balances[0]?.due || 0 },
            lowStock,
            recent,
        });
    } catch (err) {
        sendError(res, err);
    }
});

/* ------------------------------ Walk-in sale ------------------------------ */
// body: { customerName, items: [{ productId, size, quantity }], paymentMethod,
//         amountPaid?, cashReceived?, shippingFee? }
// Prices and stock come from the database. The browser only says what was sold.
router.post("/sales", async (req, res) => {
    const reserved = []; // stock taken so far: { productId, size, quantity }
    let created = false;

    try {
        const { customerName, items, paymentMethod, amountPaid, cashReceived, shippingFee: shippingFeeIn } = req.body || {};

        const name = String(customerName || "").trim().slice(0, 80);
        if (!name) throw httpError(400, "Enter the customer's name.");
        if (!PAYMENT_METHODS.includes(paymentMethod)) throw httpError(400, "Choose Cash or GCash.");
        if (!Array.isArray(items) || items.length === 0) throw httpError(400, "Add at least one item.");
        if (items.length > MAX_LINES) throw httpError(400, `A sale can have up to ${MAX_LINES} lines.`);

        // A walk-in sale that is being delivered carries the courier's fee
        const shippingFee = shippingFeeIn === undefined || shippingFeeIn === null || shippingFeeIn === ""
            ? 0
            : cleanShippingFee(shippingFeeIn);
        if (shippingFee === null) throw httpError(400, "Enter a shipping fee of 0 or more.");

        // Merge repeated product + size lines
        const wanted = new Map();
        for (const raw of items) {
            if (!mongoose.isValidObjectId(raw?.productId)) throw httpError(400, "One of the items is invalid.");
            const quantity = Math.floor(Number(raw.quantity));
            if (!(quantity >= 1)) throw httpError(400, "Quantity must be at least 1.");
            const size = String(raw.size || "");
            const key = `${raw.productId}|${size}`;
            const prev = wanted.get(key);
            wanted.set(key, { productId: String(raw.productId), size, quantity: (prev?.quantity || 0) + quantity });
        }

        const products = await Product.find({ _id: { $in: [...new Set([...wanted.values()].map((w) => w.productId))] } });
        const byId = new Map(products.map((p) => [String(p._id), p]));

        const lines = [];
        for (const w of wanted.values()) {
            const p = byId.get(w.productId);
            if (!p || HIDDEN_FROM_PUBLIC.includes(p.status)) throw httpError(409, "An item in this sale is no longer available.");
            if (w.quantity > MAX_QTY) throw httpError(400, `You can sell up to ${MAX_QTY} of one item at a time.`);

            const hasSizes = p.sizes?.length > 0;
            if (hasSizes && !p.sizes.some((s) => s.size === w.size)) throw httpError(400, `Choose a size for ${p.name}.`);
            const size = hasSizes ? w.size : "";

            const madeToOrder = p.fulfillment === "Made-to-order";
            if (!madeToOrder && hasSizes) {
                if (!(await reserveStock(p, size, w.quantity))) {
                    throw httpError(409, `Not enough stock for ${p.name} (${size}). Check the inventory and try again.`);
                }
                reserved.push({ productId: p._id, size, quantity: w.quantity });
            }

            lines.push({
                product: p._id,
                name: p.name,
                size,
                quantity: w.quantity,
                unitPrice: p.price,
                image: p.images?.[0] || "",
                madeToOrder,
            });
        }

        const total = money(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0) + shippingFee);
        const hasMadeToOrder = lines.some((l) => l.madeToOrder);

        // Ready-to-wear leaves with the customer, so it must be paid in full.
        // Only made-to-order items can take a deposit.
        const paid = amountPaid === undefined || amountPaid === null || amountPaid === "" ? total : money(amountPaid);
        if (!(paid > 0) || paid > total) throw httpError(400, "The amount paid must be more than 0 and no more than the total.");
        if (!hasMadeToOrder && paid < total) {
            throw httpError(400, "Ready-to-wear items must be paid in full. Only made-to-order items can take a deposit.");
        }
        const tendered = cleanTender(paymentMethod, cashReceived, paid);

        const summary = lines
            .map((l) => `${l.name}${l.size ? ` (${l.size})` : ""}${l.quantity > 1 ? ` ×${l.quantity}` : ""}`)
            .join(", ")
            .slice(0, 300);

        const order = await Order.create({
            customerName: name,
            channel: "Walk-in",
            fulfillment: hasMadeToOrder ? "Made-to-order" : "Ready-to-wear",
            item: summary,
            product: lines[0].product,
            items: lines.map(({ madeToOrder, ...line }) => line),
            reserved: reserved.map((r) => ({ productId: r.productId, size: r.size, quantity: r.quantity })),
            total,
            shippingFee,
            shippingMethod: shippingFee > 0 ? SHIPPING_METHOD : "",
            deliveryMethod: shippingFee > 0 ? "Delivery" : undefined,
            status: hasMadeToOrder ? "Order Received" : "Completed",
            paymentMethod,
            payments: [
                { amount: paid, method: paymentMethod, tendered, receivedBy: req.user._id, receivedByName: req.user.username },
            ],
            amountPaid: paid,
            paymentStatus: paymentStatusFor(total, paid),
            servedBy: req.user._id,
            servedByName: req.user.username,
        });
        created = true;

        await refreshStatuses(reserved.map((r) => r.productId)).catch((e) => console.error("Status refresh failed:", e));
        res.status(201).json(order);
    } catch (err) {
        if (!created) await restoreStock(reserved); // give back anything we took
        sendError(res, err);
    }
});

/* ------------------------------ Orders (record keeping) ------------------------------ */
function buildOrderFilter(query) {
    const filter = {};
    if (["Online", "Walk-in"].includes(query.channel)) filter.channel = query.channel;
    if (ORDER_STATUSES.includes(query.status)) filter.status = query.status;
    if (PAYMENT_STATUSES.includes(query.payment)) filter.paymentStatus = query.payment;

    const from = parseDay(query.from, false);
    const to = parseDay(query.to, true);
    if (from || to) filter.createdAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

    const q = String(query.q || "").trim().slice(0, 60);
    if (q) {
        const rx = new RegExp(escapeRegex(q), "i");
        const or = [{ customerName: rx }, { item: rx }];
        // "#A1B2C3" matches the last characters of the order id (that's how order numbers are shown)
        const idPart = q.replace(/^#/, "");
        if (/^[0-9a-f]{1,24}$/i.test(idPart)) {
            or.push({ $expr: { $regexMatch: { input: { $toString: "$_id" }, regex: `${idPart}$`, options: "i" } } });
        }
        filter.$or = or;
    }
    return filter;
}

router.get("/orders", async (req, res) => {
    try {
        const filter = buildOrderFilter(req.query);
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);

        const [orders, total, sums] = await Promise.all([
            Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE),
            Order.countDocuments(filter),
            Order.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        billed: { $sum: "$total" },
                        collected: { $sum: { $ifNull: ["$amountPaid", 0] } },
                    },
                },
            ]),
        ]);

        res.json({
            orders,
            total,
            page,
            pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
            summary: { count: total, billed: sums[0]?.billed || 0, collected: sums[0]?.collected || 0 },
        });
    } catch (err) {
        sendError(res, err);
    }
});

// Move an order through production. Cancelling hands its stock back, and moving an order
// off "Cancelled" takes that stock again (see utils/orderStatus.js).
router.patch("/orders/:id/status", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, "Order not found.");
        if (!ORDER_STATUSES.includes(req.body?.status)) throw httpError(400, "Invalid status.");
        const order = await Order.findById(req.params.id);
        if (!order) throw httpError(404, "Order not found.");

        const result = await setOrderStatus(order, req.body.status);
        if (!result.ok) throw httpError(409, result.message);
        res.json(order);
    } catch (err) {
        sendError(res, err);
    }
});

// Record a payment: a deposit, a balance, or confirming a customer's GCash payment
router.post("/orders/:id/payments", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, "Order not found.");
        const order = await Order.findById(req.params.id);
        if (!order) throw httpError(404, "Order not found.");

        const balance = money(order.total - (order.amountPaid || 0));
        if (balance <= 0) throw httpError(409, "This order is already paid in full.");

        const { method, amount, cashReceived } = req.body || {};
        if (!PAYMENT_METHODS.includes(method)) throw httpError(400, "Choose Cash or GCash.");
        const paid = money(amount);
        if (!(paid > 0) || paid > balance) throw httpError(400, `Enter an amount between 0 and the balance of ₱${balance}.`);
        const tendered = cleanTender(method, cashReceived, paid);

        order.payments.push({ amount: paid, method, tendered, receivedBy: req.user._id, receivedByName: req.user.username });
        order.amountPaid = money((order.amountPaid || 0) + paid);
        order.paymentStatus = paymentStatusFor(order.total, order.amountPaid);
        await order.save();

        res.status(201).json(order);
    } catch (err) {
        sendError(res, err);
    }
});

// Set the shipping fee on an order (the courier's actual charge). The total and the
// payment status follow it, so the balance owed moves with it.
router.patch("/orders/:id/shipping", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, "Order not found.");
        const fee = cleanShippingFee(req.body?.shippingFee);
        if (fee === null) throw httpError(400, "Enter a shipping fee of 0 or more.");
        const order = await Order.findById(req.params.id);
        if (!order) throw httpError(404, "Order not found.");

        setShippingFee(order, fee);
        await order.save();
        res.json(order);
    } catch (err) {
        sendError(res, err);
    }
});

/* ------------------------------ Customers (read-only) ------------------------------ */
// Built from orders, so walk-ins without an account show up too.
router.get("/customers", async (req, res) => {
    try {
        const match = { status: { $ne: CANCELLED } }; // a cancelled order is not money this customer spent
        if (req.query.scope === "today") match.createdAt = { $gte: startOfToday() };
        const q = String(req.query.q || "").trim().slice(0, 60);
        if (q) match.customerName = new RegExp(escapeRegex(q), "i");

        const rows = await Order.aggregate([
            { $match: match },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: { $ifNull: ["$customer", "$customerName"] },
                    name: { $first: "$customerName" },
                    orders: { $sum: 1 },
                    spent: { $sum: "$total" },
                    paid: { $sum: { $ifNull: ["$amountPaid", 0] } },
                    last: { $max: "$createdAt" },
                },
            },
            { $sort: { last: -1 } },
            { $limit: 100 },
            { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    key: { $toString: "$_id" },
                    name: 1,
                    orders: 1,
                    spent: 1,
                    paid: 1,
                    last: 1,
                    phone: { $ifNull: ["$user.phone", ""] },
                    email: { $ifNull: ["$user.email", ""] },
                    registered: { $cond: [{ $ifNull: ["$user", false] }, true, false] },
                },
            },
        ]);
        res.json(rows);
    } catch (err) {
        sendError(res, err);
    }
});

/* ------------------------------ Messages (read-only) ------------------------------ */
// Staff can read inquiries for context. Replying stays with the owner, and
// reading here does NOT mark messages as read for the owner.
router.get("/conversations", async (req, res) => {
    try {
        res.json(await conversationSummaries());
    } catch (err) {
        sendError(res, err);
    }
});

router.get("/threads/:customerId", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.customerId)) throw httpError(404, "Conversation not found.");
        res.json(await Message.find({ customer: req.params.customerId }).sort({ createdAt: 1 }).limit(300));
    } catch (err) {
        sendError(res, err);
    }
});

export default router;