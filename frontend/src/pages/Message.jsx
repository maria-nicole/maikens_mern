import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  Send,
  Paperclip,
  ShieldCheck,
  Loader2,
  X,
  ImagePlus,
  Palette,
  Package,
  Shirt,
  Search,
  MapPin,
  Clock,
  Lightbulb,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Same pattern as Admin.jsx: attaches the login token to every request.
// Later you can move this into one shared file (e.g. src/api.js) and import it in both.
const api = axios.create({ baseURL: `${API_URL}/api` });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const errMsg = (err) =>
  err.response?.data?.message ||
  (err.response ? err.message : "Can't reach the server. Check your connection and try again.");

const POLL_MS = 5000; // how often to check for the owner's replies
const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// Ids must match backend/utils/quickReplies.js (the answers live on the server)
const QUICK_REPLIES = [
  { id: "hours", label: "Store hours" },
  { id: "pricing", label: "Pricing" },
  { id: "order-status", label: "Order status" },
  { id: "rush", label: "Rush orders" },
];

const WELCOME = {
  _id: "welcome",
  sender: "admin",
  body: "Hi! Welcome to MAIKENS Gown & Barong 👋 Ask us anything about designs, pricing, or your order. You can also share a photo, one of your customizations, or an order. Or tap a quick question below.",
  createdAt: null,
};

const SHARE_LABEL = { product: "Product", customization: "My customization", order: "My order" };
const SHARE_ICON = { product: Shirt, customization: Palette, order: Package };

