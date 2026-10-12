import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Pencil, Archive, ArchiveRestore, Trash2, Send, RefreshCw } from "lucide-react";
import { font, api, errMsg, assetUrl, peso, shortId } from "./adminLib";
import {
    SectionHeader, PrimaryButton, GhostButton, Segmented, ProductPill, EmptyState, Spinner, ErrorNote, ConfirmDialog, inputCls,
} from "./ui";

const STATUS_FILTERS = ["All", "Active", "Low stock", "Out of stock", "Draft", "Archived"];

export default function ProductsView({ notify, onChanged }) {
    const navigate = useNavigate();
    const [products, setProducts] = useState(null);
    const [error, setError] = useState("");
    const [category, setCategory] = useState("All");
    const [status, setStatus] = useState("All");
    const [query, setQuery] = useState("");
    const [busyId, setBusyId] = useState(null);
    const [deleting, setDeleting] = useState(null); // the product awaiting delete confirmation

    const load = useCallback(async () => {
        try {
            const { data } = await api.get("/products/admin/all");
            setProducts(data);
            setError("");
        } catch (err) {
            setError(errMsg(err));
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const counts = useMemo(() => {
        const c = Object.fromEntries(STATUS_FILTERS.map((s) => [s, 0]));
        (products || []).forEach((p) => {
            c.All += 1;
            if (c[p.status] !== undefined) c[p.status] += 1;
        });
        return c;
    }, [products]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return (products || []).filter(
            (p) =>
                (category === "All" || p.category === category) &&
                (status === "All" || p.status === status) &&
                p.name.toLowerCase().includes(q)
        );
    }, [products, category, status, query]);

    const replace = (updated) => setProducts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));

    const changeStatus = async (p, next, message) => {
        setBusyId(p._id);
        try {
            const { data } = await api.patch(`/products/${p._id}/status`, { status: next });
            replace(data);
            notify("success", message);
            onChanged?.();
        } catch (err) {
            notify("error", errMsg(err));
        } finally {
            setBusyId(null);
        }
    };

    const remove = async () => {
        const p = deleting;
        setBusyId(p._id);
        try {
            await api.delete(`/products/${p._id}`);
            setProducts((prev) => prev.filter((x) => x._id !== p._id));
            notify("success", `"${p.name}" was deleted.`);
            onChanged?.();
            setDeleting(null);
        } catch (err) {
            notify("error", errMsg(err));
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div>
            <SectionHeader
                eyebrow="Product catalog management"
                title="Gowns & Barongs"
                action={
                    <div className="flex gap-2">
                        <GhostButton icon={RefreshCw} onClick={load}>Refresh</GhostButton>
                        <PrimaryButton icon={Plus} onClick={() => navigate("/admin/products/new")}>Add product</PrimaryButton>
                    </div>
                }
            />

            <div className="mb-3 flex flex-wrap items-center gap-3">
                <Segmented label="Category" value={category} options={["All", "Gown", "Barong"]} onChange={setCategory} />
                <div className="relative min-w-[180px] max-w-xs flex-1">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#B4A88F]" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products…" aria-label="Search products" className={`${inputCls} pl-8`} />
                </div>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
                {STATUS_FILTERS.map((s) => (
                    <button
                        key={s}
                        onClick={() => setStatus(s)}
                        aria-pressed={status === s}
                        className={`rounded-full px-3 py-1 text-xs transition ${status === s ? "bg-[#241F1A] text-[#F5EFE4]" : "border border-[#E3DACB] text-[#6B6153] hover:bg-[#FBF8F3]"
                            }`}
                    >
                        {s} <span className="opacity-60">{counts[s]}</span>
                    </button>
                ))}
            </div>

            <ErrorNote onRetry={load}>{error}</ErrorNote>

            <div className="overflow-x-auto rounded-2xl border border-[#E3DACB] bg-white">
                {products === null && !error ? (
                    <Spinner label="Loading products…" />
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-[#EFE9E3] text-xs uppercase tracking-wide text-[#9C8C74]">
                                <th className="px-5 py-3 font-medium">Product</th>
                                <th className="px-5 py-3 font-medium">Category</th>
                                <th className="px-5 py-3 font-medium">Sizes</th>
                                <th className="px-5 py-3 font-medium">Price</th>
                                <th className="px-5 py-3 font-medium">Stock</th>
                                <th className="px-5 py-3 font-medium">Status</th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((p) => {
                                const busy = busyId === p._id;
                                const archived = p.status === "Archived";
                                const draft = p.status === "Draft";
                                const madeToOrder = p.fulfillment === "Made-to-order";
                                return (
                                    <tr key={p._id} className={`border-b border-[#F3EEE4] last:border-0 hover:bg-[#FBF8F3] ${busy ? "opacity-60" : ""}`}>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                {p.images?.[0] ? (
                                                    <img src={assetUrl(p.images[0])} alt="" className="h-12 w-9 shrink-0 rounded-md object-cover" />
                                                ) : (
                                                    <div className="h-12 w-9 shrink-0 rounded-md bg-[#F3EEE4]" />
                                                )}
                                                <div>
                                                    <p className="font-medium text-[#241F1A]">{p.name}</p>
                                                    <p className="text-xs text-[#9C8C74]" style={font.mono}>{shortId("MK", p._id)}{madeToOrder ? " · made to order" : ""}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-[#4A4136]">{p.category}</td>
                                        <td className="px-5 py-3 text-[#4A4136]">{p.sizes?.map((s) => s.size).join(" / ") || "—"}</td>
                                        <td className="px-5 py-3" style={font.mono}>{peso(p.price)}</td>
                                        <td className="px-5 py-3 text-[#4A4136]">{madeToOrder ? "—" : p.totalStock}</td>
                                        <td className="px-5 py-3"><ProductPill status={p.status} /></td>
                                        <td className="px-5 py-3">
                                            <div className="flex justify-end gap-2">
                                                <GhostButton icon={Pencil} onClick={() => navigate(`/admin/products/${p._id}/edit`)}>Edit</GhostButton>
                                                {draft && (
                                                    <GhostButton icon={Send} disabled={busy} onClick={() => changeStatus(p, "Active", "Product published.")}>Publish</GhostButton>
                                                )}
                                                {archived ? (
                                                    <GhostButton icon={ArchiveRestore} disabled={busy} onClick={() => changeStatus(p, "Active", "Product restored.")}>Restore</GhostButton>
                                                ) : (
                                                    !draft && <GhostButton icon={Archive} disabled={busy} onClick={() => changeStatus(p, "Archived", "Product archived.")}>Archive</GhostButton>
                                                )}
                                                {(draft || archived) && (
                                                    <GhostButton icon={Trash2} danger disabled={busy} onClick={() => setDeleting(p)}>Delete</GhostButton>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
                {products && filtered.length === 0 && (
                    <EmptyState
                        title={products.length === 0 ? "No products yet" : "No products match"}
                        hint={products.length === 0 ? "Add your first gown or barong to start the catalog." : "Try a different category, status or search."}
                        action={products.length === 0 && <PrimaryButton icon={Plus} onClick={() => navigate("/admin/products/new")}>Add product</PrimaryButton>}
                    />
                )}
            </div>
            <p className="mt-3 text-xs text-[#8B8072]">Only drafts and archived products can be deleted. Archive a product to hide it from customers without losing it.</p>

            {deleting && (
                <ConfirmDialog
                    title="Delete this product?"
                    message={`"${deleting.name}" will be removed for good. Past orders keep their own copy of what was bought.`}
                    confirmLabel="Delete"
                    danger
                    loading={busyId === deleting._id}
                    onConfirm={remove}
                    onClose={() => setDeleting(null)}
                />
            )}
        </div>
    );
}