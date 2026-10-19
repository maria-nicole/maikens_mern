import { clockTime, fileUrl } from "./messageConfig";
import ShareCard from "./ShareCard";

// One chat message: photos, an optional shared item, the text, and the time
export default function MessageBubble({ message, onZoom, onImageLoad }) {
  const mine = message.sender === "customer";

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
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
          </span>
        )}
      </div>
    </div>
  );
}
