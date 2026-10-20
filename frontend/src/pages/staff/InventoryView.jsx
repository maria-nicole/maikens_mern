import { useEffect, useMemo, useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { font, assetUrl, peso, shortId } from "./staffLib";
import { SectionHeader, GhostButton, StockPill, EmptyState, Spinner, ErrorNote, inputCls } from "./ui";

const FILTERS = [
    { key: "All", label: "All" },
    { key: "Active", label: "In stock" },
    { key: "Low stock", label: "Low stock" },
    { key: "Out of stock", label: "Out of stock" },
];

const SORTS = {
    name: { label: "Name", fn: (a, b) => a.name.localeCompare(b.name) },
    "stock-asc": { label: "Stock: low to high", fn: (a, b) => a.totalStock - b.totalStock },
    "stock-desc": { label: "Stock: high to low", fn: (a, b) => b.totalStock - a.totalStock },
    "price-asc": { label: "Price: low to high", fn: (a, b) => a.price - b.price },
    "price-desc": { label: "Price: high to low", fn: (a, b) => b.price - a.price },
};

const REFRESH_MS = 30000;

export default function InventoryView({ products, loading, loadError, onRefresh }) {
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState("All");
    const [sort, setSort] = useState("name");

    // Keep the numbers fresh while this tab is open
    useEffect(() => {
        const t = setInterval(() => !document.hidden && onRefresh(), REFRESH_MS);
        return () => clearInterval(t);
    }, [onRefresh]);

    const counts = useMemo(() => {
        const c = { All: products.length, Active: 0, "Low stock": 0, "Out of stock": 0 };
        products.forEach((p) => {
            if (c[p.status] !== undefined) c[p.status] += 1;
        });
        return c;
    }, [products]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return products
            .filter((p) => (filter === "All" || p.status === filter) && p.name.toLowerCase().includes(q))
            .sort(SORTS[sort].fn);
    }, [products, query, filter, sort]);

    return (
        <div>
            <SectionHeader
                eyebrow="Inventory monitoring"
                title="Stock levels"
                action={<GhostButton icon={RefreshCw} onClick={onRefresh}>Refresh</GhostButton>}
            />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="relative min-w-[180px] flex-1">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#B4A88F]" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search inventory…" aria-label="Search inventory" className={`${inputCls} pl-8`} />
                </div>
                <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by" className={`${inputCls} w-auto`}>
                    {Object.entries(SORTS).map(([key, s]) => <option key={key} value={key}>Sort: {s.label}</option>)}
                </select>
                <span className="rounded-md border border-[#E3DACB] bg-white px-3 py-1 text-xs text-[#8B8072]">{filtered.length} items</span>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
                {FILTERS.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        aria-pressed={filter === key}
                        className={`rounded-full px-3 py-1 text-xs transition ${filter === key ? "bg-[#241F1A] text-[#F5EFE4]" : "border border-[#E3DACB] text-[#6B6153] hover:bg-[#FBF8F3]"
                            }`}
                    >
                        {label} <span className="opacity-60">{counts[key]}</span>
                    </button>
                ))}
            </div>

            <ErrorNote onRetry={onRefresh}>{loadError}</ErrorNote>

            <div className="overflow-hidden rounded-2xl border border-[#E3DACB] bg-white">
                {loading && products.length === 0 ? (
                    <Spinner label="Loading inventory…" />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px] text-left text-sm">
                            <thead className="bg-[#FBF8F3] text-xs uppercase tracking-wide text-[#9C8C74]">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Product</th>
                                    <th className="px-6 py-3 font-medium">Category</th>
                                    <th className="px-6 py-3 font-medium">Price</th>
                                    <th className="px-6 py-3 font-medium">Stock by size</th>
                                    <th className="px-6 py-3 font-medium">Total</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F3EEE4]">
                                {filtered.map((p) => {
                                    const madeToOrder = p.fulfillment === "Made-to-order";
                                    return (
                                        <tr key={p._id} className="hover:bg-[#FBF8F3]">
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    {p.images?.[0] ? (
                                                        <img src={assetUrl(p.images[0])} alt="" className="h-12 w-9 shrink-0 rounded-md object-cover" />
                                                    ) : (
                                                        <div className="h-12 w-9 shrink-0 rounded-md bg-[#F3EEE4]" />
                                                    )}
                                                    <div>
                                                        <p className="font-medium text-[#241F1A]">{p.name}</p>
                                                        <p className="text-xs text-[#9C8C74]" style={font.mono}>{shortId("MK", p._id)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-[#4A4136]">{p.category}</td>
                                            <td className="px-6 py-3" style={font.mono}>{peso(p.price)}</td>
                                            <td className="px-6 py-3">
                                                {madeToOrder ? (
                                                    <span className="text-xs text-[#8B8072]">Made to order</span>
                                                ) : p.sizes?.length ? (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {p.sizes.map((s) => (
                                                            <span
                                                                key={s.size}
                                                                className={`rounded-md border px-1.5 py-0.5 text-xs ${s.stock === 0 ? "border-[#E8CFCB] bg-[#F3E4E2] text-[#6B3838]" : "border-[#E3DACB] text-[#4A4136]"
                                                                    }`}
                                                                style={font.mono}
                                                            >
                                                                {s.size}: {s.stock}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-[#8B8072]">Not tracked</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3" style={font.mono}>{madeToOrder ? "—" : p.totalStock}</td>
                                            <td className="px-6 py-3">{madeToOrder ? <span className="text-xs text-[#8B8072]">—</span> : <StockPill status={p.status} />}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filtered.length === 0 && <EmptyState title="No items match" hint="Try a different search or filter." />}
                    </div>
                )}
            </div>
        </div>
    );
}