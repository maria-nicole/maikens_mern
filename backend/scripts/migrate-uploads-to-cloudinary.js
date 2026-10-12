// One-time migration: uploads every file in backend/uploads/ to Cloudinary and
// rewrites the matching "/uploads/<file>" paths in the database to the CDN URL.
//
// Run it ONCE from the repo root, with CLOUDINARY_* filled in .env first:
//   node backend/scripts/migrate-uploads-to-cloudinary.js
//
// Local files are kept on disk afterwards, so nothing is lost if you rerun it
// (already-migrated paths are https URLs and are skipped).
import "../config/env.js"; // must run first so process.env is ready
import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import cloudinary, { cloudinaryConfigured, UPLOAD_FOLDER } from "../config/cloudinary.js";
import { uploadsDir } from "../utils/uploads.js";

// Import every model so mongoose.models is complete before we walk the collections.
import "../models/User.js";
import "../models/cart.model.js";
import "../models/customization.model.js";
import "../models/favorite.model.js";
import "../models/message.model.js";
import "../models/order.model.js";
import "../models/product.model.js";

const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;

async function uploadLocalFiles() {
  let entries = [];
  try {
    entries = await fs.readdir(uploadsDir);
  } catch {
    console.log(`No uploads folder at ${uploadsDir} — nothing to migrate.`);
    return {};
  }

  const files = entries.filter((name) => IMAGE_EXT.test(name));
  if (files.length === 0) {
    console.log("No local images found — nothing to migrate.");
    return {};
  }

  const map = {};
  let n = 0;
  for (const name of files) {
    n += 1;
    try {
      const result = await cloudinary.uploader.upload(path.join(uploadsDir, name), {
        resource_type: "image",
        public_id: `${UPLOAD_FOLDER}/${name.replace(IMAGE_EXT, "")}`,
      });
      map[`/uploads/${name}`] = result.secure_url;
      console.log(`[${n}/${files.length}] uploaded ${name}`);
    } catch (err) {
      console.warn(`[${n}/${files.length}] FAILED ${name}: ${err.message}`);
    }
  }
  return map;
}

// Collects every string that points at a migrated file, as dotted paths for $set
function collect(value, prefix, map, $set) {
  if (Array.isArray(value)) {
    value.forEach((v, i) => collect(v, prefix ? `${prefix}.${i}` : String(i), map, $set));
  } else if (value && typeof value === "object" && value.constructor === Object) {
    for (const [k, v] of Object.entries(value)) {
      collect(v, prefix ? `${prefix}.${k}` : k, map, $set);
    }
  } else if (typeof value === "string" && map[value]) {
    if (prefix) $set[prefix] = map[value];
  }
}

async function rewriteDatabase(map) {
  let collections = 0;
  let documents = 0;
  let fields = 0;

  for (const model of Object.values(mongoose.models)) {
    let touchedInModel = 0;
    for (const doc of await model.find({}).lean()) {
      const $set = {};
      collect(doc, "", map, $set);
      if (Object.keys($set).length === 0) continue;
      await model.updateOne({ _id: doc._id }, { $set });
      documents += 1;
      fields += Object.keys($set).length;
      touchedInModel += 1;
    }
    if (touchedInModel) {
      collections += 1;
      console.log(`${model.modelName}: updated ${touchedInModel} document(s)`);
    }
  }

  return { collections, documents, fields };
}

try {
  if (!cloudinaryConfigured) {
    console.error("CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET are missing from .env — nothing to upload to.");
    process.exit(1);
  }

  const map = await uploadLocalFiles();
  const migrated = Object.keys(map).length;
  if (migrated === 0) {
    console.log("No images were uploaded, so the database was left untouched.");
  } else {
    await connectDB();
    const { collections, documents, fields } = await rewriteDatabase(map);
    console.log(
      `\nDone: ${migrated} file(s) on Cloudinary; rewrote ${fields} field(s) ` +
        `across ${documents} document(s) in ${collections} collection(s).`
    );
    console.log("Local copies in backend/uploads/ were left in place — delete them whenever you're satisfied.");
  }
} catch (err) {
  console.error("Migration failed:", err);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
  process.exit();
}
