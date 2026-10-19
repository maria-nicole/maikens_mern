/* ------------------------------------------------------------------------------------------
   Design options. The VALUES must match backend/utils/designOptions.js exactly (the server
   drops anything it doesn't recognise). Thumbnails are optional: if an image is missing,
   the option still shows as a labelled button.
   Images live in frontend/public/images/<group>/<name>.svg|jpg
   - Silhouette / Neckline / Sleeves: line drawings (SVG) so the shape is unmistakable.
   - Fabric / Design details: close-up reference photos.
   Tip: the "Design details" labels are just names. Rename them (here AND in the backend)
   to match the pattern photos in /images/design.
------------------------------------------------------------------------------------------ */
import { PALETTE, isHex, normalizeHex, swatchFor } from "../../lib/colors";

const o = (value, extra = {}) => ({ value, ...extra });

// The same shades the admin product form and the catalog use (src/lib/colors.js).
// Customers can also add a shade of their own: it is kept as selections.color (a name or
// the hex they typed) plus selections.colorHex, which is what the server checks.
const COLORS = PALETTE.map(({ name, hex }) => o(name, { swatch: hex }));

const BARONG_COLORS = COLORS.filter((c) =>
    ["White", "Ivory", "Cream", "Champagne", "Sky Blue", "Sage Green", "Navy", "Charcoal", "Black", "Wine"].includes(c.value)
);

const SLEEVES = [
    o("Sleeveless", { img: "/images/sleeve/sleeveless.svg", desc: "No sleeves, shoulders bare" }),
    o("Spaghetti Strap", { img: "/images/sleeve/spaghetti.svg", desc: "Thin straps over the shoulders" }),
    o("Off Shoulder", { img: "/images/sleeve/offshoulder.svg", desc: "Band across the arms, shoulders bare" }),
    o("Cap Sleeve", { img: "/images/sleeve/capsleeve.svg", desc: "Small sleeve covering just the shoulder" }),
    o("Short Sleeve", { img: "/images/sleeve/short.svg", desc: "Covers the upper arm" }),
    o("Long Sleeve", { img: "/images/sleeve/long.svg", desc: "Covers the whole arm to the wrist" }),
    o("Puff Sleeve", { img: "/images/sleeve/puff.svg", desc: "Rounded, gathered sleeve at the shoulder" }),
];

