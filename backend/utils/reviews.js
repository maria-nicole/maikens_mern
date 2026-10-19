/* ------------------------------------------------------------------------------------------
   The review rules, kept apart from the database so they can be exercised on their own.

   "May this customer review this product?" is answered here, in one place, and used by
   both the button on the order card and the endpoint that creates the review — so the two
   can never disagree about who is allowed to write one.

   This file deliberately imports nothing, so it can be loaded outside the app.
------------------------------------------------------------------------------------------- */

// Reviews open up once the order has actually been handed over. A cancelled order can
// never be "Completed", so this one check also covers "called off".
export const REVIEWABLE_STATUS = "Completed";

// The product ids on an order. Online checkout fills `items`; a few order shapes only ever
// have the single top-level `product`, so both are considered.
export const productIdsOn = (order) => {
  const ids = new Set();
  for (const item of order?.items || []) {
    if (item?.product) ids.add(String(item.product));
  }
  if (order?.product) ids.add(String(order.product));
  return ids;
};

export const isCompleted = (order) => !!order && order.status === REVIEWABLE_STATUS;

// The order that justifies a review for this product (newest first, as they are passed in).
// Returns null when the customer never completed an order containing it.
export const findPurchased = (orders, productId) =>
  (orders || []).find((o) => isCompleted(o) && productIdsOn(o).has(String(productId))) || null;

export const canReview = (orders, productId) => !!findPurchased(orders, productId);

/* Everything this customer may review, each with their review if they already left one.
   `orders` should be the customer's own orders, and `reviews` their own reviews.
   Returns [{ productId, orderId, review }] — one row per purchased product, newest
   purchase first, so the same product bought twice yields one row. */
export const reviewablePurchases = ({ orders = [], reviews = [] }) => {
  const byProduct = new Map(reviews.map((r) => [String(r.product), r]));
  const seen = new Set();
  const rows = [];
  for (const order of orders) {
    if (!isCompleted(order)) continue;
    for (const productId of productIdsOn(order)) {
      if (seen.has(productId)) continue; // an earlier (newer) order already owns this row
      seen.add(productId);
      rows.push({ productId, orderId: String(order._id), review: byProduct.get(productId) || null });
    }
  }
  return rows;
};

/* The average and star breakdown a product page shows.
   Always returns every bucket 5..1, so the bars don't jump around as reviews arrive. */
export const summarizeReviews = (reviews = []) => {
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  for (const review of reviews || []) {
    const rating = Math.round(Number(review?.rating) || 0);
    if (breakdown[rating] === undefined) continue; // ignore anything malformed
    breakdown[rating] += 1;
    sum += rating;
  }
  const count = Object.values(breakdown).reduce((total, n) => total + n, 0);
  return { count, average: count ? Math.round((sum / count) * 10) / 10 : 0, breakdown };
};