/* -------------------------------- helpers -------------------------------- */
const fileUrl = (path) => (!path ? "" : /^https?:\/\//i.test(path) ? path : `${API_URL}${path}`);
const peso = (n) => `₱${Number(n || 0).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;

// Adds only messages we don't already have (polling and sending can overlap)
const mergeMessages = (prev, incoming) => {
  const seen = new Set(prev.map((m) => m._id));
  const fresh = incoming.filter((m) => !seen.has(m._id));
  return fresh.length ? [...prev, ...fresh] : prev;
};

const clockTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const dayLabel = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
};

// Store is open Tue–Sun, 9 AM–6 PM, Philippine time
const getShopStatus = (now) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const day = parts.find((p) => p.type === "weekday")?.value;
  const hour = Number(parts.find((p) => p.type === "hour")?.value) % 24;
  return day !== "Mon" && hour >= 9 && hour < 18;
};

const productToShare = (p) => ({
  kind: "product",
  refId: p._id,
  title: p.name,
  subtitle: [p.category, p.eventTypes?.[0]].filter(Boolean).join(" · "),
  detail: peso(p.price),
  image: p.images?.[0] || "",
});

/* ----------------------------- small components ---------------------------- */

// A product / customization / order, shown in bubbles and in the composer
function ShareCard({ share, onRemove }) {
  const Icon = SHARE_ICON[share.kind] || Shirt;
  const card = (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-2 text-left text-neutral-800">
      {share.image ? (
        <img src={fileUrl(share.image)} alt="" className="h-16 w-12 shrink-0 rounded-md object-cover" />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-rose-50 text-yellow-700/89">
          <Icon size={20} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-yellow-700/89">{SHARE_LABEL[share.kind]}</p>
        <p className="truncate text-sm font-semibold">{share.title}</p>
        {share.subtitle && <p className="truncate text-xs text-zinc-500">{share.subtitle}</p>}
        {share.detail && <p className="mt-0.5 line-clamp-2 text-xs text-zinc-600">{share.detail}</p>}
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove shared item"
          className="shrink-0 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-gray-100 hover:text-zinc-700"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );

  if (!onRemove && share.kind === "product" && share.refId) {
    return (
      <Link to={`/product/${share.refId}`} className="block transition-opacity hover:opacity-90">
        {card}
      </Link>
    );
  }
  return card;
}

// Full-screen photo viewer
function Lightbox({ src, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close photo"
        className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white transition-colors hover:bg-white/30"
      >
        <X size={20} />
      </button>
      <img
        src={src}
        alt="Full size"
        className="max-h-full max-w-full rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// Lets the customer pick one of their customizations or orders, or a catalog product
function SharePicker({ initialTab, onPick, onClose }) {
  const [tab, setTab] = useState(initialTab);
  const [mine, setMine] = useState(null); // { customizations, orders }
  const [products, setProducts] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let ignore = false;
    Promise.all([api.get("/messages/shareables"), api.get("/products")])
      .then(([a, b]) => {
        if (ignore) return;
        setMine(a.data);
        setProducts(b.data);
      })
      .catch((err) => {
        if (!ignore) setError(errMsg(err));
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const loading = !error && (mine === null || products === null);

  const items = useMemo(() => {
    if (tab === "customization") {
      return (mine?.customizations || []).map((c) => ({
        kind: "customization",
        refId: c.id,
        title: c.title,
        subtitle: c.subtitle,
        detail: "",
        image: "",
      }));
    }
    if (tab === "order") {
      return (mine?.orders || []).map((o) => ({
        kind: "order",
        refId: o.id,
        title: o.title,
        subtitle: o.subtitle,
        detail: "",
        image: "",
      }));
    }
    const q = query.trim().toLowerCase();
    return (products || []).filter((p) => p.name.toLowerCase().includes(q)).map(productToShare);
  }, [tab, mine, products, query]);

  const TABS = [
    { id: "customization", label: "My customizations" },
    { id: "order", label: "My orders" },
    { id: "product", label: "Catalog" },
  ];

  const emptyText =
    tab === "customization"
      ? "You haven't submitted any customizations yet. Designs you send to us will show up here."
      : tab === "order"
      ? "You don't have any orders yet. Your orders will show up here."
      : "No products match your search.";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share in chat"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full flex-col rounded-t-2xl bg-white sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-neutral-800">Share in chat</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-1 border-b border-gray-100 px-3 pt-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "border-yellow-600/89 text-yellow-700/89"
                  : "border-transparent text-zinc-500 hover:text-neutral-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "product" && (
          <div className="relative px-4 pt-3">
            <Search size={14} className="absolute left-7 top-1/2 mt-1.5 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the catalog…"
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500/89"
            />
          </div>
        )}

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {loading && (
            <div className="flex justify-center py-8 text-zinc-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          )}
          {error && <p className="py-6 text-center text-sm text-red-700">{error}</p>}
          {!loading && !error && items.length === 0 && (
            <p className="py-8 text-center text-sm text-zinc-500">{emptyText}</p>
          )}
          {items.map((item) => (
            <button
              key={`${item.kind}-${item.refId}`}
              type="button"
              onClick={() => onPick(item)}
              className="block w-full cursor-pointer rounded-xl transition-colors hover:bg-gray-50"
            >
              <ShareCard share={item} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- main page -------------------------------- */
const Message = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [photos, setPhotos] = useState([]); // [{ id, file, url }]
  const [pendingShare, setPendingShare] = useState(null);
  const [picker, setPicker] = useState(null); // null | "customization" | "order" | "product"
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState(() =>
    localStorage.getItem("token") ? "loading" : "unauthorized"
  ); // loading | ready | error | unauthorized
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [now, setNow] = useState(() => new Date());

  const fileRef = useRef(null);
  const textRef = useRef(null);
  const scrollRef = useRef(null);
  const stickRef = useRef(true); // keep the view pinned to the newest message
  const lastIdRef = useRef(null);
  const photosRef = useRef(photos);
  lastIdRef.current = messages.length ? messages[messages.length - 1]._id : null;
  photosRef.current = photos;

  const ready = status === "ready";
  const open = getShopStatus(now);

  // keeps the "Open now" badge accurate
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // free photo previews when leaving the page
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  // Load the conversation, then check for new messages every few seconds
  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    let ignore = false;

    const load = async (initial) => {
      try {
        const params = initial || !lastIdRef.current ? {} : { after: lastIdRef.current };
        const { data } = await api.get("/messages", { params });
        if (ignore) return;
        setMessages((prev) => mergeMessages(prev, data));
        setStatus((s) => (s === "loading" || s === "error" ? "ready" : s));
      } catch (err) {
        if (ignore) return;
        if (err.response?.status === 401) setStatus("unauthorized");
        else if (initial) setStatus("error");
      }
    };

    load(true);
    const timer = setInterval(() => {
      if (!document.hidden) load(false);
    }, POLL_MS);

    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, []);

  // "/message?product=<id>" opens the chat with that product ready to send
  useEffect(() => {
    const productId = searchParams.get("product");
    if (!ready || !productId) return;
    let ignore = false;
    api
      .get(`/products/${productId}`)
      .then(({ data }) => {
        if (!ignore) setPendingShare(productToShare(data));
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setSearchParams({}, { replace: true });
      });
    return () => {
      ignore = true;
    };
  }, [ready, searchParams, setSearchParams]);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    if (stickRef.current) scrollToBottom();
  }, [messages, status]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  // grow the text box as the customer types (up to about 5 lines)
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft]);

  /* ---- attachments ---- */
  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const images = incoming.filter((f) => f.type.startsWith("image/"));
    const fits = images.filter((f) => f.size <= MAX_PHOTO_BYTES);
    const room = Math.max(0, MAX_PHOTOS - photos.length);

    let problem = "";
    if (images.length < incoming.length) problem = "Only image files can be attached.";
    else if (fits.length < images.length) problem = "Each photo must be under 5 MB.";
    else if (fits.length > room) problem = `You can attach up to ${MAX_PHOTOS} photos.`;

    const next = fits.slice(0, room).map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      url: URL.createObjectURL(file),
    }));
    if (next.length) setPhotos((prev) => [...prev, ...next]);
    setSendError(problem);
  };

  const removePhoto = (id) =>
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });

  const clearAttachments = () => {
    photosRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setPendingShare(null);
  };

  const handlePaste = (e) => {
    const files = Array.from(e.clipboardData?.files || []).filter((f) => f.type.startsWith("image/"));
    if (files.length) {
      e.preventDefault();
      addFiles(files);
    }
  };

  const openPicker = (tab) => {
    setMenuOpen(false);
    setPicker(tab);
  };

  const openPhotoDialog = () => {
    setMenuOpen(false);
    fileRef.current?.click();
  };

  /* ---- sending ---- */
  const send = async ({ quickReplyId } = {}) => {
    if (sending || !ready) return;
    const text = draft.trim();
    if (!quickReplyId && !text && photos.length === 0 && !pendingShare) return;

    setSending(true);
    setSendError("");

    // multipart so the photos travel with the text
    const form = new FormData();
    if (quickReplyId) {
      form.append("quickReplyId", quickReplyId);
    } else {
      if (text) form.append("body", text);
      photos.forEach((p) => form.append("images", p.file));
      if (pendingShare) {
        form.append("share", JSON.stringify({ kind: pendingShare.kind, refId: pendingShare.refId }));
      }
    }

    try {
      // The server replies with an array: your message + any automatic reply
      const { data } = await api.post("/messages", form);
      stickRef.current = true;
      setMessages((prev) => mergeMessages(prev, data));
      if (!quickReplyId) {
        setDraft("");
        clearAttachments();
      }
    } catch (err) {
      if (err.response?.status === 401) setStatus("unauthorized");
      else setSendError(errMsg(err));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const canSend = ready && !sending && (draft.trim() || photos.length > 0 || pendingShare);

  /* ---- drag & drop ---- */
  const dropProps = {
    onDragEnter: (e) => {
      if (ready && e.dataTransfer?.types?.includes("Files")) setDragging(true);
    },
    onDragOver: (e) => {
      if (ready) e.preventDefault();
    },
    onDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
    },
    onDrop: (e) => {
      e.preventDefault();
      setDragging(false);
      if (ready) addFiles(e.dataTransfer.files);
    },
  };


  return (
    <div className="min-h-screen bg-white pt-16">
      <div className="grid h-[calc(100dvh-5rem)] grid-cols-1 lg:grid-cols-[320px_1fr]">
        {/* ------------------------------ Sidebar ------------------------------ */}
        <aside className="hidden flex-col gap-7 overflow-y-auto border-r border-gray-100 bg-gray-50 p-6 lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-lg font-bold text-yellow-700/89">
              M
            </div>
            <div>
              <p className="font-semibold leading-tight text-neutral-800">MAIKENS Gown &amp; Barong</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
                <span className={`h-2 w-2 rounded-full ${open ? "bg-green-500" : "bg-zinc-300"}`} />
                {open ? "Open now" : "Closed right now"}
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-zinc-600">
            <p className="flex items-start gap-2.5">
              <Clock size={15} className="mt-0.5 shrink-0 text-yellow-700/89" />
              <span>
                Tuesday to Sunday, 9:00 AM – 6:00 PM
                <br />
                <span className="text-zinc-400">Closed on Mondays</span>
              </span>
            </p>
            <p className="flex items-start gap-2.5">
              <MapPin size={15} className="mt-0.5 shrink-0 text-yellow-700/89" />
              <span>
                Stall A18 Disenyo Pandi, Wedding Depot, Grace Park Street, Bagong Barrio, Pandi, Bulacan
              </span>
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-neutral-800">Share in chat</h3>
            <div className="space-y-1.5">
              {[
                { label: "Upload a photo", icon: ImagePlus, onClick: openPhotoDialog },
                { label: "My customization", icon: Palette, onClick: () => openPicker("customization") },
                { label: "My order", icon: Package, onClick: () => openPicker("order") },
                { label: "A product from the catalog", icon: Shirt, onClick: () => openPicker("product") },
              ].map(({ label, icon: Icon, onClick }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  disabled={!ready}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-sm text-neutral-800 transition-colors hover:border-yellow-600/89 hover:text-yellow-700/89 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon size={16} className="text-yellow-700/89" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-rose-50 p-4 text-sm text-zinc-600">
            <p className="mb-1 flex items-center gap-1.5 font-medium text-neutral-800">
              <Lightbulb size={14} className="text-yellow-700/89" />
              Faster quotes
            </p>
            Send a photo of the gown you like, your event date, and your size. We can usually quote much faster with
            those three.
          </div>

          <Link
            to="/catalog"
            className="mt-auto text-sm font-medium text-yellow-700/89 transition-colors hover:text-yellow-600/89"
          >
            Browse the catalog
          </Link>
        </aside>

        {/* -------------------------------- Chat -------------------------------- */}
        <section className="relative flex min-h-0 flex-col bg-white" {...dropProps}>
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 font-bold text-yellow-700/89 lg:hidden">
              M
            </div>
            <div>
              <p className="font-semibold leading-tight text-neutral-800">
                <span className="lg:hidden">MAIKENS Gown &amp; Barong</span>
                <span className="hidden lg:inline">Chat with the boutique</span>
              </p>
              <p className="flex items-center gap-1 text-xs text-zinc-500">
                <ShieldCheck size={12} className="text-yellow-600/89" />
                Usually replies within a few hours
              </p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} onScroll={handleScroll} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5 md:px-8">
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

            {ready &&
              [WELCOME, ...messages].map((m, i, all) => {
                const mine = m.sender === "customer";
                const showDay =
                  m.createdAt &&
                  (i === 1 ||
                    (all[i - 1].createdAt &&
                      new Date(all[i - 1].createdAt).toDateString() !== new Date(m.createdAt).toDateString()));
                return (
                  <React.Fragment key={m._id}>
                    {showDay && (
                      <div className="flex justify-center py-1">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] text-zinc-500">
                          {dayLabel(m.createdAt)}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm sm:max-w-[70%] ${
                          mine
                            ? "rounded-br-sm bg-yellow-600/89 text-white"
                            : "rounded-bl-sm bg-gray-100 text-neutral-800"
                        }`}
                      >
                        {m.images?.length > 0 && (
                          <div
                            className={`grid gap-1.5 ${m.images.length > 1 ? "grid-cols-2" : "grid-cols-1"} ${
                              m.body || m.share ? "mb-2" : ""
                            }`}
                          >
                            {m.images.map((src) => (
                              <button
                                key={src}
                                type="button"
                                onClick={() => setLightbox(fileUrl(src))}
                                className="block cursor-zoom-in overflow-hidden rounded-lg"
                                aria-label="View photo"
                              >
                                <img
                                  src={fileUrl(src)}
                                  alt="Shared photo"
                                  onLoad={() => stickRef.current && scrollToBottom()}
                                  className="max-h-60 w-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        )}
                        {m.share && (
                          <div className={m.body ? "mb-2" : ""}>
                            <ShareCard share={m.share} />
                          </div>
                        )}
                        {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                        {m.createdAt && (
                          <span className={`mt-1 block text-[10px] ${mine ? "text-white/70" : "text-zinc-500"}`}>
                            {clockTime(m.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
          </div>

          {/* Quick replies */}
          <div className="flex gap-2 overflow-x-auto px-4 pb-3 md:px-8">
            {QUICK_REPLIES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => send({ quickReplyId: item.id })}
                disabled={!ready || sending}
                className="shrink-0 cursor-pointer rounded-full border border-yellow-700/89 px-3 py-1.5 text-xs font-medium text-yellow-700/89 transition-colors hover:bg-yellow-600/89 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {item.label}
              </button>
            ))}
          </div>

          {sendError && (
            <p role="alert" className="px-4 pb-2 text-xs text-red-700 md:px-8">
              {sendError}
            </p>
          )}

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
                        onClick={() => removePhoto(p.id)}
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
                  <ShareCard share={pendingShare} onRemove={() => setPendingShare(null)} />
                </div>
              )}
            </div>
          )}

          {/* Composer */}
          <div className="relative flex items-end gap-2 border-t border-gray-100 px-4 py-3 md:px-8">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />

            <div className="relative">
              <button
                type="button"
                aria-label="Attach"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
                disabled={!ready}
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-gray-50 hover:text-yellow-700/89 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Paperclip size={18} />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div
                    role="menu"
                    className="absolute bottom-full left-0 z-20 mb-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
                  >
                    {[
                      { label: "Photo", icon: ImagePlus, onClick: openPhotoDialog },
                      { label: "My customization", icon: Palette, onClick: () => openPicker("customization") },
                      { label: "My order", icon: Package, onClick: () => openPicker("order") },
                      { label: "Product from catalog", icon: Shirt, onClick: () => openPicker("product") },
                    ].map(({ label, icon: Icon, onClick }) => (
                      <button
                        key={label}
                        type="button"
                        role="menuitem"
                        onClick={onClick}
                        className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm text-neutral-800 transition-colors hover:bg-gray-50"
                      >
                        <Icon size={16} className="text-yellow-700/89" />
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <textarea
              ref={textRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              rows={1}
              maxLength={1000}
              disabled={!ready}
              placeholder={ready ? "Type a message…" : "Log in to send a message"}
              className="max-h-[120px] flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:bg-gray-50"
            />
            <button
              type="button"
              onClick={() => send()}
              disabled={!canSend}
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-yellow-600/89 text-white transition-colors hover:bg-yellow-700/89 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>

          {/* Drop overlay */}
          {dragging && (
            <div className="pointer-events-none absolute inset-3 z-30 flex items-center justify-center rounded-2xl border-2 border-dashed border-yellow-600/89 bg-yellow-50/90">
              <p className="flex items-center gap-2 text-sm font-medium text-yellow-700/89">
                <ImagePlus size={18} /> Drop photos to attach
              </p>
            </div>
          )}
        </section>
      </div>

      {picker && (
        <SharePicker
          initialTab={picker}
          onClose={() => setPicker(null)}
          onPick={(item) => {
            setPendingShare(item);
            setPicker(null);
          }}
        />
      )}
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
};

export default Message;