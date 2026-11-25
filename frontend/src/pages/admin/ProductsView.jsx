import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Search, Plus, Pencil, Archive, ArchiveRestore, Trash2, Send, RefreshCw,
    Copy, Package, MoreHorizontal, ChevronLeft, ChevronRight, Check,
} from "lucide-react";
import { font, api, errMsg, assetUrl, peso, shortId } from "./adminLib";
import {
    SectionHeader, PrimaryButton, GhostButton, Segmented, ProductPill, StatCard,
    EmptyState, Spinner, ErrorNote, ConfirmDialog, Modal, ModalHeader, Field, inputCls,
} from "./ui";

const STATUS_FILTERS = ["All", "Active", "Low stock", "Out of stock", "Draft", "Archived"];

const SUMMARY = [
    { key: "All", label: "All products", sub: "In the catalog" },
    { key: "Active", label: "Active", sub: "Ready to sell", accent: "#3E4E3B" },
    { key: "Low stock", label: "Low stock", sub: "2 or fewer left", accent: "#6B5426" },
    { key: "Out of stock", label: "Out of stock", sub: "Needs restocking", accent: "#6B3838" },
    { key: "Draft", label: "Drafts", sub: "Not published", accent: "#6B6153" },
    { key: "Archived", label: "Archived", sub: "Hidden from shop", accent: "#6B6153" },
];

const SORT_OPTIONS = [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "name", label: "Name A–Z" },
    { value: "priceLow", label: "Price: low to high" },
    { value: "priceHigh", label: "Price: high to low" },
    { value: "stock", label: "Most stock" },
];

const BULK_LABELS = {
    publish: { title: "Publish selected products?", body: "They'll become visible in the catalog. Low stock and out-of-stock items keep their status.", confirm: "Publish" },
    restore: { title: "Restore selected products?", body: "Archived products will become active again.", confirm: "Restore" },
    archive: { title: "Archive selected products?", body: "They'll be hidden from customers but kept in the console.", confirm: "Archive" },
    delete: { title: "Delete selected products?", body: "These products will be removed for good. Past orders keep their own copy of what was bought.", confirm: "Delete" },
};

const PAGE_SIZE = 12;

const hiddenStatus = (p) => p.status === "Draft" || p.status === "Archived";

