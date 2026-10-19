import mongoose from "mongoose";

// A message sent through the public "Contact us" form, by someone who may not have an
// account. It lives in its own collection so the owner can read it in the admin console
// (the chat in /api/messages is tied to a logged-in customer, so a visitor can't use that).
const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    subject: { type: String, default: "", trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    handled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

contactMessageSchema.index({ createdAt: -1 });

export const ContactMessage = mongoose.model("ContactMessage", contactMessageSchema);
