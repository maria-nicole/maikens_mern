import mongoose from "mongoose";

/* The shop's own settings, in one document.

   The delivery fee lives here rather than in code so the owner can change it from
   the admin console; new online delivery orders are charged whatever it says.
   Orders already placed keep the fee they were charged (see order.shippingFee). */

// What a delivery costs before anyone changes it.
export const DEFAULT_DELIVERY_FEE = 150;

const settingsSchema = new mongoose.Schema(
  {
    deliveryFee: { type: Number, min: 0, default: DEFAULT_DELIVERY_FEE },
  },
  { timestamps: true }
);

export const Settings = mongoose.model("Settings", settingsSchema);

// There is only ever one settings document. This finds it, or creates it with the
// defaults — atomically, so two requests arriving together cannot make two.
export const getSettings = async () =>
  Settings.findOneAndUpdate(
    {},
    { $setOnInsert: { deliveryFee: DEFAULT_DELIVERY_FEE } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
