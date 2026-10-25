import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Loader2, Pencil, RefreshCw, Sparkles, Upload, X } from "lucide-react";
import axios from "axios";
import { API_URL, assetUrl, chosenOptions, EDITABLE, selectionChip } from "./accountShared";
import { DesignPill } from "./atoms";

/* The enlarged view of one custom design, opened from the Designs section. */
export default function DesignPreviewModal({ design, onClose }) {
  const fileInputRef = useRef(null);
  const [tryOnFile, setTryOnFile] = useState(null);
  const [tryOnPhoto, setTryOnPhoto] = useState("");
  const [tryOnResult, setTryOnResult] = useState("");
  const [tryOnStatus, setTryOnStatus] = useState("idle"); // idle | processing | done | error
  const [tryOnError, setTryOnError] = useState("");
  const [tryOnRemaining, setTryOnRemaining] = useState(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    // Reset try-on state when switching designs
    setTryOnFile(null);
    setTryOnPhoto("");
    setTryOnResult("");
    setTryOnError("");
    setTryOnStatus("idle");
    setTryOnRemaining(null);
  }, [design?._id]);

  if (!design) return null;

  const editable = EDITABLE.includes(design.status);
  const options = chosenOptions(design.selections);

  const goToLogin = () => {
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  };

  const handleUploadClick = () => {
    if (!localStorage.getItem("token")) return goToLogin();
    fileInputRef.current?.click();
  };

  const runTryOn = async (file) => {
    const token = localStorage.getItem("token");
    if (!token) return goToLogin();

    setTryOnError("");
    setTryOnStatus("processing");
    try {
      const body = new FormData();
      body.append("photo", file);
      body.append("customizationId", design._id);

      const { data } = await axios.post(`${API_URL}/api/try-on`, body, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 120000,
      });
      setTryOnResult(data.imageData);
      setTryOnRemaining(typeof data.remaining === "number" ? data.remaining : null);
      setTryOnStatus("done");
    } catch (err) {
      if (err.response?.status === 401) return goToLogin();
      setTryOnError(
        err.code === "ECONNABORTED"
          ? "That took too long. Please try again."
          : err.response?.data?.message || "Couldn't create your preview. Please try again."
      );
      setTryOnStatus("error");
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Please choose a JPG, PNG or WebP photo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("That photo is over 5 MB. Please choose a smaller one.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setTryOnFile(file);
      setTryOnPhoto(reader.result);
      setTryOnResult("");
      runTryOn(file);
    };
    reader.readAsDataURL(file);
  };

  const resetTryOn = () => {
    setTryOnFile(null);
    setTryOnPhoto("");
    setTryOnResult("");
    setTryOnError("");
    setTryOnStatus("idle");
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-neutral-900/60 flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={design.base}
        className="bg-white rounded-lg max-w-sm w-full overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          {design.previewImage ? (
            <img src={assetUrl(design.previewImage)} alt={design.base} className="w-full h-80 object-cover" />
          ) : (
            <div className="w-full h-40 bg-zinc-100 flex items-center justify-center text-sm text-zinc-400">
              No AI preview for this design
            </div>
          )}
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white"
          >
            <X size={14} className="text-gray-600" />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-neutral-800">{design.base}</p>
            <DesignPill status={design.status} />
          </div>

          {options.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-gray-600">
              {options.map(({ key, value }) => {
                const { dot, label } = selectionChip(key, value, design.selections?.colorHex);
                return (
                  <p key={key} className="flex items-center gap-1.5">
                    <span className="text-gray-400 capitalize">{key}:</span>
                    {dot && (
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-black/15"
                        style={{ background: dot }}
                        aria-hidden="true"
                      />
                    )}
                    <span>{label}</span>
                  </p>
                );
              })}
            </div>
          )}

          {design.customerNotes && (
            <p className="mt-3 text-xs text-gray-600">
              <span className="text-gray-400">Your notes:</span> {design.customerNotes}
            </p>
          )}

          {/* AI Virtual Try-On */}
          {design.previewImage && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-yellow-600/89" />
                <p className="text-sm font-semibold text-neutral-800">AI Virtual Try-On</p>
              </div>
              <p className="text-xs text-gray-500 mb-3">Upload a full-body photo to see yourself wearing this design.</p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              {tryOnStatus === "idle" && !tryOnPhoto && (
                <button
                  onClick={handleUploadClick}
                  className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-md py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Upload size={13} /> Upload photo
                </button>
              )}

              {(tryOnPhoto || tryOnStatus === "processing") && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md overflow-hidden bg-gray-50 border border-gray-100">
                      <img src={tryOnPhoto} alt="Your photo" className="w-full h-40 object-cover" />
                    </div>
                    <div className="rounded-md overflow-hidden bg-gray-50 border border-gray-100 relative">
                      {tryOnStatus === "processing" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70">
                          <Loader2 size={18} className="animate-spin text-yellow-600/89" />
                          <span className="text-xs text-gray-600">Generating...</span>
                        </div>
                      )}
                      {tryOnStatus === "done" && tryOnResult ? (
                        <img src={tryOnResult} alt="Try-on result" className="w-full h-40 object-cover" />
                      ) : tryOnStatus !== "processing" ? (
                        <div className="w-full h-40 flex flex-col items-center justify-center text-xs text-gray-400 gap-1">
                          <Camera size={16} />
                          <span>Result</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {tryOnError && <p className="text-xs text-red-600">{tryOnError}</p>}
                  {tryOnStatus === "done" && typeof tryOnRemaining === "number" && (
                    <p className="text-xs text-gray-400">{tryOnRemaining} try-on{tryOnRemaining === 1 ? "" : "s"} left this hour</p>
                  )}
                  <div className="flex gap-2">
                    {tryOnStatus === "done" && (
                      <button
                        onClick={() => tryOnFile && runTryOn(tryOnFile)}
                        className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 rounded-md py-2 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <RefreshCw size={12} /> Try again
                      </button>
                    )}
                    <button
                      onClick={resetTryOn}
                      className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 rounded-md py-2 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <X size={12} /> Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {editable ? (
            <Link
              to={`/customize?edit=${design._id}`}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-yellow-600/89 text-white py-2.5 rounded-md text-sm font-semibold border border-yellow-600/89 hover:bg-white hover:text-yellow-600/89 duration-200"
            >
              <Pencil size={13} /> Continue Editing
            </Link>
          ) : (
            <p className="mt-4 text-xs text-gray-400">
              This design is approved, so it can't be edited. Message the boutique if you need a change.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