export const GROUPS = {
    Gown: [
        { key: "color", title: "Color", hint: "The main color of the gown. Pick a swatch, or add a shade of your own.", required: true, kind: "swatch", options: COLORS },
        {
            key: "silhouette", title: "Silhouette", hint: "The overall shape of the gown.", required: true, kind: "image",
            options: [
                o("A-Line", { img: "/images/silhouette/a-line.svg", desc: "Fitted bodice that flares gradually" }),
                o("Ball Gown", { img: "/images/silhouette/ballgown.svg", desc: "Full, voluminous skirt" }),
                o("Mermaid", { img: "/images/silhouette/mermaid.svg", desc: "Hugs the body, flares below the knee" }),
                o("Trumpet", { img: "/images/silhouette/trumpet.svg", desc: "Fitted to mid-thigh, then flares" }),
                o("Sheath", { img: "/images/silhouette/sheath.svg", desc: "Slim and straight, follows the body" }),
                o("Empire Waist", { img: "/images/silhouette/empire.svg", desc: "Seam sits high, under the bust" }),
                o("Fit and Flare", { img: "/images/silhouette/fitflare.svg", desc: "Fitted through the hip, then flares" }),
                o("Column", { img: "/images/silhouette/column.svg", desc: "Straight and even from top to hem" }),
                o("Tea Length", { img: "/images/silhouette/tealength.svg", desc: "Hem falls at mid-calf" }),
                o("High Low", { img: "/images/silhouette/highlow.svg", desc: "Short in front, longer at the back" }),
            ],
        },
        {
            key: "neckline", title: "Neckline", hint: "The shape around the neck and chest.", kind: "image",
            options: [
                o("Sweetheart", { img: "/images/neckline/sweetheart.svg", desc: "Curves with a dip in the centre" }),
                o("V-Neck", { img: "/images/neckline/vneck.svg", desc: "Plunges to a point in the centre" }),
                o("Scoop Neck", { img: "/images/neckline/scoop.svg", desc: "Deep, rounded U-shape" }),
                o("Square Neck", { img: "/images/neckline/square.svg", desc: "Straight across with square corners" }),
                o("Halter", { img: "/images/neckline/halter.svg", desc: "Straps behind the neck, shoulders bare" }),
                o("High Neck", { img: "/images/neckline/highneck.svg", desc: "Covers up to the base of the neck" }),
                o("Boat Neck", { img: "/images/neckline/boatneck.svg", desc: "Wide, shallow curve across the collarbone" }),
            ],
        },
        { key: "sleeve", title: "Sleeves", hint: "How the arms are covered.", kind: "image", options: SLEEVES },
        {
            key: "fabric", title: "Fabric", hint: "What the gown is made of. It changes how it drapes and shines.", kind: "image",
            options: [
                o("Satin", { img: "/images/fabric/satin.jpg", desc: "Smooth, glossy face with a soft drape" }),
                o("Silk", { img: "/images/fabric/silk.jpg", desc: "Fine and fluid with a natural sheen" }),
                o("Tulle", { img: "/images/fabric/tulle.jpg", desc: "Sheer, fine netting for soft volume" }),
                o("Lace", { img: "/images/fabric/lace.jpg", desc: "Openwork pattern with floral motifs" }),
                o("Chiffon", { img: "/images/fabric/chiffon.jpg", desc: "Light, airy and semi-transparent" }),
                o("Organza", { img: "/images/fabric/organza.jpg", desc: "Crisp, sheer and holds its shape" }),
                o("Velvet", { img: "/images/fabric/velvet.jpg", desc: "Deep pile with a rich matte surface" }),
                o("Crepe", { img: "/images/fabric/crepe.jpg", desc: "Matte with a slightly crinkled texture" }),
                o("Taffeta", { img: "/images/fabric/taffeta.jpg", desc: "Crisp with a papery rustle" }),
                o("Sequin", { img: "/images/fabric/sequin.jpg", desc: "Covered in small reflective discs" }),
            ],
        },
        {
            key: "design", title: "Design details", hint: "Embellishments and patterns on the gown.", kind: "image",
            options: [
                o("Floral lace", { img: "/images/design/pattern1.jpg", desc: "Lace appliqué in a flower pattern" }),
                o("Beaded", { img: "/images/design/pattern2.jpg", desc: "Hand-sewn beads for a subtle shine" }),
                o("Embroidered", { img: "/images/design/pattern3.jpg", desc: "Raised stitching in a motif" }),
                o("Sequined", { img: "/images/design/pattern4.jpg", desc: "Sequin work that catches the light" }),
                o("Ruffled", { img: "/images/design/pattern5.jpg", desc: "Layered ruffles through the skirt" }),
                o("Plain / minimal", { img: "/images/design/pattern6.jpg", desc: "No embellishment, clean finish" }),
            ],
        },
    ],
    Barong: [
        { key: "color", title: "Color", hint: "The main color of the barong. Pick a swatch, or add a shade of your own.", required: true, kind: "swatch", options: BARONG_COLORS },
        {
            key: "fit", title: "Fit", hint: "How the barong sits on the body.", required: true, kind: "chip",
            options: [
                o("Classic fit", { desc: "Straight, traditional cut" }),
                o("Slim fit", { desc: "Trim and close to the body" }),
                o("Relaxed fit", { desc: "Roomy and easy through the body" }),
            ],
        },
        {
            key: "fabric", title: "Fabric", hint: "What the barong is woven from.", kind: "chip",
            options: [
                o("Piña", { desc: "Pineapple fibre, sheer and fine" }),
                o("Jusi", { desc: "Silk-blend weave, finer and smoother" }),
                o("Organza", { desc: "Crisp and sheer with body" }),
                o("Cotton blend", { desc: "Soft, breathable and easy to wear" }),
            ],
        },
        {
            key: "sleeve", title: "Sleeves", hint: "Long or short sleeves.", kind: "chip",
            options: [o("Long Sleeve", { desc: "Traditional full-length sleeve" }), o("Short Sleeve", { desc: "Casual, above the elbow" })],
        },
        {
            key: "design", title: "Embroidery", hint: "The embroidery style on the front.", kind: "chip",
            options: [
                o("Plain", { desc: "No embroidery" }),
                o("Floral embroidery", { desc: "Flower and vine motifs" }),
                o("Geometric embroidery", { desc: "Repeating angular patterns" }),
                o("Calado cutwork", { desc: "Openwork cut-out panels" }),
                o("Border embroidery", { desc: "Embroidered edge along the front" }),
            ],
        },
    ],
};

export const EXTRAS_ID = "extras";

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z]/g, "");

// Pre-fills a redesign with what the chosen product already is, so customers only change what they want
export function prefillFromProduct(product) {
    const groups = GROUPS[product.category] || [];
    const out = {};

    // Color first: keep the product's exact shade, even when it isn't one of our presets
    const shade = product.colors?.[0];
    if (shade) {
        const name = String(shade.name || "").trim();
        const hex = normalizeHex(shade.hex);
        const preset = PALETTE.find((c) => c.name.toLowerCase() === name.toLowerCase());
        if (preset) {
            out.color = preset.name;
            out.colorHex = hex || preset.hex;
        } else if (name) {
            out.color = isHex(name) ? normalizeHex(name) : name;
            out.colorHex = hex;
        } else if (hex) {
            out.color = hex;
            out.colorHex = hex;
        }
    }

    const find = (key, text, loose) => {
        const group = groups.find((g) => g.key === key);
        if (!group || !text) return;
        const t = norm(text);
        const hit = group.options.find((opt) => (loose ? t.includes(norm(opt.value)) : norm(opt.value) === t));
        if (hit) out[key] = hit.value;
    };
    find("sleeve", product.sleeve);
    find("fabric", product.material, true);
    return out;
}

// One row per section of the workbench: every option group, then "Photos & notes".
// Used by the section list and by the summary on the last step. The color row shows the
// exact shade the customer settled on, their own custom shade included.
export function buildRows(groups, selections, extrasText) {
    return [
        ...groups.map((g) => ({
            id: g.key,
            title: g.title,
            required: !!g.required,
            value: selections[g.key] || "",
            swatch: g.kind === "swatch" ? swatchFor(selections[g.key], selections.colorHex) : undefined,
        })),
        { id: EXTRAS_ID, title: "Photos & notes", required: false, value: extrasText, swatch: undefined },
    ];
}

// Decides if a check mark on top of a swatch should be dark or light
export function isLightColor(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return true;
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.7;
}
