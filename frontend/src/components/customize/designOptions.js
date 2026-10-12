/* ------------------------------------------------------------------------------------------
   Design options. The VALUES must match backend/utils/designOptions.js exactly (the server
   drops anything it doesn't recognise). Thumbnails are optional: if an image is missing,
   the option still shows as a labelled button.
   Tip: the "Design details" labels are just names. Rename them (here AND in the backend)
   to match your pattern photos in /images/design.
------------------------------------------------------------------------------------------ */
const o = (value, extra = {}) => ({ value, ...extra });

const COLORS = [
    o("White", { swatch: "#FFFFFF" }), o("Ivory", { swatch: "#F5F2EB" }), o("Cream", { swatch: "#F2E8D5" }),
    o("Champagne", { swatch: "#E6D7C3" }), o("Blush", { swatch: "#F3CFC6" }), o("Dusty Rose", { swatch: "#C99B96" }),
    o("Peach", { swatch: "#F3B88C" }), o("Coral", { swatch: "#E8785A" }), o("Red", { swatch: "#B3232E" }),
    o("Wine", { swatch: "#6B1F2A" }), o("Mauve", { swatch: "#9C7A8C" }), o("Lavender", { swatch: "#D8B4FE" }),
    o("Lilac", { swatch: "#C6A8D8" }), o("Sky Blue", { swatch: "#8EC5E8" }), o("Royal Blue", { swatch: "#2148A3" }),
    o("Navy", { swatch: "#1B2A4A" }), o("Sage Green", { swatch: "#A8B79C" }), o("Emerald", { swatch: "#1E6E52" }),
    o("Mustard", { swatch: "#D9A441" }), o("Gold", { swatch: "#C9A24B" }), o("Slate gray", { swatch: "#8A8D91" }),
    o("Charcoal", { swatch: "#3A3A3A" }), o("Black", { swatch: "#111111" }),
];
const BARONG_COLORS = COLORS.filter((c) =>
    ["White", "Ivory", "Cream", "Champagne", "Sky Blue", "Sage Green", "Navy", "Charcoal", "Black", "Wine"].includes(c.value)
);

const SLEEVES = [
    o("Sleeveless", { img: "/images/sleeve/sleeveless.jpg" }), o("Spaghetti Strap", { img: "/images/sleeve/spaghetti.jpg" }),
    o("Off Shoulder", { img: "/images/sleeve/offshoulder.jpg" }), o("Cap Sleeve", { img: "/images/sleeve/capsleeve.jpg" }),
    o("Short Sleeve", { img: "/images/sleeve/short.jpg" }), o("Long Sleeve", { img: "/images/sleeve/long.jpg" }),
    o("Puff Sleeve", { img: "/images/sleeve/puff.jpg" }), o("Bishop Sleeve", { img: "/images/sleeve/bishop.jpg" }),
];

