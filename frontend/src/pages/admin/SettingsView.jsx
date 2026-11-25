import { useEffect, useState } from "react";
import { Eye, Plus, RefreshCw, Ruler, Trash2, Truck } from "lucide-react";
import { api, errMsg, peso } from "./adminLib";
import { SectionHeader, Field, PrimaryButton, GhostButton, Spinner, ErrorNote } from "./ui";
import { DEFAULT_SIZE_GUIDE, measurement } from "../../lib/sizeGuide";

/* The shop's own settings.

   The delivery fee set here is what new online delivery orders are charged — the
   customer sees it at checkout. Orders already placed keep the fee they were
   charged; that one can be changed on the order itself (see OrdersView).

   The size guide is also saved here. It is what customers see in the size guide
   popup on every product page, so the owner can update measurements without a deploy. */

const MEASUREMENTS = [
    { key: "waistline", label: "Waistline" },
    { key: "bust", label: "Bust" },
    { key: "hips", label: "Hips" },
];

const cellInputCls =
    "w-full rounded-lg border border-[#E3DACB] bg-white px-2.5 py-1.5 text-sm text-[#241F1A] outline-none transition placeholder:text-[#B4A88F] focus:border-[#9C7A3C] focus:ring-2 focus:ring-[#9C7A3C]/20";

const asText = (value) => (value === null || value === undefined ? "" : String(value));

const guideValues = (rows) =>
    rows.map(({ size, waistline, bust, hips }) => ({ size, waistline, bust, hips }));

const editableRows = (rows) =>
    (Array.isArray(rows) && rows.length ? rows : DEFAULT_SIZE_GUIDE).map((row) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        size: asText(row.size),
        waistline: asText(row.waistline),
        bust: asText(row.bust),
        hips: asText(row.hips),
    }));

const UnsavedBadge = () => (
    <span className="whitespace-nowrap rounded-full bg-[#F4ECDB] px-2 py-0.5 text-[10px] font-medium text-[#6B5426]">
        Unsaved
    </span>
);

