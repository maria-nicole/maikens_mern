import { Link } from "react-router-dom";
import { formatPrice } from "../catalog/catalogConfig";

export default function FeaturedCollection({ loading, items, count }) {
    if (!loading && items.length === 0) return null;

    return (
        <section className="px-6 py-16 md:px-10 lg:px-24">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="font-serif text-3xl font-bold text-neutral-800 md:text-4xl">Newest arrivals</h2>
                    <p className="mt-2 text-stone-600">A closer look at our latest gowns and barong.</p>
                </div>
                <Link to="/catalog" className="text-sm font-semibold text-yellow-700/89 hover:underline">
                    View all
                </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
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
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-16">
                                <p className="font-serif text-lg font-bold text-white">{item.name}</p>
                                <p className="text-sm text-white/85">{formatPrice(item.price)}</p>
                            </div>
                        </Link>
                    ))}
            </div>
        </section>
    );
}