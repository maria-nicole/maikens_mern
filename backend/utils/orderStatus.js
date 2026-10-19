import { CANCELLED } from "../models/order.model.js";
import { heldStock, reserveStock, restoreStock, refreshStatuses } from "./stock.js";

/* ------------------------------------------------------------------------------------------
   Moves an order to a new status, keeping the stock it holds in step.

   Cancelling an order hands its stock back, and moving an order off "Cancelled" takes that
   stock again. Both the admin and the staff status routes go through here, so the two can't
   disagree about what a status change does to the inventory.

   Returns { ok: true } on success, or { ok: false, message } when the stock needed to reopen
   a cancelled order is no longer there.
------------------------------------------------------------------------------------------- */
export async function setOrderStatus(order, next) {
    if (order.status === next) return { ok: true };

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