export default function SettingsView({ notify }) {
    const [fee, setFee] = useState("");
    const [savedFee, setSavedFee] = useState("");
    const [sizeGuide, setSizeGuide] = useState([]);
    const [savedGuide, setSavedGuide] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingGuide, setSavingGuide] = useState(false);
    const [error, setError] = useState("");
    const [tick, setTick] = useState(0); // bump to reload

    useEffect(() => {
        let ignore = false;
        (async () => {
            try {
                const { data } = await api.get("/settings");
                if (ignore) return;
                const feeValue = String(data.deliveryFee ?? 0);
                const rows = editableRows(data.sizeGuide);
                setFee(feeValue);
                setSavedFee(feeValue);
                setSizeGuide(rows);
                setSavedGuide(guideValues(rows));
                setError("");
            } catch (err) {
                if (!ignore) setError(errMsg(err));
            } finally {
                if (!ignore) setLoading(false);
            }
        })();
        return () => {
            ignore = true;
        };
    }, [tick]);

    const amount = Number(fee);
    const invalidFee = fee === "" || !Number.isFinite(amount) || amount < 0;
    const feeDirty = fee !== savedFee;
    const guideDirty = JSON.stringify(guideValues(sizeGuide)) !== JSON.stringify(savedGuide);

    const save = async (e) => {
        e.preventDefault();
        if (invalidFee || !feeDirty) return;
        setSaving(true);
        try {
            const { data } = await api.put("/settings", { deliveryFee: amount });
            const feeValue = String(data.deliveryFee);
            setFee(feeValue);
            setSavedFee(feeValue);
            notify("success", `Delivery fee is now ${peso(data.deliveryFee)}.`);
        } catch (err) {
            notify("error", errMsg(err));
        } finally {
            setSaving(false);
        }
    };

    const guideError = (() => {
        if (sizeGuide.length === 0) return "Add at least one size row.";
        const seen = new Set();
        for (const [index, row] of sizeGuide.entries()) {
            const size = row.size.trim().toUpperCase();
            if (!size) return `Row ${index + 1} needs a size label.`;
            if (size.length > 10) return `Row ${index + 1}: size labels must be 10 characters or fewer.`;
            if (seen.has(size)) return `${size} appears more than once. Size labels must be unique.`;
            seen.add(size);

            for (const { key, label } of MEASUREMENTS) {
                const raw = row[key].trim();
                if (!raw) continue;
                const value = Number(raw);
                if (!Number.isFinite(value) || value < 0 || value > 200) {
                    return `Row ${index + 1}: ${label} must be between 0 and 200, or blank.`;
                }
            }
        }
        return "";
    })();

    const updateRow = (id, key, value) =>
        setSizeGuide((rows) => rows.map((row) => (row.id === id ? { ...row, [key]: value } : row)));

    const addRow = () =>
        setSizeGuide((rows) => [
            ...rows,
            { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, size: "", waistline: "", bust: "", hips: "" },
        ]);

    const removeRow = (id) => setSizeGuide((rows) => rows.filter((row) => row.id !== id));

    const resetGuide = () => setSizeGuide(editableRows(DEFAULT_SIZE_GUIDE));

    const saveGuide = async (e) => {
        e.preventDefault();
        if (guideError || !guideDirty) return;
        setSavingGuide(true);
        try {
            const payload = guideValues(sizeGuide).map((row) => ({
                size: row.size.trim().toUpperCase(),
                ...Object.fromEntries(
                    MEASUREMENTS.map(({ key }) => [key, row[key].trim() === "" ? null : Number(row[key])])
                ),
            }));
            const { data } = await api.put("/settings/size-guide", { sizeGuide: payload });
            const rows = editableRows(data.sizeGuide);
            setSizeGuide(rows);
            setSavedGuide(guideValues(rows));
            notify("success", "Size guide updated. Customers will see it on product pages.");
        } catch (err) {
            notify("error", errMsg(err));
        } finally {
            setSavingGuide(false);
        }
    };

    if (loading) return <Spinner label="Loading settings…" />;

    return (
        <div>
            <SectionHeader
                eyebrow="Shop settings"
                title="Settings"
                action={
                    <span className="rounded-full border border-[#E3DACB] bg-white px-3 py-1 text-xs text-[#8B8072]">
                        Applies across the storefront
                    </span>
                }
            />

            <ErrorNote onRetry={() => setTick((t) => t + 1)}>{error}</ErrorNote>

            <div className="space-y-5">
                <form onSubmit={save} className="max-w-2xl rounded-2xl border border-[#E3DACB] bg-white p-5">
                    <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F4ECDB] text-[#6B5426]">
                            <Truck size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold text-[#241F1A]">Delivery fee</h3>
                            <p className="mt-0.5 text-xs text-[#8B8072]">
                                Charged on new online delivery orders. Orders already placed keep the fee they were charged.
                            </p>
                        </div>
                        {feeDirty && <UnsavedBadge />}
                    </div>

                    <div className="mt-5 max-w-xs">
                        <Field label="Amount (₱)" htmlFor="delivery-fee">
                            <div className="relative">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#9C8C74]">₱</span>
                                <input
                                    id="delivery-fee"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={fee}
                                    onChange={(e) => setFee(e.target.value)}
                                    className="w-full rounded-lg border border-[#E3DACB] bg-white py-2 pl-7 pr-3 text-sm text-[#241F1A] outline-none transition placeholder:text-[#B4A88F] focus:border-[#9C7A3C] focus:ring-2 focus:ring-[#9C7A3C]/20"
                                />
                            </div>
                        </Field>
                        {invalidFee && fee !== "" && (
                            <p className="mt-2 text-xs text-[#6B3838]">Enter a number of 0 or more.</p>
                        )}
                    </div>

                    <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#FBF8F3] px-3 py-2.5 text-sm text-[#4A4136]">
                        <Truck size={15} className="mt-0.5 shrink-0 text-[#9C7A3C]" />
                        <span>
                            Deliveries are carried by <strong className="font-semibold text-[#241F1A]">Lalamove</strong>. The
                            customer is told this when they check out and on their order slip.
                        </span>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#F3EEE4] pt-4">
                        <p className="text-xs text-[#8B8072]">
                            {feeDirty ? "You have unsaved changes." : "This is the current delivery fee."}
                        </p>
                        <PrimaryButton type="submit" loading={saving} disabled={invalidFee || !feeDirty}>
                            Save delivery fee
                        </PrimaryButton>
                    </div>
                </form>

                <form onSubmit={saveGuide} className="rounded-2xl border border-[#E3DACB] bg-white p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F4ECDB] text-[#6B5426]">
                                <Ruler size={16} />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-[#241F1A]">Size guide</h3>
                                <p className="mt-0.5 text-xs text-[#8B8072]">
                                    Measurements in inches, shown in the popup on product pages. Leave a blank to show “—”.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {guideDirty && <UnsavedBadge />}
                            <GhostButton icon={RefreshCw} onClick={resetGuide} disabled={!guideDirty}>
                                Reset defaults
                            </GhostButton>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(250px,0.8fr)]">
                        <div className="min-w-0">
                            <div className="overflow-x-auto rounded-xl border border-[#E3DACB]">
                                <table className="w-full min-w-[500px] text-left text-sm">
                                    <thead>
                                        <tr className="bg-[#FBF8F3] text-[10px] uppercase tracking-wide text-[#9C8C74]">
                                            <th className="w-10 px-3 py-2.5 font-medium">#</th>
                                            <th className="w-28 px-2 py-2.5 font-medium">Size</th>
                                            {MEASUREMENTS.map(({ key, label }) => (
                                                <th key={key} className="px-2 py-2.5 font-medium">{label}</th>
                                            ))}
                                            <th className="w-10 px-2 py-2.5" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F3EEE4]">
                                        {sizeGuide.map((row, index) => (
                                            <tr key={row.id} className="transition hover:bg-[#FBF8F3]/70">
                                                <td className="px-3 py-2 text-xs text-[#B4A88F]">
                                                    {String(index + 1).padStart(2, "0")}
                                                </td>
                                                <td className="px-2 py-2">
                                                    <input
                                                        aria-label={`Size label for row ${index + 1}`}
                                                        value={row.size}
                                                        onChange={(e) => updateRow(row.id, "size", e.target.value)}
                                                        className={cellInputCls}
                                                        placeholder="S"
                                                    />
                                                </td>
                                                {MEASUREMENTS.map(({ key }) => (
                                                    <td key={key} className="px-2 py-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="200"
                                                            step="0.01"
                                                            aria-label={`${key} for row ${index + 1}`}
                                                            value={row[key]}
                                                            onChange={(e) => updateRow(row.id, key, e.target.value)}
                                                            className={cellInputCls}
                                                            placeholder="—"
                                                        />
                                                    </td>
                                                ))}
                                                <td className="px-2 py-2 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeRow(row.id)}
                                                        aria-label={`Remove row ${index + 1}`}
                                                        className="rounded-lg p-2 text-[#B4A88F] transition hover:bg-[#F3E4E2] hover:text-[#6B3838]"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <button
                                type="button"
                                onClick={addRow}
                                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#C9BBA3] py-2.5 text-xs font-medium text-[#6B6153] transition hover:border-[#9C7A3C] hover:bg-[#FBF8F3] hover:text-[#241F1A]"
                            >
                                <Plus size={14} /> Add size
                            </button>
                        </div>

                        <aside className="rounded-xl border border-[#E3DACB] bg-[#FBF8F3] p-4">
                            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-[#9C8C74]">
                                <Eye size={14} /> Customer preview
                            </div>
                            <div className="mt-3 overflow-hidden rounded-lg border border-[#E3DACB] bg-white">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="bg-[#F3EEE4] text-[10px] uppercase tracking-wide text-[#8B8072]">
                                            <th className="px-2 py-2 font-medium">Size</th>
                                            {MEASUREMENTS.map(({ key, label }) => (
                                                <th key={key} className="px-2 py-2 font-medium">{label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F3EEE4]">
                                        {sizeGuide.map((row, index) => (
                                            <tr key={row.id || index}>
                                                <td className="px-2 py-2 font-medium text-[#6B5426]">{row.size || "—"}</td>
                                                {MEASUREMENTS.map(({ key }) => (
                                                    <td key={key} className="px-2 py-2 text-[#4A4136]">
                                                        {measurement(row[key])}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="mt-3 text-[11px] leading-relaxed text-[#9C8C74]">
                                Updates as you type. Save to publish it to the storefront.
                            </p>
                        </aside>
                    </div>

                    {guideError && (
                        <div role="alert" className="mt-4 rounded-lg border border-[#E8CFCB] bg-[#F3E4E2] px-3 py-2 text-xs text-[#6B3838]">
                            {guideError}
                        </div>
                    )}

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#F3EEE4] pt-4">
                        <p className="text-xs text-[#8B8072]">
                            {guideDirty ? "You have unsaved changes." : "This is what customers currently see."}
                        </p>
                        <PrimaryButton type="submit" loading={savingGuide} disabled={!!guideError || !guideDirty}>
                            Save size guide
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </div>
    );
}
