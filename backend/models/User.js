import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true

    },
    email: {
        type: String,
        required: true,
        unique: true

    },
    password: {
        type: String,
        required: function () { return !this.googleId; },

    },

    googleId: { 
        type: String, 
        unique: true, 
        sparse: true 
    },

    role: {
        type: String,
        enum: ["customer", "staff", "admin"],
        default: "customer"
    },

    isVerified: {
        type: Boolean,
        default: true
    },
    verificationToken: {
        type: String,
        select: false
    },
    verificationTokenExpiresAt: {
        type: Date,
        select: false
    },
    verificationAttempts: {
        type: Number,
        default: 0,
        select: false
    },

    isActive: { type: Boolean, default: true },

    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    avatar: { type: String, default: "" },

    measurements: { type: mongoose.Schema.Types.Mixed, default: {} },



}, { timestamps: true });

userSchema.pre("save", async function () {
    if (!this.isModified("password")) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;