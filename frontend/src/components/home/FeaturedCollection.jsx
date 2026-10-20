import { Link } from "react-router-dom";
import { formatPrice } from "../catalog/catalogConfig";

export default function FeaturedCollection({ loading, items, count }) {
    if (!loading && items.length === 0) return null;

    return (
        <section className="px-5 py-12 sm:px-6 sm:py-16 md:px-10 lg:px-24">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
                <div>
                    <h2 className="font-serif text-2xl font-bold text-neutral-800 sm:text-3xl md:text-4xl">
                        Newest arrivals
                    </h2>
                    <p className="mt-2 text-sm text-stone-600 sm:text-base">
                        A closer look at our latest gowns and barong.
                    </p>
                </div>
                <Link to="/catalog" className="text-sm font-semibold text-yellow-700/89 hover:underline">
                    View all
                </Link>
            </div>

            {/* Two per row on every phone (a single column made the page far too long
                on a 375px screen), three on a tablet. */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                {loading
                    ? Array.from({ length: count }).map((_, i) => (
                        <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-zinc-100" />
                    ))
                    : items.map((item) => (
                        <Link
                            key={item.id}
                            to={`/product/${item.id}`}
                            className="group relative block aspect-[3/4] overflow-hidden rounded-lg bg-zinc-100"
                        >
                            <img
                                src={item.image}
                                alt={item.name}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-3 pt-14 sm:p-4 sm:pt-16">
                                <p className="font-serif text-base font-bold leading-snug text-white sm:text-lg">
                                    {item.name}
                                </p>
                                <p className="text-sm text-white/85">{formatPrice(item.price)}</p>
                            </div>
                        </Link>
                    ))}
            </div>
        </section>
    );
}