import mongoose from "mongoose";

// NOTE: "Completed" is new. Walk-in ready-to-wear sales are handed over on the spot.
// "Cancelled" is off the production path — it is excluded from sales and money-owed
// figures in the reports, so keep that in mind when adding new aggregates.
// Keep the frontend lists (admin/adminLib.js, staff/staffLib.js, account/accountShared.js)
// in sync with this.
export const ORDER_STATUSES = [
  "Order Received",
  "In Production",
  "Preparing",
  "Finished Production",
  "Ready for Pick-Up",
  "Ready for Delivery",
  "Completed",
  "Cancelled",
];

// Statuses that mean the order was called off. Its money must not be counted as
// sold, and it must not be chased as a balance.
export const CANCELLED = "Cancelled";

export const PAYMENT_STATUSES = ["Unpaid", "Partial", "Paid"];
export const PAYMENT_METHODS = ["Cash", "GCash"];

export const paymentStatusFor = (total, paid) => {
  const t = Math.round((total || 0) * 100);
  const p = Math.round((paid || 0) * 100);
  if (p >= t) return "Paid";
  return p > 0 ? "Partial" : "Unpaid";
};

// A snapshot of what was bought, so old orders still read correctly
// if the product is edited or removed later.
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name: { type: String, required: true },
    size: { type: String, default: "" },
    quantity: { type: Number, min: 1, default: 1 },
    unitPrice: { type: Number, min: 0, default: 0 },
    image: { type: String, default: "" }, // e.g. "/uploads/abc.jpg"
  },
  { _id: false }
);

// Every peso the shop receives for an order is one entry here (deposit, balance, full payment)
const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0.01 },
  method: { type: String, enum: PAYMENT_METHODS, required: true },
  tendered: { type: Number, min: 0 }, // cash handed over, so the receipt can show change
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  receivedByName: { type: String, default: "" },
  at: { type: Date, default: Date.now },
});

const orderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // optional: walk-ins may have no account
    customerName: { type: String, required: true, trim: true },
    channel: { type: String, enum: ["Online", "Walk-in"], default: "Online" },
    fulfillment: { type: String, enum: ["Ready-to-wear", "Made-to-order"], default: "Ready-to-wear" },
    item: { type: String, required: true, trim: true }, // one-line summary the admin console shows
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    items: [orderItemSchema], // filled by online checkout and walk-in sales
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, default: "Order Received" },

    // Checkout details (empty for walk-in orders)
    deliveryMethod: { type: String, enum: ["Delivery", "Pick-up"] },
    address: { type: String, default: "", trim: true },
    pickupDate: { type: Date },
    shippingFee: { type: Number, min: 0, default: 0 },
    paymentMethod: { type: String, default: "" },
    gcashNumber: { type: String, default: "" },

    // Payment tracking (staff records these)
    payments: [paymentSchema],
    amountPaid: { type: Number, min: 0, default: 0 },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "Unpaid" },
    servedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    servedByName: { type: String, default: "" },
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });

export const Order = mongoose.model("Order", orderSchema);