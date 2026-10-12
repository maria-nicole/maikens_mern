import { Link } from "react-router-dom";
import { formatPrice } from "./catalogConfig";

function getBadge(product) {
    if (product.fulfillment === "Made-to-order") {
        return { label: "Made to order", className: "bg-blue-50 text-blue-700" };
    }
    if (product.status === "Out of stock") {
        return { label: "Out of stock", className: "bg-red-50 text-red-700" };
    }
    if (product.status === "Low stock") {
        return { label: `Only ${product.totalStock} left`, className: "bg-amber-50 text-amber-700" };
    }
    return null;
}

export default function ProductCard({ product, viewMode }) {
    const isList = viewMode === "list";
    const badge = getBadge(product);
    const details = [product.category[0], product.eventType[0]].filter(Boolean).join(", ");

    return (
        <Link
            to={`/product/${product.id}`}
            className={`group block overflow-hidden rounded-lg bg-white ring-1 ring-stone-200 transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-600/89 ${isList ? "flex items-stretch" : ""
                }`}
        >
            {/* Photo */}
            <div
                className={`relative overflow-hidden bg-zinc-100 ${isList ? "w-32 shrink-0 sm:w-44" : "aspect-[3/4] w-full"
                    }`}
            >
                {product.image ? (
                    <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">No photo</div>
                )}

                {badge && (
                    <span
                        className={`absolute left-2 top-2 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm ${badge.className}`}
                    >
                        {badge.label}
                    </span>
                )}
            </div>

            {/* Info */}
            <div className={`flex flex-col gap-1 p-4 ${isList ? "flex-1 justify-center" : ""}`}>
                <h3 className="font-serif text-lg font-bold leading-snug text-neutral-800 group-hover:text-yellow-700/89 transition-colors">
                    {product.name}
                </h3>

                {details && <p className="text-sm text-stone-500">{details}</p>}

                {product.size.length > 0 && (
                    <p className="text-xs text-stone-400">Sizes {product.size.join(", ")}</p>
                )}

                <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="font-semibold text-neutral-800">{formatPrice(product.price)}</p>

                    {product.swatches.length > 0 && (
                        <div className="flex gap-1">
                            {product.swatches.slice(0, 5).map((c) => (
                                <span
                                    key={c.hex}
                                    title={c.name}
                                    className="h-4 w-4 rounded-full border border-black/10"
                                    style={{ background: c.hex }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}