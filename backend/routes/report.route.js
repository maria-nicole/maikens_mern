import express from "express";
import { Order, ORDER_STATUSES, CANCELLED } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { Customization } from "../models/customization.model.js";
import { Message } from "../models/message.model.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = express.Router();
router.use(protect, adminOnly);

const TZ = "Asia/Manila";
const OFFSET_MS = 8 * 60 * 60 * 1000; // the boutique runs on Philippine time (UTC+8, no daylight saving)
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS = 366;
const IN_PROGRESS = ["Order Received", "In Production", "Preparing", "Finished Production"];

const httpError = (status, message) => Object.assign(new Error(message), { status });
const sendError = (res, err) => {
    if (!err.status) console.error("Report route failed:", err);
    res.status(err.status || 500).json({ message: err.status ? err.message : "Couldn't build the report." });
};

// "2026-10-14" for a moment in time, as a Philippine calendar date
const manilaDay = (ms) => new Date(ms + OFFSET_MS).toISOString().slice(0, 10);
const dayStart = (ymd) => new Date(`${ymd}T00:00:00+08:00`);
const dayEnd = (ymd) => new Date(`${ymd}T23:59:59.999+08:00`);

function parseRange(query) {
    const today = manilaDay(Date.now());
    const valid = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || "") && !Number.isNaN(dayStart(v).getTime());
    const to = valid(query.to) ? query.to : today;
    const from = valid(query.from) ? query.from : manilaDay(dayStart(to).getTime() - 29 * DAY_MS);
    const start = dayStart(from);
    const end = dayEnd(to);
    if (start > end) throw httpError(400, "The start date must be before the end date.");
    if ((end - start) / DAY_MS > MAX_DAYS) throw httpError(400, "Please choose a range of one year or less.");
    return { from, to, start, end };
}

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

/* ------------------------------ Dashboard ------------------------------ */
router.get("/dashboard", async (req, res) => {
    try {
        const since = dayStart(manilaDay(Date.now()));
        const [today, active, toProcess, pendingDesigns, unread, lowStock, recent, balances] = await Promise.all([
            Order.aggregate([
                { $match: { createdAt: { $gte: since }, status: { $ne: CANCELLED } } },
                { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$total" } } },
            ]),
            Order.countDocuments({ status: { $in: IN_PROGRESS } }),
            Order.countDocuments({ status: "Order Received" }),
            Customization.countDocuments({ status: "Pending review" }),
            Message.countDocuments({ sender: "customer", read: false }),
            Product.find({ status: { $in: ["Low stock", "Out of stock"] } })
                .select("name category totalStock status images")
                .sort({ totalStock: 1 })
                .limit(8),
            Order.find().sort({ createdAt: -1 }).limit(6),
            Order.aggregate([
                { $match: { status: { $ne: CANCELLED }, $expr: { $lt: [{ $ifNull: ["$amountPaid", 0] }, "$total"] } } },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        due: { $sum: { $subtract: ["$total", { $ifNull: ["$amountPaid", 0] }] } },
                    },
                },
            ]),
        ]);

        res.json({
            today: { count: today[0]?.count || 0, total: money(today[0]?.total) },
            activeOrders: active,
            newOrders: toProcess,
            pendingDesigns,
            unreadMessages: unread,
            balances: { count: balances[0]?.count || 0, due: money(balances[0]?.due) },
            lowStock,
            recent,
        });
    } catch (err) {
        sendError(res, err);
    }
});

