import "./config/env.js"; // must stay first so process.env is ready for every other import
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/product.route.js";
import generateRouter from "./routes/generate.js";
import orderRoutes from "./routes/order.route.js";

import customizationRoutes from "./routes/customization.route.js";
import tryOnRoutes from "./routes/tryon.route.js";

import messageRoutes from "./routes/message.route.js";

import adminUserRoutes from "./routes/adminUsers.route.js";
import reportRoutes from "./routes/report.route.js";

import profileRoutes from "./routes/profile.route.js";
import cartRoutes from "./routes/cart.route.js";
import favoritesRoutes from "./routes/favorites.route.js";
import reviewRoutes from "./routes/review.route.js";
import staffRoutes from "./routes/staff.route.js";
import contactRoutes from "./routes/contact.route.js";
import { hasMailProvider, isTestSender } from "./mail/mailer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 5000;
const app = express();

// Comma-separated list of allowed browser origins.
// Production: CORS_ORIGIN=https://your-app.vercel.app (set on Render)
// Development: falls back to the Vite dev server.
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// A missing variable used to surface much later as a confusing "sign-in failed"
// popup in the browser, so report it in the boot log instead.
const ENV_PURPOSE = {
  MONGO_URI: "database connection",
  JWT_SECRET: "login sessions",
  GOOGLE_CLIENT_ID: "Google sign-in",
  GEMINI_API_KEY: "AI design generation",
  CLOUDINARY_CLOUD_NAME: "image uploads (falls back to local disk)",
  CLOUDINARY_API_KEY: "image uploads (falls back to local disk)",
  CLOUDINARY_API_SECRET: "image uploads (falls back to local disk)",
};

const missingEnv = Object.keys(ENV_PURPOSE).filter((key) => !process.env[key]);
if (missingEnv.length) {
  console.warn("Missing environment variables:");
  missingEnv.forEach((key) => console.warn(`  - ${key} (needed for ${ENV_PURPOSE[key]})`));
}

if (process.env.NODE_ENV === "production") {
  if (!process.env.CORS_ORIGIN) {
    console.warn(
      "CORS_ORIGIN is not set - the deployed frontend will be blocked by CORS. " +
        "Set it to the exact frontend URL, e.g. https://your-app.vercel.app"
    );
  }
  if (!process.env.CLIENT_URL) {
    console.warn(
      "CLIENT_URL is not set - links in the welcome email will point to http://localhost:5173."
    );
  }
  // Email is optional, but if it is switched on with an unverified sender, welcome emails
  // only reach the account owner. Worth saying out loud so the silence is not a mystery.
  if (hasMailProvider() && isTestSender()) {
    console.warn(
      "MAIL_FROM_EMAIL is unset or still on resend.dev, Resend's test sender. " +
        "Welcome emails will only reach your own address - verify your domain and set MAIL_FROM_EMAIL."
    );
  }
}

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Render (and any uptime monitor) polls this to know the service is alive
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/users/profile", profileRoutes);
app.use("/api/users", authRoutes);

app.use("/api/cart", cartRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/contact", contactRoutes);

app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/customizations", customizationRoutes);
app.use("/api/messages", messageRoutes);

app.use("/api/admin/users", adminUserRoutes);
app.use("/api/reports", reportRoutes);

app.use("/api/staff", staffRoutes);

app.use("/api/try-on", tryOnRoutes);

app.use("/api", generateRouter);

// Unknown API paths answer in JSON, not Express's default HTML page
app.use("/api", (req, res) => res.status(404).json({ message: "Not found." }));

// Last stop for anything that threw: log it and answer in JSON either way
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ message: err.status ? err.message : "Something went wrong." });
});

connectDB();

app.listen(PORT, () => {
  console.log(`Server started at port ${PORT}`);
});