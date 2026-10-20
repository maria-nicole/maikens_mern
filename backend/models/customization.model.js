import mongoose from "mongoose";

// Requests move: Pending review -> In discussion <-> Pending review -> Approved.
// Customers can edit a request until it is Approved (before production starts).
export const CUSTOMIZATION_STATUSES = ["Pending review", "In discussion", "Approved"];

const customizationSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // optional so seed.js data still works
    customerName: { type: String, required: true, trim: true },

    // What the customer is designing
    category: { type: String, enum: ["Gown", "Barong"], default: "Gown" },
    mode: { type: String, enum: ["redesign", "scratch"], default: "scratch" },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" }, // the design being redesigned

    // Human-readable fields. The admin console and the chat "share" card already read these.
    base: { type: String, required: true, trim: true },
    notes: { type: String, default: "", trim: true },
    source: { type: String, default: "", trim: true },

    // Structured choices, so the request can be edited and re-previewed later
    // colorHex is the exact shade behind "color" ("" for the older requests that predate it)
    selections: {
      color: { type: String, default: "" },
      colorHex: { type: String, default: "" },
      silhouette: { type: String, default: "" },
      fit: { type: String, default: "" },
      neckline: { type: String, default: "" },
      sleeve: { type: String, default: "" },
      fabric: { type: String, default: "" },
      design: { type: String, default: "" },
    },
    customerNotes: { type: String, default: "", maxlength: 500 },

    previewImage: { type: String, default: "" }, // AI preview, e.g. "/uploads/abc.png"
    references: {
      content: { type: String, default: "" }, // shape photo / sketch
      style: { type: String, default: "" }, // pattern / design photo
    },

    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" }, // set when the owner turns an approved design into an order

    status: { type: String, enum: CUSTOMIZATION_STATUSES, default: "Pending review" },
  },
  { timestamps: true }
);

// The customer's own design list, and the owner's review queue, both filter on these.
customizationSchema.index({ customer: 1, createdAt: -1 });

export const Customization = mongoose.model("Customization", customizationSchema);