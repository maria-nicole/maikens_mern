import mongoose from "mongoose";

// One document per (customer, product) pair, like Favorite. Reviews live in their own
// collection rather than an array on Product so that a customer can edit or delete only
// their own, the one-per-product rule can be enforced by the database, and the admin
// console can list every review without loading whole products.
const reviewSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        // The completed order that justified the review, kept as its receipt
        order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },

        rating: { type: Number, required: true, min: 1, max: 5 },
        title: { type: String, trim: true, maxlength: 80, default: "" },
        body: { type: String, required: true, trim: true, minlength: 2, maxlength: 1000 },

        // Snapshot of the account name, so the review still reads correctly if renamed later
        authorName: { type: String, trim: true, default: "" },

        // Moderation: a hidden review stays out of the public list and the average
        hidden: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// One review per customer per product
reviewSchema.index({ user: 1, product: 1 }, { unique: true });
// The public list for a product page, newest first
reviewSchema.index({ product: 1, createdAt: -1 });

export const Review = mongoose.model("Review", reviewSchema);
