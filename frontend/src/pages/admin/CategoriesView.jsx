import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Plus, RefreshCw, Pencil, Trash2, Search, Info, CalendarDays, Ruler,
    Palette, Shirt, Scissors, Layers, Sparkles, Tags, Image as ImageIcon,
} from "lucide-react";
import { api, errMsg } from "./adminLib";
import { hexForName } from "../../lib/colors";
import { GROUPS as DESIGN_GROUPS } from "../../components/customize/designOptions.js";
import {
    SectionHeader, PrimaryButton, GhostButton, StatCard, Segmented, EmptyState, Spinner,
    ErrorNote, ConfirmDialog, Modal, ModalHeader, Field, inputCls,
} from "./ui";

/**
 * MaikCraft: Categories
 * The option lists behind the product form AND the customizer. Adding one here
 * makes it a choice on the product form, a catalog filter where relevant, and
 * an option in the design tool. Renaming updates the products and saved design
 * requests that already use it.
 */

const SCOPES = [
    { key: "common", label: "Shared product lists", tab: "Shared", hint: "Used by every product and the catalog filters." },
    { key: "Gown", label: "Gown design options", tab: "Gown", hint: "The choices customers get when designing a gown." },
    { key: "Barong", label: "Barong design options", tab: "Barong", hint: "The choices customers get when designing a barong." },
];

const LISTS = {
    common: [
        { type: "eventType", label: "Event types", one: "event type", hint: "The occasions a product suits. Customers filter the catalog by these." },
        { type: "length", label: "Lengths", one: "length", hint: "Where the hem falls — used by the product form and the customizer." },
    ],
    Gown: [
        { type: "color", label: "Colors", one: "color", hint: "The shades offered on gowns in the product form and customizer." },
        { type: "silhouette", label: "Silhouettes", one: "silhouette", hint: "The overall shape of the gown." },
        { type: "neckline", label: "Necklines", one: "neckline", hint: "The shape around the neck and chest." },
        { type: "sleeve", label: "Sleeve styles", one: "sleeve style", hint: "How the arms are covered." },
        { type: "fabric", label: "Fabrics", one: "fabric", hint: "What the gown is made of." },
        { type: "design", label: "Design details", one: "design detail", hint: "Embellishments and patterns on the gown." },
    ],
    Barong: [
        { type: "color", label: "Colors", one: "color", hint: "The shades offered on barongs in the product form and customizer." },
        { type: "fit", label: "Fits", one: "fit", hint: "How the barong sits on the body." },
        { type: "sleeve", label: "Sleeve styles", one: "sleeve style", hint: "Long or short sleeves." },
        { type: "fabric", label: "Fabrics", one: "fabric", hint: "What the barong is woven from." },
        { type: "design", label: "Embroidery styles", one: "embroidery style", hint: "The embroidery style on the front." },
    ],
};

const ALL_GROUPS = SCOPES.flatMap((scope) =>
    LISTS[scope.key].map((group) => ({
        ...group,
        scope: scope.key,
        scopeLabel: scope.tab,
    }))
);

const SCOPE_TONE = {
    common: { bg: "#F4ECDB", text: "#6B5426", dot: "#9C7A3C" },
    Gown: { bg: "#F3E4E2", text: "#6B3838", dot: "#7C4A4A" },
    Barong: { bg: "#E2ECF1", text: "#2C4E64", dot: "#3E6E8E" },
};

const TYPE_ICONS = {
    eventType: CalendarDays,
    length: Ruler,
    color: Palette,
    silhouette: Shirt,
    neckline: Shirt,
    sleeve: Scissors,
    fabric: Layers,
    design: Sparkles,
    fit: Tags,
};

const TYPE_LABELS = Object.fromEntries(ALL_GROUPS.map((group) => [group.type, group.one]));

const optionKey = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const scopeOf = (item) => (item.garment === "Gown" || item.garment === "Barong" ? item.garment : "common");
const usageKey = (scope, type, name) => `${scope}|${type}|${optionKey(name)}`;

