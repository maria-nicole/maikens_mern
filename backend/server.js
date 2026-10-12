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
import staffRoutes from "./routes/staff.route.js";

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

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Render (and any uptime monitor) polls this to know the service is alive
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/users/profile", profileRoutes);
app.use("/api/users", authRoutes);

app.use("/api/cart", cartRoutes);
app.use("/api/favorites", favoritesRoutes);

app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/customizations", customizationRoutes);
app.use("/api/messages", messageRoutes);

app.use("/api/admin/users", adminUserRoutes);
app.use("/api/reports", reportRoutes);

app.use("/api/staff", staffRoutes);

app.use("/api/try-on", tryOnRoutes);

app.use("/api/users", authRoutes);
app.use("/api", generateRouter);

connectDB();

app.listen(PORT, () => {
  console.log(`Server started at port ${PORT}`);
});