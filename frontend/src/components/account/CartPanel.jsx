import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import {
  API_URL,
  asArray,
  assetUrl,
  announceCart,
  authHeader,
  cardClass,
  DELIVERY_FEE,
  EMPTY_CART,
  fmt,
  FULFILLMENT_OPTIONS,
  inputClass,
  MAX_ADDRESS,
  orderNo,
  PAYMENT_OPTIONS,
  PH_PHONE,
  primaryBtn,
  primaryLink,
  sectionHref,
  today,
} from "./accountShared";
import { EmptyState } from "./atoms";
import SaveOrderButton from "./SaveOrderButton";

const CHECKOUT_STEPS = [
  { key: "cart", label: "Cart" },
  { key: "checkout", label: "Delivery & Payment" },
];

/* The little 1 → 2 progress line that makes the two steps of checkout obvious. */
function Steps({ step }) {
  const at = CHECKOUT_STEPS.findIndex((s) => s.key === step);
  return (
    <ol className="flex items-center gap-2 text-xs font-medium">
      {CHECKOUT_STEPS.map((s, i) => (
        <li key={s.key} className="flex items-center gap-2">
          {i > 0 && <ChevronRight size={12} className="text-gray-300" />}
          <span className={i <= at ? "text-yellow-700/89" : "text-gray-400"}>
            {i + 1} · {s.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * The cart and the checkout, now two steps of one section instead of two tabs.
 * The line items and their quantities come from useAccountData, so the cart
 * count in the side nav stays in step.
 */
export default function CartPanel({ cart, profile, busyId, changeQty, removeItem, setCart, reloadCart, reloadOrders }) {
  const [step, setStep] = useState("cart");
  const [fulfillment, setFulfillment] = useState("Delivery");
  const [payment, setPayment] = useState("GCash");
  const [details, setDetails] = useState({ address: "", pickupDate: "", gcash: "" });
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(null); // the order the server created

  const items = asArray(cart?.items);
  const blocked = cart?.hasIssues || items.length === 0;
  const shipping = fulfillment === "Delivery" ? DELIVERY_FEE : 0;
  const total = (cart?.subtotal || 0) + shipping;

  const startCheckout = () => {
    // Pre-fill from the saved profile (a nice-to-have, never blocks checking out)
    setDetails((prev) => ({
      ...prev,
      address: prev.address || profile?.address || "",
      gcash: prev.gcash || profile?.phone || "",
    }));
    setError("");
    setStep("checkout");
  };

  const handleDetail = (e) => {
    setDetails((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const placeOrder = async () => {
    if (cart?.hasIssues) return setError("Some items need your attention. Change their quantity or remove them first.");
    if (fulfillment === "Delivery" && !details.address.trim()) return setError("Please enter your delivery address.");
    if (fulfillment === "Pick-up" && !details.pickupDate) return setError("Please choose a pick-up date.");
    if (payment === "GCash" && !PH_PHONE.test(details.gcash.replace(/\s/g, ""))) {
      return setError("Please enter a valid GCash number (e.g. 09XX XXX XXXX).");
    }

    setError("");
    setPlacing(true);
    try {
      const { data } = await axios.post(
        `${API_URL}/api/orders/checkout`,
        {
          deliveryMethod: fulfillment,
          address: details.address.trim(),
          pickupDate: details.pickupDate,
          paymentMethod: payment,
          gcashNumber: details.gcash.replace(/\s/g, ""),
        },
        { headers: authHeader() }
      );
      setPlaced(data);
      setCart(EMPTY_CART);
      announceCart(EMPTY_CART);
      reloadOrders?.().catch(() => {});
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't place your order. Please try again.");
      // Stock may have changed while they were checking out, so show the latest cart
      reloadCart?.().catch(() => {});
    } finally {
      setPlacing(false);
    }
  };

  /* ── Order placed ── */
  if (placed) {
    return (
      <div className="text-center py-20">
        <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
        <p className="font-semibold text-gray-800 text-lg">Order placed!</p>
        <p className="text-sm text-gray-500 mt-1">
          Order <span className="font-medium text-gray-700">{orderNo(placed)}</span> · {fmt(placed.total)}
        </p>
        <p className="text-sm text-gray-400 mt-1">You can follow its progress from the Orders section.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to={sectionHref("orders")} className={primaryLink}>
            Track My Order
          </Link>
          <Link
            to="/catalog"
            className="px-6 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            Keep Shopping
          </Link>
          <SaveOrderButton order={placed} variant="page" />
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Save your order slip and send it to us on Messenger to confirm your order.
        </p>
      </div>
    );
  }

  /* ── Empty cart ── */
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Your cart is empty."
        text="Add a gown or barong and it will show up here."
        action={
          <Link to="/catalog" className={primaryLink}>
            Browse the Catalog
          </Link>
        }
      />
    );
  }

  const summary = (
    <div className={`${cardClass} p-5 lg:sticky lg:top-24`}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Order Summary</p>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item._id} className="flex justify-between gap-3 text-sm">
            <span className="text-gray-600">
              {item.name}
              {item.size && <span className="text-gray-400"> ({item.size})</span>} <span className="text-gray-400">×{item.quantity}</span>
            </span>
            <span className="text-gray-800 font-medium whitespace-nowrap">{fmt(item.lineTotal)}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 mt-3 pt-3 space-y-1.5">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Subtotal</span>
          <span>{fmt(cart.subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>Shipping</span>
          <span>{step === "cart" ? "Calculated at checkout" : shipping === 0 ? "Free (Pick-up)" : fmt(shipping)}</span>
        </div>
        <div className="flex justify-between font-semibold text-gray-800 pt-2 border-t border-gray-100">
          <span>Total</span>
          <span className="text-yellow-700/89 text-base">{fmt(step === "cart" ? cart.subtotal : total)}</span>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 text-xs">
          {error}
        </p>
      )}

      {step === "cart" ? (
        <>
          <button type="button" onClick={startCheckout} disabled={blocked} className={`w-full py-3 mt-4 ${primaryBtn}`}>
            Proceed to Checkout <ChevronRight size={15} />
          </button>
          {blocked && (
            <p className="text-xs text-amber-700 mt-2">Fix the highlighted items to continue.</p>
          )}
        </>
      ) : (
        <>
          <button type="button" onClick={placeOrder} disabled={placing || blocked} className={`w-full py-3 mt-4 ${primaryBtn}`}>
            {placing && <Loader2 size={15} className="animate-spin" />}
            {placing ? "Placing order…" : `Place Order — ${fmt(total)}`}
          </button>
          <button
            type="button"
            onClick={() => setStep("cart")}
            className="w-full flex items-center justify-center gap-1 mt-2 py-2 text-xs text-gray-500 hover:text-gray-800"
          >
            <ChevronLeft size={13} /> Back to cart
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Step line, so it is always clear where you are */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Steps step={step} />
        <p className="text-xs text-gray-400">
          {items.length} {items.length === 1 ? "item" : "items"} in your cart
        </p>
      </div>

      {cart.hasIssues && (
        <p role="alert" className="text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-sm">
          Some items need your attention. Change their quantity or remove them to continue.
        </p>
      )}

      {step === "cart" ? (
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item._id}
                className={`${cardClass} p-4 flex gap-4 ${item.issue ? "border-amber-200" : ""} ${
                  busyId === item._id ? "opacity-60" : ""
                }`}
              >
                <Link to={`/product/${item.productId}`} className="flex-shrink-0">
                  {item.image ? (
                    <img
                      src={assetUrl(item.image)}
                      alt={item.name}
                      className="w-20 h-24 sm:w-24 sm:h-28 object-cover rounded-md border border-gray-100"
                    />
                  ) : (
                    <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-md border border-gray-100 bg-zinc-100 flex items-center justify-center text-[11px] text-zinc-400">
                      No photo
                    </div>
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-neutral-800">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {[item.category, item.size].filter(Boolean).join(" · ")}
                  </p>
                  {item.issue && <p className="text-xs text-amber-700 mt-1">{item.issue}</p>}
                  <p className="text-yellow-700/89 font-semibold text-sm mt-1.5">{fmt(item.lineTotal)}</p>

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => changeQty(item, -1)}
                      disabled={busyId === item._id || item.quantity <= 1}
                      aria-label={`Decrease quantity of ${item.name}`}
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600 disabled:opacity-40"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-sm w-6 text-center font-medium">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => changeQty(item, 1)}
                      disabled={busyId === item._id || item.quantity >= item.maxQty}
                      aria-label={`Increase quantity of ${item.name}`}
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600 disabled:opacity-40"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item)}
                  disabled={busyId === item._id}
                  aria-label={`Remove ${item.name}`}
                  className="self-start text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {summary}
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-4">
            <div className={`${cardClass} p-5`}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Delivery</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {FULFILLMENT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = fulfillment === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        setFulfillment(option.key);
                        setError("");
                      }}
                      className={`flex items-start gap-3 p-3 rounded-md border text-left transition-colors ${
                        active ? "border-yellow-600/89 bg-rose-50" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Icon size={16} className={active ? "text-yellow-700/89 mt-0.5" : "text-gray-400 mt-0.5"} />
                      <span>
                        <span className={`block text-sm font-medium ${active ? "text-yellow-700/89" : "text-gray-700"}`}>
                          {option.label}
                        </span>
                        <span className="block text-xs text-gray-400">{option.sub}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {fulfillment === "Delivery" && (
                <input
                  name="address"
                  value={details.address}
                  onChange={handleDetail}
                  placeholder="Delivery address"
                  autoComplete="street-address"
                  maxLength={MAX_ADDRESS}
                  className={`mt-3 ${inputClass}`}
                />
              )}
              {fulfillment === "Pick-up" && (
                <input
                  type="date"
                  name="pickupDate"
                  min={today}
                  value={details.pickupDate}
                  onChange={handleDetail}
                  className={`mt-3 ${inputClass}`}
                />
              )}
            </div>

            <div className={`${cardClass} p-5`}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Payment Method</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {PAYMENT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = payment === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setPayment(option.key)}
                      className={`flex items-start gap-3 p-3 rounded-md border text-left transition-colors ${
                        active ? "border-yellow-600/89 bg-rose-50" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Icon size={16} className={active ? "text-yellow-700/89 mt-0.5" : "text-gray-400 mt-0.5"} />
                      <span>
                        <span className={`block text-sm font-medium ${active ? "text-yellow-700/89" : "text-gray-700"}`}>
                          {option.label}
                        </span>
                        <span className="block text-xs text-gray-400">{option.sub}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {payment === "GCash" && (
                <>
                  <input
                    name="gcash"
                    value={details.gcash}
                    onChange={handleDetail}
                    placeholder="GCash number (e.g. 09XX XXX XXXX)"
                    inputMode="tel"
                    className={`mt-3 ${inputClass}`}
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    The boutique will confirm your GCash payment with this number. Nothing is charged on this page.
                  </p>
                </>
              )}
            </div>
          </div>

          {summary}
        </div>
      )}
    </div>
  );
}
