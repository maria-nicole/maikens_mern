import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { clockTime, fileUrl } from "./messageConfig";
import ShareCard from "./ShareCard";

// One chat message: photos, an optional shared item, the text, and the time
export default function MessageBubble({ message, onZoom, onImageLoad, onEdit, onDelete }) {
  const mine = message.sender === "customer";
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef(null);

  // Close the menu when clicking anywhere outside it. A document listener is used
  // instead of a full-screen overlay so it works inside scrolling panels too.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [menuOpen]);

  // Only the customer's own typed messages can change; canned replies stay put
  const canManage = mine && message.kind === "message" && (onEdit || onDelete);

  return (
    <div className={`group flex items-center gap-1 ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm sm:max-w-[70%] ${
          mine ? "rounded-br-sm bg-yellow-600/89 text-white" : "rounded-bl-sm bg-gray-100 text-neutral-800"
        }`}
      >
        {message.images?.length > 0 && (
          <div
            className={`grid gap-1.5 ${message.images.length > 1 ? "grid-cols-2" : "grid-cols-1"} ${
              message.body || message.share ? "mb-2" : ""
            }`}
          >
            {message.images.map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => onZoom(fileUrl(src))}
                className="block cursor-zoom-in overflow-hidden rounded-lg"
                aria-label="View photo"
              >
                <img
                  src={fileUrl(src)}
                  alt="Shared photo"
                  onLoad={onImageLoad}
                  className="max-h-60 w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
        {message.share && (
          <div className={message.body ? "mb-2" : ""}>
            <ShareCard share={message.share} />
          </div>
        )}
        {message.body && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
        {message.createdAt && (
          <span className={`mt-1 block text-[10px] ${message.sender === "customer" ? "text-white/70" : "text-zinc-500"}`}>
            {clockTime(message.createdAt)}
            {message.editedAt && <span className="italic"> · edited</span>}
          </span>
        )}
      </div>

      {canManage && (
        <div ref={wrapRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Message options"
            aria-expanded={menuOpen}
            className="rounded-full p-1 text-zinc-300 transition-colors hover:bg-gray-100 hover:text-zinc-600"
          >
            <MoreHorizontal size={14} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-20 mt-1 w-32 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 text-left shadow-lg"
            >
              {message.body && onEdit && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(message);
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-xs text-neutral-800 transition-colors hover:bg-gray-50"
                >
                  <Pencil size={13} /> Edit
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(message);
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-xs text-red-700 transition-colors hover:bg-red-50"
                >
                  <Trash2 size={13} /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
