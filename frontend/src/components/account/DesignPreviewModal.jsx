import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Pencil, X } from "lucide-react";
import { assetUrl, chosenOptions, EDITABLE, selectionChip } from "./accountShared";
import { DesignPill } from "./atoms";

/* The enlarged view of one custom design, opened from the Designs section. */
export default function DesignPreviewModal({ design, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!design) return null;

  const editable = EDITABLE.includes(design.status);
  const options = chosenOptions(design.selections);

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
