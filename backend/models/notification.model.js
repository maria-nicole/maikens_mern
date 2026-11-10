import mongoose from "mongoose";

/* ------------------------------------------------------------------------------------------
   One bell notification. A notification is written when something the recipient cares
   about happens (their order moved, a customer messaged the shop, stock ran low), and
   it points at the page in the app where that thing lives, so the bell can take them
   straight there.

   Staff-wide events are copied — one document per staff/admin — rather than shared, so
   each person keeps their own read state. The link is per copy too: a staff copy points
   at the staff console, an admin's at the owner console.
------------------------------------------------------------------------------------------- */

export const NOTIFICATION_TYPES = [
    "order", // an order's status moved (to the customer)
    "new-order", // a customer placed an online order (to the shop)
    "payment", // money was recorded on an order (to the customer)
    "shipping", // the shipping fee changed an order's total (to the customer)
    "message", // chat activity (customer wrote in, or the shop replied)
    "inquiry", // the contact form was used (to the shop)
    "design", // a customization request moved along (either side)
    "stock", // a product dropped to low or out of stock (to the shop)
];

const notificationSchema = new mongoose.Schema(
    {
        recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        type: { type: String, enum: NOTIFICATION_TYPES, required: true },
        title: { type: String, required: true, trim: true, maxlength: 120 },
        body: { type: String, default: "", trim: true, maxlength: 300 },
        link: { type: String, default: "", trim: true }, // frontend path, e.g. "/profile?tab=orders"
        read: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// The bell's list, newest first
notificationSchema.index({ recipient: 1, createdAt: -1 });
// The unread count is asked for on every poll
notificationSchema.index({ recipient: 1, read: 1 });

export const Notification = mongoose.model("Notification", notificationSchema);
