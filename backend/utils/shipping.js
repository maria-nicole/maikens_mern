import { paymentStatusFor } from "../models/order.model.js";

/* The money on an order: what the items cost, what shipping costs, and what the
   customer still owes. Admin and staff can set the shipping fee on an order from
   their consoles, so these helpers live in one place and both consoles use them. */

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

// What the items add up to, without the shipping.
export const subtotalOf = (order) => {
  if (order?.items?.length) {
    return money(order.items.reduce((s, it) => s + (it.unitPrice || 0) * (it.quantity || 1), 0));
  }
  // Orders from before the items array only carry the total, so take the fee back off.
  return money(Math.max(0, (order?.total || 0) - (order?.shippingFee || 0)));
};

// Set the shipping fee on an order, and bring the total and the payment status with it.
// The money already received is left alone, so the balance simply follows the new total.
export const setShippingFee = (order, fee) => {
  const subtotal = subtotalOf(order);
  order.shippingFee = money(fee);
  order.total = money(subtotal + order.shippingFee);
  order.paymentStatus = paymentStatusFor(order.total, order.amountPaid || 0);
  return order;
};

// A fee the shop can charge: a number, and not negative.
export const cleanShippingFee = (raw) => {
  const fee = Number(raw);
  if (!Number.isFinite(fee) || fee < 0) return null;
  if (fee > 100000) return null;
  return money(fee);
};
