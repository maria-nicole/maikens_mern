import mongoose from "mongoose";

// One cart per customer. Items keep their own _id so the cart page can
// change or remove a single line.
const cartItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    size: { type: String, default: "" },
    quantity: { type: Number, min: 1, max: 10, default: 1 },
});

const cartSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
        items: [cartItemSchema],
    },
    { timestamps: true }
);

export const Cart = mongoose.model("Cart", cartSchema);