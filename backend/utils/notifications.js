import User from "../models/User.js";
import { Notification } from "../models/notification.model.js";

/* ------------------------------------------------------------------------------------------
   Who to tell when something happens.

   These helpers never throw: a notification that can't be written is logged and
   forgotten, because it must never take a checkout or a status change down with it.
   Callers can await them anyway (the swallow happens inside), which keeps the
   notification on disk before the HTTP response goes out.
------------------------------------------------------------------------------------------- */

// One notification to one person.
export async function notifyCustomer(userId, { link = "", ...notification }) {
    if (!userId) return; // walk-ins and deleted accounts have nobody to tell
    try {
        await Notification.create({ ...notification, recipient: userId, link });
    } catch (err) {
        console.error("Notification could not be written:", err.message);
    }
}

// One notification to everyone on the shop side. Each staff member and the owner get
// their own copy, so their bells and read states stay personal.
//
// `link` may be a single path, or one per console when the two land on different tabs:
//   { staff: "/staff?tab=orders", admin: "/admin?tab=orders" }
// `roles` narrows the audience — events whose tab only exists in the owner console
// (design requests, inquiries) are sent to admins alone.
export async function notifyStaff({ link = "", ...notification }, roles = ["staff", "admin"]) {
    try {
        const users = await User.find({ role: { $in: roles }, isActive: { $ne: false } }).select("_id role");
        if (!users.length) return;

        const linkFor = (role) =>
            typeof link === "string" ? link : link?.[role] || link?.all || "";

        await Notification.insertMany(
            users.map((u) => ({ ...notification, recipient: u._id, link: linkFor(u.role) }))
        );
    } catch (err) {
        console.error("Staff notification could not be written:", err.message);
    }
}
