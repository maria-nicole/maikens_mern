/* ------------------------------------------------------------------------------------------
   Shipping details shown to the customer.

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
