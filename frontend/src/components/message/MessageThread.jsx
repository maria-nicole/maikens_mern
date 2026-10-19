import { Fragment } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { WELCOME, dayLabel } from "./messageConfig";
import MessageBubble from "./MessageBubble";

// The scrolling message area: loading / logged-out / error states, then the bubbles
export default function MessageThread({ status, messages, scrollRef, onScroll, onZoom, onImageLoad }) {
  return (
    <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5 md:px-8">
      {status === "loading" && (
        <div className="flex h-full items-center justify-center text-zinc-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      )}

      {status === "unauthorized" && (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <p className="font-medium text-neutral-800">Log in to message us</p>
          <p className="mt-1 text-sm text-zinc-500">
            Your conversation is saved to your account so we can reply to you.
          </p>
          <Link
            to="/login"
            className="mt-4 rounded-lg bg-yellow-600/89 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-700/89"
          >
            Log in
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <p className="font-medium text-neutral-800">Couldn't load your messages</p>
          <p className="mt-1 text-sm text-zinc-500">Check that the server is running, then try again.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Try again
          </button>
        </div>
      )}

      {status === "ready" &&
        [WELCOME, ...messages].map((m, i, all) => {
          const showDay =
            m.createdAt &&
            (i === 1 ||
              (all[i - 1].createdAt &&
                new Date(all[i - 1].createdAt).toDateString() !== new Date(m.createdAt).toDateString()));
          return (
            <Fragment key={m._id}>
              {showDay && (
                <div className="flex justify-center py-1">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] text-zinc-500">
                    {dayLabel(m.createdAt)}
                  </span>
                </div>
              )}
              <MessageBubble message={m} onZoom={onZoom} onImageLoad={onImageLoad} />
            </Fragment>
          );
        })}
    </div>
  );
}
