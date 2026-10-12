import { fileURLToPath } from "url";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import cloudinary, { cloudinaryConfigured, UPLOAD_FOLDER } from "../config/cloudinary.js";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "uploads");
fs.mkdirSync(dir, { recursive: true });

/* ------------------------------- storages ------------------------------- */

// Production (CLOUDINARY_* configured): stream each upload to Cloudinary.
// The routes store `fileUrl(file)` in the DB — the CDN URL, which survives redeploys.
const cloudStorage = {
  _handleFile(req, file, cb) {
    let done = false;
    const finish = (err, result) => {
      if (done) return;
      done = true;
      if (err) {
        console.error("Cloudinary upload failed:", err.message);
        cb(new Error("Couldn't upload the image. Please try again."));
      } else {
        // path = what gets stored in the DB; filename = public_id, used to delete later
        cb(null, { ...result, path: result.secure_url, filename: result.public_id });
      }
    };
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image", folder: UPLOAD_FOLDER },
      finish
    );
    file.stream.on("error", (err) => finish(err));
    stream.on("error", (err) => finish(err));
    file.stream.pipe(stream);
  },
  _removeFile(req, file, cb) {
    cloudinary.uploader.destroy(file.filename, { resource_type: "image" }).then(
      () => cb(null),
      () => cb(null) // best effort — nothing to roll back on the client's side
    );
  },
};

// Development fallback (no CLOUDINARY_* env vars): same disk behaviour as before.
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) =>
    cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
});

const storage = cloudinaryConfigured ? cloudStorage : diskStorage;

/**
 * The value routes persist in the DB for an uploaded file: the Cloudinary URL
 * when configured, otherwise the legacy local "/uploads/<file>" path.
 */
export const fileUrl = (file) =>
  cloudinaryConfigured ? file.path : `/uploads/${file.filename}`;

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Images only")),
});

const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    AVATAR_TYPES.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Please choose a JPG, PNG or WebP image.")),
});

// Try-on photos are personal, so they stay in memory and are never written to disk.
export const uploadTryOnPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    AVATAR_TYPES.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Please choose a JPG, PNG or WebP photo.")),
});
