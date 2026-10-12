import { useState, useEffect } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  Heart, Sparkles, ShoppingBag, Trash2, Pencil, X, Check,
  Clock, Plus, Lock, Loader2, MessageCircle,
} from "lucide-react";

// Backend base URL. Set VITE_API_URL in frontend/.env when you deploy.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const assetUrl = (path) => (!path ? "" : /^https?:\/\//i.test(path) ? path : `${API_URL}${path}`);

// Same statuses as backend/models/customization.model.js
const STATUS_CONFIG = {
  "Pending review": "text-amber-700 bg-amber-50 border-amber-200",
  "In discussion": "text-blue-700 bg-blue-50 border-blue-200",
  Approved: "text-green-700 bg-green-50 border-green-200",
};
const EDITABLE = ["Pending review", "In discussion"];

const formatPrice = (n) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(n || 0);
const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

const cardClass = "bg-white rounded-lg border border-gray-200";
const primaryLink =
  "inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-600/89 text-white text-sm font-medium rounded-md border border-yellow-600/89 hover:bg-white hover:text-yellow-600/89 duration-200";

// "Ivory · A-Line · Lace": the choices a customer made, in a readable order
const chosenOptions = (selections = {}) =>
  ["color", "silhouette", "fit", "neckline", "sleeve", "fabric", "design"].map((k) => selections[k]).filter(Boolean);

