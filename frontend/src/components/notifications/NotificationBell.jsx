import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Banknote,
  Bell,
  CheckCheck,
  Inbox,
  Mail,
  MessageSquare,
  Package,
  PackagePlus,
  Sparkles,
  Truck,
} from "lucide-react";
import { useNotifications } from "./useNotifications";

/* ------------------------------------------------------------------------------------------
   The bell every signed-in user sees — customers in the shop's navbar, the owner and
   staff in their consoles. It shows the unread count, opens a dropdown of what happened,
   and takes the user to the page the notification points at when one is clicked.

   `variant` only changes the styling: "store" matches the navbar's amber look, "console"
   matches the owner/staff consoles' palette. The behaviour is identical.
------------------------------------------------------------------------------------------- */

const TYPE_ICONS = {
  order: Package,
  "new-order": PackagePlus,
  payment: Banknote,
  shipping: Truck,
  message: MessageSquare,
  inquiry: Mail,
  design: Sparkles,
  stock: AlertTriangle,
};

const timeAgo = (iso) => {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export default function NotificationBell({ variant = "store" }) {
  const navigate = useNavigate();
  const ref = useRef(null);
  const { open, setOpen, openPanel, unread, items, loading, markRead, markAllRead } = useNotifications(true);

  // Escape and clicks outside close the dropdown — the same contract the navbar's
  // account menu follows.
  useEffect(() => {
    if (!open) return;
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    const onDown = (event) => ref.current && !ref.current.contains(event.target) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, setOpen]);

  const onItemClick = (notification) => {
    setOpen(false);
    markRead(notification._id);
    if (notification.link) navigate(notification.link);
  };

  const label = unread > 0 ? `Notifications, ${unread} unread` : "Notifications";
  const consoleStyle = variant === "console";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className={
          consoleStyle
            ? "relative rounded-lg p-2 text-[#4A4136] hover:bg-white"
            : "relative inline-flex h-10 w-10 items-center justify-center rounded-full text-stone-600 transition-colors hover:bg-amber-50 hover:text-amber-800"
        }
      >
        <Bell size={consoleStyle ? 18 : 21} />
        {unread > 0 &&
          (consoleStyle ? (
            <span className="absolute right-0.5 top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#7C4A4A] px-1 text-[10px] font-medium leading-none text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : (
            <span className="absolute right-0 top-0 min-w-[18px] rounded-full bg-amber-600 px-1 text-center text-[11px] font-semibold leading-[18px] text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ))}
      </button>

      {open && (
        <div
          role="menu"
          className={
            "absolute right-0 z-50 mt-3 w-[22rem] overflow-hidden rounded-xl shadow-xl " +
            (consoleStyle ? "border border-[#E3DACB] bg-white" : "border border-amber-200 bg-white")
          }
        >
          <div
            className={
              "flex items-center justify-between border-b px-4 py-3 " +
              (consoleStyle ? "border-[#E3DACB] bg-[#F5F1EB]" : "border-amber-100 bg-stone-50")
            }
          >
            <span className={"text-sm font-semibold " + (consoleStyle ? "text-[#241F1A]" : "text-stone-800")}>
              Notifications
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50"
              >
                <CheckCheck size={14} />
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {loading && items.length === 0 && (
              <p className={"px-4 py-6 text-center text-sm " + (consoleStyle ? "text-[#8B8072]" : "text-stone-500")}>
                Loading…
              </p>
            )}

            {!loading && items.length === 0 && (
              <div className={"flex flex-col items-center gap-2 px-4 py-8 " + (consoleStyle ? "text-[#8B8072]" : "text-stone-500")}>
                <Inbox size={22} />
                <p className="text-sm">You&apos;re all caught up.</p>
              </div>
            )}

            {items.map((notification) => {
              const Icon = TYPE_ICONS[notification.type] || Bell;
              return (
                <button
                  key={notification._id}
                  type="button"
                  role="menuitem"
                  onClick={() => onItemClick(notification)}
                  className={
                    "flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 " +
                    (consoleStyle ? "border-[#EFE9E3] " : "border-amber-100 ") +
                    (notification.read
                      ? consoleStyle
                        ? "bg-white hover:bg-[#F5F1EB]"
                        : "bg-white hover:bg-amber-50"
                      : consoleStyle
                      ? "bg-[#F0E4C8]/40 hover:bg-[#F0E4C8]/60"
                      : "bg-amber-50/70 hover:bg-amber-50")
                  }
                >
                  <span
                    className={
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg " +
                      (consoleStyle ? "bg-[#9C7A3C]/15 text-[#9C7A3C]" : "bg-amber-100 text-amber-700")
                    }
                  >
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={
                        "block text-sm leading-snug " +
                        (notification.read
                          ? consoleStyle
                            ? "text-[#4A4136]"
                            : "text-stone-600"
                          : consoleStyle
                          ? "font-semibold text-[#241F1A]"
                          : "font-semibold text-stone-800")
                      }
                    >
                      {notification.title}
                    </span>
                    {notification.body && (
                      <span className={"mt-0.5 block truncate text-xs " + (consoleStyle ? "text-[#8B8072]" : "text-stone-500")}>
                        {notification.body}
                      </span>
                    )}
                    <span className={"mt-1 block text-[11px] " + (consoleStyle ? "text-[#B4A88F]" : "text-stone-400")}>
                      {timeAgo(notification.createdAt)}
                    </span>
                  </span>
                  {!notification.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-600" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
