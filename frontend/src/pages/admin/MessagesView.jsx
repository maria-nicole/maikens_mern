import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, MoreHorizontal, Pencil, Search, Send, Trash2, X } from "lucide-react";
import { api, errMsg, assetUrl, formatWhen } from "./adminLib";
import { SectionHeader, EmptyState, Spinner, ErrorNote, PrimaryButton, inputCls } from "./ui";
import useChatSocket from "../../components/message/useChatSocket";

const SHARE_LABEL = { product: "Shared product", customization: "Shared customization", order: "Shared order" };
// Thumbnail height per kind, 3:4 like the product photos. Orders get the biggest.
const SHARE_THUMB = { product: "h-16", customization: "h-20", order: "h-24" };
const POLL_MS = 30000; // safety net only — live updates arrive over the socket

export default function MessagesView({ notify, onChanged }) {
    const [conversations, setConversations] = useState(null);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [activeId, setActiveId] = useState(null);
    const [thread, setThread] = useState([]);
    const [loadingThread, setLoadingThread] = useState(false);
    const [reply, setReply] = useState("");
    const [sending, setSending] = useState(false);
    const [editing, setEditing] = useState(null); // the reply being edited, or null
    const threadRef = useRef(null);
    const stickRef = useRef(true);

    const loadConversations = useCallback(async () => {
        try {
            const { data } = await api.get("/messages/conversations");
            setConversations(data);
            setError("");
        } catch (err) {
            setError(errMsg(err));
        }
    }, []);

    // Open a thread. The server marks the customer's messages as read.
    const loadThread = useCallback(
        async (customerId, { quiet, force } = {}) => {
            if (!quiet) setLoadingThread(true);
            try {
                const { data } = await api.get(`/messages/thread/${customerId}`);
                // The poll skips a needless re-render when nothing new arrived, but
                // a reconnect must replace the thread so edits made while the socket
                // was away show up too.
                setThread((prev) =>
                    force || prev.length !== data.length || prev[prev.length - 1]?._id !== data[data.length - 1]?._id
                        ? data
                        : prev
                );
                loadConversations();
                onChanged?.();
            } catch (err) {
                if (!quiet) notify("error", errMsg(err));
            } finally {
                if (!quiet) setLoadingThread(false);
            }
        },
        [loadConversations, notify, onChanged]
    );

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    useEffect(() => {
        if (!activeId && conversations?.length) setActiveId(conversations[0].customerId);
    }, [conversations, activeId]);

    useEffect(() => {
        if (!activeId) return;
        setThread([]);
        setEditing(null);
        setReply("");
        stickRef.current = true;
        loadThread(activeId);
    }, [activeId, loadThread]);

    // New messages arrive without a refresh
    useEffect(() => {
        const t = setInterval(() => {
            if (document.hidden) return;
            loadConversations();
            if (activeId) loadThread(activeId, { quiet: true });
        }, POLL_MS);
        return () => clearInterval(t);
    }, [activeId, loadConversations, loadThread]);

    // Live updates from the customer's chat
    useChatSocket({
        onNew: (msg) => {
            loadConversations();
            // Only mark read while the tab is actually being looked at
            if (!document.hidden && activeId && String(msg.customer) === String(activeId)) {
                loadThread(activeId, { quiet: true });
            }
        },
        onUpdated: (msg) => {
            if (String(msg.customer) === String(activeId)) {
                setThread((t) => t.map((m) => (m._id === msg._id ? msg : m)));
            }
            loadConversations();
        },
        onDeleted: ({ id, customerId }) => {
            if (String(customerId) === String(activeId)) setThread((t) => t.filter((m) => m._id !== id));
            loadConversations();
        },
        onReconnect: () => {
            loadConversations();
            if (!document.hidden && activeId) loadThread(activeId, { quiet: true, force: true });
        },
    });

    useEffect(() => {
        const el = threadRef.current;
        if (el && stickRef.current) el.scrollTop = el.scrollHeight;
    }, [thread]);

    const handleScroll = () => {
        const el = threadRef.current;
        if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    };

    const shown = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (conversations || []).filter((c) => !q || c.customerName.toLowerCase().includes(q));
    }, [conversations, search]);
    const active = conversations?.find((c) => c.customerId === activeId);

    const startEdit = (msg) => {
        setEditing(msg);
        setReply(msg.body || "");
    };

    const cancelEdit = () => {
        setEditing(null);
        setReply("");
    };

    const removeMessage = async (msg) => {
        if (!window.confirm("Delete this message?")) return;
        try {
            await api.delete(`/messages/${msg._id}`);
            setThread((t) => t.filter((m) => m._id !== msg._id));
            if (editing?._id === msg._id) cancelEdit();
            loadConversations();
        } catch (err) {
            notify("error", errMsg(err));
        }
    };

    const send = async () => {
        const body = reply.trim();
        if (!body || !activeId || sending) return;
        setSending(true);
        try {
            if (editing) {
                const { data } = await api.patch(`/messages/${editing._id}`, { body });
                setThread((t) => t.map((m) => (m._id === data._id ? data : m)));
                cancelEdit();
                loadConversations();
                return;
            }
            const { data } = await api.post(`/messages/thread/${activeId}`, { body });
            stickRef.current = true;
            setThread((t) => [...t, data]);
            setReply("");
            loadConversations();
        } catch (err) {
            notify("error", errMsg(err));
        } finally {
            setSending(false);
        }
    };

    return (
        <div>
            <SectionHeader eyebrow="Customer communication support" title="Messages" />
            <ErrorNote onRetry={loadConversations}>{error}</ErrorNote>

            {conversations === null && !error ? (
                <Spinner label="Loading conversations…" />
            ) : conversations?.length === 0 ? (
                <div className="rounded-2xl border border-[#E3DACB] bg-white">
                    <EmptyState title="No conversations yet" hint="Customer messages will appear here." />
                </div>
            ) : (
                <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-[#E3DACB] bg-white md:grid-cols-[300px_1fr]">
                    <div className="border-b border-[#E3DACB] md:border-b-0 md:border-r">
                        <div className="relative border-b border-[#F3EEE4] p-3">
                            <Search size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#B4A88F]" />
                            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers…" aria-label="Search conversations" className={`${inputCls} pl-8`} />
                        </div>
                        <div className="max-h-[520px] divide-y divide-[#F3EEE4] overflow-y-auto">
                            {shown.map((m) => (
                                <button
                                    key={m.customerId}
                                    onClick={() => setActiveId(m.customerId)}
                                    aria-current={m.customerId === activeId}
                                    className={`flex w-full items-start gap-2 px-4 py-3 text-left transition ${m.customerId === activeId ? "bg-[#FBF8F3]" : "hover:bg-[#FBF8F3]"}`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`truncate text-sm text-[#241F1A] ${m.unread > 0 ? "font-semibold" : "font-medium"}`}>{m.customerName}</p>
                                            <span className="shrink-0 text-[10px] text-[#9C8C74]">{formatWhen(m.time)}</span>
                                        </div>
                                        <p className="truncate text-xs text-[#8B8072]">{m.preview}</p>
                                    </div>
                                    {m.unread > 0 && (
                                        <span aria-label={`${m.unread} unread`} className="mt-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#7C4A4A] px-1 text-[10px] font-medium text-white">
                                            {m.unread}
                                        </span>
                                    )}
                                </button>
                            ))}
                            {shown.length === 0 && <p className="px-4 py-6 text-center text-xs text-[#8B8072]">No customers match.</p>}
                        </div>
                    </div>

                    <div className="flex min-h-[420px] flex-col p-5">
                        <p className="text-sm font-semibold text-[#241F1A]">{active?.customerName}</p>

                        <div ref={threadRef} onScroll={handleScroll} className="mt-4 max-h-[400px] flex-1 space-y-2 overflow-y-auto pr-1">
                            {loadingThread && thread.length === 0 && <p className="text-sm text-[#8B8072]">Loading…</p>}
                            {thread.map((msg) => {
                                const mine = msg.sender === "admin";
                                // Only typed messages can change; the canned auto-ack stays put
                                const menu = (msg.kind ?? "message") === "message" ? (
                                    <MessageMenu
                                        align={mine ? "right" : "left"}
                                        canEdit={mine && !!msg.body}
                                        onEdit={() => startEdit(msg)}
                                        onDelete={() => removeMessage(msg)}
                                    />
                                ) : null;
                                return (
                                    <div key={msg._id} className={`group flex items-center gap-1 ${mine ? "justify-end" : "justify-start"}`}>
                                        {!mine && menu}
                                        <div className={`max-w-md rounded-2xl px-4 py-2.5 text-sm ${mine ? "rounded-tr-sm bg-[#241F1A] text-[#F5EFE4]" : "rounded-tl-sm bg-[#FBF8F3] text-[#4A4136]"}`}>
                                            {msg.images?.length > 0 && (
                                                <div className={`grid gap-1.5 ${msg.images.length > 1 ? "grid-cols-2" : "grid-cols-1"} ${msg.body || msg.share ? "mb-2" : ""}`}>
                                                    {msg.images.map((src) => (
                                                        <a key={src} href={assetUrl(src)} target="_blank" rel="noreferrer">
                                                            <img src={assetUrl(src)} alt="Photo in this conversation" className="max-h-56 w-full rounded-lg object-cover" />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                            {msg.share && (
                                                <div className={`flex gap-2.5 rounded-lg border border-[#E3DACB] bg-white p-2 text-[#241F1A] ${msg.body ? "mb-2" : ""}`}>
                                                    {msg.share.image && <img src={assetUrl(msg.share.image)} alt="" className={`${SHARE_THUMB[msg.share.kind] || "h-16"} aspect-[3/4] shrink-0 rounded-md object-cover`} />}
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] text-[#9C7A3C]">{SHARE_LABEL[msg.share.kind]}</p>
                                                        <p className="truncate text-sm font-medium">{msg.share.title}</p>
                                                        {msg.share.subtitle && <p className="truncate text-xs text-[#8B8072]">{msg.share.subtitle}</p>}
                                                        {msg.share.detail && <p className="mt-0.5 line-clamp-2 text-xs text-[#4A4136]">{msg.share.detail}</p>}
                                                    </div>
                                                </div>
                                            )}
                                            <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                                            <p className={`mt-1 text-[10px] ${mine ? "text-[#C9BFAF]" : "text-[#9C8C74]"}`}>
                                                {formatWhen(msg.createdAt)}
                                                {msg.editedAt && <span className="italic"> · edited</span>}
                                            </p>
                                        </div>
                                        {mine && menu}
                                    </div>
                                );
                            })}
                        </div>

                        {editing && (
                            <div className="mt-4 flex items-center justify-between rounded-lg bg-[#FBF8F3] px-3 py-2 text-xs text-[#4A4136]">
                                <span>Editing message</span>
                                <button type="button" onClick={cancelEdit} className="flex items-center gap-1 text-[#8B8072] transition-colors hover:text-[#241F1A]">
                                    <X size={12} /> Cancel
                                </button>
                            </div>
                        )}

                        <div className="mt-5 flex items-end gap-2 border-t border-[#F3EEE4] pt-4">
                            <textarea
                                value={reply}
                                onChange={(e) => setReply(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Escape" && editing) {
                                        e.preventDefault();
                                        cancelEdit();
                                        return;
                                    }
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        send();
                                    }
                                }}
                                rows={1}
                                maxLength={2000}
                                placeholder={editing ? "Edit your message… (Enter to save)" : "Type a reply… (Enter to send)"}
                                aria-label="Reply"
                                className={`${inputCls} max-h-28 resize-none`}
                            />
                            <PrimaryButton icon={editing ? Check : Send} onClick={send} loading={sending} disabled={!reply.trim()}>
                                {editing ? "Save" : "Send"}
                            </PrimaryButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// A small "⋯" menu on typed messages. Edit is only offered for the owner's own
// replies; Delete is offered for anything typed, so the owner can moderate.
function MessageMenu({ align = "right", canEdit, onEdit, onDelete }) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    // A document listener closes the menu on an outside click; a full-screen
    // overlay would sit above the menu inside the scrolling console panel.
    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (!wrapRef.current?.contains(e.target)) setOpen(false);
        };
        document.addEventListener("pointerdown", onDown);
        return () => document.removeEventListener("pointerdown", onDown);
    }, [open]);

    return (
        <div ref={wrapRef} className="relative shrink-0">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label="Message options"
                aria-expanded={open}
                className="rounded-full p-1 text-[#C9BFAF] transition-colors hover:bg-[#F3EEE4] hover:text-[#4A4136]"
            >
                <MoreHorizontal size={14} />
            </button>
            {open && (
                <div role="menu" className={`absolute top-full z-20 mt-1 w-32 overflow-hidden rounded-xl border border-[#E3DACB] bg-white py-1 shadow-lg ${align === "left" ? "left-0" : "right-0"}`}>
                    {canEdit && (
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                setOpen(false);
                                onEdit();
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#241F1A] transition-colors hover:bg-[#FBF8F3]"
                        >
                            <Pencil size={13} /> Edit
                        </button>
                    )}
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            setOpen(false);
                            onDelete();
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#7C4A4A] transition-colors hover:bg-[#F3E4E2]"
                    >
                        <Trash2 size={13} /> Delete
                    </button>
                </div>
            )}
        </div>
    );
}