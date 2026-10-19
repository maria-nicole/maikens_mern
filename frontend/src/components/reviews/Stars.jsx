import { Star } from "lucide-react";

/**
 * A row of stars. Display-only unless `onChange` is given, in which case the stars
 * become buttons for picking a rating.
 *
 * Used for the average and for each review on a product page, and for the rating
 * field in ReviewForm.
 */
const SIZES = { sm: 13, md: 16, lg: 22 };

// Whole stars only, so the row never shows a half-filled star
const nearest = (value) => Math.min(5, Math.max(0, Math.round(Number(value) || 0)));

export default function Stars({ value = 0, size = "md", onChange, label }) {
  const px = SIZES[size] || SIZES.md;
  const shown = nearest(value);
  const stars = [1, 2, 3, 4, 5];

  if (!onChange) {
    return (
      <span
        className="inline-flex items-center gap-0.5"
        role="img"
        aria-label={label || `${value} out of 5 stars`}
      >
        {stars.map((n) => (
          <Star
            key={n}
            size={px}
            aria-hidden="true"
            className={`fill-current ${n <= shown ? "text-yellow-600/89" : "text-gray-200"}`}
          />
        ))}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1" role="radiogroup" aria-label={label || "Your rating"}>
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={shown === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onClick={() => onChange(n)}
          className="rounded p-0.5 transition-transform hover:scale-110"
        >
          <Star
            size={px}
            aria-hidden="true"
            className={`fill-current ${n <= shown ? "text-yellow-600/89" : "text-gray-300"}`}
          />
        </button>
      ))}
    </span>
  );
}