export const GROUPS = {
    Gown: [
        { key: "color", title: "Color", hint: "The main color of the gown.", required: true, kind: "swatch", options: COLORS },
        {
            key: "silhouette", title: "Silhouette", hint: "The overall shape of the gown.", required: true, kind: "image",
            options: [
                o("A-Line", { img: "/images/silhouette/aline.jpg" }), o("Ball Gown", { img: "/images/silhouette/ballgown.jpg" }),
                o("Mermaid", { img: "/images/silhouette/mermaid.jpg" }), o("Trumpet", { img: "/images/silhouette/trumpet.jpg" }),
                o("Sheath", { img: "/images/silhouette/sheath.jpg" }), o("Empire Waist", { img: "/images/silhouette/empire.jpg" }),
                o("Fit and Flare", { img: "/images/silhouette/fitflare.jpg" }), o("Column", { img: "/images/silhouette/column.jpg" }),
                o("Tea Length", { img: "/images/silhouette/tealength.jpg" }), o("High Low", { img: "/images/silhouette/highlow.jpg" }),
            ],
        },
        {
            key: "neckline", title: "Neckline", hint: "The shape around the neck and chest.", kind: "image",
            options: [
                o("Sweetheart", { img: "/images/neckline/sweetheart.jpg" }), o("V-Neck", { img: "/images/neckline/vneck.jpg" }),
                o("Scoop Neck", { img: "/images/neckline/scoop.jpg" }), o("Square Neck", { img: "/images/neckline/square.jpg" }),
                o("Halter", { img: "/images/neckline/halter.jpg" }), o("High Neck", { img: "/images/neckline/highneck.jpg" }),
                o("Boat Neck", { img: "/images/neckline/boatneck.jpg" }),
            ],
        },
        { key: "sleeve", title: "Sleeves", hint: "How the arms are covered.", kind: "image", options: SLEEVES },
        {
            key: "fabric", title: "Fabric", hint: "What the gown is made of. It changes how it drapes and shines.", kind: "image",
            options: [
                o("Satin", { img: "/images/fabric/satin.jpg" }), o("Silk", { img: "/images/fabric/silk.jpg" }),
                o("Tulle", { img: "/images/fabric/tulle.jpg" }), o("Lace", { img: "/images/fabric/lace.jpg" }),
                o("Chiffon", { img: "/images/fabric/chiffon.jpg" }), o("Organza", { img: "/images/fabric/organza.jpg" }),
                o("Velvet", { img: "/images/fabric/velvet.jpg" }), o("Crepe", { img: "/images/fabric/crepe.jpg" }),
                o("Taffeta", { img: "/images/fabric/taffeta.jpg" }), o("Sequin", { img: "/images/fabric/sequin.jpg" }),
            ],
        },
        {
            key: "design", title: "Design details", hint: "Embellishments and patterns on the gown.", kind: "image",
            options: [
                o("Floral lace", { img: "/images/design/pattern1.jpg" }), o("Beaded", { img: "/images/design/pattern2.jpg" }),
                o("Embroidered", { img: "/images/design/pattern3.jpg" }), o("Sequined", { img: "/images/design/pattern4.jpg" }),
                o("Ruffled", { img: "/images/design/pattern5.jpg" }), o("Plain / minimal", { img: "/images/design/pattern6.jpg" }),
            ],
        },
    ],
    Barong: [
        { key: "color", title: "Color", hint: "The main color of the barong.", required: true, kind: "swatch", options: BARONG_COLORS },
        {
            key: "fit", title: "Fit", hint: "How the barong sits on the body.", required: true, kind: "chip",
            options: [o("Classic fit"), o("Slim fit"), o("Relaxed fit")],
        },
        { key: "fabric", title: "Fabric", hint: "What the barong is woven from.", kind: "chip", options: [o("Piña"), o("Jusi"), o("Organza"), o("Cotton blend")] },
        { key: "sleeve", title: "Sleeves", hint: "Long or short sleeves.", kind: "chip", options: [o("Long Sleeve"), o("Short Sleeve")] },
        {
            key: "design", title: "Embroidery", hint: "The embroidery style on the front.", kind: "chip",
            options: [o("Plain"), o("Floral embroidery"), o("Geometric embroidery"), o("Calado cutwork"), o("Border embroidery")],
        },
    ],
};

export const EXTRAS_ID = "extras";

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z]/g, "");

// Pre-fills a redesign with what the chosen product already is, so customers only change what they want
export function prefillFromProduct(product) {
    const groups = GROUPS[product.category] || [];
    const out = {};
    const find = (key, text, loose) => {
        const group = groups.find((g) => g.key === key);
        if (!group || !text) return;
        const t = norm(text);
        const hit = group.options.find((opt) => (loose ? t.includes(norm(opt.value)) : norm(opt.value) === t));
        if (hit) out[key] = hit.value;
    };
    find("color", product.colors?.[0]?.name);
    find("sleeve", product.sleeve);
    find("fabric", product.material, true);
    return out;
}

// One row per section of the workbench: every option group, then "Photos & notes".
// Used by the section list and by the summary on the last step.
export function buildRows(groups, selections, extrasText) {
    return [
        ...groups.map((g) => ({
            id: g.key,
            title: g.title,
            required: !!g.required,
            value: selections[g.key] || "",
            swatch: g.kind === "swatch" ? g.options.find((opt) => opt.value === selections[g.key])?.swatch : undefined,
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