export default function ProductsView({ notify, onChanged }) {
    const navigate = useNavigate();
    const [products, setProducts] = useState(null);
    const [error, setError] = useState("");
    const [category, setCategory] = useState("All");
    const [status, setStatus] = useState("All");
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState("newest");
    const [view, setView] = useState("table");
    const [page, setPage] = useState(1);
    const [busyId, setBusyId] = useState(null);
    const [deleting, setDeleting] = useState(null); // the product awaiting delete confirmation
    const [stocking, setStocking] = useState(null); // product whose sizes are being edited
    const [selected, setSelected] = useState(new Set());
    const [bulk, setBulk] = useState(null); // { action, ids }
    const [bulkBusy, setBulkBusy] = useState(false);
    const [menu, setMenu] = useState(null); // { id, top, left } for the floating actions menu

    const load = useCallback(async (ignore = false) => {
        try {
            const { data } = await api.get("/products/admin/all");
            if (ignore) return;
            setProducts(Array.isArray(data) ? data : []);
            setError("");
        } catch (err) {
            if (!ignore) setError(errMsg(err));
        }
    }, []);

    useEffect(() => {
        let ignore = false;
        (async () => {
            await load(ignore);
        })();
        return () => {
            ignore = true;
        };
    }, [load]);

    const counts = useMemo(() => {
        const c = Object.fromEntries(STATUS_FILTERS.map((s) => [s, 0]));
        for (const p of products || []) {
            c.All += 1;
            if (c[p.status] !== undefined) c[p.status] += 1;
        }
        return c;
    }, [products]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = (products || []).filter(
            (p) =>
                (category === "All" || p.category === category) &&
                (status === "All" || p.status === status) &&
                (!q ||
                    p.name.toLowerCase().includes(q) ||
                    p.category.toLowerCase().includes(q) ||
                    shortId("MK", p._id).toLowerCase().includes(q))
        );
        const by = {
            newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
            oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
            name: (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
            priceLow: (a, b) => Number(a.price) - Number(b.price),
            priceHigh: (a, b) => Number(b.price) - Number(a.price),
            stock: (a, b) => (b.totalStock || 0) - (a.totalStock || 0),
        };
        return [...list].sort(by[sort] || by.newest);
    }, [products, category, status, query, sort]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const replace = (updated) =>
        setProducts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));

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

    const duplicate = async (p) => {
        setBusyId(p._id);
        try {
            const { data } = await api.post(`/products/admin/duplicate/${p._id}`);
            setProducts((prev) => [data, ...prev]);
            notify("success", `"${p.name}" was duplicated as a draft.`);
            onChanged?.();
        } catch (err) {
            notify("error", errMsg(err));
        } finally {
            setBusyId(null);
        }
    };

    const saveStock = async (updated) => {
        replace(updated);
        setStocking(null);
        notify("success", `Stock updated for "${updated.name}".`);
        onChanged?.();
    };

    const remove = async () => {
        const p = deleting;
        setBusyId(p._id);
        try {
            await api.delete(`/products/${p._id}`);
            setProducts((prev) => prev.filter((x) => x._id !== p._id));
            setSelected((prev) => {
                const next = new Set(prev);
                next.delete(p._id);
                return next;
            });
            notify("success", `"${p.name}" was deleted.`);
            onChanged?.();
            setDeleting(null);
        } catch (err) {
            notify("error", errMsg(err));
            setDeleting(null);
        } finally {
            setBusyId(null);
        }
    };

    const runBulk = async () => {
        const { action, ids } = bulk;
        setBulkBusy(true);
        try {
            if (action === "delete") {
                await api.post("/products/admin/bulk/delete", { ids });
                setProducts((prev) => prev.filter((p) => !ids.includes(p._id)));
            } else {
                const nextStatus = action === "archive" ? "Archived" : "Active";
                const { data } = await api.post("/products/admin/bulk/status", { ids, status: nextStatus });
                const byId = new Map((data.products || []).map((p) => [p._id, p]));
                setProducts((prev) => prev.map((p) => byId.get(p._id) || p));
            }
            setSelected(new Set());
            notify("success", `${ids.length} ${ids.length === 1 ? "product" : "products"} updated.`);
            onChanged?.();
            setBulk(null);
        } catch (err) {
            notify("error", errMsg(err));
        } finally {
            setBulkBusy(false);
        }
    };

    const chooseStatus = (next) => {
        setStatus(next);
        setPage(1);
        setMenu(null);
    };

    const toggleSelect = (id) =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const toggleVisible = (checked) =>
        setSelected((prev) => {
            const next = new Set(prev);
            for (const p of paged) checked ? next.add(p._id) : next.delete(p._id);
            return next;
        });

    const openMenu = (e, id) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMenu((prev) =>
            prev?.id === id
                ? null
                : { id, top: rect.bottom + 6, left: Math.max(8, rect.right - 176) }
        );
    };

    const menuProduct = menu ? products?.find((p) => p._id === menu.id) : null;
    const selectedIds = [...selected];

    return (
        <div>
            <SectionHeader
                eyebrow="Product catalog management"
                title="Gowns & Barongs"
                action={
                    <div className="flex gap-2">
                        <GhostButton icon={RefreshCw} onClick={() => load()}>Refresh</GhostButton>
                        <PrimaryButton icon={Plus} onClick={() => navigate("/admin/products/new")}>Add product</PrimaryButton>
                    </div>
                }
            />

            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                {SUMMARY.map((item) => (
                    <StatCard
                        key={item.key}
                        label={item.label}
                        value={itemsReady(products) ? counts[item.key] : "—"}
                        sub={item.sub}
                        accent={item.accent}
                        onClick={() => chooseStatus(item.key)}
                        className={status === item.key ? "ring-2 ring-[#9C7A3C]" : ""}
                    />
                ))}
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-3">
                <Segmented label="Category" value={category} options={["All", "Gown", "Barong"]} onChange={(v) => { setCategory(v); setPage(1); }} />
                <div className="relative min-w-[180px] max-w-xs flex-1">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#B4A88F]" />
                    <input
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                        placeholder="Search name, category or ID…"
                        aria-label="Search products"
                        className={`${inputCls} pl-8`}
                    />
                </div>
                <div className="w-40">
                    <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products" className={inputCls}>
                        {SORT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
                <Segmented
                    label="View"
                    value={view}
                    options={[{ value: "table", label: "Table" }, { value: "cards", label: "Image" }]}
                    onChange={setView}
                />
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
                {STATUS_FILTERS.map((s) => (
                    <button
                        key={s}
                        onClick={() => chooseStatus(s)}
                        aria-pressed={status === s}
                        className={`rounded-full px-3 py-1 text-xs transition ${status === s ? "bg-[#241F1A] text-[#F5EFE4]" : "border border-[#E3DACB] text-[#6B6153] hover:bg-[#FBF8F3]"
                            }`}
                    >
                        {s} <span className="opacity-60">{counts[s]}</span>
                    </button>
                ))}
            </div>

            {selectedIds.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#9C7A3C]/40 bg-[#F4ECDB] px-4 py-2.5">
                    <span className="mr-1 text-xs font-medium text-[#6B5426]">{selectedIds.length} selected</span>
                    <GhostButton icon={Send} onClick={() => setBulk({ action: "publish", ids: selectedIds })}>Publish</GhostButton>
                    <GhostButton icon={ArchiveRestore} onClick={() => setBulk({ action: "restore", ids: selectedIds })}>Restore</GhostButton>
                    <GhostButton icon={Archive} onClick={() => setBulk({ action: "archive", ids: selectedIds })}>Archive</GhostButton>
                    <GhostButton danger icon={Trash2} onClick={() => setBulk({ action: "delete", ids: selectedIds })}>Delete</GhostButton>
                    <GhostButton className="ml-auto" onClick={() => setSelected(new Set())}>Clear</GhostButton>
                </div>
            )}

            <ErrorNote onRetry={() => load()}>{error}</ErrorNote>

            {products === null && !error ? (
                <div className="rounded-2xl border border-[#E3DACB] bg-white">
                    <Spinner label="Loading products…" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-[#E3DACB] bg-white">
                    <EmptyState
                        title={products.length === 0 ? "No products yet" : "No products match"}
                        hint={products.length === 0 ? "Add your first gown or barong to start the catalog." : "Try a different category, status, sort or search."}
                        action={products.length === 0 && <PrimaryButton icon={Plus} onClick={() => navigate("/admin/products/new")}>Add product</PrimaryButton>}
                    />
                </div>
            ) : view === "table" ? (
                <div className="overflow-x-auto rounded-2xl border border-[#E3DACB] bg-white">
                    <table className="w-full min-w-[900px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-[#EFE9E3] text-xs uppercase tracking-wide text-[#9C8C74]">
                                <th className="w-10 px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={paged.length > 0 && paged.every((p) => selected.has(p._id))}
                                        onChange={(e) => toggleVisible(e.target.checked)}
                                        aria-label="Select products on this page"
                                        className="h-4 w-4 accent-[#9C7A3C]"
                                    />
                                </th>
                                <th className="px-3 py-3 font-medium">Product</th>
                                <th className="px-3 py-3 font-medium">Price</th>
                                <th className="px-3 py-3 font-medium">Stock</th>
                                <th className="px-3 py-3 font-medium">Status</th>
                                <th className="px-3 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {paged.map((p) => (
                                <tr key={p._id} className={`border-b border-[#F3EEE4] last:border-0 hover:bg-[#FBF8F3] ${busyId === p._id || selected.has(p._id) ? "bg-[#FBF8F3]" : ""}`}>
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selected.has(p._id)}
                                            onChange={() => toggleSelect(p._id)}
                                            aria-label={`Select ${p.name}`}
                                            className="h-4 w-4 accent-[#9C7A3C]"
                                        />
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="flex items-center gap-3">
                                            <ProductThumb product={p} />
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-[#241F1A]">{p.name}</p>
                                                <p className="text-xs text-[#9C8C74]" style={font.mono}>{shortId("MK", p._id)}</p>
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    <Tag>{p.category}</Tag>
                                                    {p.fulfillment === "Made-to-order" && <Tag>Made-to-order</Tag>}
                                                    {p.customizable && <Tag tone="gold">Customizable</Tag>}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3" style={font.mono}>{peso(p.price)}</td>
                                    <td className="px-3 py-3"><StockCell product={p} onEdit={() => setStocking(p)} /></td>
                                    <td className="px-3 py-3"><ProductPill status={p.status} /></td>
                                    <td className="px-3 py-3 text-right">
                                        <button
                                            type="button"
                                            onClick={(e) => openMenu(e, p._id)}
                                            aria-label={`Actions for ${p.name}`}
                                            aria-expanded={menu?.id === p._id}
                                            className="rounded-lg border border-[#E3DACB] p-1.5 text-[#6B6153] transition hover:border-[#C9BBA3] hover:bg-white"
                                        >
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {paged.map((p) => (
                        <article key={p._id} className={`overflow-hidden rounded-2xl bg-white shadow-sm ${selected.has(p._id) ? "ring-2 ring-[#9C7A3C]" : ""}`}>
                            <div className="relative aspect-[4/5] bg-[#F3EEE4]">
                                {p.images?.[0] ? (
                                    <img src={assetUrl(p.images[0])} alt="" className="h-full w-full object-contain p-2" />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-xs text-[#9C8C74]">No photo yet</div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => toggleSelect(p._id)}
                                    aria-label={`Select ${p.name}`}
                                    aria-pressed={selected.has(p._id)}
                                    className={`absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm transition ${selected.has(p._id)
                                        ? "border-[#241F1A] bg-[#241F1A] text-[#F5EFE4]"
                                        : "border-white/80 bg-white/90 text-transparent hover:bg-white"
                                        }`}
                                >
                                    <Check size={13} />
                                </button>
                                <div className="absolute right-3 top-3 rounded-full bg-white/90">
                                    <button
                                        type="button"
                                        onClick={(e) => openMenu(e, p._id)}
                                        aria-label={`Actions for ${p.name}`}
                                        aria-expanded={menu?.id === p._id}
                                        className="rounded-full p-1.5 text-[#6B6153] transition hover:bg-white"
                                    >
                                        <MoreHorizontal size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-3 p-4">
                                <div>
                                    <p className="truncate font-medium text-[#241F1A]">{p.name}</p>
                                    <p className="text-xs text-[#9C8C74]" style={font.mono}>{shortId("MK", p._id)}</p>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    <Tag>{p.category}</Tag>
                                    {p.fulfillment === "Made-to-order" && <Tag>Made-to-order</Tag>}
                                    {p.customizable && <Tag tone="gold">Customizable</Tag>}
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm" style={font.mono}>{peso(p.price)}</span>
                                    <ProductPill status={p.status} />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setStocking(p)}
                                    disabled={p.fulfillment === "Made-to-order"}
                                    className="flex w-full items-center justify-between rounded-lg border border-[#E3DACB] px-3 py-2 text-xs text-[#6B6153] transition hover:border-[#C9BBA3] disabled:opacity-50"
                                >
                                    <span>Stock</span>
                                    <span className="font-medium text-[#241F1A]">{p.fulfillment === "Made-to-order" ? "—" : `${p.totalStock || 0} units`}</span>
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {filtered.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#8B8072]">
                    <span>
                        Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
                    </span>
                    <div className="flex items-center gap-2">
                        <GhostButton icon={ChevronLeft} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</GhostButton>
                        <span>Page {currentPage} of {totalPages}</span>
                        <GhostButton disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next <ChevronRight size={13} /></GhostButton>
                    </div>
                </div>
            )}

            <p className="mt-3 text-xs text-[#8B8072]">
                Only drafts and archived products can be deleted. Archive a product to hide it from customers without losing it.
            </p>

            {menu && menuProduct && (
                <>
                    <button className="fixed inset-0 z-40 cursor-default" aria-label="Close actions menu" onClick={() => setMenu(null)} />
                    <div
                        className="fixed z-50 w-44 overflow-hidden rounded-xl border border-[#E3DACB] bg-white py-1 shadow-xl"
                        style={{ top: menu.top, left: menu.left }}
                    >
                        <MenuItem icon={Pencil} label="Edit product" onClick={() => { setMenu(null); navigate(`/admin/products/${menuProduct._id}/edit`); }} />
                        <MenuItem icon={Copy} label="Duplicate" disabled={busyId === menuProduct._id} onClick={() => { setMenu(null); duplicate(menuProduct); }} />
                        {menuProduct.fulfillment !== "Made-to-order" && (
                            <MenuItem icon={Package} label="Edit stock" onClick={() => { setMenu(null); setStocking(menuProduct); }} />
                        )}
                        <div className="my-1 border-t border-[#F3EEE4]" />
                        {menuProduct.status === "Draft" && (
                            <MenuItem icon={Send} label="Publish" disabled={busyId === menuProduct._id} onClick={() => { setMenu(null); changeStatus(menuProduct, "Active", "Product published."); }} />
                        )}
                        {menuProduct.status === "Archived" ? (
                            <MenuItem icon={ArchiveRestore} label="Restore" disabled={busyId === menuProduct._id} onClick={() => { setMenu(null); changeStatus(menuProduct, "Active", "Product restored."); }} />
                        ) : (
                            menuProduct.status !== "Draft" && (
                                <MenuItem icon={Archive} label="Archive" disabled={busyId === menuProduct._id} onClick={() => { setMenu(null); changeStatus(menuProduct, "Archived", "Product archived."); }} />
                            )
                        )}
                        {hiddenStatus(menuProduct) && (
                            <MenuItem icon={Trash2} label="Delete" danger disabled={busyId === menuProduct._id} onClick={() => { setMenu(null); setDeleting(menuProduct); }} />
                        )}
                    </div>
                </>
            )}

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

            {bulk && (
                <ConfirmDialog
                    title={BULK_LABELS[bulk.action].title}
                    message={`${BULK_LABELS[bulk.action].body} (${bulk.ids.length} ${bulk.ids.length === 1 ? "product" : "products"})`}
                    confirmLabel={BULK_LABELS[bulk.action].confirm}
                    danger={bulk.action === "delete"}
                    loading={bulkBusy}
                    onConfirm={runBulk}
                    onClose={() => setBulk(null)}
                />
            )}

            {stocking && (
                <StockModal product={stocking} onClose={() => setStocking(null)} onSaved={saveStock} />
            )}
        </div>
    );
}

const itemsReady = (products) => Array.isArray(products);

function ProductThumb({ product }) {
    return product.images?.[0] ? (
        <img src={assetUrl(product.images[0])} alt="" className="h-14 w-11 shrink-0 rounded-lg object-cover" />
    ) : (
        <div className="h-14 w-11 shrink-0 rounded-lg bg-[#F3EEE4]" />
    );
}

function Tag({ children, tone }) {
    return (
        <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{
                background: tone === "gold" ? "#F4ECDB" : "#EFE9E3",
                color: tone === "gold" ? "#6B5426" : "#6B6153",
            }}
        >
            {children}
        </span>
    );
}

function StockCell({ product, onEdit }) {
    if (product.fulfillment === "Made-to-order") return <span className="text-[#9C8C74]">—</span>;
    const total = product.totalStock || 0;
    return (
        <button type="button" onClick={onEdit} className="group flex items-center gap-2 text-left" title="Edit stock">
            <span className="font-medium text-[#241F1A]">{total}</span>
            <span className="h-1.5 w-12 overflow-hidden rounded-full bg-[#EFE9E3]">
                <span
                    className="block h-full rounded-full"
                    style={{ width: `${Math.min(100, total * 10)}%`, background: total <= 2 ? "#9C7A3C" : "#5B6E58" }}
                />
            </span>
            <Pencil size={11} className="text-[#B4A88F] opacity-0 transition group-hover:opacity-100" />
        </button>
    );
}

function MenuItem({ icon: IconEl, label, onClick, disabled, danger }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${danger ? "text-[#6B3838] hover:bg-[#F3E4E2]" : "text-[#4A4136] hover:bg-[#FBF8F3]"
                }`}
        >
            {IconEl && <IconEl size={14} />}
            {label}
        </button>
    );
}

function StockModal({ product, onClose, onSaved }) {
    const [sizes, setSizes] = useState(
        (product.sizes || []).map((s) => ({ size: s.size, stock: String(s.stock ?? 0) }))
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            const { data } = await api.patch(`/products/${product._id}/stock`, {
                sizes: sizes.map((s) => ({ size: s.size, stock: Number(s.stock) || 0 })),
            });
            onSaved(data);
        } catch (err) {
            setError(errMsg(err));
            setSaving(false);
        }
    };

    return (
        <Modal label="Edit stock" onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <ModalHeader
                    title="Edit stock"
                    subtitle={`Update the units available for "${product.name}". Status recalculates automatically.`}
                    onClose={onClose}
                />
                {sizes.length ? (
                    <div className="space-y-2">
                        {sizes.map((s, i) => (
                            <div key={s.size} className="flex items-center gap-3">
                                <span className="w-16 text-sm font-medium text-[#4A4136]">{s.size}</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={s.stock}
                                    onChange={(e) => setSizes((prev) => prev.map((row, idx) => (idx === i ? { ...row, stock: e.target.value } : row)))}
                                    aria-label={`Stock for size ${s.size}`}
                                    className={inputCls}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="rounded-lg bg-[#FBF8F3] px-3 py-4 text-sm text-[#8B8072]">This product has no tracked sizes. Add them in the full product form.</p>
                )}
                <Field label="Note" error={error} hint="Products with 2 or fewer units show as Low stock; 0 shows as Out of stock.">
                    <span className="block text-xs text-[#8B8072]">Drafts and archived items keep their status.</span>
                </Field>
                <div className="flex justify-end gap-2">
                    <GhostButton onClick={onClose} disabled={saving}>Cancel</GhostButton>
                    <PrimaryButton type="submit" loading={saving} disabled={!sizes.length}>Save stock</PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}
