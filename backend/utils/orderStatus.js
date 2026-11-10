import { CANCELLED } from "../models/order.model.js";
import { heldStock, reserveStock, restoreStock, refreshStatuses } from "./stock.js";
import { notifyCustomer } from "./notifications.js";

/* ------------------------------------------------------------------------------------------
   Moves an order to a new status, keeping the stock it holds in step.

   Cancelling an order hands its stock back, and moving an order off "Cancelled" takes that
   stock again. Both the admin and the staff status routes go through here, so the two can't
   disagree about what a status change does to the inventory.

   Returns { ok: true } on success, or { ok: false, message } when the stock needed to reopen
   a cancelled order is no longer there.
------------------------------------------------------------------------------------------- */
async function moveOrderStatus(order, next) {
    const enteringCancelled = order.status !== CANCELLED && next === CANCELLED;
    const leavingCancelled = order.status === CANCELLED && next !== CANCELLED;

    if (enteringCancelled) {
        const held = await heldStock(order);
        order.status = next;
        await order.save();
        await restoreStock(held);
        await refreshStatuses(held.map((r) => r.productId)).catch(() => {});
        return { ok: true };
    }

    if (leavingCancelled) {
        const held = await heldStock(order);
        const retaken = [];
        for (const r of held) {
            if (!(await reserveStock({ _id: r.productId }, r.size, r.quantity))) {
                await restoreStock(retaken); // put back whatever we just took
                return {
                    ok: false,
                    message: "This order's items are no longer in stock. Restock the inventory, then reopen the order.",
                };
            }
            retaken.push(r);
        }
        order.status = next;
        await order.save();
        await refreshStatuses(held.map((r) => r.productId)).catch(() => {});
        return { ok: true };
    }

    order.status = next;
    await order.save();
    return { ok: true };
}

export async function setOrderStatus(order, next) {
    const before = order.status;
    if (before === next) return { ok: true };

    const result = await moveOrderStatus(order, next);

    // Tell the customer their order moved — this is the one place every status change
    // (owner console, staff console, either route) passes through. Walk-ins without an
    // account have no bell to ring, so notifyCustomer quietly skips them.
    if (result.ok) {
        await notifyCustomer(order.customer, {
            type: "order",
            title: `Order #${String(order._id).slice(-6).toUpperCase()} is now ${next}`,
            body: order.item || "",
            link: "/profile?tab=orders",
        });
    }

    return result;
}
