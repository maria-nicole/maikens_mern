import mongoose from "mongoose";

/* The shop's own settings, in one document.

   The delivery fee lives here rather than in code so the owner can change it from
   the admin console; new online delivery orders are charged whatever it says.
   Orders already placed keep the fee they were charged (see order.shippingFee). */

// What a delivery costs before anyone changes it.
export const DEFAULT_DELIVERY_FEE = 150;

// Measurements in inches, copied from the store's own chart. Bump the version
// when these defaults change so an existing settings document is migrated once.
export const SIZE_GUIDE_VERSION = 2;

export const DEFAULT_SIZE_GUIDE = [
  { size: "S", waistline: 29, bust: 36, hips: 36 },
  { size: "M", waistline: 31, bust: 36, hips: 36 },
  { size: "L", waistline: 33, bust: 38, hips: 38 },
  { size: "XL", waistline: 35, bust: 40, hips: 40 },
  { size: "2XL", waistline: 37, bust: 42, hips: 42 },
  { size: "3XL", waistline: 39, bust: 44, hips: 44 },
];

const cloneGuide = () => DEFAULT_SIZE_GUIDE.map((row) => ({ ...row }));

const sizeRowSchema = new mongoose.Schema(
  {
    size: { type: String, required: true, trim: true },
    waistline: { type: Number, default: null },
    bust: { type: Number, default: null },
    hips: { type: Number, default: null },
  },
  { _id: false }
);

const settingsSchema = new mongoose.Schema(
  {
    deliveryFee: { type: Number, min: 0, default: DEFAULT_DELIVERY_FEE },
    sizeGuide: {
      type: [sizeRowSchema],
      default: cloneGuide,
    },
    sizeGuideVersion: { type: Number, default: SIZE_GUIDE_VERSION },
  },
  { timestamps: true }
);

export const Settings = mongoose.model("Settings", settingsSchema);

// There is only ever one settings document. This finds it, or creates it with the
// defaults — atomically, so two requests arriving together cannot make two.
export const getSettings = async () => {
  const settings = await Settings.findOneAndUpdate(
    {},
    {
      $setOnInsert: {
        deliveryFee: DEFAULT_DELIVERY_FEE,
        sizeGuide: cloneGuide(),
        sizeGuideVersion: SIZE_GUIDE_VERSION,
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  // Migrate documents saved before the current chart was added. Once migrated,
  // later owner edits are left alone because the version matches.
  if (settings.sizeGuideVersion !== SIZE_GUIDE_VERSION || !Array.isArray(settings.sizeGuide) || settings.sizeGuide.length === 0) {
    settings.sizeGuide = cloneGuide();
    settings.sizeGuideVersion = SIZE_GUIDE_VERSION;
    await settings.save();
  }
  return settings;
};
