import { Link } from "react-router-dom";
import { Clock, Package } from "lucide-react";
import { cardClass, fmt, formatDate, orderNo, primaryLink } from "./accountShared";
import { EmptyState, OrderProgress, OrderThumb, Skeleton, StatusPill } from "./atoms";

/**
 * Every order this customer has placed, newest first (the API sorts them).
 * Moved out of the old /profile "Order History" tab.
 */
export default function OrdersPanel({ orders, loading }) {
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
                    {order.items.map((it, idx) => (
                      <li key={idx} className="text-sm font-semibold text-neutral-800">
                        {it.name}
                        <span className="font-normal text-gray-400">
                          {it.size ? ` · ${it.size}` : ""}
                          {it.quantity > 1 ? ` · ×${it.quantity}` : ""}
                        </span>
                      </li>
                    ))}
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

            <OrderProgress status={order.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