// Reuse the customizer's thumbnails/descriptions so the admin sees the exact
// picture a customer would for the same option. Options with no artwork stay
// as plain names.
const ARTWORK = Object.fromEntries(
    ["Gown", "Barong"].flatMap((garment) =>
        DESIGN_GROUPS[garment].map((group) => [
            `${garment}|${group.key}`,
            Object.fromEntries(
                group.options.filter((opt) => opt.img).map((opt) => [optionKey(opt.value), opt])
            ),
        ])
    )
);
const artworkFor = (scope, type, name) => {
    // Length lives in the shared list, but its drawings are keyed to Gown.
    const artworkScope = scope === "common" ? "Gown" : scope;
    return ARTWORK[`${artworkScope}|${type}`]?.[optionKey(name)] || null;
};

const SCOPE_FILTERS = [
    { value: "all", label: "All" },
    ...SCOPES.map((scope) => ({ value: scope.key, label: scope.tab })),
];

// Count where each option is already used, so removing one is an informed choice.
async function fetchUsage() {
    const bump = (counts, scope, type, name) => {
        const key = usageKey(scope, type, name);
        counts.set(key, (counts.get(key) || 0) + 1);
    };
    const counts = new Map();
    const [products, designs] = await Promise.all([
        api.get("/products/admin/all").catch(() => ({ data: [] })),
        api.get("/customizations").catch(() => ({ data: [] })),
    ]);
    for (const p of products.data || []) {
        const scope = p.category === "Barong" ? "Barong" : "Gown";
        for (const t of p.eventTypes || []) bump(counts, "common", "eventType", t);
        if (p.length) bump(counts, "common", "length", p.length);
        if (p.sleeve) bump(counts, scope, "sleeve", p.sleeve);
        for (const c of p.colors || []) if (c.name) bump(counts, scope, "color", c.name);
        if (p.material) bump(counts, scope, "fabric", p.material);
        if (p.silhouette) bump(counts, scope, "silhouette", p.silhouette);
        if (p.neckline) bump(counts, scope, "neckline", p.neckline);
        if (p.design) bump(counts, scope, "design", p.design);
        if (p.fit) bump(counts, scope, "fit", p.fit);
    }
    for (const d of designs.data || []) {
        const scope = d.category === "Barong" ? "Barong" : "Gown";
        for (const key of ["color", "silhouette", "neckline", "sleeve", "fabric", "design", "fit"]) {
            if (d.selections?.[key]) bump(counts, scope, key, d.selections[key]);
        }
    }
    return counts;
}

