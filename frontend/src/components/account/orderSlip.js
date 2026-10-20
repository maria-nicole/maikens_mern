/* ------------------------------------------------------------------------------------------
   The order slip: a small PNG of an order that the customer can send to the boutique on
   Messenger — the tidy version of screenshotting the checkout page.

   Layout is deliberately kept apart from drawing:
     • slipLayout(order) turns an order into a flat list of things to draw
     • drawSlip(ctx, layout, images) paints that list onto a canvas
   so the geometry can be produced and inspected without a browser.

   This file deliberately imports nothing outside the app: it is the one piece that can
   be rendered outside the app to check the result.
------------------------------------------------------------------------------------------- */

import { courierOf } from "./shipping.js";

export const SLIP_WIDTH = 720; // logical pixels — the canvas is drawn at SLIP_SCALE times this
export const SLIP_SCALE = 2; // 2x, so Messenger's compression doesn't make it fuzzy

/* Every colour below appears elsewhere in the shop (the gold, the stone greys). */
const GOLD = "#CA8A04";
const GOLD_DARK = "#B45309";
const PILL_BG = "#FFFBEB";
const PILL_BORDER = "#FDE68A";
const INK = "#241F1A";
const INK_SOFT = "#57534E";
const MUTED = "#A8A29E";
const HAIRLINE = "#E7E5E4";
const PAGE = "#FFFFFF";
const FOOT_BG = "#FAFAF9";
const PLACEHOLDER = "#F5F5F4";
/* The same green and maroon the rest of the app uses for "paid" and "money owed" */
const GOOD = "#3E4E3B";
const DUE = "#6B3838";

/* Status pill tones. Everything sits in the house gold except a cancelled order, which
   the boutique needs to be able to spot at a glance. */
const PILL_DEFAULT = { bg: PILL_BG, border: PILL_BORDER, text: GOLD_DARK };
const PILL_TONES = { Cancelled: { bg: "#FEF2F2", border: "#FECACA", text: "#B91C1C" } };
const CANCELLED_TEXT = PILL_TONES.Cancelled.text;

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const font = (size, weight = 400, family = SANS) => `${weight} ${size}px ${family}`;

const PAD = 40;
const BAND_H = 112;
const THUMB_W = 54;
const THUMB_H = 72;
const ROW_H = 88;
const IMAGE_TIMEOUT_MS = 4000;

/* The mark from public/logo.svg, so the slip carries the same logo as the site. */
const MARK_PATH = "M 17,45 C 18.5,34 20,26 20,21 Q 20,17.5 24,19.5 L 32,34 L 40,19.5 Q 44,17.5 44,21 C 44,26 45.5,34 47,45";
const MARK_STROKE = 5;
const MARK_BOX = 64;

/* ── Formatters ──
   Same output as accountShared.fmt / formatDate / orderNo. Repeated rather than imported
   so this module stays free of the app's module graph. */
const peso = (n) => `₱${Number(n || 0).toLocaleString("en-PH")}`;
const slipNo = (order) => `#${String(order?._id || "").slice(-6).toUpperCase()}`;
const slipDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "";

/* Old orders predate the items array, so fall back to the one-line summary. */
const itemsOf = (order) =>
  order?.items?.length
    ? order.items
    : [{ name: order?.item || "Order", quantity: 1, unitPrice: order?.total || 0, size: "", image: "" }];

const subtotalOf = (rows) => rows.reduce((sum, it) => sum + (it.unitPrice || 0) * (it.quantity || 1), 0);

const paymentLine = (order) => {
  const method = order?.paymentMethod;
  if (!method) return "To be arranged with the boutique";
  return order.gcashNumber ? `${method} · ${order.gcashNumber}` : method;
};

const deliveryLine = (order) =>
  order?.deliveryMethod === "Pick-up"
    ? `Pick-up on ${slipDate(order.pickupDate) || "a date to be agreed"}`
    : order?.address || "To be arranged with the boutique";

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/* ── Money received ──
   What the customer has paid, and what is left to settle. The slip and the order
   card in My Account both read from this one function so they can never disagree.

   The payment ledger is the source of truth: the rows printed on the slip always
   add up to the "paid to date" shown beneath them. Orders taken before the ledger
   existed only carry amountPaid, which is the fallback.

   `tendered` is the cash handed across the counter, which includes the change given
   back — it is not money the shop kept, so it never counts towards the total paid. */
