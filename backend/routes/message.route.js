import express from "express";
import mongoose from "mongoose";
import { Message } from "../models/message.model.js";
import { Product } from "../models/product.model.js";
import { Customization } from "../models/customization.model.js";
import { Order } from "../models/order.model.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { upload, fileUrl } from "../middleware/upload.js";
import { QUICK_REPLIES, AUTO_ACK } from "../utils/quickReplies.js";
import { removeUpload } from "../utils/uploads.js";

const router = express.Router();
const MAX_PHOTOS = 4;

const peso = (n) => `₱${Number(n || 0).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
const orderNo = (o) => `#${String(o._id).slice(-6).toUpperCase()}`;

/* ------------------------------ ADMIN ------------------------------ */

// ADMIN: one row per customer with the latest message and unread count
router.get("/conversations", protect, adminOnly, async (req, res) => {
  try {
    const rows = await Message.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$customer",
          last: { $first: "$$ROOT" },
          unread: {
            $sum: { $cond: [{ $and: [{ $eq: ["$sender", "customer"] }, { $eq: ["$read", false] }] }, 1, 0] },
          },
        },
      },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          customerId: "$_id",
          customerName: { $ifNull: ["$user.username", "Unknown customer"] },
          // text if there is any, otherwise describe the photo / shared item
          preview: {
            $cond: [
              { $gt: [{ $strLenCP: { $ifNull: ["$last.body", ""] } }, 0] },
              "$last.body",
              {
                $cond: [
                  { $gt: [{ $size: { $ifNull: ["$last.images", []] } }, 0] },
                  "📷 Photo",
                  {
                    $cond: [
                      { $ifNull: ["$last.share.title", false] },
                      { $concat: ["Shared: ", "$last.share.title"] },
                      "",
                    ],
                  },
                ],
              },
            ],
          },
          time: "$last.createdAt",
          unread: 1,
        },
      },
      { $sort: { time: -1 } },
    ]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN: open a thread (also marks the customer's messages as read)
router.get("/thread/:customerId", protect, adminOnly, async (req, res) => {
  try {
    await Message.updateMany({ customer: req.params.customerId, sender: "customer", read: false }, { read: true });
    res.json(await Message.find({ customer: req.params.customerId }).sort({ createdAt: 1 }));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ADMIN: reply to a customer
router.post("/thread/:customerId", protect, adminOnly, async (req, res) => {
  try {
    const msg = await Message.create({
      customer: req.params.customerId,
      sender: "admin",
      body: req.body?.body,
      read: true,
    });
    res.status(201).json(msg);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* ----------------------------- CUSTOMER ----------------------------- */

// CUSTOMER: the customization requests and orders this customer can share in chat
router.get("/shareables", protect, async (req, res) => {
  try {
    const [customizations, orders] = await Promise.all([
      Customization.find({ customer: req.user._id }).sort({ createdAt: -1 }).limit(20),
      Order.find({ customer: req.user._id }).sort({ createdAt: -1 }).limit(20),
    ]);
    res.json({
      customizations: customizations.map((c) => ({
        id: c._id,
        title: c.base,
        subtitle: `${c.source || "Custom design"} · ${c.status}`,
        createdAt: c.createdAt,
      })),
      orders: orders.map((o) => ({
        id: o._id,
        title: o.item,
        subtitle: `${orderNo(o)} · ${o.status}`,
        createdAt: o.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CUSTOMER: load my own conversation.
// `?after=<messageId>` returns only newer messages, which the chat uses for polling.
router.get("/", protect, async (req, res) => {
  try {
    const filter = { customer: req.user._id };
    if (req.query.after && mongoose.isValidObjectId(req.query.after)) {
      filter._id = { $gt: req.query.after };
    }
    res.json(await Message.find(filter).sort({ _id: 1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Parses the upload and turns multer's errors into friendly JSON
const uploadPhotos = (req, res, next) =>
  upload.array("images", MAX_PHOTOS)(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Each photo must be under 5 MB."
        : err.code === "LIMIT_UNEXPECTED_FILE"
        ? `You can attach up to ${MAX_PHOTOS} photos.`
        : err.message;
    res.status(400).json({ message });
  });

const discardFiles = (files = []) => files.forEach((f) => removeUpload(fileUrl(f)));

// Looks the item up ourselves instead of trusting what the browser sends,
// and only lets customers share their OWN customizations and orders.
async function buildShare(request, user) {
  if (!request || !mongoose.isValidObjectId(request.refId)) return null;

  if (request.kind === "product") {
    const p = await Product.findOne({ _id: request.refId, status: { $ne: "Draft" } });
    if (!p) return null;
    return {
      kind: "product",
      refId: p._id,
      title: p.name,
      subtitle: [p.category, p.eventTypes?.[0]].filter(Boolean).join(" · "),
      detail: peso(p.price),
      image: p.images?.[0] || "",
    };
  }

  if (request.kind === "customization") {
    const c = await Customization.findOne({ _id: request.refId, customer: user._id });
    if (!c) return null;
    return {
      kind: "customization",
      refId: c._id,
      title: c.base,
      subtitle: `${c.source || "Custom design"} · ${c.status}`,
      detail: (c.notes || "").slice(0, 160),
      image: "",
    };
  }

  if (request.kind === "order") {
    const o = await Order.findOne({ _id: request.refId, customer: user._id });
    if (!o) return null;
    const product = o.product ? await Product.findById(o.product) : null;
    return {
      kind: "order",
      refId: o._id,
      title: o.item,
      subtitle: `${orderNo(o)} · ${o.status}`,
      detail: peso(o.total),
      image: product?.images?.[0] || "",
    };
  }

  return null;
}

// CUSTOMER: send a message to the shop.
// multipart/form-data with any of: body (text), images (up to 4 photos),
// share (JSON: { kind, refId }), or quickReplyId.
// Responds with an ARRAY: the customer's message plus any automatic reply.
router.post("/", protect, uploadPhotos, async (req, res) => {
  const fail = (status, message) => {
    discardFiles(req.files);
    return res.status(status).json({ message });
  };

  try {
    if (req.user.role === "admin") return fail(400, "Admins reply from the admin console.");

    const input = req.body || {}; // req.body is undefined when no body parser handled the request
    const quick = QUICK_REPLIES[input.quickReplyId];
    let body = "";
    let images = [];
    let share;

    if (quick) {
      body = quick.question;
      discardFiles(req.files);
    } else {
      body = String(input.body || "").trim();
      images = (req.files || []).map(fileUrl);

      if (input.share) {
        let request;
        try {
          request = JSON.parse(input.share);
        } catch {
          return fail(400, "Invalid shared item.");
        }
        share = await buildShare(request, req.user);
        if (!share) return fail(400, "That item can't be shared.");
      }

      if (!body && images.length === 0 && !share) return fail(400, "Message is empty.");
    }

    // Checked BEFORE saving, so we know what the thread looked like beforehand
    const last = await Message.findOne({ customer: req.user._id }).sort({ _id: -1 });

    const created = [await Message.create({ customer: req.user._id, sender: "customer", body, images, share })];

    if (quick) {
      created.push(
        await Message.create({ customer: req.user._id, sender: "admin", kind: "quick-reply", body: quick.answer, read: true })
      );
    } else if (!last || last.kind === "quick-reply") {
      // Only acknowledge a fresh conversation. Not while the owner is mid-chat,
      // and not twice in a row.
      created.push(
        await Message.create({ customer: req.user._id, sender: "admin", kind: "auto-ack", body: AUTO_ACK, read: true })
      );
    }

    res.status(201).json(created);
  } catch (err) {
    fail(400, err.message);
  }
});

export default router;