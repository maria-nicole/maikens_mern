import { Link } from "react-router-dom";
import { Heart, ShoppingBag } from "lucide-react";
import { assetUrl, cardClass, fmt, primaryLink } from "./accountShared";
import { EmptyState, Skeleton } from "./atoms";

/**
 * The catalogue products this customer saved with the heart button.
 * Moved out of the old /favorites "Favorite Designs" tab.
 */
export default function FavoritesPanel({ favorites, loading, onRemove }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
        ))}
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="No favorites yet."
        text="Tap the heart icon on any gown or barong to save it here."
        action={
          <Link to="/catalog" className={primaryLink}>
            Browse the Catalog
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">
        {favorites.length} {favorites.length === 1 ? "saved piece" : "saved pieces"}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        {favorites.map((item) => {
          const soldOut = item.status === "Out of stock";
          const details = [
            item.category,
            item.eventTypes?.[0],
            item.sizes?.length ? `Sizes ${item.sizes.map((s) => s.size).join("/")}` : "",
          ].filter(Boolean);

          return (
            <div key={item._id} className={`${cardClass} overflow-hidden group`}>
              <div className="relative">
                <Link to={`/product/${item._id}`}>
                  {item.images?.[0] ? (
                    <img
                      src={assetUrl(item.images[0])}
                      alt={item.name}
                      className="w-full aspect-[3/4] object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[3/4] bg-zinc-100 flex items-center justify-center text-xs text-zinc-400">
                      No photo
                    </div>
                  )}
                </Link>

                <button
                  type="button"
                  onClick={() => onRemove(item)}
                  aria-label={`Remove ${item.name} from favorites`}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white"
                >
                  <Heart size={14} className="fill-yellow-600/89 text-yellow-600/89" />
                </button>

                {(soldOut || item.status === "Low stock") && (
                  <span
                    className={`absolute bottom-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      soldOut ? "text-red-700 bg-red-50 border-red-200" : "text-amber-700 bg-amber-50 border-amber-200"
                    }`}
                  >
                    {soldOut ? "Out of stock" : `Only ${item.totalStock} left`}
                  </span>
                )}
              </div>

              <div className="p-3">
                <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{details.join(" · ")}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-yellow-700/89 font-semibold text-sm">{fmt(item.price)}</p>
                  <Link
                    to={`/product/${item._id}`}
                    aria-label={`View ${item.name}`}
                    className="w-8 h-8 rounded-full bg-yellow-600/89 text-white flex items-center justify-center hover:bg-yellow-700/89"
                  >
                    <ShoppingBag size={13} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
