import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, X, ChevronLeft, ChevronRight, Check, Loader2, AlertCircle, Star } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { font, api, errMsg, assetUrl, peso } from "./adminLib";
import { Spinner } from "./ui";
import { PALETTE } from "../../lib/colors";

/**
 * Add a product (/admin/products/new) or edit one (/admin/products/:id/edit).
 * Same form for both: editing loads the product, pre-fills everything and keeps
 * its existing photos unless you remove them.
 */

/* ------------------------------ Option lists ------------------------------ */
const CATEGORIES = ["Gown", "Barong"];
const SIZES_BY_CATEGORY = {
    Gown: ["XS", "S", "M", "L", "XL", "XXL"],
    Barong: ["S", "M", "L", "XL", "XXL"],
};
const EVENT_TYPES = ["Wedding", "Ninang / Sponsor", "Debut", "Prom / School event", "Party", "Formal"];
const SLEEVES = ["Sleeveless", "Cap sleeve", "Short sleeve", "Long sleeve", "Off-shoulder", "Barrel cuff"];
const LENGTHS = ["Mini", "Knee", "Midi", "Maxi", "Floor-length", "Cathedral train"];
const LOW_STOCK_AT = 2; // matches the rule in product.route.js
const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/* ------------------------------ Small UI bits ------------------------------ */
function Field({ label, hint, error, children, htmlFor }) {
    return (
        <div>
            <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-[#241F1A]">{label}</label>
            {children}
            {error ? (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-[#7C4A4A]"><AlertCircle size={12} /> {error}</p>
            ) : (
                hint && <p className="mt-1.5 text-xs text-[#8B8072]">{hint}</p>
            )}
        </div>
    );
}

const inputCls =
    "w-full rounded-lg border border-[#E3DACB] bg-white px-3 py-2 text-sm text-[#241F1A] outline-none transition placeholder:text-[#B4A88F] focus:border-[#9C7A3C] focus:ring-2 focus:ring-[#9C7A3C]/20";

function Section({ title, description, children }) {
    return (
        <section className="rounded-2xl border border-[#E3DACB] bg-white p-5 sm:p-6">
            <h3 className="text-lg text-[#241F1A]" style={font.display}>{title}</h3>
            {description && <p className="mt-1 text-sm text-[#8B8072]">{description}</p>}
            <div className="mt-5 space-y-5">{children}</div>
        </section>
    );
}

function Chip({ active, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9C7A3C] ${active ? "border-[#241F1A] bg-[#241F1A] text-[#F5EFE4]" : "border-[#E3DACB] bg-white text-[#6B6153] hover:border-[#C9BBA3] hover:bg-[#FBF8F3]"
                }`}
        >
            {children}
        </button>
    );
}

const EMPTY_FORM = {
    name: "", category: "Gown", description: "", material: "", sleeve: "", length: "", price: "",
    fulfillment: "Ready-to-wear", customizable: true,
};

/* ------------------------------ Main component ------------------------------ */
export default function ProductForm() {
    const { id } = useParams();
    const editing = !!id;
    const navigate = useNavigate();

    const [loading, setLoading] = useState(editing);
    const [loadError, setLoadError] = useState("");
    const [savedStatus, setSavedStatus] = useState(""); // the product's current status when editing

    const [form, setForm] = useState(EMPTY_FORM);
    const [eventTypes, setEventTypes] = useState([]);
    const [colors, setColors] = useState([]);
    const [customHex, setCustomHex] = useState("#9C7A3C");
    const [customName, setCustomName] = useState("");
    const [sizeStock, setSizeStock] = useState({}); // { M: 3, L: 1 }
    // Photos: existing ones { id, path, url } and new ones { id, file, url }, in display order
    const [images, setImages] = useState([]);
    const [dragOver, setDragOver] = useState(false);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(null); // "publish" | "draft" | "save" | null
    const [result, setResult] = useState(null);
    const fileRef = useRef(null);
    const imagesRef = useRef(images);
    imagesRef.current = images;

    // Free object URLs when the page unmounts
    useEffect(() => () => imagesRef.current.forEach((i) => i.file && URL.revokeObjectURL(i.url)), []);

    // Editing: load the product, drafts and archived items included
    useEffect(() => {
        if (!editing) return;
        let ignore = false;
        setLoading(true);
        api
            .get(`/products/admin/${id}`)
            .then(({ data: p }) => {
                if (ignore) return;
                setSavedStatus(p.status);
                setForm({
                    name: p.name || "", category: p.category || "Gown", description: p.description || "", material: p.material || "",
                    sleeve: p.sleeve || "", length: p.length || "", price: p.price ? String(p.price) : "",
                    fulfillment: p.fulfillment || "Ready-to-wear", customizable: p.customizable !== false,
                });
                setEventTypes(p.eventTypes || []);
                setColors((p.colors || []).map((c) => ({ name: c.name, hex: c.hex })));
                setSizeStock(Object.fromEntries((p.sizes || []).map((s) => [s.size, s.stock])));
                setImages((p.images || []).map((path) => ({ id: path, path, url: assetUrl(path) })));
            })
            .catch((err) => !ignore && setLoadError(err.response?.status === 404 ? "That product doesn't exist." : errMsg(err)))
            .finally(() => !ignore && setLoading(false));
        return () => {
            ignore = true;
        };
    }, [editing, id]);

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
    const availableSizes = SIZES_BY_CATEGORY[form.category];

    const totalStock = useMemo(() => Object.values(sizeStock).reduce((s, n) => s + (Number(n) || 0), 0), [sizeStock]);
    const selectedSizes = availableSizes.filter((s) => s in sizeStock);
    const derivedStatus =
        selectedSizes.length === 0 ? "Active" : totalStock === 0 ? "Out of stock" : totalStock <= LOW_STOCK_AT ? "Low stock" : "Active";

    /* ---- handlers ---- */
    function changeCategory(cat) {
        setForm((f) => ({ ...f, category: cat }));
        // Drop sizes that don't exist for the new category
        setSizeStock((prev) => Object.fromEntries(Object.entries(prev).filter(([s]) => SIZES_BY_CATEGORY[cat].includes(s))));
    }

    const toggle = (list, setList, value) => setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

    function toggleSize(size) {
        setSizeStock((prev) => {
            const next = { ...prev };
            if (size in next) delete next[size];
            else next[size] = 1;
            return next;
        });
    }

    // A color counts as chosen when the shade matches, or when the name does (so a product
    // saved with a palette name but a slightly different hex still shows as selected)
    const hasColor = (c) =>
        colors.some(
            (x) => (x.hex || "").toLowerCase() === c.hex.toLowerCase() || (x.name || "").toLowerCase() === c.name.toLowerCase()
        );

    function togglePaletteColor(c) {
        if (hasColor(c)) setColors(colors.filter((x) => (x.hex || "").toLowerCase() !== c.hex.toLowerCase() && (x.name || "").toLowerCase() !== c.name.toLowerCase()));
        else addColor(c);
    }

    function addColor(c) {
        if (hasColor(c)) return;
        setColors([...colors, c]);
    }

    function addFiles(fileList) {
        const incoming = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
        const fits = incoming.filter((f) => f.size <= MAX_IMAGE_BYTES);
        const room = MAX_IMAGES - images.length;
        const next = fits.slice(0, room).map((file) => ({
            id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
            file,
            url: URL.createObjectURL(file),
        }));
        if (next.length) {
            setImages((prev) => [...prev, ...next]);
            setErrors((e) => ({ ...e, images: undefined }));
        }
        if (fits.length < incoming.length) setErrors((e) => ({ ...e, images: "Each photo must be under 5 MB." }));
    }

    function removeImage(imgId) {
        setImages((prev) => {
            const target = prev.find((i) => i.id === imgId);
            if (target?.file) URL.revokeObjectURL(target.url);
            return prev.filter((i) => i.id !== imgId);
        });
    }

    function moveImage(index, dir) {
        setImages((prev) => {
            const j = index + dir;
            if (j < 0 || j >= prev.length) return prev;
            const copy = [...prev];
            [copy[index], copy[j]] = [copy[j], copy[index]];
            return copy;
        });
    }

    function validate(mode) {
        const e = {};
        if (!form.name.trim()) e.name = "Enter a product name.";
        if (mode !== "draft") {
            if (!(Number(form.price) > 0)) e.price = "Enter a price greater than 0.";
            if (images.length === 0) e.images = "Add at least one photo.";
            if (selectedSizes.length === 0) e.sizes = "Select at least one size.";
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    // mode: "publish" (go live), "draft" (hide), "save" (editing: keep Draft/Archived as they are)
    async function submit(mode) {
        setResult(null);
        if (!validate(mode)) return;
        setSubmitting(mode);

        const status =
            mode === "draft" ? "Draft" : mode === "save" && ["Draft", "Archived"].includes(savedStatus) ? savedStatus : derivedStatus;

        const newFiles = images.filter((i) => i.file);
        const payload = {
            name: form.name.trim(),
            category: form.category,
            description: form.description.trim(),
            material: form.material.trim(),
            sleeve: form.sleeve,
            length: form.length,
            price: Number(form.price) || 0,
            eventTypes,
            colors,
            sizes: selectedSizes.map((size) => ({ size, stock: Number(sizeStock[size]) || 0 })),
            fulfillment: form.fulfillment,
            customizable: form.customizable,
            status,
            // The final photo order: existing photos by path, new uploads by position
            imageOrder: images.map((i) => (i.file ? `new:${newFiles.indexOf(i)}` : i.path)),
        };

        // multipart so images travel with the JSON (the server parses `data`)
        const body = new FormData();
        body.append("data", JSON.stringify(payload));
        newFiles.forEach((img) => body.append("images", img.file));

        try {
            // Large uploads go straight to fetch-style multipart; axios sets the boundary itself
            await api({ method: editing ? "put" : "post", url: editing ? `/products/${id}` : "/products", data: body });
            navigate("/admin?tab=products");
        } catch (err) {
            setResult({ type: "error", message: `Couldn't save the product. ${errMsg(err)}` });
            setSubmitting(null);
        }
    }

    /* ---- render ---- */
    if (loading) return <div className="min-h-screen bg-[#EFE9E3]"><Spinner label="Loading product…" /></div>;

    if (loadError) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#EFE9E3] px-4">
                <div className="w-full max-w-md rounded-2xl border border-[#E3DACB] bg-white p-8 text-center">
                    <p className="text-sm text-[#6B3838]">{loadError}</p>
                    <Link to="/admin?tab=products" className="mt-5 inline-block text-sm font-medium text-[#9C7A3C] hover:underline">Back to products</Link>
                </div>
            </div>
        );
    }

    const cover = images[0]?.url;
    // Shades the admin added themselves (anything that isn't one of the shared presets)
    const customColors = colors.filter(
        (c) =>
            !PALETTE.some(
                (x) => x.hex.toLowerCase() === (c.hex || "").toLowerCase() || x.name.toLowerCase() === (c.name || "").toLowerCase()
            )
    );

    return (
        <div className="min-h-screen bg-[#EFE9E3] text-[#241F1A]" style={{ fontFamily: "'Work Sans', system-ui, sans-serif" }}>
            {/* Sticky action bar */}
            <div className="sticky top-0 z-20 border-b border-[#E3DACB] bg-[#EFE9E3]/90 backdrop-blur">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
                    <Link to="/admin?tab=products" className="inline-flex items-center gap-2 text-sm text-[#6B6153] transition hover:text-[#241F1A]">
                        <ArrowLeft size={16} /> Back to products
                    </Link>
                    <div className="flex items-center gap-2">
                        {editing ? (
                            <>
                                {savedStatus === "Draft" && (
                                    <button
                                        type="button"
                                        onClick={() => submit("publish")}
                                        disabled={!!submitting}
                                        className="rounded-lg border border-[#E3DACB] bg-white px-4 py-2 text-sm font-medium text-[#4A4136] transition hover:border-[#C9BBA3] hover:bg-[#FBF8F3] disabled:opacity-50"
                                    >
                                        {submitting === "publish" ? "Publishing…" : "Publish"}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => submit("save")}
                                    disabled={!!submitting}
                                    className="inline-flex items-center gap-2 rounded-lg bg-[#241F1A] px-4 py-2 text-sm font-medium text-[#F5EFE4] transition hover:bg-[#3a3229] disabled:opacity-60"
                                >
                                    {submitting === "save" && <Loader2 size={14} className="animate-spin" />}
                                    Save changes
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => submit("draft")}
                                    disabled={!!submitting}
                                    className="rounded-lg border border-[#E3DACB] bg-white px-4 py-2 text-sm font-medium text-[#4A4136] transition hover:border-[#C9BBA3] hover:bg-[#FBF8F3] disabled:opacity-50"
                                >
                                    {submitting === "draft" ? "Saving…" : "Save draft"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => submit("publish")}
                                    disabled={!!submitting}
                                    className="inline-flex items-center gap-2 rounded-lg bg-[#241F1A] px-4 py-2 text-sm font-medium text-[#F5EFE4] transition hover:bg-[#3a3229] disabled:opacity-60"
                                >
                                    {submitting === "publish" && <Loader2 size={14} className="animate-spin" />}
                                    Publish product
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#9C7A3C]">Product catalog management</p>
                <h1 className="mt-1 text-3xl" style={font.display}>{editing ? "Edit product" : "Add a product"}</h1>

                {result && (
                    <div role="status" className="mt-5 flex items-center gap-2 rounded-lg border border-[#7C4A4A]/30 bg-[#F3E4E2] px-4 py-3 text-sm text-[#6B3838]">
                        {result.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
                        {result.message}
                    </div>
                )}

                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
                    {/* ------------------------ FORM ------------------------ */}
                    <div className="space-y-6">
                        <Section title="Photos" description={`Up to ${MAX_IMAGES}. The first photo is the cover shown in the catalog.`}>
                            <div>
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                        addFiles(e.target.files);
                                        e.target.value = "";
                                    }}
                                />

                                {images.length < MAX_IMAGES && (
                                    <button
                                        type="button"
                                        onClick={() => fileRef.current?.click()}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setDragOver(true);
                                        }}
                                        onDragLeave={() => setDragOver(false)}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setDragOver(false);
                                            addFiles(e.dataTransfer.files);
                                        }}
                                        className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${dragOver ? "border-[#9C7A3C] bg-[#F4ECDB]" : errors.images ? "border-[#7C4A4A]/60 bg-[#FBF3F1]" : "border-[#D9CDB8] bg-[#FBF8F3] hover:border-[#9C7A3C]"
                                            }`}
                                    >
                                        <ImagePlus size={22} className="text-[#9C7A3C]" />
                                        <span className="text-sm font-medium">Drop photos here or click to browse</span>
                                        <span className="text-xs text-[#8B8072]">JPG or PNG · up to 5 MB each · front, back and detail shots work best</span>
                                    </button>
                                )}
                                {errors.images && (
                                    <p className="mt-1.5 flex items-center gap-1 text-xs text-[#7C4A4A]"><AlertCircle size={12} /> {errors.images}</p>
                                )}

                                {images.length > 0 && (
                                    <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                                        {images.map((img, i) => (
                                            <li key={img.id} className="group relative">
                                                <div className={`aspect-[3/4] overflow-hidden rounded-xl border-2 bg-[#EFE9E3] ${i === 0 ? "border-[#9C7A3C]" : "border-[#E3DACB]"}`}>
                                                    <img src={img.url} alt={`Product photo ${i + 1}`} className="h-full w-full object-cover" />
                                                </div>
                                                {i === 0 && (
                                                    <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-[#241F1A] px-2 py-0.5 text-[10px] font-medium text-[#F5EFE4]">
                                                        <Star size={9} className="fill-[#C9A96A] text-[#C9A96A]" /> Cover
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(img.id)}
                                                    aria-label={`Remove photo ${i + 1}`}
                                                    className="absolute right-1.5 top-1.5 rounded-full bg-white/95 p-1 text-[#4A4136] shadow-sm transition hover:text-[#7C4A4A]"
                                                >
                                                    <X size={12} />
                                                </button>
                                                <div className="mt-1.5 flex justify-center gap-1">
                                                    <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label="Move earlier" className="rounded p-1 text-[#6B6153] hover:bg-white disabled:opacity-30">
                                                        <ChevronLeft size={14} />
                                                    </button>
                                                    <button type="button" onClick={() => moveImage(i, 1)} disabled={i === images.length - 1} aria-label="Move later" className="rounded p-1 text-[#6B6153] hover:bg-white disabled:opacity-30">
                                                        <ChevronRight size={14} />
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </Section>

                        <Section title="Product details">
                            <Field label="Product name" htmlFor="p-name" error={errors.name}>
                                <input id="p-name" value={form.name} onChange={set("name")} placeholder="e.g. Luisa Style Mother Gown" className={inputCls} />
                            </Field>

                            <Field label="Category">
                                <div className="flex w-fit gap-1 rounded-lg border border-[#E3DACB] bg-white p-1">
                                    {CATEGORIES.map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => changeCategory(c)}
                                            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${form.category === c ? "bg-[#241F1A] text-[#F5EFE4]" : "text-[#6B6153] hover:bg-[#FBF8F3]"}`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </Field>

                            <Field label="Description" htmlFor="p-desc" hint="Shown on the product page. Mention fabric feel, fit and best occasions.">
                                <textarea id="p-desc" rows={4} value={form.description} onChange={set("description")} placeholder="A floor-length gown in soft imported lace with a fitted bodice…" className={`${inputCls} resize-y leading-relaxed`} />
                            </Field>

                            <Field label="Event type" hint="Used by the catalog's event filter. Pick all that apply.">
                                <div className="flex flex-wrap gap-2">
                                    {EVENT_TYPES.map((t) => (
                                        <Chip key={t} active={eventTypes.includes(t)} onClick={() => toggle(eventTypes, setEventTypes, t)}>{t}</Chip>
                                    ))}
                                </div>
                            </Field>
                        </Section>

                        <Section title="Design attributes" description="These also feed the customization tool's predefined design elements.">
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <Field label="Material" htmlFor="p-mat">
                                    <input id="p-mat" value={form.material} onChange={set("material")} placeholder="Imported lace" className={inputCls} />
                                </Field>
                                <Field label="Sleeve style" htmlFor="p-sleeve">
                                    <select id="p-sleeve" value={form.sleeve} onChange={set("sleeve")} className={inputCls}>
                                        <option value="">Select…</option>
                                        {SLEEVES.map((s) => <option key={s}>{s}</option>)}
                                    </select>
                                </Field>
                                <Field label="Length" htmlFor="p-length">
                                    <select id="p-length" value={form.length} onChange={set("length")} className={inputCls}>
                                        <option value="">Select…</option>
                                        {LENGTHS.map((s) => <option key={s}>{s}</option>)}
                                    </select>
                                </Field>
                            </div>

                            <Field label="Colors" hint="Tap a swatch to add it, or pick a shade of your own. These are the same colors customers can choose in the customizer.">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    {PALETTE.map((c) => {
                                        const on = hasColor(c);
                                        return (
                                            <button
                                                key={c.hex}
                                                type="button"
                                                onClick={() => togglePaletteColor(c)}
                                                aria-pressed={on}
                                                title={c.name}
                                                className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs transition ${on ? "border-[#241F1A] bg-[#FBF8F3]" : "border-[#E3DACB] bg-white hover:border-[#C9BBA3]"}`}
                                            >
                                                <span className="h-5 w-5 rounded-full border border-black/10" style={{ background: c.hex }} />
                                                {c.name}
                                                {on && <Check size={12} />}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <input type="color" value={customHex} onChange={(e) => setCustomHex(e.target.value)} aria-label="Custom color" className="h-8 w-10 cursor-pointer rounded border border-[#E3DACB] bg-white p-0.5" />
                                    <input
                                        type="text"
                                        value={customName}
                                        onChange={(e) => setCustomName(e.target.value)}
                                        maxLength={24}
                                        placeholder="Name this shade (optional)"
                                        aria-label="Custom color name"
                                        className="w-44 rounded-lg border border-[#E3DACB] bg-white px-3 py-1.5 text-xs text-[#4A4136] outline-none focus:border-[#C9BBA3]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            addColor({ name: customName.trim() || customHex.toUpperCase(), hex: customHex });
                                            setCustomName("");
                                        }}
                                        className="rounded-lg border border-[#E3DACB] bg-white px-3 py-1.5 text-xs font-medium text-[#4A4136] hover:bg-[#FBF8F3]"
                                    >
                                        Add custom color
                                    </button>
                                </div>
                                {customColors.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {customColors.map((c) => (
                                            <span key={`${c.hex}-${c.name}`} className="inline-flex items-center gap-2 rounded-full border border-[#E3DACB] py-1 pl-1 pr-2 text-xs">
                                                <span className="h-5 w-5 rounded-full border border-black/10" style={{ background: c.hex }} />
                                                <span style={font.mono}>{c.name}</span>
                                                <button type="button" aria-label={`Remove ${c.name}`} onClick={() => setColors(colors.filter((x) => !((x.hex || "").toLowerCase() === (c.hex || "").toLowerCase() && (x.name || "").toLowerCase() === (c.name || "").toLowerCase())))}>
                                                    <X size={12} className="text-[#8B8072]" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </Field>
                        </Section>

                        <Section title="Sizes and stock" description="Select each size you carry, then set how many are on hand.">
                            <div>
                                <div className="flex flex-wrap gap-2">
                                    {availableSizes.map((s) => (
                                        <Chip key={s} active={s in sizeStock} onClick={() => toggleSize(s)}>{s}</Chip>
                                    ))}
                                </div>
                                {errors.sizes && <p className="mt-1.5 flex items-center gap-1 text-xs text-[#7C4A4A]"><AlertCircle size={12} /> {errors.sizes}</p>}
                            </div>

                            {selectedSizes.length > 0 && (
                                <div className="overflow-hidden rounded-xl border border-[#EFE9E3]">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-[#EFE9E3] bg-[#FBF8F3] text-xs text-[#8B8072]">
                                                <th className="px-4 py-2 font-medium">Size</th>
                                                <th className="px-4 py-2 font-medium">Units in stock</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedSizes.map((s) => (
                                                <tr key={s} className="border-b border-[#F3EEE4] last:border-0">
                                                    <td className="px-4 py-2 font-medium" style={font.mono}>{s}</td>
                                                    <td className="px-4 py-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={sizeStock[s]}
                                                            onChange={(e) => setSizeStock((p) => ({ ...p, [s]: Math.max(0, parseInt(e.target.value || "0", 10)) }))}
                                                            aria-label={`Stock for size ${s}`}
                                                            className="w-24 rounded-lg border border-[#E3DACB] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[#9C7A3C]"
                                                            style={font.mono}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Section>

                        <Section title="Pricing and ordering">
                            <Field label="Price" htmlFor="p-price" error={errors.price}>
                                <div className="relative max-w-[220px]">
                                    <span className="pointer-events-none absolute left-3 top-2 text-sm text-[#8B8072]">₱</span>
                                    <input id="p-price" type="number" min="0" value={form.price} onChange={set("price")} placeholder="0" className={`${inputCls} pl-7`} style={font.mono} />
                                </div>
                            </Field>

                            <Field label="How is it sold?">
                                <div className="flex w-fit gap-1 rounded-lg border border-[#E3DACB] bg-white p-1">
                                    {["Ready-to-wear", "Made-to-order"].map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setForm((f) => ({ ...f, fulfillment: t }))}
                                            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${form.fulfillment === t ? "bg-[#241F1A] text-[#F5EFE4]" : "text-[#6B6153] hover:bg-[#FBF8F3]"}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </Field>

                            <label className="flex cursor-pointer items-start gap-3">
                                <input type="checkbox" checked={form.customizable} onChange={(e) => setForm((f) => ({ ...f, customizable: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-[#241F1A]" />
                                <span>
                                    <span className="block text-sm font-medium">Allow customers to customize this design</span>
                                    <span className="block text-xs text-[#8B8072]">Shows the customization tool on the product page so customers can redesign it.</span>
                                </span>
                            </label>
                        </Section>
                    </div>

                    {/* ------------------------ LIVE PREVIEW ------------------------ */}
                    <aside className="lg:sticky lg:top-20 lg:self-start">
                        <p className="mb-2 text-sm font-medium text-[#6B6153]">Catalog preview</p>
                        <div className="overflow-hidden rounded-2xl border border-[#E3DACB] bg-white">
                            <div className="aspect-[3/4] bg-[#F3EEE4]">
                                {cover ? <img src={cover} alt="Cover preview" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-[#B4A88F]">No photo yet</div>}
                            </div>
                            <div className="space-y-2 p-4">
                                <p className="text-xs text-[#9C7A3C]">{form.category}{eventTypes[0] ? ` · ${eventTypes[0]}` : ""}</p>
                                <p className="text-lg leading-snug" style={font.display}>{form.name.trim() || "Product name"}</p>
                                <p className="text-sm" style={font.mono}>{form.price ? peso(form.price) : "₱0"}</p>
                                {colors.length > 0 && (
                                    <div className="flex gap-1.5 pt-1">
                                        {colors.map((c) => <span key={c.hex} title={c.name} className="h-4 w-4 rounded-full border border-black/10" style={{ background: c.hex }} />)}
                                    </div>
                                )}
                                {selectedSizes.length > 0 && <p className="text-xs text-[#8B8072]">Sizes: {selectedSizes.join(" / ")}</p>}
                            </div>
                        </div>

                        <dl className="mt-4 space-y-2 rounded-2xl border border-[#E3DACB] bg-white p-4 text-sm">
                            <div className="flex justify-between"><dt className="text-[#8B8072]">Total units</dt><dd style={font.mono}>{totalStock}</dd></div>
                            <div className="flex justify-between">
                                <dt className="text-[#8B8072]">Stock status</dt>
                                <dd className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: derivedStatus === "Active" ? "#E7EDE3" : "#F3E4E2", color: derivedStatus === "Active" ? "#3E4E3B" : "#6B3838" }}>
                                    {derivedStatus}
                                </dd>
                            </div>
                            {editing && <div className="flex justify-between"><dt className="text-[#8B8072]">Listing</dt><dd>{savedStatus}</dd></div>}
                            <div className="flex justify-between"><dt className="text-[#8B8072]">Sold as</dt><dd>{form.fulfillment}</dd></div>
                            <div className="flex justify-between"><dt className="text-[#8B8072]">Customizable</dt><dd>{form.customizable ? "Yes" : "No"}</dd></div>
                        </dl>
                    </aside>
                </div>
            </div>
        </div>
    );
}