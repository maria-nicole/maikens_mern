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
        // Never sent to a client by default. Every route that returns a user therefore
        // omits the hash without having to remember .select("-password"), which is one
        // forgotten call away from leaking it.
        select: false,

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

    // Password reset. Only the hash of the emailed token is stored, and it is single-use:
    // it is cleared the moment the password changes. select:false, like the fields above,
    // so a reset token can never ride along in a user response.
    resetToken: {
        type: String,
        select: false
    },
    resetTokenExpiresAt: {
        type: Date,
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