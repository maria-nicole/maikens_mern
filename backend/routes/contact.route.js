import express from "express";
import mongoose from "mongoose";
import { ContactMessage } from "../models/contactMessage.model.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 80;
const MAX_SUBJECT = 120;
const MAX_MESSAGE = 2000;

const sendError = (res, err) => {
    if (!err.status) console.error("Contact route failed:", err);
    res.status(err.status || 500).json({ message: err.status ? err.message : "Something went wrong. Please try again." });
};

// A visitor may send a few messages, but not spam the boutique
const sendLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 5 });

// PUBLIC: the "Contact us" form. Saved so the owner can read it in the admin console.
router.post("/", sendLimit, async (req, res) => {
    try {
        const name = String(req.body?.name || "").trim().slice(0, MAX_NAME);
        const email = String(req.body?.email || "").trim().toLowerCase().slice(0, 120);
        const subject = String(req.body?.subject || "").trim().slice(0, MAX_SUBJECT);
        const message = String(req.body?.message || "").trim().slice(0, MAX_MESSAGE);

        if (!name) return res.status(400).json({ message: "Please enter your name." });
        if (!EMAIL.test(email)) return res.status(400).json({ message: "Please enter a valid email address." });
        if (!message) return res.status(400).json({ message: "Please write a message." });

        await ContactMessage.create({ name, email, subject, message });
        res.status(201).json({ message: "Thanks, your message has been sent. We'll get back to you shortly." });
    } catch (err) {
        sendError(res, err);
    }
});

// ADMIN: the inbox, newest first. ?status=unhandled|handled filters it.
router.get("/", protect, adminOnly, async (req, res) => {
    try {
        const filter = {};
        if (req.query.status === "unhandled") filter.handled = false;
        else if (req.query.status === "handled") filter.handled = true;

        const [messages, unhandled] = await Promise.all([
            ContactMessage.find(filter).sort({ createdAt: -1 }).limit(200),
            ContactMessage.countDocuments({ handled: false }),
        ]);
        res.json({ messages, unhandled });
    } catch (err) {
        sendError(res, err);
    }
});

// ADMIN: mark an inquiry handled (or put it back in the inbox)
router.patch("/:id", protect, adminOnly, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Message not found." });
        const handled = req.body?.handled !== false;
        const doc = await ContactMessage.findByIdAndUpdate(req.params.id, { handled }, { returnDocument: "after" });
        doc ? res.json(doc) : res.status(404).json({ message: "Message not found." });
    } catch (err) {
        sendError(res, err);
    }
});

// ADMIN: delete an inquiry
router.delete("/:id", protect, adminOnly, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Message not found." });
        await ContactMessage.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted" });
    } catch (err) {
        sendError(res, err);
    }
});

export default router;
