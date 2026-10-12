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

// Recomputes Low stock / Out of stock after stock changed
export async function refreshStatuses(productIds) {
    for (const id of new Set(productIds.map(String))) {
        const p = await Product.findById(id);
        if (!p || HIDDEN_FROM_PUBLIC.includes(p.status)) continue;
        const { totalStock, status } = computeStock({ sizes: p.sizes, status: p.status });
        await Product.updateOne({ _id: id }, { totalStock, status });
    }
}