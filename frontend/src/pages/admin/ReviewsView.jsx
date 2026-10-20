import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, RefreshCw, Trash2 } from "lucide-react";
import { api, errMsg, assetUrl, formatDate } from "./adminLib";
import { SectionHeader, GhostButton, Segmented, EmptyState, Spinner, ErrorNote, ConfirmDialog } from "./ui";
import Stars from "../../components/reviews/Stars";

/**
 * Owner's view of every product review.
 *
 * Reviews publish the moment a customer posts one, so the owner's job here is to
 * curate afterwards: hide a review to drop it from the product page and its average
 * (reversible), or delete it for good.
 */
const FILTERS = [
    { value: "all", label: "All" },
    { value: "visible", label: "Showing" },
    { value: "hidden", label: "Hidden" },
];

export default function ReviewsView({ notify }) {
    const [data, setData] = useState(null); // { reviews, total, page, pages }
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [busyId, setBusyId] = useState(null);
    const [confirm, setConfirm] = useState(null); // the review about to be deleted

    const load = useCallback(async () => {
        try {
            const { data: res } = await api.get("/reviews/admin/all", {
                params: { page, hidden: filter === "all" ? undefined : filter === "hidden" },
            });
            setData(res);
            setError("");
        } catch (err) {
            setError(errMsg(err));
        }
    }, [page, filter]);

    useEffect(() => {
        load();
    }, [load]);

    // Swaps the row in place, or drops it when the active filter no longer matches
    // (hiding while "Showing" is selected, say) — so the list never contradicts itself.
    const toggleHidden = async (review) => {
        setBusyId(review._id);
        try {
            const { data: updated } = await api.patch(`/reviews/admin/${review._id}`, { hidden: !review.hidden });
            setData((prev) => {
                if (!prev) return prev;
                const stillMatches = filter === "all" || (filter === "hidden") === updated.hidden;
                return {
                    ...prev,
                    reviews: stillMatches
                        ? prev.reviews.map((r) => (r._id === updated._id ? updated : r))
                        : prev.reviews.filter((r) => r._id !== updated._id),
                    total: Math.max(0, prev.total + (stillMatches ? 0 : -1)),
                };
            });
            notify("success", updated.hidden ? "Review hidden from the product page." : "Review is showing again.");
        } catch (err) {
            notify("error", errMsg(err));
        } finally {
            setBusyId(null);
        }
    };

    const destroy = async () => {
        setBusyId(confirm._id);
        try {
            await api.delete(`/reviews/admin/${confirm._id}`);
            setData((prev) =>
                prev ? { ...prev, reviews: prev.reviews.filter((r) => r._id !== confirm._id), total: Math.max(0, prev.total - 1) } : prev
            );
            notify("success", "Review deleted.");
        } catch (err) {
            notify("error", errMsg(err));
        } finally {
            setBusyId(null);
            setConfirm(null);
        }
    };

    const chooseFilter = (value) => {
        setFilter(value);
        setPage(1);
    };

    const reviews = data?.reviews || [];

    return (
        <div>
            <SectionHeader
                eyebrow="Customer feedback"
                title="Product reviews"
                action={<GhostButton icon={RefreshCw} onClick={load}>Refresh</GhostButton>}
            />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <Segmented label="Show" value={filter} options={FILTERS} onChange={chooseFilter} />
                {data && (
                    <p className="text-xs text-[#8B8072]">
                        {data.total} {data.total === 1 ? "review" : "reviews"}
                    </p>
                )}
            </div>

            <ErrorNote onRetry={load}>{error}</ErrorNote>

            <div className="overflow-x-auto rounded-2xl border border-[#E3DACB] bg-white">
                {data === null && !error ? (
                    <Spinner label="Loading reviews…" />
                ) : reviews.length === 0 ? (
                    <EmptyState
                        title="No reviews here."
                        hint={filter === "hidden" ? "Nothing has been hidden." : "Customer reviews appear as soon as an order is completed."}
                    />
                ) : (
                    <table className="w-full min-w-[760px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-[#EFE9E3] text-xs uppercase tracking-wide text-[#9C8C74]">
                                <th className="px-5 py-3 font-medium">Item</th>
                                <th className="px-5 py-3 font-medium">Customer</th>
                                <th className="px-5 py-3 font-medium">Rating</th>
                                <th className="px-5 py-3 font-medium">Review</th>
                                <th className="px-5 py-3 font-medium">Posted</th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {reviews.map((review) => (
                                <tr key={review._id} className={`border-b border-[#F3EEE4] last:border-0 hover:bg-[#FBF8F3] ${busyId === review._id ? "opacity-60" : ""}`}>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            {review.product?.images?.[0] ? (
                                                <img
                                                    src={assetUrl(review.product.images[0])}
                                                    alt=""
                                                    className="h-10 w-8 flex-shrink-0 rounded object-cover"
                                                />
                                            ) : (
                                                <div className="h-10 w-8 flex-shrink-0 rounded bg-[#EFE9E3]" />
                                            )}
                                            <span className="font-medium text-[#241F1A]">
                                                {review.product?.name || <span className="text-[#8B8072]">Removed item</span>}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-[#4A4136]">{review.authorName || "—"}</td>
                                    <td className="px-5 py-3">
                                        <Stars value={review.rating} size="sm" label={`${review.rating} out of 5 stars`} />
                                    </td>
                                    <td className="max-w-xs px-5 py-3 text-[#4A4136]">
                                        {review.title && <p className="font-medium text-[#241F1A]">{review.title}</p>}
                                        <p className="whitespace-pre-line text-xs text-[#6B6153]">{review.body}</p>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-3 text-xs text-[#8B8072]">{formatDate(review.createdAt)}</td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center justify-end gap-2">
                                            {review.hidden ? (
                                                <>
                                                    <span className="whitespace-nowrap rounded-full border border-dashed border-[#8B8072]/50 bg-[#EFE9E3] px-2.5 py-1 text-xs font-medium text-[#6B6153]">
                                                        Hidden
                                                    </span>
                                                    <GhostButton icon={Eye} onClick={() => toggleHidden(review)}>Show</GhostButton>
                                                </>
                                            ) : (
                                                <GhostButton icon={EyeOff} onClick={() => toggleHidden(review)}>Hide</GhostButton>
                                            )}
                                            <GhostButton icon={Trash2} danger onClick={() => setConfirm(review)}>Delete</GhostButton>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {data && data.pages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                    <GhostButton disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</GhostButton>
                    <p className="text-xs text-[#8B8072]">Page {data.page} of {data.pages}</p>
                    <GhostButton disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</GhostButton>
                </div>
            )}

            {confirm && (
                <ConfirmDialog
                    title="Delete this review?"
                    message={`${confirm.authorName || "This customer"}'s review of ${confirm.product?.name || "a removed item"} will be gone for good. To take it off the product page without losing it, hide it instead.`}
                    confirmLabel="Delete review"
                    danger
                    loading={busyId === confirm._id}
                    onConfirm={destroy}
                    onClose={() => setConfirm(null)}
                />
            )}
        </div>
    );
}
