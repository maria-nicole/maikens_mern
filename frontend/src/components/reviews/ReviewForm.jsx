import { useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import Stars from "./Stars";
import { ghostBtn, inputClass, primaryBtn } from "../account/accountShared";

/**
 * The one form for both writing a review and editing one, opened from the order card.
 *
 * The parent owns the save call (so it can pick create or edit against the server and
 * then refresh the list), which is why errors are re-thrown and shown here, next to
 * the fields they belong to.
 */
const MAX_TITLE = 80;
const MAX_BODY = 1000;

export default function ReviewForm({ productName, initial = null, onSave, onDelete, onClose }) {
  const editing = !!initial;

  const [rating, setRating] = useState(initial?.rating || 0);
  const [title, setTitle] = useState(initial?.title || "");
  const [body, setBody] = useState(initial?.body || "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return setError("Please choose a rating.");
    if (body.trim().length < 2) return setError("Please write a few words about the product.");

    setSaving(true);
    setError("");
    try {
      await onSave({ rating, title: title.trim(), body: body.trim() });
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save your review. Please try again.");
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    setError("");
    try {
      await onDelete();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't delete your review. Please try again.");
      setSaving(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label={editing ? "Edit your review" : "Write a review"}
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-lg p-6 space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-neutral-800">{editing ? "Edit your review" : "Write a review"}</h3>
            <p className="text-xs text-gray-400">{productName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-neutral-800">Your rating</p>
          <Stars value={rating} size="lg" onChange={setRating} />
        </div>

        <div>
          <label htmlFor="review-title" className="mb-1.5 block text-sm font-medium text-neutral-800">
            Headline <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="review-title"
            type="text"
            value={title}
            maxLength={MAX_TITLE}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sums up your experience"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="review-body" className="mb-1.5 block text-sm font-medium text-neutral-800">
            Your review
          </label>
          <textarea
            id="review-body"
            value={body}
            maxLength={MAX_BODY}
            rows={5}
            onChange={(e) => setBody(e.target.value)}
            placeholder="How did it fit? How was the fabric and the finish?"
            className={`${inputClass} resize-none`}
          />
          <p className="mt-1 text-right text-xs text-gray-400">
            {body.length}/{MAX_BODY}
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* Deleting is asked about once, here, rather than through a browser popup */}
        {editing && confirmDelete ? (
          <div className="space-y-2 rounded-md border border-red-100 bg-red-50 p-3">
            <p className="text-sm text-red-800">Delete this review? This can&apos;t be undone.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmDelete(false)} disabled={saving} className={ghostBtn}>
                Keep it
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md border border-red-700 bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && <Loader2 size={15} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 pt-1">
            {editing ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={saving}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:text-red-800 disabled:opacity-50"
              >
                <Trash2 size={14} /> Delete
              </button>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              <button type="button" onClick={onClose} disabled={saving} className={ghostBtn}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className={`${primaryBtn} px-5 py-2.5`}>
                {saving && <Loader2 size={15} className="animate-spin" />}
                {editing ? "Save changes" : "Post review"}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
