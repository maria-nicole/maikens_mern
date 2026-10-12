import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import cloudinary, {
  cloudinaryConfigured,
  UPLOAD_FOLDER,
  cloudinaryPublicId,
  isCloudinaryUrl,
} from "../config/cloudinary.js";

// backend/uploads: the folder middleware/upload.js writes to when Cloudinary isn't configured
export const uploadsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "uploads");

// Only things this server saved itself: a local "/uploads/<uuid>.png" file, or an
// image URL on OUR Cloudinary cloud. Never an arbitrary remote URL — readUpload and
// uploadExists fetch these server-side, so anything else would be an SSRF hole.
const LOCAL_UPLOAD = /^\/uploads\/[\w-]+\.(png|jpe?g|webp)$/i;
export const SAFE_UPLOAD = LOCAL_UPLOAD; // kept for callers that only match local paths

const isSafe = (urlPath) =>
  (typeof urlPath === "string" && LOCAL_UPLOAD.test(urlPath)) || isCloudinaryUrl(urlPath);

const isRemote = (urlPath) => /^https?:\/\//i.test(urlPath);

const MIME_BY_EXT = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };
const EXT_BY_MIME = { ".png": ".png", ".jpg": ".jpg", ".jpeg": ".jpg", ".webp": ".webp" };

const fileFor = (urlPath) => path.join(uploadsDir, path.basename(urlPath));

export async function uploadExists(urlPath) {
  if (!isSafe(urlPath)) return false;
  if (isRemote(urlPath)) {
    try {
      const res = await fetch(urlPath, { method: "HEAD" });
      return res.ok;
    } catch {
      return false;
    }
  }
  try {
    await fs.access(fileFor(urlPath));
    return true;
  } catch {
    return false;
  }
}

// Returns { mimeType, data (base64), url } or null if it isn't a safe, existing image
export async function readUpload(urlPath) {
  if (!isSafe(urlPath)) return null;

  if (isRemote(urlPath)) {
    try {
      const res = await fetch(urlPath);
      if (!res.ok) return null;
      const mimeType = (res.headers.get("content-type") || "").split(";")[0];
      if (!mimeType.startsWith("image/")) return null;
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length === 0 || buffer.length > 15 * 1024 * 1024) return null;
      return { mimeType, data: buffer.toString("base64"), url: urlPath };
    } catch {
      return null;
    }
  }

  try {
    const file = fileFor(urlPath);
    const buffer = await fs.readFile(file);
    return {
      mimeType: MIME_BY_EXT[path.extname(file).toLowerCase()],
      data: buffer.toString("base64"),
      url: urlPath,
    };
  } catch {
    return null;
  }
}

// Saves a base64 image from the AI and returns its URL: the Cloudinary URL in
// production, a local "/uploads/<uuid>.png" path in development.
export async function saveImage(base64, mimeType) {
  if (cloudinaryConfigured) {
    const result = await cloudinary.uploader.upload(
      `data:${mimeType};base64,${base64}`,
      { resource_type: "image", folder: UPLOAD_FOLDER }
    );
    return result.secure_url;
  }

  const ext = EXT_BY_MIME[mimeType] || ".png";
  const filename = crypto.randomUUID() + ext;
  await fs.writeFile(path.join(uploadsDir, filename), Buffer.from(base64, "base64"));
  return `/uploads/${filename}`;
}

// Best-effort delete of an image this server saved. External URLs (e.g. a Google
// avatar) don't match SAFE and are left alone.
export const removeUpload = (urlPath) => {
  if (!isSafe(urlPath)) return;
  if (isRemote(urlPath)) {
    const publicId = cloudinaryPublicId(urlPath);
    if (publicId) {
      cloudinary.uploader
        .destroy(publicId, { resource_type: "image" })
        .catch(() => {});
    }
    return;
  }
  fs.unlink(fileFor(urlPath)).catch(() => {});
};