/* ------------------------------ Summary report ------------------------------ */
router.get("/summary", async (req, res) => {
    try {
        const { from, to, start, end } = parseRange(req.query);
        const match = { createdAt: { $gte: start, $lte: end } };
        // Cancelled orders still appear in the status breakdown (which uses `match`), but
        // they must not inflate sales, the daily chart, top products, or the totals
        // derived from them.
        const billable = { ...match, status: { $ne: CANCELLED } };

        const [byChannel, daily, byStatus, topProducts, listed, designs] = await Promise.all([
            Order.aggregate([
                { $match: billable },
                {
                    $group: {
                        _id: "$channel",
                        orders: { $sum: 1 },
                        billed: { $sum: "$total" },
                        collected: { $sum: { $ifNull: ["$amountPaid", 0] } },
                    },
                },
            ]),
            Order.aggregate([
                { $match: billable },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } },
                        orders: { $sum: 1 },
                        billed: { $sum: "$total" },
                    },
                },
            ]),
            // Deliberately unfiltered: cancelled orders are counted here so the shop can see them
            Order.aggregate([{ $match: match }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
            Order.aggregate([
                { $match: billable },
                { $unwind: "$items" },
                {
                    $group: {
                        _id: "$items.name",
                        units: { $sum: "$items.quantity" },
                        revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } },
                    },
                },
                { $sort: { revenue: -1 } },
                { $limit: 5 },
            ]),
            Product.find({ status: { $nin: ["Draft", "Archived"] } }).select("name category totalStock status fulfillment"),
            Customization.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        ]);

        // Every day in the range, including quiet ones, so the chart has no gaps
        const dayMap = new Map(daily.map((d) => [d._id, d]));
        const series = [];
        for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
            const key = manilaDay(t);
            series.push({ date: key, orders: dayMap.get(key)?.orders || 0, billed: money(dayMap.get(key)?.billed) });
        }

        const channels = Object.fromEntries(
            ["Online", "Walk-in"].map((c) => {
                const row = byChannel.find((r) => r._id === c);
                return [c, { orders: row?.orders || 0, billed: money(row?.billed), collected: money(row?.collected) }];
            })
        );
        const orders = channels.Online.orders + channels["Walk-in"].orders;
        const billed = money(channels.Online.billed + channels["Walk-in"].billed);
        const collected = money(channels.Online.collected + channels["Walk-in"].collected);

        const tracked = listed.filter((p) => p.fulfillment !== "Made-to-order");
        res.json({
            range: { from, to },
            totals: { orders, billed, collected, outstanding: money(billed - collected), average: orders ? money(billed / orders) : 0 },
            channels,
            daily: series,
            byStatus: ORDER_STATUSES.map((s) => ({ status: s, count: byStatus.find((r) => r._id === s)?.count || 0 })),
            topProducts: topProducts.map((p) => ({ name: p._id, units: p.units, revenue: money(p.revenue) })),
            inventory: {
                designs: listed.length,
                units: tracked.reduce((s, p) => s + (p.totalStock || 0), 0),
                low: tracked.filter((p) => p.status === "Low stock").length,
                out: tracked.filter((p) => p.status === "Out of stock").length,
                watch: tracked
                    .filter((p) => p.status === "Low stock" || p.status === "Out of stock")
                    .sort((a, b) => a.totalStock - b.totalStock)
                    .slice(0, 10)
                    .map((p) => ({ _id: p._id, name: p.name, category: p.category, totalStock: p.totalStock, status: p.status })),
            },
            designs: ["Pending review", "In discussion", "Approved"].map((s) => ({
                status: s,
                count: designs.find((r) => r._id === s)?.count || 0,
            })),
        });
    } catch (err) {
        sendError(res, err);
    }
});

/* ------------------------------ CSV export ------------------------------ */
const csvCell = (v) => {
    let s = String(v ?? "");
    if (/^[=+\-@]/.test(s)) s = `'${s}`; // stops spreadsheets running a customer's text as a formula
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

router.get("/orders.csv", async (req, res) => {
    try {
        const { from, to, start, end } = parseRange(req.query);
        const orders = await Order.find({ createdAt: { $gte: start, $lte: end } }).sort({ createdAt: 1 });

        const head = ["Order", "Date", "Customer", "Channel", "Items", "Type", "Status", "Total", "Paid", "Balance", "Payment status"];
        const rows = orders.map((o) => {
            const paid = money(o.amountPaid);
            return [
                `#${String(o._id).slice(-6).toUpperCase()}`,
                manilaDay(o.createdAt.getTime()),
                o.customerName,
                o.channel,
                o.item,
                o.fulfillment,
                o.status,
                money(o.total),
                paid,
                money(Math.max(0, o.total - paid)),
                o.paymentStatus || "Unpaid",
            ];
        });

        const csv = "\uFEFF" + [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="maikens-orders-${from}-to-${to}.csv"`);
        res.send(csv);
    } catch (err) {
        sendError(res, err);
    }
});

export default router;