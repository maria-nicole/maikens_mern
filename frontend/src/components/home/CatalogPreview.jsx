import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import ProductCard from "../catalog/ProductCard";

const buttonClass =
    "flex w-full items-center justify-center gap-2 rounded-md border border-yellow-700/89 p-3 font-medium text-yellow-700/89 duration-200 hover:bg-yellow-600/89 hover:text-white";

export default function CatalogPreview({ loading, loadError, products, skeletonCount, hasMore, onShowMore }) {
    return (
        <section className="bg-stone-50 px-6 py-16 md:px-10 lg:px-24">
            <div className="mb-8">
                <h2 className="font-serif text-3xl font-bold text-neutral-800 md:text-4xl">From our catalog</h2>
                <p className="mt-2 text-stone-600">Ready-to-wear and made-to-order pieces for every occasion.</p>
            </div>

            {loadError && (
                <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {loadError}
                </p>
            )}

            {loading ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {Array.from({ length: skeletonCount }).map((_, i) => (
                        <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-zinc-100" />
                    ))}
                </div>
            ) : products.length === 0 ? (
                !loadError && (
                    <div className="py-10 text-center">
                        <p className="font-serif text-xl font-bold text-neutral-800">Nothing in the catalog yet</p>
                        <p className="mt-1 text-sm text-stone-500">New gowns and barong will show up here once they're published.</p>
                    </div>
                )
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        {products.map((product) => (
                            <ProductCard key={product.id} product={product} viewMode="grid" />
                        ))}
                    </div>

                    <div className="mx-auto mt-10 max-w-sm">
                        {hasMore ? (
                            <button onClick={onShowMore} className={buttonClass}>
                                Show more
                            </button>
                        ) : (
                            <Link to="/catalog" className={buttonClass}>
                                Browse the full catalog
                                <ArrowRight size={16} />
                            </Link>
                        )}
                    </div>
                </>
            )}
        </section>
    );
}