import { useEffect, useRef } from "react";
import { ImagePlus, Loader2, Package, Palette, Paperclip, Send, Shirt, X } from "lucide-react";
import ShareCard from "./ShareCard";

// The composer: attach menu, photos/share waiting to send, text box and Send
export default function Composer({
  ready,
  fileRef,
  draft,
  onDraft,
  onKeyDown,
  onPaste,
  onFiles,
  photos,
  onRemovePhoto,
  pendingShare,
  onRemoveShare,
  sending,
  canSend,
  onSend,
  menuOpen,
  onMenuToggle,
  onPhoto,
  onPicker,
}) {
  const textRef = useRef(null);

  // grow the text box as the customer types (up to about 5 lines)
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft]);

  const MENU = [
    { label: "Photo", icon: ImagePlus, onClick: onPhoto },
    { label: "My customization", icon: Palette, onClick: () => onPicker("customization") },
    { label: "My order", icon: Package, onClick: () => onPicker("order") },
    { label: "Product from catalog", icon: Shirt, onClick: () => onPicker("product") },
  ];

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Attachments waiting to be sent */}
      {(photos.length > 0 || pendingShare) && (
        <div className="space-y-2 border-t border-gray-100 px-4 py-3 md:px-8">
          {photos.length > 0 && (
            <ul className="flex gap-2.5">
              {photos.map((p, i) => (
                <li key={p.id} className="relative">
                  <img
                    src={p.url}
                    alt={`Photo ${i + 1} to send`}
                    className="h-16 w-16 rounded-lg border border-gray-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => onRemovePhoto(p.id)}
                    aria-label={`Remove photo ${i + 1}`}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-neutral-800 p-1 text-white shadow transition-colors hover:bg-red-700"
                  >
                    <X size={10} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {pendingShare && (
            <div className="max-w-md">
              <ShareCard share={pendingShare} onRemove={onRemoveShare} />
            </div>
          )}
        </div>
      )}

      <div className="relative flex items-end gap-2 px-4 py-3 md:px-8">
        <div className="relative">
          <button
            type="button"
            onClick={onMenuToggle}
            aria-expanded={menuOpen}
            aria-label="Attach"
            disabled={!ready}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-gray-50 hover:text-yellow-700/89 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Paperclip size={18} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={onMenuToggle} />
              <div
                role="menu"
                className="absolute bottom-full left-0 z-20 mb-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
              >
                {MENU.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      role="menuitem"
                      onClick={item.onClick}
                      className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm text-neutral-800 transition-colors hover:bg-gray-50"
                    >
                      <Icon size={16} className="text-yellow-700/89" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <textarea
          ref={textRef}
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          rows={1}
          maxLength={1000}
          disabled={!ready}
          placeholder={ready ? "Type a message…" : "Log in to send a message"}
          className="max-h-[120px] flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:bg-gray-50"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-yellow-600/89 text-white transition-colors hover:bg-yellow-700/89 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </>
  );
}
