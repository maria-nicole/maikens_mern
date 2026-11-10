import express from "express";
import mongoose from "mongoose";
import { Notification } from "../models/notification.model.js";
import { protect } from "../middleware/auth.js";

/* ------------------------------------------------------------------------------------------
   The bell's backend. Everything here is "mine": a signed-in user only ever sees, counts
   and marks their own notifications, whoever they are — customer, staff or owner.
------------------------------------------------------------------------------------------- */

const router = express.Router();
router.use(protect);

const PAGE_SIZE = 20;

// My notifications, newest first.
router.get("/", async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const [items, total, unread] = await Promise.all([
            Notification.find({ recipient: req.user._id })
                .sort({ createdAt: -1 })
                .skip((page - 1) * PAGE_SIZE)
                .limit(PAGE_SIZE),
            Notification.countDocuments({ recipient: req.user._id }),
            Notification.countDocuments({ recipient: req.user._id, read: false }),
        ]);
        res.json({
            items,
            page,
            pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
            unread,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Just the unread count, for the badge between page loads.
router.get("/unread-count", async (req, res) => {
    try {
        res.json({ unread: await Notification.countDocuments({ recipient: req.user._id, read: false }) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Mark one of mine read. The recipient filter is the whole security check: nobody can
// touch a notification that isn't theirs, because everything else simply isn't found.
router.patch("/:id/read", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Notification not found." });
        const doc = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id },
            { read: true },
            { returnDocument: "after" }
        );
        if (!doc) return res.status(404).json({ message: "Notification not found." });
        res.json(doc);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Mark everything of mine read, in one go.
router.post("/read-all", async (req, res) => {
    try {
        const result = await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
        res.json({ updated: result.modifiedCount || 0 });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

export default router;
