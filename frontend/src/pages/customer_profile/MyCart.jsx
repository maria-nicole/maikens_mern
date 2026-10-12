import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import {
  ShoppingBag, Trash2, Plus, Minus, ChevronRight,
  MapPin, Calendar, Smartphone, CheckCircle2, Lock, Loader2, Check,
} from "lucide-react";

// Backend base URL. Set VITE_API_URL in frontend/.env when you deploy.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const assetUrl = (path) => (!path ? "" : /^https?:\/\//i.test(path) ? path : `${API_URL}${path}`);

// Display only: the server sets the real fee when the order is placed.
const DELIVERY_FEE = 150;

const FULFILLMENT_OPTIONS = [
  { key: "Delivery", label: "Delivery", sub: "+₱150 shipping", icon: MapPin },
  { key: "Pick-up", label: "Pick-up", sub: "Free · Schedule a date", icon: Calendar },
];

const PAYMENT_OPTIONS = [{ key: "GCash", label: "GCash", sub: "Mobile wallet", icon: Smartphone }];

const PH_PHONE = /^(09|\+639)\d{9}$/;
const MAX_ADDRESS = 250;

const fmt = (n) => `₱${Number(n || 0).toLocaleString("en-PH")}`;
const orderNo = (o) => `#${String(o._id).slice(-6).toUpperCase()}`;

// Local date as YYYY-MM-DD, for the date picker's minimum
const today = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

const inputClass =
  "mt-3 w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm text-neutral-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-yellow-500/89 focus:border-yellow-600/89";

const EMPTY_CART = { items: [], itemCount: 0, subtotal: 0, hasIssues: false };

