import { useEffect, useState } from "react";
import axios from "axios";
import { Loader2, Star } from "lucide-react";
import Stars from "./Stars";
import { API_URL, cardClass, formatDate } from "../account/accountShared";

/**
 * What other customers said about this product: the average, the star breakdown and
 * every visible review. Read-only and public — reviews are written from the order
 * card in My Account, where we know the customer actually bought the item.
 */
const BARS = [5, 4, 3, 2, 1];

const initialOf = (name) => (String(name || "").trim().charAt(0) || "?").toUpperCase();

export default function ReviewsSection({ productId }) {
  const [data, setData] = useState(null); // { reviews, summary }
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/api/reviews/product/${productId}`);
        if (!ignore) setData(res.data);
      } catch {
        if (!ignore) setError("Reviews couldn't be loaded right now.");
      }
    })();
    return () => {
      ignore = true;
    };
  }, [productId]);

  const summary = data?.summary;
  const count = summary?.count || 0;

  return (
    <div className="px-6 md:px-10 lg:px-24 pb-16">
      <h2 className="mb-5 text-2xl font-bold text-neutral-800">Customer reviews</h2>

      {!data && !error && (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" /> Loading reviews…
        </p>
      )}

      {error && <p className="text-sm text-gray-400">{error}</p>}

      {data && count === 0 && (
        <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          No reviews yet. A review can be written once an order for this piece is complete.
        </p>
      )}

      {data && count > 0 && (
        <div className="grid items-start gap-6 md:grid-cols-[240px_1fr]">
          {/* The average and the spread */}
          <div className={`${cardClass} p-5 text-center`}>
            <p className="text-4xl font-bold text-neutral-800">{summary.average.toFixed(1)}</p>
            <div className="mt-1 flex justify-center">
              <Stars value={summary.average} label={`${summary.average} out of 5 stars`} />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {count} {count === 1 ? "review" : "reviews"}
            </p>

            <div className="mt-4 space-y-1.5">
              {BARS.map((n) => {
                const pct = Math.round((summary.breakdown[n] / count) * 100);
                return (
                  <div key={n} className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="w-3 text-right">{n}</span>
                    <Star size={11} aria-hidden="true" className="shrink-0 fill-current text-yellow-600/89" />
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <span className="block h-full rounded-full bg-yellow-600/89" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-5 text-right tabular-nums">{summary.breakdown[n]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <ul className="space-y-3">
            {data.reviews.map((review) => (
              <li key={review._id} className={`${cardClass} p-4`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-600/10 text-sm font-semibold text-yellow-800/89">
                    {initialOf(review.authorName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-neutral-800">
                      {review.authorName || "A customer"}
                    </p>
                    <div className="flex items-center gap-2">
                      <Stars value={review.rating} size="sm" />
                      <span className="text-xs text-gray-400">{formatDate(review.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {review.title && <p className="mt-3 text-sm font-semibold text-neutral-800">{review.title}</p>}
                <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{review.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
