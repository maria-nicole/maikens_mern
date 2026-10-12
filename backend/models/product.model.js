import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: ["Gown", "Barong"], required: true },
    description: { type: String, default: "" },
    material: { type: String, default: "" },
    sleeve: { type: String, default: "" },
    length: { type: String, default: "" },
    price: { type: Number, default: 0, min: 0 },
    eventTypes: [String],
    colors: [{ name: String, hex: String, _id: false }],
    sizes: [{ size: String, stock: { type: Number, min: 0, default: 0 }, _id: false }],
    totalStock: { type: Number, default: 0 },
    fulfillment: { type: String, enum: ["Ready-to-wear", "Made-to-order"], default: "Ready-to-wear" },
    customizable: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["Draft", "Active", "Low stock", "Out of stock", "Archived"],
      default: "Active",
    },
    images: [String], // e.g. "/uploads/abc.jpg"
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", productSchema);