export default function CategoriesView({ notify }) {
    const [items, setItems] = useState(null); // every option: { _id, garment, type, name }
    const [error, setError] = useState("");
    const [scopeFilter, setScopeFilter] = useState("all");
    const [query, setQuery] = useState("");
    const [showImages, setShowImages] = useState(false);
    const [adding, setAdding] = useState(null); // null or { scope, type }
    const [renaming, setRenaming] = useState(null); // option being renamed
    const [confirming, setConfirming] = useState(null); // option about to be removed
    const [busyId, setBusyId] = useState(null);
    // How many products and saved designs carry each option — shown next to it,
    // so removing one is an informed choice rather than a guess.
    const [usage, setUsage] = useState(new Map());

    const load = useCallback(async (ignore = false) => {
        try {
            const [categories, counts] = await Promise.all([api.get("/categories"), fetchUsage()]);
            if (ignore) return;
            setItems(Array.isArray(categories.data) ? categories.data : []);
            setUsage(counts);
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

    const countsByScope = useMemo(() => {
        const counts = { common: 0, Gown: 0, Barong: 0 };
        for (const item of items || []) counts[scopeOf(item)] += 1;
        return counts;
    }, [items]);

    const inUseCount = useMemo(
        () => [...usage.values()].filter((count) => count > 0).length,
        [usage]
    );

    const q = query.trim().toLowerCase();
    const visibleGroups = useMemo(() => {
        return ALL_GROUPS
            .filter((group) => scopeFilter === "all" || group.scope === scopeFilter)
            .map((group) => {
                const list = (items || [])
                    .filter((item) => scopeOf(item) === group.scope && item.type === group.type)
                    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
                const groupMatches =
                    !q || `${group.label} ${group.hint} ${group.scopeLabel}`.toLowerCase().includes(q);
                const shown = groupMatches
                    ? list
                    : list.filter((item) => item.name.toLowerCase().includes(q));
                return { ...group, list, shown, groupMatches };
            })
            .filter((group) => group.shown.length > 0 || (group.groupMatches && group.list.length === 0));
    }, [items, q, scopeFilter]);

    const clearFilters = () => {
        setQuery("");
        setScopeFilter("all");
    };

    const usageOf = (item) => usage.get(usageKey(scopeOf(item), item.type, item.name)) || 0;

    const remove = async () => {
        const item = confirming;
        setBusyId(item._id);
        try {
            await api.delete(`/categories/${item._id}`);
            setItems((prev) => prev.filter((i) => i._id !== item._id));
            setUsage((prev) => {
                const next = new Map(prev);
                const key = usageKey(scopeOf(item), item.type, item.name);
                const count = next.get(key) || 0;
                if (count <= 1) next.delete(key);
                else next.set(key, count - 1);
                return next;
            });
            notify("success", `"${item.name}" was removed.`);
            setConfirming(null);
        } catch (err) {
            notify("error", errMsg(err));
            setConfirming(null);
        } finally {
            setBusyId(null);
        }
    };

    const confirmMessage = () => {
        const count = usageOf(confirming);
        return count > 0
            ? `${count} ${count === 1 ? "item" : "items"} currently ${count === 1 ? "uses" : "use"} "${confirming.name}" and will keep that value — it just stops being offered.`
            : `No products or saved designs use "${confirming.name}". It just stops being offered.`;
    };

    const oneFor = (item) =>
        LISTS[scopeOf(item)]?.find((group) => group.type === item.type)?.one ||
        TYPE_LABELS[item.type]?.toLowerCase() ||
        "option";

    return (
        <div>
            <SectionHeader
                eyebrow="Product & design option lists"
                title="Categories"
                action={
                    <div className="flex gap-2">
                        <GhostButton icon={RefreshCw} onClick={() => load()}>Refresh</GhostButton>
                        <PrimaryButton icon={Plus} onClick={() => setAdding({})}>Add option</PrimaryButton>
                    </div>
                }
            />

            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#E3DACB] bg-white px-4 py-3 text-sm text-[#6B6153]">
                <Info size={16} className="mt-0.5 shrink-0 text-[#9C7A3C]" />
                <p>
                    These are the exact lists used by the product form, catalog filters and the design tool.
                    Renaming an option updates products and saved requests that already use it.
                </p>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Shared options" value={items ? countsByScope.common : "—"} sub="Events & lengths" />
                <StatCard label="Gown options" value={items ? countsByScope.Gown : "—"} sub="Design choices" accent="#6B3838" />
                <StatCard label="Barong options" value={items ? countsByScope.Barong : "—"} sub="Design choices" accent="#2C4E64" />
                <StatCard label="In use" value={items ? inUseCount : "—"} sub="On products or requests" />
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <Segmented label="Option scope" value={scopeFilter} options={SCOPE_FILTERS} onChange={setScopeFilter} />
                <div className="relative min-w-[180px] max-w-xs flex-1">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#B4A88F]" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search options…"
                        aria-label="Search options"
                        className={`${inputCls} pl-8`}
                    />
                </div>
                <button
                    type="button"
                    onClick={() => setShowImages((shown) => !shown)}
                    aria-pressed={showImages}
                    title="Show the pictures customers see for these options"
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${showImages
                        ? "border-[#241F1A] bg-[#241F1A] text-[#F5EFE4]"
                        : "border-[#E3DACB] bg-white text-[#6B6153] hover:border-[#C9BBA3] hover:bg-[#FBF8F3]"
                        }`}
                >
                    <ImageIcon size={14} /> Pictures
                </button>
                {(q || scopeFilter !== "all") && (
                    <GhostButton onClick={clearFilters}>Clear filters</GhostButton>
                )}
            </div>

            <ErrorNote onRetry={() => load()}>{error}</ErrorNote>

            {items === null && !error ? (
                <div className="rounded-2xl border border-[#E3DACB] bg-white">
                    <Spinner label="Loading categories…" />
                </div>
            ) : visibleGroups.length === 0 ? (
                <div className="rounded-2xl border border-[#E3DACB] bg-white">
                    <EmptyState
                        title="No options match"
                        hint="Try another search or show all lists."
                        action={<GhostButton onClick={clearFilters}>Clear filters</GhostButton>}
                    />
                </div>
            ) : (
                <div className="columns-1 gap-4 md:columns-2 2xl:columns-3">
                    {visibleGroups.map((group) => {
                        const tone = SCOPE_TONE[group.scope];
                        const IconEl = TYPE_ICONS[group.type] || Tags;
                        return (
                            <section
                                key={`${group.scope}-${group.type}`}
                                className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-[#E3DACB] border-t-2 bg-white"
                                style={{ borderTopColor: tone.dot }}
                            >
                                <div className="flex items-start gap-3 px-4 py-3.5">
                                    <div
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                        style={{ background: tone.bg, color: tone.dot }}
                                    >
                                        <IconEl size={15} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-sm font-medium text-[#241F1A]">{group.label}</h3>
                                            <span
                                                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                                                style={{ background: tone.bg, color: tone.text }}
                                            >
                                                {group.scopeLabel}
                                            </span>
                                            <span className="text-[11px] text-[#9C8C74]">{group.list.length}</span>
                                        </div>
                                        <p className="mt-0.5 line-clamp-2 text-[11px] text-[#8B8072]">{group.hint}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setAdding({ scope: group.scope, type: group.type })}
                                        aria-label={`Add ${group.one} to ${group.label}`}
                                        title={`Add ${group.one}`}
                                        className="shrink-0 rounded-lg border border-[#E3DACB] p-1.5 text-[#6B6153] transition hover:border-[#9C7A3C] hover:bg-[#FBF8F3] hover:text-[#241F1A]"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>

                                <div className="border-t border-[#F3EEE4] px-4 py-3">
                                    {group.shown.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {group.shown.map((item) => {
                                                const count = usageOf(item);
                                                const busy = busyId === item._id;
                                                const hex = group.type === "color" ? hexForName(item.name) : "";
                                                const art = showImages ? artworkFor(group.scope, group.type, item.name) : null;
                                                const label = art?.desc ? `${item.name} — ${art.desc}` : item.name;
                                                const actions = (
                                                    <OptionActions
                                                        item={item}
                                                        floating={!!art}
                                                        onRename={() => setRenaming(item)}
                                                        onRemove={() => setConfirming(item)}
                                                    />
                                                );

                                                if (art) {
                                                    const drawing = /\.svg$/i.test(art.img || "");
                                                    return (
                                                        <div
                                                            key={item._id}
                                                            title={label}
                                                            className={`group relative w-[92px] overflow-hidden rounded-xl border border-[#E3DACB] bg-white transition hover:border-[#C9BBA3] ${busy ? "opacity-60" : ""}`}
                                                        >
                                                            <div className="flex h-[72px] items-center justify-center overflow-hidden bg-[#FBF8F3]">
                                                                <img
                                                                    src={art.img}
                                                                    alt=""
                                                                    loading="lazy"
                                                                    className={`h-full w-full ${drawing ? "object-contain p-1.5" : "object-cover"}`}
                                                                    onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
                                                                />
                                                            </div>
                                                            <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                                                                <span className="min-w-0 truncate text-[11px] font-medium text-[#241F1A]">
                                                                    {item.name}
                                                                </span>
                                                                {count > 0 && (
                                                                    <span
                                                                        className="rounded-full bg-[#F4ECDB] px-1.5 py-0.5 text-[10px] font-medium text-[#6B5426]"
                                                                        title={`Used ${count} ${count === 1 ? "time" : "times"}`}
                                                                    >
                                                                        {count}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {actions}
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div
                                                        key={item._id}
                                                        title={label}
                                                        className={`group flex items-center gap-1 rounded-full border border-[#E3DACB] bg-[#FBF8F3] py-1 pl-3 pr-1 text-xs text-[#241F1A] transition hover:border-[#C9BBA3] ${busy ? "opacity-60" : ""}`}
                                                    >
                                                        {group.type === "color" && (
                                                            <span
                                                                className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10"
                                                                style={{ background: hex || "#F3EEE4" }}
                                                                title={hex || "No preset shade"}
                                                            />
                                                        )}
                                                        <span className="max-w-[170px] truncate">{item.name}</span>
                                                        {count > 0 && (
                                                            <span
                                                                className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#6B5426]"
                                                                title={`Used ${count} ${count === 1 ? "time" : "times"}`}
                                                            >
                                                                {count}
                                                            </span>
                                                        )}
                                                        {actions}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setAdding({ scope: group.scope, type: group.type })}
                                            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#D8CDBE] py-3 text-xs text-[#8B8072] transition hover:border-[#9C7A3C] hover:text-[#6B5426]"
                                        >
                                            <Plus size={13} /> Add the first {group.one}
                                        </button>
                                    )}
                                    {q && group.shown.length !== group.list.length && (
                                        <p className="mt-2 text-[10px] text-[#9C8C74]">
                                            Showing {group.shown.length} of {group.list.length}
                                        </p>
                                    )}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}

            <p className="mt-4 text-xs text-[#8B8072]">
                A number beside an option is how many products or saved design requests use it.
            </p>

            {confirming && (
                <ConfirmDialog
                    title={`Remove "${confirming.name}"?`}
                    message={confirmMessage()}
                    confirmLabel="Remove"
                    danger
                    loading={busyId === confirming._id}
                    onConfirm={remove}
                    onClose={() => setConfirming(null)}
                />
            )}

            {renaming && (
                <RenameCategoryModal
                    item={renaming}
                    one={oneFor(renaming)}
                    onClose={() => setRenaming(null)}
                    onRenamed={(updated) => {
                        setItems((prev) => prev.map((i) => (i._id === updated._id ? updated : i)));
                        // Products and saved designs that used the old name were updated too
                        setUsage((prev) => {
                            const next = new Map(prev);
                            const scope = scopeOf(renaming);
                            const count = next.get(usageKey(scope, renaming.type, renaming.name)) || 0;
                            next.delete(usageKey(scope, renaming.type, renaming.name));
                            if (count) next.set(usageKey(scope, updated.type, updated.name), count);
                            return next;
                        });
                        setRenaming(null);
                        notify("success", `Renamed to "${updated.name}". Products and saved designs using it were updated too.`);
                    }}
                />
            )}

            {adding && (
                <AddCategoryModal
                    initial={adding}
                    onClose={() => setAdding(null)}
                    onAdded={(created) => {
                        setItems((prev) => [...prev, created]);
                        setAdding(null);
                        notify("success", `"${created.name}" was added.`);
                    }}
                />
            )}
        </div>
    );
}

function OptionActions({ item, floating, onRename, onRemove }) {
    return (
        <div
            className={
                floating
                    ? "absolute right-1 top-1 flex gap-0.5 rounded-lg bg-white/90 p-0.5 shadow-sm opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
                    : "flex items-center gap-0.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
            }
        >
            <button
                type="button"
                onClick={onRename}
                aria-label={`Rename ${item.name}`}
                title="Rename"
                className="rounded-full p-1 text-[#8B8072] hover:bg-white hover:text-[#241F1A]"
            >
                <Pencil size={11} />
            </button>
            <button
                type="button"
                onClick={onRemove}
                aria-label={`Remove ${item.name}`}
                title="Remove"
                className="rounded-full p-1 text-[#8B8072] hover:bg-[#F3E4E2] hover:text-[#6B3838]"
            >
                <Trash2 size={11} />
            </button>
        </div>
    );
}

function AddCategoryModal({ initial = {}, onClose, onAdded }) {
    const [scope, setScope] = useState(initial.scope || "common");
    const [type, setType] = useState(initial.type || LISTS[initial.scope || "common"][0].type);
    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const types = LISTS[scope];
    const one = types.find((group) => group.type === type)?.one || "option";

    const changeScope = (nextScope) => {
        setScope(nextScope);
        if (!LISTS[nextScope].some((group) => group.type === type)) setType(LISTS[nextScope][0].type);
    };

    const submit = async (e) => {
        e.preventDefault();
        const clean = name.replace(/\s+/g, " ").trim(); // same tidy-up the backend applies
        if (clean.length < 2) {
            setError("Enter a name of 2 characters or more.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const { data } = await api.post("/categories", {
                type,
                garment: scope === "common" ? "All" : scope,
                name: clean,
            });
            onAdded(data);
        } catch (err) {
            setError(errMsg(err));
            setSaving(false);
        }
    };

    return (
        <Modal label="Add an option" onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <ModalHeader
                    title="Add an option"
                    subtitle="It becomes available on the product form, in the catalog filters and in the design tool where relevant."
                    onClose={onClose}
                />
                <div>
                    <p className="mb-1.5 text-sm font-medium text-[#241F1A]">Applies to</p>
                    <Segmented
                        label="Applies to"
                        value={scope}
                        options={SCOPES.map((s) => ({ value: s.key, label: s.tab }))}
                        onChange={changeScope}
                    />
                </div>
                <Field label="List" htmlFor="cat-add-list" hint={types.find((group) => group.type === type)?.hint}>
                    <select
                        id="cat-add-list"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className={inputCls}
                    >
                        {types.map((group) => (
                            <option key={group.type} value={group.type}>{group.label}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Name" htmlFor="cat-add-name" error={error}>
                    <input
                        id="cat-add-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                        maxLength={60}
                        placeholder={`e.g. ${type === "color" ? "Champagne" : `New ${one}`}`}
                        className={inputCls}
                        required
                    />
                </Field>
                <PrimaryButton type="submit" loading={saving} disabled={name.trim().length < 2} className="w-full">
                    Add option
                </PrimaryButton>
            </form>
        </Modal>
    );
}

function RenameCategoryModal({ item, one, onClose, onRenamed }) {
    const [name, setName] = useState(item.name);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            const { data } = await api.put(`/categories/${item._id}`, {
                name: name.replace(/\s+/g, " ").trim(),
            });
            onRenamed(data);
        } catch (err) {
            setError(errMsg(err));
            setSaving(false);
        }
    };

    return (
        <Modal label={`Rename ${one}`} onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <ModalHeader
                    title={`Rename ${one}`}
                    subtitle="Products and saved designs using it are renamed too, so filters and requests keep matching."
                    onClose={onClose}
                />
                <Field label="Name" htmlFor="cat-rename" error={error}>
                    <input
                        id="cat-rename"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                        onFocus={(e) => e.target.select()}
                        maxLength={60}
                        className={inputCls}
                        required
                    />
                </Field>
                <PrimaryButton type="submit" loading={saving} className="w-full">Save name</PrimaryButton>
            </form>
        </Modal>
    );
}
