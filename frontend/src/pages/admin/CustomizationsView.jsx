import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, MessageSquare, ShoppingBag, RefreshCw, X } from "lucide-react";
import { font, api, errMsg, assetUrl, peso, shortId, shortDate } from "./adminLib";
import {
    SectionHeader, GhostButton, PrimaryButton, DesignPill, EmptyState, Spinner, ErrorNote, Modal, ModalHeader, Field, inputCls,
} from "./ui";

const FILTERS = ["All", "Pending review", "In discussion", "Approved"];
const OPTION_KEYS = ["color", "silhouette", "fit", "neckline", "sleeve", "fabric", "design"];

export default function CustomizationsView({ notify, onChanged }) {
    const [items, setItems] = useState(null);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("All");
    const [busyId, setBusyId] = useState(null);
    const [changes, setChanges] = useState(null); // request to send a "please change" note for
    const [pricing, setPricing] = useState(null); // approved request to turn into an order
    const [zoom, setZoom] = useState("");

    const load = useCallback(async () => {
        try {
            const { data } = await api.get("/customizations");
            setItems(data);
            setError("");
        } catch (err) {
            setError(errMsg(err));
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const counts = useMemo(() => {
        const c = Object.fromEntries(FILTERS.map((f) => [f, 0]));
        (items || []).forEach((i) => {
            c.All += 1;
            if (c[i.status] !== undefined) c[i.status] += 1;
        });
        return c;
    }, [items]);

    const shown = (items || []).filter((i) => filter === "All" || i.status === filter);
    const replace = (updated) => setItems((prev) => prev.map((x) => (x._id === updated._id ? updated : x)));

    const setStatus = async (item, status, note, successMessage) => {
        setBusyId(item._id);
        try {
            const { data } = await api.patch(`/customizations/${item._id}/status`, { status, note });
            replace(data);
            notify("success", successMessage);
            onChanged?.();
            return true;
        } catch (err) {
            notify("error", errMsg(err));
            return false;
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div>
            <SectionHeader
                eyebrow="Order & customization management"
                title="Customer design requests"
                action={<GhostButton icon={RefreshCw} onClick={load}>Refresh</GhostButton>}
            />

            <div className="mb-5 flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        aria-pressed={filter === f}
                        className={`rounded-full px-3 py-1 text-xs transition ${filter === f ? "bg-[#241F1A] text-[#F5EFE4]" : "border border-[#E3DACB] text-[#6B6153] hover:bg-[#FBF8F3]"}`}
                    >
                        {f} <span className="opacity-60">{counts[f]}</span>
                    </button>
                ))}
            </div>

            <ErrorNote onRetry={load}>{error}</ErrorNote>

            {items === null && !error ? (
                <Spinner label="Loading design requests…" />
            ) : shown.length === 0 ? (
                <div className="rounded-2xl border border-[#E3DACB] bg-white">
                    <EmptyState
                        title={items?.length ? "No requests in this view" : "No design requests yet"}
                        hint={items?.length ? "Try another filter." : "Requests from the customization tool will show up here."}
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {shown.map((c) => {
                        const busy = busyId === c._id;
                        const chosen = OPTION_KEYS.map((k) => c.selections?.[k]).filter(Boolean);
                        const refs = [c.references?.content, c.references?.style].filter(Boolean);
                        return (
                            <div key={c._id} className={`rounded-2xl border border-[#E3DACB] bg-white p-5 ${busy ? "opacity-60" : ""}`}>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => c.previewImage && setZoom(c.previewImage)}
                                        disabled={!c.previewImage}
                                        aria-label="Enlarge the AI preview"
                                        className="shrink-0 disabled:cursor-default"
                                    >
                                        {c.previewImage ? (
                                            <img src={assetUrl(c.previewImage)} alt="AI preview" className="h-36 w-28 rounded-lg border border-[#EFE9E3] object-cover" />
                                        ) : (
                                            <div className="flex h-36 w-28 items-center justify-center rounded-lg border border-[#EFE9E3] bg-[#FBF8F3] px-2 text-center text-[11px] text-[#B4A88F]">No AI preview</div>
                                        )}
                                    </button>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="text-sm font-semibold text-[#241F1A]">{c.customerName}</p>
                                                <p className="text-xs text-[#9C8C74]" style={font.mono}>{shortId("CST", c._id)} · {shortDate(c.createdAt)}</p>
                                            </div>
                                            <DesignPill status={c.status} />
                                        </div>
                                        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-[#9C7A3C]">{c.base}</p>
                                        {chosen.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {chosen.map((v) => (
                                                    <span key={v} className="rounded-full border border-[#E3DACB] bg-[#FBF8F3] px-2 py-0.5 text-xs text-[#4A4136]">{v}</span>
                                                ))}
                                            </div>
                                        )}
                                        {c.customerNotes && <p className="mt-2 text-sm text-[#4A4136]">“{c.customerNotes}”</p>}
                                        {refs.length > 0 && (
                                            <div className="mt-3 flex gap-2">
                                                {refs.map((r) => (
                                                    <button key={r} onClick={() => setZoom(r)} aria-label="Enlarge reference photo">
                                                        <img src={assetUrl(r)} alt="Reference" className="h-12 w-10 rounded-md border border-[#EFE9E3] object-cover" />
                                                    </button>
                                                ))}
                                                <span className="self-center text-xs text-[#9C8C74]">Reference photos</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#F3EEE4] pt-4">
                                    {c.status !== "Approved" && (
                                        <GhostButton icon={Check} disabled={busy} onClick={() => setStatus(c, "Approved", "", "Design approved.")}>Approve</GhostButton>
                                    )}
                                    {c.status !== "Approved" && (
                                        <GhostButton icon={MessageSquare} disabled={busy} onClick={() => setChanges(c)}>Request changes</GhostButton>
                                    )}
                                    {c.status === "Approved" && !c.order && (
                                        <PrimaryButton icon={ShoppingBag} onClick={() => setPricing(c)} className="!py-1.5 !text-xs">Create order</PrimaryButton>
                                    )}
                                    {c.status === "Approved" && !c.order && (
                                        <GhostButton disabled={busy} onClick={() => setStatus(c, "In discussion", "", "Moved back to discussion.")}>Reopen</GhostButton>
                                    )}
                                    {c.order && <span className="text-xs font-medium text-[#3E4E3B]">Order created</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {changes && (
                <ChangesModal
                    item={changes}
                    onClose={() => setChanges(null)}
                    onSend={async (note) => {
                        const ok = await setStatus(changes, "In discussion", note, "Sent to the customer.");
                        if (ok) setChanges(null);
                    }}
                />
            )}

            {pricing && (
                <PriceModal
                    item={pricing}
                    onClose={() => setPricing(null)}
                    onDone={(customization) => {
                        replace(customization);
                        setPricing(null);
                        notify("success", "Order created. The customer was notified.");
                        onChanged?.();
                    }}
                />
            )}

            {zoom && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" onClick={() => setZoom("")}>
                    <button className="absolute right-5 top-5 text-white/80 hover:text-white" aria-label="Close" onClick={() => setZoom("")}>
                        <X size={28} />
                    </button>
                    <img src={assetUrl(zoom)} alt="Enlarged" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
}

// Moves the request to "In discussion" and sends the customer a note in their chat.
function ChangesModal({ item, onClose, onSend }) {
    const [note, setNote] = useState("");
    const [sending, setSending] = useState(false);
    return (
        <Modal label="Request changes" onClose={onClose}>
            <ModalHeader title="Request changes" subtitle={`${item.customerName} · ${item.base}`} onClose={onClose} />
            <Field label="What should the customer change?" htmlFor="changes-note" hint="This is sent to their chat, and they can edit the design until you approve it.">
                <textarea
                    id="changes-note"
                    rows={4}
                    maxLength={1000}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. The beaded bodice isn't available in this color. Could you pick another fabric?"
                    className={`${inputCls} resize-none`}
                />
            </Field>
            <div className="mt-5 flex justify-end gap-2">
                <GhostButton onClick={onClose} disabled={sending}>Cancel</GhostButton>
                <PrimaryButton
                    loading={sending}
                    onClick={async () => {
                        setSending(true);
                        await onSend(note.trim());
                        setSending(false);
                    }}
                >
                    {note.trim() ? "Send note" : "Move to discussion"}
                </PrimaryButton>
            </div>
        </Modal>
    );
}

// The agreed price becomes the order total; the customer then follows it under My Orders.
function PriceModal({ item, onClose, onDone }) {
    const [price, setPrice] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const invalid = !(Number(price) > 0);

    const submit = async (e) => {
        e.preventDefault();
        if (invalid) return;
        setSaving(true);
        setError("");
        try {
            const { data } = await api.post("/orders/from-customization", { customizationId: item._id, total: Number(price) });
            onDone(data.customization);
        } catch (err) {
            setError(errMsg(err));
            setSaving(false);
        }
    };

    return (
        <Modal label="Create order" onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <ModalHeader title="Create order" subtitle={`${item.customerName} · ${item.base}`} onClose={onClose} />
                <Field label="Agreed price" htmlFor="design-price" hint="Includes fabric, work and any extras you agreed with the customer.">
                    <div className="relative max-w-[220px]">
                        <span className="pointer-events-none absolute left-3 top-2 text-sm text-[#8B8072]">₱</span>
                        <input id="design-price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={`${inputCls} pl-7`} style={font.mono} autoFocus />
                    </div>
                </Field>
                <p className="text-xs text-[#8B8072]">
                    The order starts at “Order Received” as made-to-order. Record any deposit from the Orders tab.
                    {Number(price) > 0 && <> Total: <span style={font.mono}>{peso(price)}</span>.</>}
                </p>
                {error && <p role="alert" className="rounded-lg bg-[#F3E4E2] px-3 py-2 text-sm text-[#6B3838]">{error}</p>}
                <PrimaryButton type="submit" loading={saving} disabled={invalid} className="w-full">Create order</PrimaryButton>
            </form>
        </Modal>
    );
}