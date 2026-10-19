import express from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { sendVerificationEmail, sendWelcomeEmail } from "../mail/emails.js";
import { hasMailProvider } from "../mail/mailer.js";


const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const router = express.Router();

// Throttle the endpoints an attacker would hammer. Generous enough that a real person
// retyping a password never notices, tight enough to make guessing useless.
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const signupLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });
const verifyLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
// These fields are select:false in the model, so routes that need them ask for them
const WITH_CODE = "+verificationToken +verificationTokenExpiresAt +verificationAttempts";

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
const hashCode = (code) => crypto.createHash("sha256").update(String(code)).digest("hex");

const session = (user) => ({
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    token: generateToken(user._id),
});

// Creates a fresh 6-digit code on the user (call user.save() afterwards). Only a hash is stored.
function issueCode(user) {
    const code = String(crypto.randomInt(100000, 1000000));
    user.verificationToken = hashCode(code);
    user.verificationTokenExpiresAt = new Date(Date.now() + CODE_TTL_MS);
    user.verificationAttempts = 0;
    return code;
}

const codeIsLive = (user) =>
    user.verificationToken && user.verificationTokenExpiresAt && user.verificationTokenExpiresAt > Date.now();

async function deliverCode(user, code) {
    if (process.env.NODE_ENV !== "production") console.log(`[dev] verification code for ${user.email}: ${code}`);
    await sendVerificationEmail(user.email, code, user.username);
}

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

        let user = await User.findOne({ email });
        if (user?.isVerified) return res.status(400).json({ message: "User already exists." });

        const nameTaken = await User.exists({ username, ...(user ? { _id: { $ne: user._id } } : {}) });
        if (nameTaken) return res.status(400).json({ message: "That username is taken." });

        if (user) {
            // Earlier sign-up that was never verified: let them start over with the new details
            user.username = username;
            user.password = password;
        } else {
            user = new User({ username, email, password, isVerified: false });
        }

        // Without a mail provider there is no way to send a code, so the account is
        // created ready to use instead. Set BREVO_API_KEY and this stops happening.
        if (!hasMailProvider()) {
            user.isVerified = true;
            await user.save();
            return res.status(201).json({ needsVerification: false, ...session(user) });
        }

        const code = issueCode(user);
        await user.save();

        let emailSent = true;
        try {
            await deliverCode(user, code);
        } catch {
            emailSent = false; // they can press "Resend code" on the next screen
        }

        // No token yet: they must verify first
        res.status(201).json({ needsVerification: true, email: user.email, emailSent });
    } catch (err) {
        console.error("Register failed:", err);
        res.status(err.code === 11000 ? 400 : 500).json({
            message: err.code === 11000 ? "That username or email is already in use." : "Registration failed. Please try again.",
        });
    }
});

/* ------------------------------ Verify email ------------------------------ */
router.post("/verify-email", verifyLimit, async (req, res) => {
    try {
        const email = String(req.body?.email || "").trim().toLowerCase();
        const code = String(req.body?.code || "").trim();
        if (!email || !/^\d{6}$/.test(code)) return res.status(400).json({ message: "Enter the 6-digit code." });

        const user = await User.findOne({ email }).select(WITH_CODE);
        if (!user) return res.status(400).json({ message: "That code isn't right." });
        if (user.isVerified) return res.status(400).json({ message: "This email is already verified. Please log in." });

        if (!codeIsLive(user)) {
            return res.status(400).json({ message: "That code has expired. Request a new one." });
        }
        if (user.verificationAttempts >= MAX_ATTEMPTS) {
            return res.status(429).json({ message: "Too many incorrect attempts. Request a new code." });
        }
        if (hashCode(code) !== user.verificationToken) {
            user.verificationAttempts += 1;
            await user.save();
            return res.status(400).json({ message: "That code isn't right." });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpiresAt = undefined;
        user.verificationAttempts = 0;
        await user.save();

        sendWelcomeEmail(user.email, user.username).catch(() => { }); // nice to have, never blocks

        res.json(session(user)); // verified, so log them in
    } catch (err) {
        console.error("Verify failed:", err);
        res.status(500).json({ message: "Server error. Please try again." });
    }
});

/* ------------------------------ Resend code ------------------------------ */
router.post("/resend-verification", signupLimit, async (req, res) => {
    const generic = { message: "If that account needs verification, a new code is on its way." };
    try {
        const email = String(req.body?.email || "").trim().toLowerCase();
        const user = await User.findOne({ email }).select(WITH_CODE);
        if (!user || user.isVerified) return res.json(generic);

        const sentAt = user.verificationTokenExpiresAt ? user.verificationTokenExpiresAt.getTime() - CODE_TTL_MS : 0;
        const wait = RESEND_COOLDOWN_MS - (Date.now() - sentAt);
        if (wait > 0) {
            const retryAfter = Math.ceil(wait / 1000);
            return res.status(429).json({ message: `Please wait ${retryAfter} seconds before requesting another code.`, retryAfter });
        }

        const code = issueCode(user);
        await user.save();
        try {
            await deliverCode(user, code);
        } catch {
            return res.status(502).json({ message: "We couldn't send the email. Please try again in a moment." });
        }
        res.json(generic);
    } catch (err) {
        console.error("Resend failed:", err);
        res.status(500).json({ message: "Server error. Please try again." });
    }
});

/* ------------------------------ Login ------------------------------ */
router.post("/login", loginLimit, async (req, res) => {
    try {
        const email = String(req.body?.email || "").trim().toLowerCase();
        const password = String(req.body?.password || "");
        if (!email || !password) return res.status(400).json({ message: "Please fill all the fields." });

        const user = await User.findOne({ email }).select(WITH_CODE);
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ message: "Invalid credentials." });
        }
        if (user.isActive === false) {
            return res.status(403).json({ message: "This account has been deactivated." });
        }

        if (!user.isVerified) {
            // No mail provider means no code can be sent, so there is nothing to wait
            // for. Let the account in rather than stranding it.
            if (!hasMailProvider()) {
                user.isVerified = true;
                await user.save();
                return res.status(200).json(session(user));
            }
            // Make sure they have a live code waiting for them on the verify page
            if (!codeIsLive(user)) {
                const code = issueCode(user);
                await user.save();
                deliverCode(user, code).catch(() => { });
            }
            return res.status(403).json({
                message: "Please verify your email first.",
                needsVerification: true,
                email: user.email,
            });
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
            // Google has verified this email, so any pending verification is no longer needed
            if (!user.googleId || !user.isVerified) {
                user.googleId = user.googleId || payload.sub;
                user.isVerified = true;
                user.verificationToken = undefined;
                user.verificationTokenExpiresAt = undefined;
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
                isVerified: true,
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