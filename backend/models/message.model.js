import mongoose from "mongoose";

// A snapshot of something the customer shared in chat (a product, one of their
// customization requests, or one of their orders). It is copied in when the
// message is sent, so the chat still renders even if the original changes.
const shareSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["product", "customization", "order"], required: true },
    refId: { type: mongoose.Schema.Types.ObjectId },
    title: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    detail: { type: String, default: "" },
    image: { type: String, default: "" }, // e.g. "/uploads/abc.jpg"
  },
  { _id: false }
);

// One document per chat message. A "conversation" is all messages sharing the same customer.
const messageSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sender: { type: String, enum: ["customer", "admin"], required: true },
    // A message needs text, OR at least one photo, OR a shared item
    body: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
      required: function () {
        return !(this.images && this.images.length) && !(this.share && this.share.kind);
      },
    },
    images: [String], // uploaded photos, e.g. "/uploads/abc.jpg"
    share: { type: shareSchema, default: undefined },
    read: { type: Boolean, default: false },
    // "message"     = typed by the customer or the owner
    // "quick-reply" = the system's canned answer to a quick-question chip
    // "auto-ack"    = the "the owner will reply shortly" notice
    kind: { type: String, enum: ["message", "quick-reply", "auto-ack"], default: "message" },
  },
  { timestamps: true }
);

messageSchema.index({ customer: 1, createdAt: -1 });

export const Message = mongoose.model("Message", messageSchema);