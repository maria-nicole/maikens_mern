import { QUICK_REPLIES } from "./messageConfig";

// One-tap canned questions. The answers live on the server (utils/quickReplies.js)
export default function QuickReplies({ ready, sending, onQuickReply }) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-3 md:px-8">
      {QUICK_REPLIES.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onQuickReply(item.id)}
          disabled={!ready || sending}
          className="shrink-0 cursor-pointer rounded-full border border-yellow-700/89 px-3 py-1.5 text-xs font-medium text-yellow-700/89 transition-colors hover:bg-yellow-600/89 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
