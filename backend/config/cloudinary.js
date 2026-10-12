// Central Cloudinary setup. Both middleware/upload.js and utils/uploads.js use this
// so the SDK is configured in exactly one place.
//
// Required env vars (set them in .env locally and in the Render dashboard):
//   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
//
// Without them the server still runs: uploads fall back to the local disk,
// which is fine for development but does NOT survive a redeploy in production.
import { v2 as cloudinary } from "cloudinary";

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

export const cloudinaryConfigured = Boolean(
  CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET
);

// Everything this app uploads lives under one folder in the Cloudinary Media Library.
export const UPLOAD_FOLDER = "maikens";

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
} else {
  console.warn(
    "[uploads] CLOUDINARY_* env vars are missing — images are saved to disk and will be lost on redeploy."
  );
}

// "https://res.cloudinary.com/<cloud>/image/upload/v123/folder/name.png" -> "folder/name"
// Returns null for anything that isn't a plain delivery URL from our cloud.
export function cloudinaryPublicId(url) {
  if (!url || !cloudinaryConfigured) return null;
  const prefix = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/`;
  if (!url.startsWith(prefix)) return null;
  const rest = url.slice(prefix.length).split(/[?#]/)[0]; // drop query/hash
  const parts = rest.split("/");
  if (/^v\d+$/.test(parts[0] || "")) parts.shift(); // drop the version segment if present
  const joined = parts.join("/");
  return joined.replace(/\.[a-zA-Z0-9]+$/, "") || null; // delivery URLs end in the format
}

// True only for image URLs on OUR cloud (never arbitrary remote URLs — these get
// fetched server-side, so anything else would be an SSRF hole).
export function isCloudinaryUrl(url) {
  if (!url || !cloudinaryConfigured) return false;
  return url.startsWith(`https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/`);
}

export default cloudinary;