export const paymentSummary = (order) => {
  const rows = (order?.payments || [])
    .filter((p) => Number(p?.amount) > 0)
    .map((p) => ({
      at: p?.at || order?.createdAt,
      method: p?.method || "",
      amount: round2(p.amount),
    }));

  const ledgerTotal = rows.reduce((sum, p) => sum + p.amount, 0);
  const paid = round2(rows.length ? ledgerTotal : order?.amountPaid);
  const total = round2(order?.total);

  return {
    rows,
    paid,
    total,
    balance: Math.max(0, round2(total - paid)),
    hasLedger: rows.length > 0,
    // A cancelled order is never "paid in full", however much money came in.
    cancelled: order?.status === "Cancelled",
  };
};

/* ── Text measuring and wrapping ── */

/* Used when there is no canvas to measure with (the layout check in Node). */
const roughMeasure = (text, fontStr) => {
  const size = Number(/(\d+(?:\.\d+)?)px/.exec(fontStr)?.[1] || 14);
  return String(text).length * size * 0.52;
};

function truncate(value, fontStr, maxWidth, measure) {
  let out = value;
  while (out.length > 1 && measure(`${out}…`, fontStr) > maxWidth) out = out.slice(0, -1);
  return `${out.trimEnd()}…`;
}

/* Splits into at most maxLines lines, ellipsising whatever doesn't fit. */
export function wrapText(value, fontStr, maxWidth, measure = roughMeasure, maxLines = 2) {
  const words = String(value || "").split(/\s+/).filter(Boolean);
  if (!words.length) return [""];

  const lines = [];
  let line = "";

  for (const word of words) {
    if (!line) {
      line = measure(word, fontStr) <= maxWidth ? word : truncate(word, fontStr, maxWidth, measure);
      continue;
    }
    const candidate = `${line} ${word}`;
    if (measure(candidate, fontStr) <= maxWidth) {
      line = candidate;
      continue;
    }
    lines.push(line);
    // No rows left, and this word didn't fit: cut the last line short.
    if (lines.length === maxLines) {
      lines[maxLines - 1] = truncate(lines[maxLines - 1], fontStr, maxWidth, measure);
      return lines;
    }
    line = word;
  }

  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

/* ── The layout ── */

/**
 * Everything the slip shows, as a flat list of primitives plus the page height.
 * `measure(text, cssFont)` must return a width in logical pixels.
 */
export function slipLayout(order, { measure = roughMeasure, resolveImage = (p) => p || "" } = {}) {
  const m = measure;
  const parts = [];
  const W = SLIP_WIDTH;
  const right = W - PAD;
  const contentW = right - PAD;

  const rect = (x, y, w, h, fill, r = 0) => parts.push({ type: "rect", x, y, w, h, fill, r });
  const rule = (x, y, w, color = HAIRLINE) => parts.push({ type: "rect", x, y, w, h: 1, fill: color });
  const text = ({ align = "left", ...rest }) => parts.push({ type: "text", align, ...rest });

  /* ── Header band ── */
  rect(0, 0, W, BAND_H, GOLD);
  parts.push({ type: "mark", x: PAD, y: 34, size: 44 });

  const brandFont = font(26, 700, SERIF);
  const brandTailFont = font(17, 400, SERIF);
  const brandLead = "MAIKENS ";
  const brandX = PAD + 60;
  text({ x: brandX, y: 68, text: brandLead, font: brandFont, color: "#FFFFFF" });
  text({ x: brandX + m(brandLead, brandFont), y: 68, text: "Gown & Barong", font: brandTailFont, color: "#FFF7E6" });
  text({ x: right, y: 52, text: "ORDER SLIP", font: font(11, 700), color: "#FFF7E6", align: "right" });

  /* ── Order number and status ── */
  let by = BAND_H + 34 + 30; // baseline of the order number
  text({ x: PAD, y: by, text: slipNo(order), font: font(30, 700, SERIF), color: INK });

  const pillText = order?.status || "Order Received";
  const pill = PILL_TONES[order?.status] || PILL_DEFAULT;
  const pillFont = font(12.5, 600);
  const pillW = Math.round(m(pillText, pillFont)) + 26;
  const pillH = 26;
  const pillY = by - 25;
  rect(right - pillW, pillY, pillW, pillH, pill.bg, pillH / 2);
  parts.push({ type: "rect", x: right - pillW, y: pillY, w: pillW, h: pillH, r: pillH / 2, fill: "none", stroke: pill.border });
  text({ x: right - pillW / 2, y: pillY + 18, text: pillText, font: pillFont, color: pill.text, align: "center" });

  by += 26;
  text({ x: PAD, y: by, text: `Prepared for ${order?.customerName || "you"}`, font: font(13.5, 500), color: INK_SOFT });
  const placed = slipDate(order?.createdAt);
  if (placed) text({ x: right, y: by, text: `Placed ${placed}`, font: font(13), color: MUTED, align: "right" });

  /* ── Items ── */
  rule(PAD, by + 20, contentW);
  by += 51;
  text({ x: PAD, y: by, text: "ITEMS", font: font(11, 700), color: MUTED });
  by += 10;

  const rows = itemsOf(order);
  const nameFont = font(15, 600);
  const metaFont = font(12.5);
  const priceFont = font(15, 600);
  const textX = PAD + THUMB_W + 16;

  rows.forEach((item, i) => {
    const top = by + i * ROW_H;

    const src = resolveImage(item.image);
    if (src) parts.push({ type: "image", x: PAD, y: top, w: THUMB_W, h: THUMB_H, r: 6, src, fallbackFill: PLACEHOLDER });
    else rect(PAD, top, THUMB_W, THUMB_H, PLACEHOLDER, 6);
    // A hairline so a missing (or very light) photo still reads as a picture slot
    parts.push({ type: "rect", x: PAD, y: top, w: THUMB_W, h: THUMB_H, r: 6, fill: "none", stroke: HAIRLINE });

    const price = peso((item.unitPrice || 0) * (item.quantity || 1));
    text({ x: right, y: top + 19, text: price, font: priceFont, color: INK, align: "right" });

    const maxW = Math.max(80, right - m(price, priceFont) - 16 - textX);
    wrapText(item.name || "Item", nameFont, maxW, m, 2).forEach((line, li) => {
      text({ x: textX, y: top + 19 + li * 20, text: line, font: nameFont, color: INK });
    });

    const meta = [item.size ? `Size ${item.size}` : "", `Qty ${item.quantity || 1}`].filter(Boolean).join(" · ");
    text({ x: textX, y: top + THUMB_H - 8, text: meta, font: metaFont, color: MUTED });
  });

  by += rows.length * ROW_H - 16;

  /* ── Delivery and payment ── */
  by += 28;
  rule(PAD, by, contentW);

  by += 30;
  text({ x: PAD, y: by, text: order?.deliveryMethod === "Pick-up" ? "PICK-UP" : "DELIVERY", font: font(11, 700), color: MUTED });
  by += 22;
  const addressFont = font(13.5);
  const addressLines = wrapText(deliveryLine(order), addressFont, contentW, m, 2);
  addressLines.forEach((line, i) => text({ x: PAD, y: by + i * 19, text: line, font: addressFont, color: INK }));
  by += addressLines.length * 19;

  // Who brings it
  const courier = courierOf(order);
  if (courier) {
    by += 20;
    text({ x: PAD, y: by, text: `Delivered by ${courier}`, font: font(13.5), color: MUTED });
  }

  by += 26;
  text({ x: PAD, y: by, text: "PAYMENT", font: font(11, 700), color: MUTED });
  by += 22;
  text({ x: PAD, y: by, text: paymentLine(order), font: addressFont, color: INK });

  /* ── Totals ── */
  by += 30;
  rule(PAD, by, contentW);

  const labelX = right - 220;
  by += 26;
  const totals = [
    ["Subtotal", peso(subtotalOf(rows))],
    ["Shipping", order?.shippingFee ? peso(order.shippingFee) : "Free (Pick-up)"],
  ];
  totals.forEach(([label, value], i) => {
    text({ x: labelX, y: by + i * 22, text: label, font: font(13.5), color: MUTED });
    text({ x: right, y: by + i * 22, text: value, font: font(13.5, 500), color: INK, align: "right" });
  });

  by += totals.length * 22 + 8;
  rule(labelX, by, right - labelX);
  by += 28;
  text({ x: labelX, y: by, text: "Total", font: font(14, 600), color: INK });
  text({ x: right, y: by, text: peso(order?.total), font: font(19, 700, SERIF), color: GOLD_DARK, align: "right" });

  /* ── Payments received ──
     Charges, then money in, then what is left — the order a statement reads in. */
  const money = paymentSummary(order);

  by += 30;
  rule(PAD, by, contentW);

  by += 26;
  text({ x: PAD, y: by, text: "PAYMENTS RECEIVED", font: font(11, 700), color: MUTED });

  const payFont = font(13.5);
  if (money.hasLedger) {
    money.rows.forEach((row, i) => {
      const label = [slipDate(row.at), row.method].filter(Boolean).join(" · ");
      const y = by + 22 + i * 20;
      text({ x: PAD, y, text: label, font: payFont, color: INK_SOFT });
      text({ x: right, y, text: peso(row.amount), font: font(13.5, 500), color: INK, align: "right" });
    });
    by += 22 + money.rows.length * 20;
  } else {
    // Orders taken before the ledger existed still count what was paid, with no rows to show.
    text({
      x: PAD,
      y: by + 22,
      text: money.paid > 0 ? "Recorded at the boutique." : "No payment recorded yet.",
      font: payFont,
      color: MUTED,
    });
    by += 42;
  }

  by += 10;
  rule(PAD, by, contentW);

  by += 24;
  text({ x: PAD, y: by, text: "Paid to date", font: font(13.5), color: MUTED });
  text({ x: right, y: by, text: peso(money.paid), font: font(13.5, 600), color: INK, align: "right" });

  by += 22;
  if (money.cancelled) {
    // Money may have changed hands, so it is shown — but a cancelled order is never
    // "paid in full"; it is money to sort out with the boutique.
    const notice =
      money.paid > 0
        ? `Cancelled — ${peso(money.paid)} received. Message us about a refund.`
        : "Cancelled. No payment was received.";
    const noticeFont = font(13, 600);
    const noticeLines = wrapText(notice, noticeFont, contentW, m, 2);
    noticeLines.forEach((line, i) =>
      text({ x: PAD, y: by + i * 18, text: line, font: noticeFont, color: CANCELLED_TEXT })
    );
    by += (noticeLines.length - 1) * 18;
  } else if (money.balance > 0) {
    text({ x: PAD, y: by, text: "Balance due", font: font(13.5), color: MUTED });
    text({ x: right, y: by, text: peso(money.balance), font: font(13.5, 600), color: DUE, align: "right" });
  } else if (money.paid > 0) {
    text({ x: PAD, y: by, text: "Paid in full", font: font(13.5, 600), color: GOOD });
  } else {
    text({ x: PAD, y: by, text: "Nothing due", font: font(13.5), color: MUTED });
  }

  /* ── Footer band ── */
  const footTop = by + 34;
  const footH = 76;
  rect(0, footTop, W, footH, FOOT_BG);
  rule(0, footTop, W);
  text({
    x: PAD,
    y: footTop + 31,
    text: "Send this slip to MAIKENS on Messenger and we'll confirm your order.",
    font: font(13, 500),
    color: INK_SOFT,
  });
  text({
    x: PAD,
    y: footTop + 53,
    text: "Maikens Gown & Barong · maikens-mern.vercel.app",
    font: font(11.5),
    color: MUTED,
  });

  return { width: W, height: footTop + footH, items: parts };
}

/* ── Drawing ── */

function roundRectPath(ctx, x, y, w, h, r = 0) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (!radius) {
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawMark(ctx, x, y, size) {
  const scale = size / MARK_BOX;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = MARK_STROKE;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke(new Path2D(MARK_PATH));
  ctx.restore();
}

/** Paints a layout. `images` maps a resolved src to an already-loaded image. */
export function drawSlip(ctx, layout, images = new Map()) {
  ctx.save();
  ctx.fillStyle = PAGE;
  ctx.fillRect(0, 0, layout.width, layout.height);
  ctx.textBaseline = "alphabetic";

  for (const part of layout.items) {
    if (part.type === "text") {
      ctx.font = part.font;
      ctx.fillStyle = part.color;
      ctx.textAlign = part.align || "left";
      ctx.fillText(part.text, part.x, part.y);
    } else if (part.type === "mark") {
      drawMark(ctx, part.x, part.y, part.size);
    } else if (part.type === "image") {
      const img = images.get(part.src);
      roundRectPath(ctx, part.x, part.y, part.w, part.h, part.r);
      if (img?.complete && img.naturalWidth) {
        ctx.save();
        ctx.clip();
        ctx.drawImage(img, part.x, part.y, part.w, part.h);
        ctx.restore();
      } else {
        // A slow or blocked photo must never hold up the slip
        ctx.fillStyle = part.fallbackFill || PLACEHOLDER;
        ctx.fill();
      }
    } else if (part.type === "rect") {
      roundRectPath(ctx, part.x, part.y, part.w, part.h, part.r);
      if (part.fill && part.fill !== "none") {
        ctx.fillStyle = part.fill;
        ctx.fill();
      }
      if (part.stroke) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = part.stroke;
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

/* ── Public helpers ── */

export const slipFilename = (order) => `maikens-order-${slipNo(order).slice(1)}.png`;

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* Photos are a nice-to-have, so a slow or CORS-blocked one resolves as null
   instead of rejecting and taking the whole slip down with it. */
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = setTimeout(() => resolve(null), IMAGE_TIMEOUT_MS);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

/**
 * Renders the order to a PNG. `assetUrl(path)` turns a stored "/uploads/x.jpg"
 * into something the browser can load (the account page already has one).
 */
export async function buildOrderSlip(order, { assetUrl } = {}) {
  const resolve = typeof assetUrl === "function" ? assetUrl : (p) => p || "";
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const measure = (text, cssFont) => {
    ctx.font = cssFont;
    return ctx.measureText(text).width;
  };

  const layout = slipLayout(order, { measure, resolveImage: resolve });

  const sources = [...new Set(layout.items.filter((p) => p.type === "image" && p.src).map((p) => p.src))];
  const loaded = await Promise.all(sources.map(loadImage));
  const images = new Map();
  sources.forEach((src, i) => {
    if (loaded[i]) images.set(src, loaded[i]);
  });

  // Setting the size also resets the context, so the scale has to come after it
  canvas.width = Math.round(layout.width * SLIP_SCALE);
  canvas.height = Math.round(layout.height * SLIP_SCALE);
  ctx.scale(SLIP_SCALE, SLIP_SCALE);
  drawSlip(ctx, layout, images);

  const blob = await new Promise((resolve2) => canvas.toBlob(resolve2, "image/png"));
  if (!blob) throw new Error("Couldn't create the order image on this device.");
  return { blob, filename: slipFilename(order) };
}

/** The same order as plain text, for pasting into a chat instead of attaching a file. */
export function slipText(order) {
  const rows = itemsOf(order);
  const money = paymentSummary(order);
  const lines = [
    "MAIKENS Gown & Barong — Order Slip",
    `${slipNo(order)} · ${slipDate(order?.createdAt)}`,
    `Status: ${order?.status || "Order Received"}`,
    "",
    `Prepared for: ${order?.customerName || "you"}`,
    "",
    "Items",
    ...rows.map(
      (it) =>
        `• ${it.name}${it.size ? ` (${it.size})` : ""} ×${it.quantity || 1} — ${peso(
          (it.unitPrice || 0) * (it.quantity || 1)
        )}`
    ),
    "",
    `Subtotal: ${peso(subtotalOf(rows))}`,
    `Shipping: ${order?.shippingFee ? peso(order.shippingFee) : "Free (Pick-up)"}`,
    `Total: ${peso(order?.total)}`,
    "",
    ...(money.rows.length
      ? [
          "Payments received",
          ...money.rows.map((p) => `• ${slipDate(p.at)} · ${p.method} — ${peso(p.amount)}`),
          "",
        ]
      : []),
    `Paid to date: ${peso(money.paid)}`,
    money.cancelled
      ? money.paid > 0
        ? `Cancelled — ${peso(money.paid)} received. Message us about a refund.`
        : "Cancelled. No payment was received."
      : money.balance > 0
        ? `Balance due: ${peso(money.balance)}`
        : money.paid > 0
          ? "Paid in full"
          : "Nothing due",
    "",
    order?.deliveryMethod === "Pick-up" ? `Pick-up: ${slipDate(order?.pickupDate)}` : `Delivery: ${deliveryLine(order)}`,
    ...(courierOf(order) ? [`Delivered by: ${courierOf(order)}`] : []),
    `Payment: ${paymentLine(order)}`,
    "",
    "Send this to MAIKENS on Messenger and we'll confirm your order.",
  ];
  return lines.join("\n");
}
