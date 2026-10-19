import express from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { sendWelcomeEmail } from "../mail/emails.js";
import { hasMailProvider } from "../mail/mailer.js";


const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const router = express.Router();

// Throttle the endpoints an attacker would hammer. Generous enough that a real person
// retyping a password never notices, tight enough to make guessing useless.
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const signupLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });

const session = (user) => ({
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    token: generateToken(user._id),
});

/* ------------------------------ Register ------------------------------ */
router.post("/register", signupLimit, async (req, res) => {
    try {
        const username = String(req.body?.username || "").trim();
        const email = String(req.body?.email || "").trim().toLowerCase();
        const password = String(req.body?.password || "");

        if (!username || !email || !password) return res.status(400).json({ message: "Please fill all the fields." });
        if (password.length < 8 || !/\d/.test(password)) {
            return res.status(400).json({ message: "Password must be at least 8 characters and contain a number." });
        }

        if (await User.exists({ email })) return res.status(400).json({ message: "User already exists." });

        const nameTaken = await User.exists({ username });
        if (nameTaken) return res.status(400).json({ message: "That username is taken." });

        const user = await User.create({ username, email, password });

        // Email is optional, so the welcome note is only attempted when a provider is
        // configured. It must never delay or block the sign-up.
        if (hasMailProvider()) {
            sendWelcomeEmail(user.email, user.username).catch(() => { }); // nice to have, never blocks
        }

        // No email step: the account is ready the moment it's created, so log them straight in.
        res.status(201).json(session(user));
    } catch (err) {
        console.error("Register failed:", err);
        res.status(err.code === 11000 ? 400 : 500).json({
            message: err.code === 11000 ? "That username or email is already in use." : "Registration failed. Please try again.",
        });
    }
});

/* ------------------------------ Login ------------------------------ */
router.post("/login", loginLimit, async (req, res) => {
    try {
        const email = String(req.body?.email || "").trim().toLowerCase();
        const password = String(req.body?.password || "");
        if (!email || !password) return res.status(400).json({ message: "Please fill all the fields." });

        const user = await User.findOne({ email });
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ message: "Invalid credentials." });
        }
        if (user.isActive === false) {
            return res.status(403).json({ message: "This account has been deactivated." });
        }

        res.status(200).json(session(user));
    } catch (err) {
        console.error("Login failed:", err);
        res.status(500).json({ message: "Server Error!" });
    }
});

/* ------------------------------ Google ------------------------------ */
router.post("/google", async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) return res.status(400).json({ message: "Missing Google credential." });

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        if (!payload?.email || !payload.email_verified) {
            return res.status(401).json({ message: "Your Google email isn't verified." });
        }

        const email = payload.email.toLowerCase();
        let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email }] });

        if (user) {
            if (user.isActive === false) {
                return res.status(403).json({ message: "This account has been deactivated." });
            }
            // First Google sign-in on an existing email account: link the Google identity
            if (!user.googleId) {
                user.googleId = payload.sub;
                if (!user.avatar && payload.picture) user.avatar = payload.picture;
                await user.save();
            }
        } else {
            const base = (payload.name || email.split("@")[0]).trim().slice(0, 30);
            let username = base;
            while (await User.exists({ username })) {
                username = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
            }
            user = await User.create({
                username,
                email,
                googleId: payload.sub,
                avatar: payload.picture || "",
            });
        }

        res.status(200).json(session(user));
    } catch (err) {
        console.error("Google auth failed:", err.message);
        res.status(401).json({ message: "Google sign-in failed. Please try again." });
    }
});

/* ------------------------------ Me ------------------------------ */
router.get("/me", protect, async (req, res) => {
    res.status(200).json(req.user);
});

export default router;
