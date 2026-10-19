import { useEffect, useRef, useState } from "react";
import { api, errMsg, assetUrl, formatWhen } from "./staffLib";
import { SectionHeader, EmptyState, Spinner, ErrorNote } from "./ui";

const SHARE_LABEL = { product: "Shared product", customization: "Shared customization", order: "Shared order" };
// Thumbnail height per kind, 3:4 like the product photos. Orders get the biggest.
const SHARE_THUMB = { product: "h-16", customization: "h-20", order: "h-24" };

// Staff can read inquiries for context. Replies are handled by the owner/admin,
// and opening a thread here does not mark it as read for them.
export default function MessagesView({ conversations, loaded, onRefresh }) {
    const [activeId, setActiveId] = useState(null);
    const [thread, setThread] = useState([]);
    const [loadingThread, setLoadingThread] = useState(false);
    const [error, setError] = useState("");
    const threadRef = useRef(null);

    useEffect(() => {
        if (!activeId && conversations.length > 0) setActiveId(conversations[0].customerId);
    }, [conversations, activeId]);

    useEffect(() => {
        if (!activeId) return;
        let ignore = false;
        setLoadingThread(true);
        setError("");
        api
            .get(`/staff/threads/${activeId}`)
            .then(({ data }) => !ignore && setThread(data))
            .catch((err) => !ignore && setError(errMsg(err)))
            .finally(() => !ignore && setLoadingThread(false));
        return () => {
            ignore = true;
        };
    }, [activeId]);

    useEffect(() => {
        if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }, [thread]);

    const active = conversations.find((c) => c.customerId === activeId);

    return (
        <div>
            <SectionHeader eyebrow="Read-only" title="Customer messages" />
            <p className="mb-4 text-xs text-[#8B8072]">
                Replies are handled by the owner/admin account. You can read inquiries here for context.
            </p>

            {!loaded ? (
                <Spinner label="Loading messages…" />
            ) : conversations.length === 0 ? (
                <div className="rounded-2xl border border-[#E3DACB] bg-white">
                    <EmptyState title="No conversations yet" hint="Customer messages will appear here." />
                </div>
            ) : (
                <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-[#E3DACB] bg-white md:grid-cols-[280px_1fr]">
                    <div className="max-h-[560px] divide-y divide-[#F3EEE4] overflow-y-auto border-b border-[#E3DACB] md:border-b-0 md:border-r">
                        {conversations.map((m) => (
                            <button
                                key={m.customerId}
                                onClick={() => setActiveId(m.customerId)}
                                aria-current={m.customerId === activeId}
                                className={`flex w-full items-start gap-2 px-4 py-3 text-left transition ${m.customerId === activeId ? "bg-[#FBF8F3]" : "hover:bg-[#FBF8F3]"}`}
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="truncate text-sm font-medium text-[#241F1A]">{m.customerName}</p>
                                        <span className="shrink-0 text-[10px] text-[#9C8C74]">{formatWhen(m.time)}</span>
                                    </div>
                                    <p className="truncate text-xs text-[#8B8072]">{m.preview}</p>
                                </div>
                                {m.unread > 0 && <span aria-label="Unread" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#7C4A4A]" />}
                            </button>
                        ))}
                    </div>

                    <div className="flex min-h-[320px] flex-col p-5">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-[#241F1A]">{active?.customerName}</p>
                            <button onClick={onRefresh} className="text-xs font-medium text-[#9C7A3C] hover:underline">Refresh</button>
                        </div>
                        <ErrorNote>{error}</ErrorNote>
                        <div ref={threadRef} className="mt-4 max-h-[440px] space-y-2 overflow-y-auto pr-1">
                            {loadingThread && thread.length === 0 && <p className="text-sm text-[#8B8072]">Loading…</p>}
                            {thread.map((msg) => (
                                <div key={msg._id} className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}>
                                    <div
                                        className={`max-w-md rounded-2xl px-4 py-2.5 text-sm ${msg.sender === "admin" ? "rounded-tr-sm bg-[#241F1A] text-[#F5EFE4]" : "rounded-tl-sm bg-[#FBF8F3] text-[#4A4136]"
                                            }`}
                                    >
                                        {msg.images?.length > 0 && (
                                            <div className={`grid gap-1.5 ${msg.images.length > 1 ? "grid-cols-2" : "grid-cols-1"} ${msg.body || msg.share ? "mb-2" : ""}`}>
                                                {msg.images.map((src) => (
                                                    <a key={src} href={assetUrl(src)} target="_blank" rel="noreferrer">
                                                        <img src={assetUrl(src)} alt="Customer photo" className="max-h-56 w-full rounded-lg object-cover" />
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
                                        {msg.body}
                                        <p className={`mt-1 text-[10px] ${msg.sender === "admin" ? "text-[#C9BFAF]" : "text-[#9C8C74]"}`}>{formatWhen(msg.createdAt)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}