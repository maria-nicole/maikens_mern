import { useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Pencil, MessageCircle, Plus, Sparkles } from "lucide-react";
import { cardClass, chosenOptions, EDITABLE, formatDate, primaryLink, selectionChip } from "./accountShared";
import { DesignPill, DesignThumb, EmptyState, Skeleton } from "./atoms";
import DesignPreviewModal from "./DesignPreviewModal";

/**
 * Every custom design the customer has sent to the boutique.
 * The card opens a preview with the saved virtual try-on inside it.
 */
export default function DesignsPanel({ designs, loading, onRemove, onTryOnSaved }) {
  const [previewId, setPreviewId] = useState(null);
  // Derive the open design from the list so a newly saved try-on shows up in
  // the modal immediately instead of leaving a stale copy on screen.
  const preview = designs.find((d) => d._id === previewId) || null;

  const confirmRemove = (design) => {
    if (!window.confirm(`Delete "${design.base}"? This can't be undone.`)) return;
    onRemove(design).then((ok) => {
      if (ok) setPreviewId(null);
    });
  };

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-44 rounded-lg" />
        ))}
      </div>
    );
  }

  if (designs.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No custom designs yet."
        text="Design your own gown or barong, preview it with AI, and try it on virtually before sending it to the boutique."
        action={
          <Link to="/customize" className={primaryLink}>
            <Plus size={14} /> Start Customizing
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-400">
          {designs.length} {designs.length === 1 ? "design" : "designs"}
        </p>
        <Link
          to="/customize"
          className="inline-flex items-center gap-1.5 rounded-md border border-yellow-600/89 bg-yellow-600/89 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white hover:text-yellow-600/89"
        >
          <Plus size={13} /> New Design
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {designs.map((design) => {
          const editable = EDITABLE.includes(design.status);
          const options = chosenOptions(design.selections);
          return (
            <article key={design._id} className={`${cardClass} p-4 transition-shadow hover:shadow-sm`}>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setPreviewId(design._id)}
                  className="relative flex-shrink-0 cursor-pointer group"
                  aria-label={`Preview ${design.base}`}
                >
                  <DesignThumb design={design} className="h-36 w-28 sm:h-40 sm:w-32" iconSize={20} />
                  <span className="absolute inset-0 flex items-end justify-center rounded-md bg-black/0 pb-2 text-[11px] font-medium text-white opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                    View
                  </span>
                  {design.tryOnImage && (
                    <span className="absolute -right-1.5 -top-1.5 flex items-center gap-1 rounded-full border border-yellow-600/30 bg-white px-2 py-0.5 text-[10px] font-semibold text-yellow-700 shadow-sm">
                      <Camera size={10} /> Try-on ready
                    </span>
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800">{design.base}</p>
                    <DesignPill status={design.status} />
                  </div>

                  {options.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {options.map(({ key, value }) => {
                        const { dot, label } = selectionChip(key, value, design.selections?.colorHex);
                        return (
                          <span
                            key={key}
                            className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600"
                          >
                            {dot && (
                              <span
                                className="h-3 w-3 rounded-full border border-black/15"
                                style={{ background: dot }}
                                aria-hidden="true"
                              />
                            )}
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-gray-400">No design choices saved</p>
                  )}

                  <p className="mt-1.5 text-xs text-gray-400">
                    Last edited {formatDate(design.updatedAt || design.createdAt)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setPreviewId(design._id)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700/89 hover:underline"
                >
                  <Camera size={12} /> {design.tryOnImage ? "View try-on" : "Try it on"}
                </button>
                {editable ? (
                  <>
                    <Link
                      to={`/customize?edit=${design._id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:underline"
                    >
                      <Pencil size={11} /> Continue Editing
                    </Link>
                    <button
                      type="button"
                      onClick={() => confirmRemove(design)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-500"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <Link
                    to={`/message?share=customization&id=${design._id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:underline"
                  >
                    <MessageCircle size={11} /> Message the boutique
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <DesignPreviewModal
        design={preview}
        onClose={() => setPreviewId(null)}
        onTryOnSaved={onTryOnSaved}
      />
    </div>
  );
}
