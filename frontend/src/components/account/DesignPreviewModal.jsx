import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Camera, Loader2, Pencil, RefreshCw, Sparkles, Upload, X } from "lucide-react";
import axios from "axios";
import { API_URL, assetUrl, chosenOptions, EDITABLE, selectionChip } from "./accountShared";
import { DesignPill } from "./atoms";

/* The enlarged view of one custom design, opened from the Designs section.
   A saved try-on result lives on the design, so it survives leaving this modal. */
export default function DesignPreviewModal({ design, onClose, onTryOnSaved }) {
  const fileInputRef = useRef(null);
  const lastDesignIdRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const [tryOnFile, setTryOnFile] = useState(null);
  const [tryOnPhoto, setTryOnPhoto] = useState("");
  const [tryOnResult, setTryOnResult] = useState("");
  const [tryOnStatus, setTryOnStatus] = useState("idle"); // idle | processing | done | error
  const [tryOnError, setTryOnError] = useState("");
  const [fileError, setFileError] = useState("");
  const [tryOnRemaining, setTryOnRemaining] = useState(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!design?._id) {
      lastDesignIdRef.current = null;
      return;
    }
    // Only reset when opening a different design (or reopening after a close).
    // A try-on saved while this modal is open shouldn't wipe the photo/result.
    if (lastDesignIdRef.current === design._id) return;
    lastDesignIdRef.current = design._id;

    const saved = design?.tryOnImage ? assetUrl(design.tryOnImage) : "";
    setTryOnFile(null);
    setTryOnPhoto("");
    setTryOnResult(saved);
    setTryOnError("");
    setFileError("");
    setTryOnStatus(saved ? "done" : "idle");
    setTryOnRemaining(null);
  }, [design?._id, design?.tryOnImage]);

  if (!design) return null;

  const editable = EDITABLE.includes(design.status);
  const options = chosenOptions(design.selections);
  const loggedIn = !!localStorage.getItem("token");

  // My Designs uses a ?tab=designs URL, which Login doesn't read from a bare
  // query string. Router state is what the login page actually understands.
  const goToLogin = () => navigate("/login", { state: { from: location } });

  const runTryOn = async (file) => {
    if (!loggedIn) return goToLogin();

    setTryOnError("");
    setFileError("");
    setTryOnStatus("processing");
    try {
      const body = new FormData();
      body.append("photo", file);
      body.append("customizationId", design._id);

      const { data } = await axios.post(`${API_URL}/api/try-on`, body, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        timeout: 120000,
      });
      const savedUrl = data.imageUrl ? assetUrl(data.imageUrl) : "";
      setTryOnResult(savedUrl || data.imageData);
      setTryOnRemaining(typeof data.remaining === "number" ? data.remaining : null);
      setTryOnStatus("done");
      if (savedUrl) onTryOnSaved?.(design._id, data.imageUrl);
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
      setFileError("Please choose a JPG, PNG or WebP photo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError("That photo is over 5 MB. Please choose a smaller one.");
      return;
    }
    setFileError("");
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
    const saved = design.tryOnImage ? assetUrl(design.tryOnImage) : "";
    setTryOnFile(null);
    setTryOnPhoto("");
    setTryOnResult(saved);
    setTryOnError("");
    setFileError("");
    setTryOnStatus(saved ? "done" : "idle");
  };

  const inputId = `tryon-photo-${design._id}`;
  const showTryOnPanel = !!(tryOnPhoto || tryOnResult || tryOnStatus === "processing");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-900/60 p-4 sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={design.base}
        className="relative w-full max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close preview"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm hover:bg-white"
        >
          <X size={15} />
        </button>

        <div className="grid md:grid-cols-[260px_1fr]">
          {/* Design preview — keep the 3:4 shape instead of cropping it to a banner */}
          <div className="border-b border-gray-100 bg-zinc-50 p-4 md:border-b-0 md:border-r">
            <div className="aspect-[3/4] overflow-hidden rounded-xl border border-gray-100 bg-white">
              {design.previewImage ? (
                <img
                  src={assetUrl(design.previewImage)}
                  alt={design.base}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-400">
                  <Sparkles size={22} />
                  <span className="text-xs text-center px-4">No AI preview for this design</span>
                </div>
              )}
            </div>
            <p className="mt-2 text-center text-[11px] text-gray-400">AI design preview</p>
          </div>

          <div className="min-w-0 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 pr-8">
              <p className="font-semibold text-neutral-800">{design.base}</p>
              <DesignPill status={design.status} />
            </div>

            {options.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                {options.map(({ key, value }) => {
                  const { dot, label } = selectionChip(key, value, design.selections?.colorHex);
                  return (
                    <p key={key} className="flex items-center gap-1.5">
                      <span className="capitalize text-gray-400">{key}:</span>
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

            {/* Virtual try-on */}
            <div className="mt-5 border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-yellow-600/89" />
                <p className="text-sm font-semibold text-neutral-800">Virtual Try-On</p>
                {tryOnStatus === "done" && !tryOnFile && <span className="text-[11px] text-green-700">Saved</span>}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Upload a full-body photo to see yourself wearing this design. Your result is saved here.
              </p>

              <input
                id={inputId}
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              {!design.previewImage && !tryOnResult ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                  This design has no AI preview yet, so there is nothing to try on.{" "}
                  {editable && (
                    <Link to={`/customize?edit=${design._id}`} className="font-semibold underline">
                      Generate one by continuing the design.
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  {tryOnStatus !== "processing" && !showTryOnPanel && (
                    <label
                      htmlFor={inputId}
                      onClick={(e) => {
                        if (!loggedIn) {
                          e.preventDefault();
                          goToLogin();
                        }
                      }}
                      className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Upload size={14} /> {tryOnStatus === "error" ? "Choose another photo" : "Upload photo"}
                    </label>
                  )}
                  {fileError && <p className="mt-2 text-xs text-red-600">{fileError}</p>}

                  {showTryOnPanel && (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <figure className="min-w-0">
                          <div className="aspect-[3/4] overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                            {tryOnPhoto ? (
                              <img src={tryOnPhoto} alt="Your photo" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full flex-col items-center justify-center gap-1 text-gray-400">
                                <Camera size={17} />
                                <span className="text-xs">No photo</span>
                              </div>
                            )}
                          </div>
                          <figcaption className="mt-1 text-center text-[11px] text-gray-400">Your photo</figcaption>
                        </figure>
                        <figure className="min-w-0">
                          <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                            {tryOnResult && (
                              <img src={tryOnResult} alt="Try-on result" className="h-full w-full object-cover" />
                            )}
                            {tryOnStatus === "processing" && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/75">
                                <Loader2 size={20} className="animate-spin text-yellow-600/89" />
                                <span className="text-xs text-gray-600">Generating...</span>
                              </div>
                            )}
                            {!tryOnResult && tryOnStatus !== "processing" && (
                              <div className="flex h-full flex-col items-center justify-center gap-1 text-gray-400">
                                <Sparkles size={17} />
                                <span className="text-xs">Result</span>
                              </div>
                            )}
                          </div>
                          <figcaption className="mt-1 text-center text-[11px] text-gray-400">Your try-on</figcaption>
                        </figure>
                      </div>

                      {tryOnError && <p className="text-xs text-red-600">{tryOnError}</p>}
                      {typeof tryOnRemaining === "number" && (
                        <p className="text-xs text-gray-400">
                          {tryOnRemaining} try-on{tryOnRemaining === 1 ? "" : "s"} left this hour
                        </p>
                      )}

                      <div className="flex gap-2">
                        {tryOnFile && tryOnStatus !== "processing" && (
                          <button
                            onClick={() => runTryOn(tryOnFile)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-gray-200 py-2 text-xs text-gray-700 hover:bg-gray-50"
                          >
                            <RefreshCw size={12} /> Try again
                          </button>
                        )}
                        <button
                          onClick={resetTryOn}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-gray-200 py-2 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          <X size={12} /> Clear
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {editable ? (
              <Link
                to={`/customize?edit=${design._id}`}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-md border border-yellow-600/89 bg-yellow-600/89 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-yellow-600/89"
              >
                <Pencil size={13} /> Continue Editing
              </Link>
            ) : (
              <p className="mt-5 text-xs text-gray-400">
                This design is approved, so it can&apos;t be edited. Message the boutique if you need a change.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
