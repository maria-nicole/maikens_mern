import ProductCard from "./ProductCard";

export default function ProductGrid({
    loading,
    loadError,
    products,
    viewMode,
    skeletonCount,
    catalogIsEmpty,
    hasActiveFilters,
    onClearAll,
}) {
    if (loadError) {
        return (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                {loadError}
            </div>
        );
    }

    const gridClass =
        viewMode === "grid" ? "grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4" : "flex flex-col gap-4";

    if (loading) {
        return (
            <div className={gridClass}>
                {Array.from({ length: skeletonCount }).map((_, i) => (
                    <div key={i} className="animate-pulse overflow-hidden rounded-lg ring-1 ring-stone-100">
                        <div className={viewMode === "grid" ? "aspect-[3/4] bg-zinc-100" : "h-44 bg-zinc-100"} />
                        {viewMode === "grid" && (
                            <div className="space-y-2 p-4">
                                <div className="h-4 w-3/4 rounded bg-zinc-100" />
                                <div className="h-3 w-1/2 rounded bg-zinc-100" />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="py-20 text-center">
                {catalogIsEmpty ? (
                    <>
                        <p className="font-serif text-xl font-bold text-neutral-800">Nothing in the catalog yet</p>
                        <p className="mt-1 text-sm text-stone-500">New gowns and barong will show up here once they're published.</p>
                    </>
                ) : (
                    <>
                        <p className="font-serif text-xl font-bold text-neutral-800">No matches found</p>
                        <p className="mt-1 text-sm text-stone-500">Try removing a filter or searching a different name.</p>
                        {hasActiveFilters && (
                            <button
                                onClick={onClearAll}
                                className="mt-5 rounded-md border border-yellow-600/89 bg-yellow-600/89 px-5 py-2 text-sm font-medium text-white hover:bg-white hover:text-yellow-600/89 duration-200"
                            >
                                Clear search and filters
                            </button>
                        )}
                    </>
                )}
            </div>
        );
    }

    return (
        <div className={gridClass}>
            {products.map((product) => (
                <ProductCard key={product.id} product={product} viewMode={viewMode} />
            ))}
        </div>
    );
}