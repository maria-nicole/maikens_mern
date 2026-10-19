import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Package, Star } from "lucide-react";
import { cardClass, fmt, formatDate, orderNo, primaryLink } from "./accountShared";
import { EmptyState, OrderProgress, OrderThumb, Skeleton, StatusPill } from "./atoms";
import SaveOrderButton from "./SaveOrderButton";
import ReviewForm from "../reviews/ReviewForm";

/**
 * Every order this customer has placed, newest first (the API sorts them).
 * Moved out of the old /profile "Order History" tab.
 *
 * Items on an order that has been completed carry a "Write a review" link; the
 * review itself is then readable by anyone on the product page.
 */
export default function OrdersPanel({ orders, loading, reviewable = [], onSaveReview, onRemoveReview, notify }) {
  // { product, name, review } for the item whose form is open
  const [writing, setWriting] = useState(null);

  // Keyed by order + product, so the link sits on the order that earned the right to
  // review rather than on every order that happens to contain the same piece.
  const byPurchase = useMemo(
    () => new Map((reviewable || []).map((row) => [`${row.orderId}:${row.productId}`, row])),
    [reviewable]
  );

  const save = async (values) => {
    await onSaveReview({ reviewId: writing?.review?._id, product: writing?.product, ...values });
    notify?.(writing?.review ? "Your review was updated." : "Thanks — your review is posted.");
    setWriting(null);
  };

  const remove = async () => {
    await onRemoveReview(writing?.review?._id);
    notify?.("Your review was removed.");
    setWriting(null);
  };

  if (loading) {
    return (
      <div className="grid lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-36 rounded-lg" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No orders yet."
        text="Once you check out, you can follow each order here."
        action={
          <Link to="/catalog" className={primaryLink}>
            Browse the Catalog
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">
        {orders.length} {orders.length === 1 ? "order" : "orders"} · newest first
      </p>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        {orders.map((order) => (
          <div key={order._id} className={`${cardClass} p-4 space-y-3`}>
            <div className="flex gap-4 items-start">
              <OrderThumb order={order} className="w-20 h-24 flex-shrink-0" />

              <div className="flex-1 min-w-0">
                {order.items?.length > 0 ? (
                  <ul className="space-y-0.5">
                    {order.items.map((it, idx) => {
                      const bought = it.product ? byPurchase.get(`${order._id}:${it.product}`) : null;
                      return (
                        <li key={idx} className="text-sm font-semibold text-neutral-800">
                          {it.name}
                          <span className="font-normal text-gray-400">
                            {it.size ? ` · ${it.size}` : ""}
                            {it.quantity > 1 ? ` · ×${it.quantity}` : ""}
                          </span>
                          {bought && (
                            <button
                              type="button"
                              onClick={() => setWriting({ product: it.product, name: it.name, review: bought.review })}
                              className="ml-2 inline-flex items-center gap-1 align-middle text-xs font-medium text-yellow-700/89 hover:text-yellow-800"
                            >
                              <Star size={11} className="fill-current" />
                              {bought.review ? "Edit your review" : "Write a review"}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm font-semibold text-neutral-800">{order.item}</p>
                )}

                <p className="text-xs text-gray-400 flex items-center gap-1 mt-1.5">
                  <Clock size={11} /> {formatDate(order.createdAt)} · {orderNo(order)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {[order.fulfillment, order.deliveryMethod].filter(Boolean).join(" · ")}
                </p>
                <p className="text-yellow-700/89 font-semibold text-sm mt-1.5">{fmt(order.total)}</p>
              </div>

              <StatusPill status={order.status} />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <OrderProgress status={order.status} />
              </div>
              <SaveOrderButton order={order} />
            </div>
          </div>
        ))}
      </div>

      {writing && (
        <ReviewForm
          productName={writing.name}
          initial={writing.review}
          onSave={save}
          onDelete={remove}
          onClose={() => setWriting(null)}
        />
      )}
    </div>
  );
}
