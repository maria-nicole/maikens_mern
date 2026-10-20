import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ImagePlus, ShieldCheck } from "lucide-react";

import {
  MAX_PHOTOS,
  MAX_PHOTO_BYTES,
  POLL_MS,
  api,
  errMsg,
  getShopStatus,
  mergeMessages,
  productToShare,
} from "../components/message/messageConfig";
import { NAVBAR_PT } from "../components/account/accountShared";
import ChatSidebar from "../components/message/ChatSidebar";
import MessageThread from "../components/message/MessageThread";
import QuickReplies from "../components/message/QuickReplies";
import Composer from "../components/message/Composer";
import SharePicker from "../components/message/SharePicker";
import Lightbox from "../components/message/Lightbox";

/**
 * Chat with the boutique: the state and the API calls live here.
 * Everything you see lives in src/components/message/.
 */
export default function Message() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [photos, setPhotos] = useState([]);
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
  const scrollRef = useRef(null);
  const stickRef = useRef(true); // keep the view pinned to the newest message
  const lastIdRef = useRef(null); // id of the newest message we already have
  const photosRef = useRef(photos);

  const ready = status === "ready";
  const open = getShopStatus(now);

  // keep the polling closure and the unmount cleanup reading fresh values
  useEffect(() => {
    lastIdRef.current = messages.length ? messages[messages.length - 1]._id : null;
  }, [messages]);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

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

  // "/message?product=<id>" (from a product page) or
  // "/message?share=customization|order&id=<id>" (from "Message the boutique")
  // opens the chat with that item ready to send.
  useEffect(() => {
    const productId = searchParams.get("product");
    const kind = searchParams.get("share");
    const id = searchParams.get("id");
    if (!ready || (!productId && !(kind && id))) return;

    let ignore = false;
    const forget = () => {
      if (!ignore) setSearchParams({}, { replace: true });
    };

    if (productId) {
      api
        .get(`/products/${productId}`)
        .then(({ data }) => {
          if (!ignore) setPendingShare(productToShare(data));
        })
        .catch(() => {})
        .finally(forget);
    } else {
      api
        .get("/messages/shareables")
        .then(({ data }) => {
          const pool = kind === "order" ? data.orders : data.customizations;
          const item = (pool || []).find((x) => String(x.id) === String(id));
          if (item && !ignore) {
            setPendingShare({
              kind: kind === "order" ? "order" : "customization",
              refId: item.id,
              title: item.title,
              subtitle: item.subtitle,
              detail: "",
              image: item.image || "",
            });
          }
        })
        .catch(() => {})
        .finally(forget);
    }

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

    const next = fits.slice(0, room).map((f) => ({
      id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2)}`,
      file: f,
      url: URL.createObjectURL(f),
    }));

    if (next.length) setPhotos((prev) => [...prev, ...next]);
    setSendError(problem);
  };

  const removePhoto = (id) => {
    setPhotos((prev) => {
      const gone = prev.find((p) => p.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return prev.filter((p) => p.id !== id);
    });
  };

  const removeShare = () => setPendingShare(null);

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

  const openPhotoDialog = () => {
    setMenuOpen(false);
    fileRef.current?.click();
  };

  const openPicker = (tab) => {
    setMenuOpen(false);
    setPicker(tab);
  };

  /* ---- sending ---- */
  const send = async ({ quickReplyId } = {}) => {
    if (!ready || sending) return;

    const body = draft.trim();
    const form = new FormData();
    if (quickReplyId) {
      form.append("quickReplyId", quickReplyId);
    } else {
      if (!body && !photos.length && !pendingShare) return;
      if (body) form.append("body", body);
      photos.forEach((p) => form.append("images", p.file));
      if (pendingShare) form.append("share", JSON.stringify({ kind: pendingShare.kind, refId: pendingShare.refId }));
    }

    setSending(true);
    setSendError("");
    try {
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

  const canSend = ready && !sending && (!!draft.trim() || photos.length > 0 || !!pendingShare);

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
    <div className={`min-h-screen bg-white ${NAVBAR_PT}`}>
      <div className="grid h-[calc(100dvh-5rem)] grid-cols-1 lg:grid-cols-[320px_1fr]">
        <ChatSidebar open={open} ready={ready} onPhoto={openPhotoDialog} onPicker={openPicker} />

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

          <MessageThread
            status={status}
            messages={messages}
            scrollRef={scrollRef}
            onScroll={handleScroll}
            onZoom={setLightbox}
            onImageLoad={() => stickRef.current && scrollToBottom()}
          />

          <QuickReplies ready={ready} sending={sending} onQuickReply={(id) => send({ quickReplyId: id })} />

          {sendError && (
            <p role="alert" className="px-4 pb-2 text-xs text-red-700 md:px-8">
              {sendError}
            </p>
          )}

          <Composer
            fileRef={fileRef}
            ready={ready}
            draft={draft}
            onDraft={setDraft}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFiles={addFiles}
            photos={photos}
            onRemovePhoto={removePhoto}
            pendingShare={pendingShare}
            onRemoveShare={removeShare}
            sending={sending}
            canSend={canSend}
            onSend={() => send()}
            menuOpen={menuOpen}
            onMenuToggle={() => setMenuOpen((v) => !v)}
            onPhoto={openPhotoDialog}
            onPicker={openPicker}
          />

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
}
