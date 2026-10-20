/* ------------------------------------------------------------------------------------------
   Shipping and payment details shown to the customer.

   This module deliberately imports nothing: the order slip (orderSlip.js) needs it, and
   that file stays free of outside imports so it can be rendered outside the app.

   SHIPPING_METHOD must match backend/models/order.model.js.
   DELIVERY_FEE_DEFAULT is only a fallback — the real fee comes from the shop settings
   (the admin console sets it) and is loaded with the rest of the account data.
------------------------------------------------------------------------------------------- */

// Who carries the parcel.
export const SHIPPING_METHOD = "Lalamove";

// What a delivery costs before the owner changes it.
export const DELIVERY_FEE_DEFAULT = 150;

// The courier for an order, or "" when the order isn't being delivered.
// Orders placed before the courier was recorded fall back to the usual one.
export const courierOf = (order) =>
  order?.deliveryMethod === "Delivery" ? order?.shippingMethod || SHIPPING_METHOD : "";

/* ------------------------------------------------------------------------------------------
   How the boutique takes payment.

   Half the product price may be paid to start an order, with the rest settled before
   pick-up or delivery. That is the boutique's practice, not something the checkout
   enforces: an online order is recorded as unpaid, and staff enter each payment by hand
   (see backend/routes/staff.route.js). The wording below says "you may pay", not "you
   pay", so it describes the arrangement without promising an automatic split.

   Payments are not refundable — it is why the wording is firm here. Cancelling an order
   the shop itself cannot fulfil is the one case the staff resolve directly.
------------------------------------------------------------------------------------------- */

export const PAYMENT_POLICY = [
  {
    title: "Half payment to start",
    body: "You may pay half of the product price to begin your order, with the balance settled before pick-up or delivery.",
  },
  {
    title: "Payments are non-refundable",
    body: "Payments cannot be refunded once an order is placed, including a change of mind.",
  },
];

// The policy as one flat sentence per entry, for places with no room for headings.
export const paymentPolicyLines = () => PAYMENT_POLICY.map((p) => `${p.title} — ${p.body}`);
