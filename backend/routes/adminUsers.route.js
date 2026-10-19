import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = express.Router();
router.use(protect, adminOnly);

const ROLES = ["customer", "staff", "admin"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const httpError = (status, message) => Object.assign(new Error(message), { status });
const sendError = (res, err) => {
  if (err.code === 11000) return res.status(409).json({ message: "That username or email is already taken." });
  if (!err.status) console.error("Admin users route failed:", err);
  res.status(err.status || 500).json({ message: err.status ? err.message : "Something went wrong. Please try again." });
};

// All accounts, newest first
router.get("/", async (req, res) => {
  try {
    res.json(await User.find().select("-password").sort({ _id: -1 }));
  } catch (err) {
    sendError(res, err);
  }
});

// Create an account (usually staff). Password is hashed by the User model.
router.post("/", async (req, res) => {
  try {
    const username = String(req.body?.username || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const role = req.body?.role;

    if (username.length < 2 || username.length > 40) throw httpError(400, "Username must be 2 to 40 characters.");
    if (!EMAIL.test(email)) throw httpError(400, "Enter a valid email address.");
    if (password.length < 8 || !/\d/.test(password)) throw httpError(400, "Password needs at least 8 characters and a number.");
    if (!ROLES.includes(role)) throw httpError(400, "Choose a role.");

    const user = await User.create({ username, email, password, role, isVerified: true });
    const { password: _omit, ...safe } = user.toObject();
    res.status(201).json(safe);
  } catch (err) {
    sendError(res, err);
  }
});

// Deactivate / reactivate
router.patch("/:id/status", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, "User not found.");
    if (req.params.id === String(req.user._id)) throw httpError(400, "You can't deactivate your own account.");
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: Boolean(req.body.isActive) },
      { returnDocument: "after" }
    ).select("-password");
    if (!user) throw httpError(404, "User not found.");
    res.json(user);
  } catch (err) {
    sendError(res, err);
  }
});

// Mark an account as verified by hand. This is the way out for a customer whose
// verification email never arrived: the owner confirms them and they can sign in.
router.patch("/:id/verify", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, "User not found.");
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: { isVerified: true },
        $unset: { verificationToken: 1, verificationTokenExpiresAt: 1, verificationAttempts: 1 },
      },
      { returnDocument: "after" }
    ).select("-password");
    if (!user) throw httpError(404, "User not found.");
    res.json(user);
  } catch (err) {
    sendError(res, err);
  }
});

// Change a role
router.patch("/:id/role", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, "User not found.");
    if (req.params.id === String(req.user._id)) throw httpError(400, "You can't change your own role.");
    if (!ROLES.includes(req.body?.role)) throw httpError(400, "Choose a role.");
    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { returnDocument: "after" }).select("-password");
    if (!user) throw httpError(404, "User not found.");
    res.json(user);
  } catch (err) {
    sendError(res, err);
  }
});

export default router;