export default function Favorites() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  // Tab lives in the URL, so links like /favorites?tab=custom always land on the right tab
  const tab = searchParams.get("tab") === "custom" ? "custom" : "designs";
  const changeTab = (key) => setSearchParams(key === "custom" ? { tab: "custom" } : {});

  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [customDesigns, setCustomDesigns] = useState([]);
  const [favError, setFavError] = useState("");
  const [customError, setCustomError] = useState("");
  const [preview, setPreview] = useState(null);
  const [toast, setToast] = useState("");

  // Load both lists from the database
  useEffect(() => {
    if (!localStorage.getItem("token")) {
      setLoggedIn(false);
      setLoading(false);
      return;
    }

    let ignore = false;
    (async () => {
      const [favs, designs] = await Promise.allSettled([
        axios.get(`${API_URL}/api/favorites`, { headers: authHeader() }),
        axios.get(`${API_URL}/api/customizations/mine`, { headers: authHeader() }),
      ]);
      if (ignore) return;

      const expired = [favs, designs].some((r) => r.status === "rejected" && r.reason?.response?.status === 401);
      if (expired) {
        setLoggedIn(false);
      } else {
        if (favs.status === "fulfilled") setFavorites(Array.isArray(favs.value.data) ? favs.value.data : []);
        else setFavError("Couldn't load your favorites. Please try again.");
        if (designs.status === "fulfilled") setCustomDesigns(Array.isArray(designs.value.data) ? designs.value.data : []);
        else setCustomError("Couldn't load your designs. Please try again.");
      }
      setLoading(false);
    })();

    return () => {
      ignore = true;
    };
  }, []);

  // Close the preview with Escape
  useEffect(() => {
    if (!preview) return;
    const onKey = (e) => e.key === "Escape" && setPreview(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const removeFavorite = async (product) => {
    const before = favorites;
    setFavorites((prev) => prev.filter((f) => f._id !== product._id)); // update right away, undo if it fails
    try {
      await axios.delete(`${API_URL}/api/favorites/${product._id}`, { headers: authHeader() });
    } catch {
      setFavorites(before);
      setToast("Couldn't remove that favorite. Please try again.");
    }
  };

  const removeCustom = async (design) => {
    if (!window.confirm(`Delete "${design.base}"? This can't be undone.`)) return;
    try {
      await axios.delete(`${API_URL}/api/customizations/${design._id}`, { headers: authHeader() });
      setCustomDesigns((prev) => prev.filter((c) => c._id !== design._id));
      setPreview(null);
    } catch (err) {
      setToast(err.response?.data?.message || "Couldn't delete that design. Please try again.");
    }
  };

  const tabs = [
    { key: "designs", label: "Favorite Designs", icon: Heart, count: favorites.length },
    { key: "custom", label: "My Customizations", icon: Sparkles, count: customDesigns.length },
  ];

  /* ------------------------------ Gate: loading / logged out ------------------------------ */
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
          <p className="text-sm text-zinc-600 mt-2 mb-6">Log in to see your favorite designs and custom design requests.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/login" state={{ from: location }} className={`justify-center px-6 py-2.5 ${primaryLink}`}>
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
          <Heart size={20} className="text-yellow-700/89" />
          <h1 className="text-lg font-semibold text-gray-800">My Favorites</h1>
        </div>
        <div className="px-4 sm:px-6 lg:px-10 flex gap-6 overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => changeTab(key)}
              className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === key
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
        {/* ── FAVORITE DESIGNS TAB ── */}
        {tab === "designs" &&
          (favError ? (
            <p role="alert" className="text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 text-sm inline-block">
              {favError}
            </p>
          ) : favorites.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <Heart size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No favorites yet.</p>
              <p className="text-xs mt-1">Tap the heart icon on any gown or barong to save it here.</p>
              <Link
                to="/catalog"
                className="mt-5 inline-block px-6 py-2.5 bg-yellow-600/89 text-white text-sm font-medium rounded-md hover:bg-yellow-700/89 transition-colors"
              >
                Browse the Catalog
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {favorites.map((item) => {
                const soldOut = item.status === "Out of stock";
                const details = [
                  item.category,
                  item.eventTypes?.[0],
                  item.sizes?.length ? `Sizes ${item.sizes.map((s) => s.size).join("/")}` : "",
                ].filter(Boolean);
                return (
                  <div key={item._id} className={`${cardClass} overflow-hidden group`}>
                    <div className="relative">
                      <Link to={`/product/${item._id}`}>
                        {item.images?.[0] ? (
                          <img
                            src={assetUrl(item.images[0])}
                            alt={item.name}
                            className="w-full aspect-[3/4] object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full aspect-[3/4] bg-zinc-100 flex items-center justify-center text-xs text-zinc-400">
                            No photo
                          </div>
                        )}
                      </Link>
                      <button
                        onClick={() => removeFavorite(item)}
                        aria-label={`Remove ${item.name} from favorites`}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white"
                      >
                        <Heart size={14} className="fill-yellow-600/89 text-yellow-600/89" />
                      </button>
                      {(soldOut || item.status === "Low stock") && (
                        <span
                          className={`absolute bottom-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full border ${soldOut ? "text-red-700 bg-red-50 border-red-200" : "text-amber-700 bg-amber-50 border-amber-200"
                            }`}
                        >
                          {soldOut ? "Out of stock" : `Only ${item.totalStock} left`}
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{details.join(" · ")}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-yellow-700/89 font-semibold text-sm">{formatPrice(item.price)}</p>
                        <Link
                          to={`/product/${item._id}`}
                          aria-label={`View ${item.name}`}
                          className="w-8 h-8 rounded-full bg-yellow-600/89 text-white flex items-center justify-center hover:bg-yellow-700/89"
                        >
                          <ShoppingBag size={13} />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

        {/* ── MY CUSTOMIZATIONS TAB ── */}
        {tab === "custom" &&
          (customError ? (
            <p role="alert" className="text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 text-sm inline-block">
              {customError}
            </p>
          ) : customDesigns.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <Sparkles size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">You haven't created any custom designs yet.</p>
              <p className="text-xs mt-1">Use the AI Customization tool to design your own gown or barong.</p>
              <Link to="/customize" className={`mt-5 ${primaryLink}`}>
                <Plus size={14} /> Start Customizing
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  {customDesigns.length} {customDesigns.length === 1 ? "design" : "designs"}
                </p>
                <Link
                  to="/customize"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-yellow-600/89 text-white text-xs font-semibold rounded-md border border-yellow-600/89 hover:bg-white hover:text-yellow-600/89 duration-200"
                >
                  <Plus size={13} /> New Design
                </Link>
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                {customDesigns.map((design) => {
                  const editable = EDITABLE.includes(design.status);
                  const options = chosenOptions(design.selections);
                  return (
                    <div key={design._id} className={`${cardClass} p-4 flex gap-4`}>
                      <button onClick={() => setPreview(design)} className="flex-shrink-0" aria-label={`Preview ${design.base}`}>
                        {design.previewImage ? (
                          <img src={assetUrl(design.previewImage)} alt={design.base} className="w-24 h-32 object-cover rounded-md border border-gray-100" />
                        ) : (
                          <div className="w-24 h-32 rounded-md border border-gray-100 bg-zinc-100 flex items-center justify-center text-[11px] text-zinc-400 text-center px-2">
                            No AI preview
                          </div>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-gray-800 text-sm">{design.base}</p>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUS_CONFIG[design.status] || STATUS_CONFIG["Pending review"]
                              }`}
                          >
                            {design.status}
                          </span>
                        </div>
                        {options.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {options.map((opt) => (
                              <span key={opt} className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-1.5">
                          <Clock size={11} /> Last edited {formatDate(design.updatedAt || design.createdAt)}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                          {editable ? (
                            <Link
                              to={`/customize?edit=${design._id}`}
                              className="text-xs font-medium text-yellow-700/89 flex items-center gap-1 hover:underline"
                            >
                              <Pencil size={11} /> Continue Editing
                            </Link>
                          ) : (
                            <Link to="/message" className="text-xs font-medium text-gray-600 flex items-center gap-1 hover:underline">
                              <MessageCircle size={11} /> Message the boutique
                            </Link>
                          )}
                          {editable && (
                            <button
                              onClick={() => removeCustom(design)}
                              aria-label={`Delete ${design.base}`}
                              className="text-xs font-medium text-gray-400 flex items-center gap-1 hover:text-red-500 ml-auto"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>

      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => setPreview(null)}
        >
          <div
            role="dialog"
            aria-label={preview.base}
            className="bg-white rounded-lg max-w-sm w-full overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              {preview.previewImage ? (
                <img src={assetUrl(preview.previewImage)} alt={preview.base} className="w-full h-80 object-cover" />
              ) : (
                <div className="w-full h-40 bg-zinc-100 flex items-center justify-center text-sm text-zinc-400">
                  No AI preview for this design
                </div>
              )}
              <button
                onClick={() => setPreview(null)}
                aria-label="Close preview"
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white"
              >
                <X size={14} className="text-gray-600" />
              </button>
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-neutral-800">{preview.base}</p>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUS_CONFIG[preview.status] || STATUS_CONFIG["Pending review"]
                    }`}
                >
                  {preview.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-gray-600">
                {Object.entries(preview.selections || {})
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <p key={k}>
                      <span className="text-gray-400 capitalize">{k}:</span> {v}
                    </p>
                  ))}
              </div>
              {preview.customerNotes && (
                <p className="mt-3 text-xs text-gray-600">
                  <span className="text-gray-400">Your notes:</span> {preview.customerNotes}
                </p>
              )}
              {EDITABLE.includes(preview.status) ? (
                <Link
                  to={`/customize?edit=${preview._id}`}
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
      )}
    </div>
  );
}