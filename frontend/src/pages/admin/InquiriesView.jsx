import { useCallback, useEffect, useState } from "react";
import { Check, Mail, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { api, errMsg, formatDateTime } from "./adminLib";
import { SectionHeader, GhostButton, Segmented, EmptyState, Spinner, ErrorNote, ConfirmDialog } from "./ui";

/**
 * Owner's inbox for the public "Contact us" form.
 *
 * Messages arrive from visitors who may not have an account, so they can't appear in the
 * chat (that is tied to a signed-in customer). They land here, newest first.
 */
const FILTERS = [
    { value: "all", label: "All" },
    { value: "unhandled", label: "New" },
    { value: "handled", label: "Handled" },
];

export default function InquiriesView({ notify, onChanged }) {
    const [data, setData] = useState(null); // { messages, unhandled }
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("all");
    const [busyId, setBusyId] = useState(null);
    const [confirm, setConfirm] = useState(null); // the message about to be deleted

    const load = useCallback(async () => {
        try {
            const { data: res } = await api.get("/contact", {
                params: { status: filter === "all" ? undefined : filter },
            });
            setData(res);
            setError("");
        } catch (err) {
            setError(errMsg(err));
        }
    }, [filter]);

    useEffect(() => {
        load();
    }, [load]);

    const setHandled = async (message, handled) => {
        setBusyId(message._id);
        try {
            const { data: updated } = await api.patch(`/contact/${message._id}`, { handled });
            setData((prev) => {
                if (!prev) return prev;
                // With a filter on, a row that no longer matches drops out of the list
                const stillMatches = filter === "all" || (filter === "unhandled") === !updated.handled;
                const messages = stillMatches
                    ? prev.messages.map((m) => (m._id === updated._id ? updated : m))
                    : prev.messages.filter((m) => m._id !== updated._id);
                return { messages, unhandled: Math.max(0, prev.unhandled + (handled ? -1 : 1)) };
            });
            notify("success", handled ? "Marked as handled." : "Moved back to new.");
            onChanged?.();
        } catch (err) {
            notify("error", errMsg(err));
        } finally {
            setBusyId(null);
        }
    };

    const destroy = async () => {
        setBusyId(confirm._id);
        try {
            await api.delete(`/contact/${confirm._id}`);
            setData((prev) =>
                prev
                    ? {
                        messages: prev.messages.filter((m) => m._id !== confirm._id),
                        unhandled: Math.max(0, prev.unhandled - (confirm.handled ? 0 : 1)),
                    }
                    : prev
            );
            notify("success", "Inquiry deleted.");
            onChanged?.();
        } catch (err) {
            notify("error", errMsg(err));
        } finally {
            setBusyId(null);
            setConfirm(null);
        }
    };

    const messages = data?.messages || [];

    return (
        <div>
            <SectionHeader
                eyebrow="From the contact form"
                title="Inquiries"
                action={<GhostButton icon={RefreshCw} onClick={load}>Refresh</GhostButton>}
            />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <Segmented label="Show" value={filter} options={FILTERS} onChange={setFilter} />
                {data && (
                    <p className="text-xs text-[#8B8072]">
                        {data.unhandled} {data.unhandled === 1 ? "new inquiry" : "new inquiries"}
                    </p>
                )}
            </div>

            <ErrorNote onRetry={load}>{error}</ErrorNote>

            {data === null && !error ? (
                <div className="rounded-2xl border border-[#E3DACB] bg-white">
                    <Spinner label="Loading inquiries…" />
                </div>
            ) : messages.length === 0 ? (
                <div className="rounded-2xl border border-[#E3DACB] bg-white">
                    <EmptyState
                        title="No inquiries here."
                        hint={filter === "handled" ? "Nothing has been marked handled yet." : "Messages from the contact form land here."}
                    />
                </div>
            ) : (
                <div className="space-y-3">
                    {messages.map((message) => (
                        <article
                            key={message._id}
                            className={`rounded-2xl border bg-white p-5 ${message.handled ? "border-[#E3DACB]" : "border-[#9C7A3C]/40"
                                } ${busyId === message._id ? "opacity-60" : ""}`}
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium text-[#241F1A]">
                                        {message.name}
                                        {!message.handled && (
                                            <span className="ml-2 rounded-full bg-[#F4ECDB] px-2 py-0.5 text-[11px] font-medium text-[#6B5426]">
                                                New
                                            </span>
                                        )}
                                        {message.handled && (
                                            <span className="ml-2 rounded-full bg-[#E7EDE3] px-2 py-0.5 text-[11px] font-medium text-[#3E4E3B]">
                                                Handled
                                            </span>
                                        )}
                                    </p>
                                    <a
                                        href={`mailto:${message.email}`}
                                        className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-[#8B8072] hover:text-[#6B5426]"
                                    >
                                        <Mail size={12} /> {message.email}
                                    </a>
                                </div>
                                <p className="text-xs text-[#8B8072]">{formatDateTime(message.createdAt)}</p>
                            </div>

                            {message.subject && (
                                <p className="mt-3 text-sm font-medium text-[#241F1A]">{message.subject}</p>
                            )}
                            <p className="mt-1 whitespace-pre-line text-sm text-[#4A4136]">{message.message}</p>

                            <div className="mt-4 flex items-center justify-end gap-2">
                                {message.handled ? (
                                    <GhostButton icon={RotateCcw} onClick={() => setHandled(message, false)}>Reopen</GhostButton>
                                ) : (
                                    <GhostButton icon={Check} onClick={() => setHandled(message, true)}>Mark handled</GhostButton>
                                )}
                                <GhostButton icon={Trash2} danger onClick={() => setConfirm(message)}>Delete</GhostButton>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {confirm && (
                <ConfirmDialog
                    title="Delete this inquiry?"
                    message={`The message from ${confirm.name} will be gone for good. To keep it but move it out of the way, mark it handled instead.`}
                    confirmLabel="Delete inquiry"
                    danger
                    loading={busyId === confirm._id}
                    onConfirm={destroy}
                    onClose={() => setConfirm(null)}
                />
            )}
        </div>
    );
}
