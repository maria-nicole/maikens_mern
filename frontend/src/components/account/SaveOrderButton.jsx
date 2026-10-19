import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, ExternalLink, Loader2, Share2, X } from "lucide-react";
import { MESSENGER_URL, assetUrl, ghostBtn, orderNo, primaryBtn } from "./accountShared";
import { buildOrderSlip, downloadBlob, slipText } from "./orderSlip";

/* Small button inside an order card vs. the bigger one on the order-placed screen */
const triggerClass = {
  card: "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50",
  page: ghostBtn,
};

/**
 * "Save order" — turns an order into a slip image (orderSlip.js) the customer can send to
 * the boutique on Messenger. A preview opens first, so nothing is saved by accident.
 *
 * On a phone the save goes through the share sheet when the browser supports it, which puts
 * Messenger one tap away; everywhere else it downloads the file.
 */
export default function SaveOrderButton({ order, variant = "card", className = "" }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | working | ready | error
  const [slip, setSlip] = useState(null); // { blob, filename, url, width, height }
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  const urlRef = useRef("");

  // Let go of the preview image when the button goes away
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    []
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const start = async () => {
    setOpen(true);
    setCopied(false);
    setNote("");
    if (slip) {
      setStatus("ready");
      return;
    }

    setStatus("working");
    try {
      const built = await buildOrderSlip(order, { assetUrl });
      const url = URL.createObjectURL(built.blob);
      urlRef.current = url;
      setSlip({ ...built, url });
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setNote(err?.message || "Couldn't create the order image.");
    }
  };

  const saveImage = async () => {
    if (!slip) return;
    const file = new File([slip.blob], slip.filename, { type: "image/png" });

    // Phones: hand it to the share sheet so they can pick Messenger straight away
    let canShare = false;
    try {
      canShare = !!navigator.canShare?.({ files: [file] });
    } catch {
      canShare = false; // an unsupported file type makes canShare throw on some browsers
    }

    if (canShare) {
      try {
        await navigator.share({ files: [file], title: `Order ${orderNo(order)}` });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return; // they closed the sheet — not a failure
      }
    }

    downloadBlob(slip.blob, slip.filename);
    setNote("Saved. Attach it in Messenger and we'll confirm your order.");
  };

  const copyDetails = async () => {
    try {
      await navigator.clipboard.writeText(slipText(order));
      setCopied(true);
      setNote("Order details copied — paste them into the chat.");
      setTimeout(() => setCopied(false), 2600);
    } catch {
      setNote("Your browser wouldn't let us copy. Save the image instead.");
    }
  };

  return (
    <>
      <button type="button" onClick={start} className={`${triggerClass[variant] || triggerClass.card} ${className}`}>
        <Share2 size={variant === "page" ? 15 : 13} />
        Save order
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-neutral-900/60 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Save order ${orderNo(order)}`}
            className="bg-white rounded-lg w-full max-w-md max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
              <div>
                <p className="font-semibold text-neutral-800">Save order {orderNo(order)}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Save the slip and send it to us on Messenger so we can confirm.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={15} />
              </button>
            </div>

            <div className="px-5">
              {status === "working" && (
                <div className="h-72 rounded-md border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-3 text-gray-400">
                  <Loader2 size={22} className="animate-spin text-yellow-600/89" />
                  <p className="text-xs">Putting your order slip together…</p>
                </div>
              )}

              {status === "error" && (
                <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                  {note || "Couldn't create the order image."}
                </p>
              )}

              {status === "ready" && slip && (
                <img
                  src={slip.url}
                  alt={`Order ${orderNo(order)} slip`}
                  className="w-full max-h-[52vh] object-contain rounded-md border border-gray-200 bg-white"
                />
              )}
            </div>

            <div className="p-5 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={saveImage}
                  disabled={status !== "ready"}
                  className={`flex-1 ${primaryBtn}`}
                >
                  <Download size={15} /> Save image
                </button>
                <button
                  type="button"
                  onClick={copyDetails}
                  className="flex-1 inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
                  {copied ? "Copied" : "Copy details"}
                </button>
              </div>

              <a
                href={MESSENGER_URL}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-yellow-700/89 hover:underline"
              >
                Open Messenger to send it <ExternalLink size={13} />
              </a>

              {note && status === "ready" && <p className="text-xs text-gray-500 text-center">{note}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