export default function MyCart() {
  const location = useLocation();

  const [tab, setTab] = useState("cart");
  const [cart, setCart] = useState(EMPTY_CART);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem("token"));
  const [busyId, setBusyId] = useState(null); // the line being changed

  const [fulfillment, setFulfillment] = useState("Delivery");
  const [payment, setPayment] = useState("GCash");
  const [details, setDetails] = useState({ address: "", pickupDate: "", gcash: "" });
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(null); // the order the server created
  const [toast, setToast] = useState("");

  const loadCart = async () => {
    const { data } = await axios.get(`${API_URL}/api/cart`, { headers: authHeader() });
    setCart(data);
  };

  // Load the cart, then pre-fill checkout from the saved profile (nice-to-have, never blocks)
  useEffect(() => {
    if (!localStorage.getItem("token")) {
      setLoggedIn(false);
      setLoading(false);
      return;
    }

    let ignore = false;
    (async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/cart`, { headers: authHeader() });
        if (!ignore) setCart(data);
      } catch (err) {
        if (ignore) return;
        if (err.response?.status === 401) setLoggedIn(false);
        else setLoadError("We couldn't load your cart. Please try again.");
      } finally {
        if (!ignore) setLoading(false);
      }

      try {
        const { data: profile } = await axios.get(`${API_URL}/api/users/profile`, { headers: authHeader() });
        if (!ignore) {
          setDetails((prev) => ({
            ...prev,
            address: prev.address || profile.address || "",
            gcash: prev.gcash || profile.phone || "",
          }));
        }
      } catch {
        /* optional */
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const changeQty = async (item, delta) => {
    const next = Math.min(Math.max(1, item.quantity + delta), Math.max(1, item.maxQty));
    if (next === item.quantity) return;
    setBusyId(item._id);
    try {
      const { data } = await axios.patch(`${API_URL}/api/cart/${item._id}`, { quantity: next }, { headers: authHeader() });
      setCart(data);
    } catch (err) {
      setToast(err.response?.data?.message || "Couldn't update the quantity.");
    } finally {
      setBusyId(null);
    }
  };

  const removeItem = async (item) => {
    setBusyId(item._id);
    try {
      const { data } = await axios.delete(`${API_URL}/api/cart/${item._id}`, { headers: authHeader() });
      setCart(data);
    } catch (err) {
      setToast(err.response?.data?.message || "Couldn't remove that item.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDetail = (e) => {
    setDetails((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const goToTab = (key) => {
    setTab(key);
    setPlaced(null);
    setError("");
  };

  const shipping = fulfillment === "Delivery" ? DELIVERY_FEE : 0;
  const total = cart.subtotal + shipping;
  const blocked = cart.hasIssues || cart.items.length === 0;

  const handlePlaceOrder = async () => {
    if (cart.hasIssues) return setError("Please fix the items marked in your cart first.");
    if (fulfillment === "Delivery") {
      if (!details.address.trim()) return setError("Please enter your delivery address.");
      if (details.address.trim().length > MAX_ADDRESS) return setError(`Address must be ${MAX_ADDRESS} characters or fewer.`);
    }
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
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't place your order. Please try again.");
      // Stock may have changed while they were checking out, so show the latest cart
      loadCart().catch(() => { });
    } finally {
      setPlacing(false);
    }
  };

  const tabs = [
    { key: "cart", label: "Cart", icon: ShoppingBag, count: cart.items.length },
    { key: "checkout", label: "Checkout", icon: ChevronRight, disabled: cart.items.length === 0 && !placed },
  ];

  /* ------------------------------ Gate: loading / logged out / error ------------------------------ */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-yellow-600/89" />
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 px-4 flex items-center justify-center">
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center w-full max-w-md">
          <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-yellow-600/89" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-800">Please log in first</h1>
          <p className="text-sm text-zinc-600 mt-2 mb-6">Log in to see your cart and check out.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/login"
              state={{ from: location }}
              className="px-6 py-2.5 bg-yellow-600/89 text-white text-sm font-medium rounded-md border border-yellow-600/89 hover:bg-white hover:text-yellow-600/89 duration-200"
            >
              Log In
            </Link>
            <Link
              to="/register"
              className="px-6 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              Create an account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 px-4 flex items-center justify-center">
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center w-full max-w-md">
          <p className="text-sm text-red-700 mb-4">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-yellow-600/89 text-white text-sm font-medium rounded-md hover:bg-yellow-700/89"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Toast */}
      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-800 text-white px-5 py-3 rounded-md shadow-lg text-sm flex items-center gap-2">
          <Check size={14} className="text-yellow-500" />
          {toast}
        </div>
      )}

      {/* Header + tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-10 py-4 flex items-center gap-3">
          <ShoppingBag size={20} className="text-yellow-700/89" />
          <h1 className="text-lg font-semibold text-gray-800">My Cart</h1>
        </div>
        <div className="px-4 sm:px-6 lg:px-10 flex gap-6">
          {tabs.map(({ key, label, icon: Icon, count, disabled }) => (
            <button
              key={key}
              onClick={() => goToTab(key)}
              disabled={disabled}
              className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${tab === key
                  ? "border-yellow-700/89 text-yellow-600/89"
                  : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
            >
              <Icon size={14} />
              {label}
              {count > 0 && (
                <span className="bg-rose-100 text-yellow-600/89 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-10 py-6">
        {/* ── CART TAB ── */}
        {tab === "cart" &&
          (cart.items.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm mb-5">Your cart is empty.</p>
              <Link
                to="/catalog"
                className="inline-block px-6 py-2.5 bg-yellow-600/89 text-white text-sm font-medium rounded-md hover:bg-yellow-700/89 transition-colors"
              >
                Browse the Catalog
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6 items-start">
              {/* Items */}
              <div className="lg:col-span-2 space-y-4">
                {cart.hasIssues && (
                  <p role="alert" className="text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-sm">
                    Some items need your attention. Change their quantity or remove them to continue.
                  </p>
                )}

                {cart.items.map((item) => (
                  <div
                    key={item._id}
                    className={`bg-white rounded-lg border p-4 flex gap-4 ${item.issue ? "border-amber-200" : "border-gray-200"} ${busyId === item._id ? "opacity-60" : ""
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
                        {[item.category, item.size && `Size ${item.size}`, item.fulfillment === "Made-to-order" && "Made to order"]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p className="text-yellow-700/89 font-semibold text-sm mt-1">{fmt(item.unitPrice)}</p>
                      {item.issue && <p className="text-xs font-medium text-amber-700 mt-1">{item.issue}</p>}
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => changeQty(item, -1)}
                          disabled={busyId === item._id || item.quantity <= 1}
                          aria-label="Decrease quantity"
                          className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600 disabled:opacity-40"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-sm w-5 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => changeQty(item, +1)}
                          disabled={busyId === item._id || item.quantity >= item.maxQty}
                          aria-label="Increase quantity"
                          className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600 disabled:opacity-40"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <button
                        onClick={() => removeItem(item)}
                        disabled={busyId === item._id}
                        aria-label={`Remove ${item.name}`}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                      <p className="text-sm font-semibold text-gray-700">{fmt(item.lineTotal)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3 lg:sticky lg:top-24">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Summary</p>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal ({cart.itemCount} {cart.itemCount === 1 ? "item" : "items"})</span>
                  <span>{fmt(cart.subtotal)}</span>
                </div>
                <p className="text-xs text-gray-400">Shipping is calculated at checkout.</p>
                <div className="border-t border-gray-100 pt-3 flex justify-between font-semibold text-gray-800">
                  <span>Estimated Total</span>
                  <span className="text-yellow-700/89">{fmt(cart.subtotal)}</span>
                </div>
                <button
                  onClick={() => goToTab("checkout")}
                  disabled={blocked}
                  className="w-full bg-yellow-600/89 text-white py-3 rounded-md text-sm font-semibold border border-yellow-600/89 hover:bg-white hover:text-yellow-600/89 duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-yellow-600/89 disabled:hover:text-white"
                >
                  Proceed to Checkout <ChevronRight size={15} />
                </button>
              </div>
            </div>
          ))}

        {/* ── CHECKOUT TAB ── */}
        {tab === "checkout" &&
          (placed ? (
            <div className="text-center py-24">
              <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
              <p className="font-semibold text-gray-800 text-lg">Order Placed!</p>
              <p className="text-sm text-gray-500 mt-1">
                Order <span className="font-medium text-gray-700">{orderNo(placed)}</span> · {fmt(placed.total)}
              </p>
              <p className="text-sm text-gray-400 mt-1">You can track its status anytime from your Profile.</p>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  to="/profile?tab=history"
                  className="px-6 py-2.5 bg-yellow-600/89 text-white text-sm font-medium rounded-md hover:bg-yellow-700/89 transition-colors"
                >
                  Track My Order
                </Link>
                <Link
                  to="/catalog"
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
                >
                  Keep Shopping
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6 items-start">
              {/* Fulfillment + Payment */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Fulfillment</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {FULFILLMENT_OPTIONS.map(({ key, label, sub, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => { setFulfillment(key); setError(""); }}
                        className={`flex items-start gap-3 p-3 rounded-md border text-left transition-colors ${fulfillment === key ? "border-yellow-600/89 bg-rose-50" : "border-gray-200 hover:border-gray-300"
                          }`}
                      >
                        <Icon size={16} className={fulfillment === key ? "text-yellow-700/89 mt-0.5" : "text-gray-400 mt-0.5"} />
                        <div>
                          <p className={`text-sm font-medium ${fulfillment === key ? "text-yellow-700/89" : "text-gray-700"}`}>{label}</p>
                          <p className="text-xs text-gray-400">{sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {fulfillment === "Delivery" && (
                    <input
                      name="address"
                      value={details.address}
                      onChange={handleDetail}
                      placeholder="Delivery address"
                      autoComplete="street-address"
                      maxLength={MAX_ADDRESS}
                      className={inputClass}
                    />
                  )}
                  {fulfillment === "Pick-up" && (
                    <input
                      type="date"
                      name="pickupDate"
                      min={today}
                      value={details.pickupDate}
                      onChange={handleDetail}
                      className={inputClass}
                    />
                  )}
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Payment Method</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {PAYMENT_OPTIONS.map(({ key, label, sub, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => setPayment(key)}
                        className={`flex items-start gap-3 p-3 rounded-md border text-left transition-colors ${payment === key ? "border-yellow-600/89 bg-rose-50" : "border-gray-200 hover:border-gray-300"
                          }`}
                      >
                        <Icon size={16} className={payment === key ? "text-yellow-700/89 mt-0.5" : "text-gray-400 mt-0.5"} />
                        <div>
                          <p className={`text-sm font-medium ${payment === key ? "text-yellow-700/89" : "text-gray-700"}`}>{label}</p>
                          <p className="text-xs text-gray-400">{sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {payment === "GCash" && (
                    <>
                      <input
                        name="gcash"
                        value={details.gcash}
                        onChange={handleDetail}
                        placeholder="GCash number (e.g. 09XX XXX XXXX)"
                        inputMode="tel"
                        className={inputClass}
                      />
                      <p className="text-xs text-gray-400 mt-2">
                        The boutique will confirm your GCash payment with this number. Nothing is charged on this page.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Order summary */}
              <div className="bg-white rounded-lg border border-gray-200 p-5 lg:sticky lg:top-24">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Order Summary</p>
                <div className="space-y-2">
                  {cart.items.map((i) => (
                    <div key={i._id} className="flex justify-between gap-3 text-sm">
                      <span className="text-gray-600">
                        {i.name}
                        {i.size && <span className="text-gray-400"> ({i.size})</span>}{" "}
                        <span className="text-gray-400">×{i.quantity}</span>
                      </span>
                      <span className="text-gray-800 font-medium whitespace-nowrap">{fmt(i.lineTotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 mt-3 pt-3 space-y-1.5">
                  <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>{fmt(cart.subtotal)}</span></div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Shipping</span>
                    <span>{shipping === 0 ? "Free (Pick-up)" : fmt(shipping)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-800 pt-2 border-t border-gray-100">
                    <span>Total</span>
                    <span className="text-yellow-700/89 text-base">{fmt(total)}</span>
                  </div>
                </div>

                {error && (
                  <p role="alert" className="mt-4 text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 text-xs">
                    {error}
                  </p>
                )}

                <button
                  onClick={handlePlaceOrder}
                  disabled={placing || blocked}
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-yellow-600/89 text-white py-3 rounded-md text-sm font-semibold border border-yellow-600/89 hover:bg-white hover:text-yellow-600/89 duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-yellow-600/89 disabled:hover:text-white"
                >
                  {placing && <Loader2 size={15} className="animate-spin" />}
                  {placing ? "Placing order…" : `Confirm & Place Order — ${fmt(total)}`}
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}