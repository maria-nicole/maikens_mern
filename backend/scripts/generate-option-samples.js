/* ------------------------------------------------------------------------------------------
   One-off tool: renders the fabric + design-detail thumbnails with the Gemini image model and
   writes them straight into the frontend's public folder. Run it locally, never on the server.

     node backend/scripts/generate-option-samples.js                 # everything still missing
     node backend/scripts/generate-option-samples.js --match satin   # just one (good first test)
     node backend/scripts/generate-option-samples.js --only fabric   # one group only
     node backend/scripts/generate-option-samples.js --force         # redo files that exist

   Files that already exist are skipped, so delete the ones you don't like and re-run.
   Needs GEMINI_API_KEY in .env and the sharp devDependency (npm install).
   ------------------------------------------------------------------------------------------ */

import "../config/env.js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateWithGemini } from "../utils/gemini.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "..", "frontend", "public", "images");

const SIZE = { width: 400, height: 533 }; // 3:4, matches the option grid

const STYLE =
    "photograph, extreme close-up, soft even studio lighting, neutral background, no people, no hands, no text, no watermark";

const FABRICS = [
    ["satin", "glossy ivory satin fabric with smooth liquid folds"],
    ["silk", "champagne silk fabric, fine fluid drape and subtle lustre"],
    ["tulle", "layers of sheer ivory tulle netting, airy with fine visible mesh"],
    ["lace", "ivory floral lace fabric, openwork pattern of flowers and vines"],
    ["chiffon", "blush chiffon fabric, light, semi-transparent and softly folded"],
    ["organza", "ivory organza fabric, crisp and sheer with structured folds"],
    ["velvet", "deep wine velvet fabric, rich plush pile absorbing the light"],
    ["crepe", "ivory crepe fabric, matte surface with a fine crinkled texture"],
    ["taffeta", "champagne taffeta fabric, crisp with a subtle sheen and sculpted folds"],
    ["sequin", "cloth covered in small champagne sequins catching the light"],
];

// pattern1..pattern6 line up with the "Design details" options in designOptions.js
const DESIGNS = [
    ["pattern1", "ivory bridal fabric with a floral lace appliqué in a flower pattern"],
    ["pattern2", "hand-sewn pearl and crystal beading scattered over ivory fabric"],
    ["pattern3", "raised floral embroidery in ivory thread on smooth satin"],
    ["pattern4", "dense champagne sequin work sparkling across the fabric"],
    ["pattern5", "layered ruffles of ivory tulle and organza"],
    ["pattern6", "plain ivory satin with a clean, minimal finish"],
];

const OPTIONS = [
    ...FABRICS.map(([file, subject]) => ({ group: "fabric", file: `${file}.jpg`, prompt: `${subject}, ${STYLE}` })),
    ...DESIGNS.map(([file, subject]) => ({ group: "design", file: `${file}.jpg`, prompt: `${subject}, ${STYLE}` })),
];

const args = process.argv.slice(2);
const force = args.includes("--force");
const only = (args.find((a) => a.startsWith("--only=")) || "").split("=")[1];
const match = (args.find((a) => a.startsWith("--match=")) || "").split("=")[1];

const selected = OPTIONS.filter(
    (o) => (!only || o.group === only) && (!match || o.file.includes(match))
);

if (!selected.length) {
    console.error("Nothing matched. Try --only=fabric or --match=satin.");
    process.exit(1);
}
if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set in .env — cannot generate images.");
    process.exit(1);
}

let sharp;
try {
    ({ default: sharp } = await import("sharp"));
} catch {
    console.error("sharp is not installed. Run `npm install` in the project root first.");
    process.exit(1);
}

console.log(`${selected.length} thumbnail(s) queued${force ? " (overwriting)" : ""}\n`);

let made = 0;
let skipped = 0;
const failed = [];

for (const opt of selected) {
    const dest = path.join(OUT, opt.group, opt.file);
    if (!force) {
        try {
            await fs.access(dest);
            console.log(`skip   ${opt.group}/${opt.file}  (already there)`);
            skipped++;
            continue;
        } catch {
            /* not there yet */
        }
    }

    process.stdout.write(`render ${opt.group}/${opt.file} … `);
    try {
        await fs.mkdir(path.dirname(dest), { recursive: true });
        const { data } = await generateWithGemini([{ text: opt.prompt }], { aspectRatio: "3:4" });
        const info = await sharp(Buffer.from(data, "base64"))
            .resize(SIZE.width, SIZE.height, { fit: "cover", position: "centre" })
            .jpeg({ quality: 82, mozjpeg: true })
            .toFile(dest);
        console.log(`ok (${Math.round(info.size / 1024)} KB)`);
        made++;
    } catch (err) {
        console.log(`FAILED — ${err.message}`);
        failed.push(`${opt.group}/${opt.file}: ${err.message}`);
    }

    await new Promise((r) => setTimeout(r, 1200)); // be kind to the API
}

console.log(`\ndone: ${made} written, ${skipped} skipped, ${failed.length} failed`);
if (failed.length) {
    console.log("\nfailed:");
    failed.forEach((f) => console.log("  - " + f));
    process.exitCode = 1;
}
