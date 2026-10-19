import { useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, MessageCircle, Plus, Sparkles } from "lucide-react";
import { cardClass, chosenOptions, EDITABLE, formatDate, primaryLink, selectionChip } from "./accountShared";
import { DesignPill, DesignThumb, EmptyState, Skeleton } from "./atoms";
import DesignPreviewModal from "./DesignPreviewModal";

/**
 * Every custom design the customer has sent to the boutique.
 * Moved out of the old /favorites "My Customizations" tab.
 */
export default function DesignsPanel({ designs, loading, onRemove }) {
  const [preview, setPreview] = useState(null);

  const confirmRemove = (design) => {
    if (!window.confirm(`Delete "${design.base}"? This can't be undone.`)) return;
    onRemove(design).then((ok) => {
      if (ok) setPreview(null);
    });
  };

  if (loading) {
    return (
      <div className="grid lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    );
  }

  if (designs.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No custom designs yet."
        text="Design your own gown or barong and preview it with AI before sending it to the boutique."
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
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-400">
          {designs.length} {designs.length === 1 ? "design" : "designs"}
        </p>
        <Link
          to="/customize"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-yellow-600/89 text-white text-xs font-semibold rounded-md border border-yellow-600/89 hover:bg-white hover:text-yellow-600/89 duration-200"
        >
          <Plus size={13} /> New Design
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {designs.map((design) => {
          const editable = EDITABLE.includes(design.status);
          const options = chosenOptions(design.selections);
          return (
            <div key={design._id} className={`${cardClass} p-4 flex gap-4`}>
              <button
                type="button"
                onClick={() => setPreview(design)}
                className="flex-shrink-0 cursor-pointer"
                aria-label={`Preview ${design.base}`}
              >
                <DesignThumb design={design} className="w-24 h-32" iconSize={18} />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-gray-800 text-sm">{design.base}</p>
                  <DesignPill status={design.status} />
                </div>

                {options.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {options.map(({ key, value }) => {
                      const { dot, label } = selectionChip(key, value, design.selections?.colorHex);
                      return (
                        <span
                          key={key}
                          className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5"
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
                )}

                <p className="text-xs text-gray-400 mt-1.5">
                  Last edited {formatDate(design.updatedAt || design.createdAt)}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                  {editable ? (
                    <>
                      <Link
                        to={`/customize?edit=${design._id}`}
                        className="text-xs font-medium text-yellow-700/89 flex items-center gap-1 hover:underline"
                      >
                        <Pencil size={11} /> Continue Editing
                      </Link>
                      <button
                        type="button"
                        onClick={() => confirmRemove(design)}
                        className="text-xs font-medium text-gray-500 flex items-center gap-1 hover:text-red-500"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <Link
                      to={`/message?share=customization&id=${design._id}`}
                      className="text-xs font-medium text-gray-600 flex items-center gap-1 hover:underline"
                    >
                      <MessageCircle size={11} /> Message the boutique
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <DesignPreviewModal design={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
