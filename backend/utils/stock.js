import { Product } from "../models/product.model.js";

export const LOW_STOCK_AT = 2;
export const HIDDEN_FROM_PUBLIC = ["Draft", "Archived"];

export function computeStock(data) {
    const totalStock = (data.sizes || []).reduce((s, x) => s + (Number(x.stock) || 0), 0);
    let status = data.status;
    // Draft and Archived are set by hand; every other status is derived from stock
    if (!HIDDEN_FROM_PUBLIC.includes(status)) {
        status = !data.sizes?.length ? "Active"
            : totalStock === 0 ? "Out of stock"
                : totalStock <= LOW_STOCK_AT ? "Low stock" : "Active";
    }
    return { totalStock, status };
}

// Takes stock in ONE atomic step, so two people can't sell the last piece together.
// Returns true if the stock was taken.
export async function reserveStock(product, size, quantity) {
    const result = await Product.updateOne(
        { _id: product._id, sizes: { $elemMatch: { size, stock: { $gte: quantity } } } },
        { $inc: { "sizes.$.stock": -quantity, totalStock: -quantity } }
    );
    return result.modifiedCount === 1;
}

// Gives back stock taken by reserveStock: [{ productId, size, quantity }]
export async function restoreStock(reserved) {
    for (const r of reserved) {
        await Product.updateOne(
            { _id: r.productId, "sizes.size": r.size },
            { $inc: { "sizes.$.stock": r.quantity, totalStock: r.quantity } }
        ).catch(() => { });
    }
}

// What an order is currently holding in stock, as [{ productId, size, quantity }].
// Checkout and walk-in sales record this on the order as `reserved` when they take the
// stock, so cancelling hands back exactly what was taken.
//
// An empty `reserved` means either "recorded, and nothing was held" (the field is set) or a
// legacy order created before the field existed. Mongoose hands both an empty array, so
// $isDefault tells them apart; a legacy order's stock is derived from the live product —
// a line only holds stock when it is ready-to-wear and carries a size.
export async function heldStock(order) {
    if (order.reserved?.length) {
        return order.reserved.map((r) => ({ productId: r.productId, size: r.size, quantity: r.quantity }));
    }
    if (!order.$isDefault("reserved")) return [];

    const held = [];
    for (const item of order.items || []) {
        if (!item.product || !item.size) continue;
        const p = await Product.findById(item.product).select("fulfillment sizes");
        if (!p || p.fulfillment === "Made-to-order") continue;
        if (!p.sizes?.some((s) => s.size === item.size)) continue;
        held.push({ productId: item.product, size: item.size, quantity: item.quantity });
    }
    return held;
}

// Recomputes Low stock / Out of stock after stock changed
export async function refreshStatuses(productIds) {
    for (const id of new Set(productIds.map(String))) {
        const p = await Product.findById(id);
        if (!p || HIDDEN_FROM_PUBLIC.includes(p.status)) continue;
        const { totalStock, status } = computeStock({ sizes: p.sizes, status: p.status });
        await Product.updateOne({ _id: id }, { totalStock, status });
    }
}