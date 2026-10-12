import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  User, Package, Settings, LogOut, Edit2, Camera, Sparkles, Plus,
  Mail, Phone, MapPin, Ruler, Clock, ChevronRight,
  Heart, ShieldCheck, Lock, Loader2,
} from "lucide-react";

// Backend base URL. Set VITE_API_URL in frontend/.env when you deploy.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const MAX_AVATAR_MB = 2;
const PH_PHONE = /^(09|\+639)\d{9}$/;

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const assetUrl = (path) => (!path ? "" : /^https?:\/\//i.test(path) ? path : `${API_URL}${path}`);

const fmt = (n) => `₱${Number(n || 0).toLocaleString("en-PH")}`;
const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
const orderNo = (o) => `#${String(o._id).slice(-6).toUpperCase()}`;

// Order stages. These strings must match ORDER_STATUSES in backend/models/order.model.js.
// "step" is how far along production the order is (1 to 5), for the progress bar.
const ORDER_STATUS = {
  "Order Received": { step: 1, color: "text-gray-700 bg-gray-50 border-gray-200" },
  "In Production": { step: 2, color: "text-blue-700 bg-blue-50 border-blue-200" },
  Preparing: { step: 3, color: "text-amber-700 bg-amber-50 border-amber-200" },
  "Finished Production": { step: 4, color: "text-purple-700 bg-purple-50 border-purple-200" },
  "Ready for Pick-Up": { step: 5, color: "text-teal-700 bg-teal-50 border-teal-200" },
  "Ready for Delivery": { step: 5, color: "text-teal-700 bg-teal-50 border-teal-200" },
  "Completed": { step: 5, color: "text-green-700 bg-green-50 border-green-200" },
};
const FALLBACK_STATUS = { step: 1, color: "text-gray-700 bg-gray-50 border-gray-200" };

// Same statuses as backend/models/customization.model.js
const DESIGN_STATUS = {
  "Pending review": "text-amber-700 bg-amber-50 border-amber-200",
  "In discussion": "text-blue-700 bg-blue-50 border-blue-200",
  Approved: "text-green-700 bg-green-50 border-green-200",
};
const EDITABLE = ["Pending review", "In discussion"];

const TABS = ["overview", "history", "settings"];

const inputClass =
  "w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm text-neutral-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-yellow-500/89 focus:border-yellow-600/89 disabled:bg-gray-50 disabled:text-gray-400";

const primaryLink =
  "inline-flex items-center justify-center gap-2 bg-yellow-600/89 text-white text-sm font-medium rounded-md border border-yellow-600/89 hover:bg-white hover:text-yellow-600/89 duration-200";

function StatusPill({ status }) {
  const tone = (ORDER_STATUS[status] || FALLBACK_STATUS).color;
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${tone}`}>{status}</span>
  );
}

function OrderProgress({ status }) {
  const step = (ORDER_STATUS[status] || FALLBACK_STATUS).step;
  return (
    <div
      className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={5}
      aria-valuenow={step}
      aria-label={`Order progress: ${status}`}
    >
      <div className="h-full rounded-full bg-yellow-600/89 transition-all" style={{ width: `${(step / 5) * 100}%` }} />
    </div>
  );
}

function OrderThumb({ order, className }) {
  const image = order.items?.[0]?.image;
  return image ? (
    <img src={assetUrl(image)} alt="" className={`object-cover rounded-md border border-gray-100 ${className}`} />
  ) : (
    <div className={`rounded-md border border-gray-100 bg-zinc-100 flex items-center justify-center text-zinc-400 ${className}`}>
      <Package size={16} />
    </div>
  );
}

export default function Profile({ user, setUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const fileRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // The tab lives in the URL, so links like /profile?tab=history land on the right tab
  const tab = TABS.includes(searchParams.get("tab")) ? searchParams.get("tab") : "overview";
  const setTab = (key) => setSearchParams(key === "overview" ? {} : { tab: key });

  // Profile from the database
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem("token"));

  // Orders and custom designs from the database
  const [orders, setOrders] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState("");

  // Profile editing
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ phone: "", address: "" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  // Pull the logged-in user's profile (username, email, contacts, picture)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoggedIn(false);
      setLoading(false);
      return;
    }

    let ignore = false;
    const loadProfile = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const res = await axios.get(`${API_URL}/api/users/profile`, { headers: authHeader() });
        if (!ignore) {
          setProfile(res.data);
          setLoggedIn(true);
        }
      } catch (err) {
        if (ignore) return;
        if (err.response?.status === 401) {
          // Token expired or invalid: treat as logged out
          localStorage.removeItem("token");
          delete axios.defaults.headers.common.Authorization;
          setUser?.(null);
          setLoggedIn(false);
        } else {
          setLoadError("We couldn't load your profile. Please try again.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pull this customer's orders and custom design requests
  useEffect(() => {
    if (!localStorage.getItem("token")) {
      setActivityLoading(false);
      return;
    }

    let ignore = false;
    (async () => {
      const [ordersRes, designsRes] = await Promise.allSettled([
        axios.get(`${API_URL}/api/orders/mine`, { headers: authHeader() }),
        axios.get(`${API_URL}/api/customizations/mine`, { headers: authHeader() }),
      ]);
      if (ignore) return;

      if (ordersRes.status === "fulfilled") setOrders(Array.isArray(ordersRes.value.data) ? ordersRes.value.data : []);
      if (designsRes.status === "fulfilled") setDesigns(Array.isArray(designsRes.value.data) ? designsRes.value.data : []);
      if (ordersRes.status === "rejected" || designsRes.status === "rejected") {
        setActivityError("Some of your activity couldn't be loaded. Please refresh to try again.");
      }
      setActivityLoading(false);
    })();

    return () => {
      ignore = true;
    };
  }, []);

  // Free the temporary preview URL when it changes or the page unmounts
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  // ── Editing handlers ──
  const startEdit = () => {
    setForm({ phone: profile?.phone || "", address: profile?.address || "" });
    setSaveError("");
    setSaved(false);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setAvatarFile(null);
    setAvatarPreview("");
    setSaveError("");
  };

  const handleFormChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (saveError) setSaveError("");
  };

  const handleAvatarPick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSaveError("Please choose an image file (JPG, PNG, or WebP).");
      return;
    }
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      setSaveError(`Image must be ${MAX_AVATAR_MB}MB or smaller.`);
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setSaveError("");
    if (!editing) {
      setForm({ phone: profile?.phone || "", address: profile?.address || "" });
      setEditing(true);
    }
  };

  const handleSave = async () => {
    const phone = form.phone.replace(/\s/g, "");
    if (phone && !PH_PHONE.test(phone)) {
      setSaveError("Please enter a valid mobile number (e.g. 0917 234 5678).");
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const body = new FormData();
      body.append("phone", phone);
      body.append("address", form.address.trim());
      if (avatarFile) body.append("avatar", avatarFile);

      const res = await axios.put(`${API_URL}/api/users/profile`, body, {
        headers: { ...authHeader(), "Content-Type": "multipart/form-data" },
      });

      const updated = res.data.user || res.data;
      setProfile((prev) => ({ ...prev, ...updated }));
      setUser?.({ ...(user || {}), ...updated });

      setEditing(false);
      setAvatarFile(null);
      setAvatarPreview("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err.response?.data?.message || "Couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common.Authorization;
    setUser?.(null);
    navigate("/");
  };

  // ── Gate: loading / not logged in / error ──
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
          <p className="text-sm text-zinc-600 mt-2 mb-6">
            Log in to view your profile, orders, and saved details.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/login" state={{ from: location }} className={`px-6 py-2.5 ${primaryLink}`}>
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

  if (loadError || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 px-4 flex items-center justify-center">
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center w-full max-w-md">
          <p className="text-sm text-red-700 mb-4">{loadError || "Something went wrong."}</p>
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

  // ── Derived display values ──
  const displayName = profile.username || "Customer";
  const initials = displayName.slice(0, 2).toUpperCase();
  const avatarSrc = avatarPreview || (profile.avatar?.startsWith("/uploads") ? assetUrl(profile.avatar) : profile.avatar);
  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-PH", { month: "long", year: "numeric" })
    : null;
  const measurements = profile.measurements && Object.keys(profile.measurements).length > 0 ? profile.measurements : null;
  const totalOrdered = orders.reduce((s, o) => s + (o.total || 0), 0);
  const latestOrder = orders[0];
  const latestDesigns = designs.slice(0, 2);

  const tabs = [
    { key: "overview", label: "Overview", icon: User },
    { key: "history", label: "Order History", icon: Package },
    { key: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-10 py-4 flex items-center gap-3">
          <User size={20} className="text-yellow-700/89" />
          <h1 className="text-lg font-semibold text-gray-800">My Profile</h1>
        </div>
        <div className="px-4 sm:px-6 lg:px-10 flex gap-6 overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === key
                  ? "border-yellow-700/89 text-yellow-600/89"
                  : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-10 py-6">
        {activityError && (
          <p role="alert" className="mb-4 text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 text-sm inline-block">
            {activityError}
          </p>
        )}

        {/* ── OVERVIEW TAB ── */}
        {tab === "overview" && (
          <div className="grid lg:grid-cols-3 gap-6 items-start">
            {/* Profile card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 lg:sticky lg:top-24">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={displayName}
                      className="w-28 h-28 rounded-full object-cover border border-gray-100"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-rose-50 text-yellow-700/89 text-3xl font-bold flex items-center justify-center border border-gray-100">
                      {initials}
                    </div>
                  )}
                  <button
                    onClick={() => fileRef.current?.click()}
                    aria-label="Change profile picture"
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-yellow-600/89 text-white flex items-center justify-center border-2 border-white hover:bg-yellow-700/89"
                  >
                    <Camera size={14} />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleAvatarPick}
                    className="hidden"
                  />
                </div>
                {avatarFile && (
                  <p className="text-xs text-yellow-700/89 mt-3">New photo selected. Save to apply.</p>
                )}

                <p className="font-semibold text-neutral-800 text-lg mt-4">{displayName}</p>
                <p className="text-sm text-gray-500 break-all">{profile.email}</p>
                {memberSince && <p className="text-xs text-gray-400 mt-1">Member since {memberSince}</p>}
              </div>

              <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-800">{activityLoading ? "–" : orders.length}</p>
                  <p className="text-xs text-gray-400">Orders</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-800">{activityLoading ? "–" : designs.length}</p>
                  <p className="text-xs text-gray-400">Designs</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-yellow-700/89 leading-7">
                    {activityLoading ? "–" : fmt(totalOrdered)}
                  </p>
                  <p className="text-xs text-gray-400">Total Ordered</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {saved && (
                <p className="text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 text-sm">
                  Profile updated.
                </p>
              )}

              {/* Contact info: view / edit */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact Information</p>
                  {!editing && (
                    <button
                      onClick={startEdit}
                      className="flex items-center gap-1.5 text-xs text-yellow-700/89 font-medium hover:underline"
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                  )}
                </div>

                {editing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input className={inputClass} value={profile.email} disabled />
                      <p className="text-xs text-gray-400 mt-1">Your email is tied to your login and can&apos;t be changed here.</p>
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Mobile number</label>
                      <input
                        id="phone"
                        name="phone"
                        value={form.phone}
                        onChange={handleFormChange}
                        placeholder="0917 234 5678"
                        inputMode="tel"
                        autoComplete="tel"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <textarea
                        id="address"
                        name="address"
                        value={form.address}
                        onChange={handleFormChange}
                        rows={2}
                        placeholder="House no., street, barangay, city, province"
                        autoComplete="street-address"
                        className={inputClass}
                      />
                    </div>

                    {saveError && (
                      <p role="alert" className="text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 text-sm">
                        {saveError}
                      </p>
                    )}

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={cancelEdit}
                        disabled={saving}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2 text-sm bg-yellow-600/89 text-white rounded-md border border-yellow-600/89 hover:bg-white hover:text-yellow-600/89 duration-200 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        {saving ? "Saving…" : "Save Changes"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <Mail size={15} className="text-gray-400 flex-shrink-0" /> {profile.email}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <Phone size={15} className="text-gray-400 flex-shrink-0" />
                      {profile.phone || <span className="text-gray-400">No mobile number added</span>}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <MapPin size={15} className="text-gray-400 flex-shrink-0" />
                      {profile.address || <span className="text-gray-400">No address added</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* Recent order */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent Order</p>
                  {orders.length > 0 && (
                    <button onClick={() => setTab("history")} className="text-xs text-yellow-700/89 font-medium flex items-center hover:underline">
                      See all <ChevronRight size={12} />
                    </button>
                  )}
                </div>
                {activityLoading ? (
                  <div className="h-14 bg-zinc-100 animate-pulse rounded-md" />
                ) : latestOrder ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <OrderThumb order={latestOrder} className="w-12 h-14 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{latestOrder.item}</p>
                        <p className="text-xs text-gray-400">{orderNo(latestOrder)} · {formatDate(latestOrder.createdAt)}</p>
                      </div>
                      <StatusPill status={latestOrder.status} />
                    </div>
                    <OrderProgress status={latestOrder.status} />
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">
                    You haven&apos;t placed an order yet.{" "}
                    <Link to="/catalog" className="text-yellow-700/89 font-medium hover:underline">Browse the catalog</Link>
                  </div>
                )}
              </div>

              {/* Custom designs */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles size={12} /> My Custom Designs
                  </p>
                  {designs.length > 0 && (
                    <Link to="/favorites?tab=custom" className="text-xs text-yellow-700/89 font-medium flex items-center hover:underline">
                      See all <ChevronRight size={12} />
                    </Link>
                  )}
                </div>

                {activityLoading ? (
                  <div className="h-14 bg-zinc-100 animate-pulse rounded-md" />
                ) : latestDesigns.length > 0 ? (
                  <div className="space-y-3">
                    {latestDesigns.map((d) => (
                      <div key={d._id} className="flex items-center gap-3">
                        {d.previewImage ? (
                          <img src={assetUrl(d.previewImage)} alt="" className="w-12 h-14 object-cover rounded-md border border-gray-100 flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-14 rounded-md border border-gray-100 bg-zinc-100 flex items-center justify-center text-zinc-400 flex-shrink-0">
                            <Sparkles size={16} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{d.base}</p>
                          <p className="text-xs text-gray-400">{formatDate(d.updatedAt || d.createdAt)}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${DESIGN_STATUS[d.status] || DESIGN_STATUS["Pending review"]}`}>
                          {d.status}
                        </span>
                        {EDITABLE.includes(d.status) && (
                          <Link to={`/customize?edit=${d._id}`} className="text-xs font-medium text-yellow-700/89 hover:underline whitespace-nowrap">
                            Edit
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    Design your own gown or barong and preview it with AI before sending it to the boutique.
                  </p>
                )}

                <Link to="/customize" className={`mt-4 w-full sm:w-auto px-5 py-2.5 ${primaryLink}`}>
                  <Plus size={14} />
                  {designs.length > 0 ? "Start a new design" : "Design your own"}
                </Link>
              </div>

              {/* Measurements */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-3">
                  <Ruler size={12} /> Saved Measurements
                </p>
                {measurements ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.entries(measurements).map(([label, value]) => (
                        <div key={label} className="bg-rose-50 rounded-md p-2.5 text-center">
                          <p className="text-xs text-gray-400 capitalize">{label}</p>
                          <p className="text-sm font-semibold text-gray-800">{value}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-3">Used to speed up fitting and custom design requests.</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">
                    No measurements saved yet. The boutique will record them during your fitting.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── ORDER HISTORY TAB ── */}
        {tab === "history" &&
          (activityLoading ? (
            <div className="grid lg:grid-cols-2 gap-4">
              {[0, 1].map((i) => <div key={i} className="h-36 bg-zinc-100 animate-pulse rounded-lg" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No orders yet.</p>
              <p className="text-xs mt-1">Once you check out, you can follow each order here.</p>
              <Link
                to="/catalog"
                className="mt-5 inline-block px-6 py-2.5 bg-yellow-600/89 text-white text-sm font-medium rounded-md hover:bg-yellow-700/89 transition-colors"
              >
                Browse the Catalog
              </Link>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-4">{orders.length} {orders.length === 1 ? "order" : "orders"}</p>
              <div className="grid lg:grid-cols-2 gap-4 items-start">
                {orders.map((o) => (
                  <div key={o._id} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                    <div className="flex gap-4 items-start">
                      <OrderThumb order={o} className="w-20 h-24 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        {o.items?.length > 0 ? (
                          <ul className="space-y-0.5">
                            {o.items.map((it, idx) => (
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
                          <p className="text-sm font-semibold text-neutral-800">{o.item}</p>
                        )}
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-1.5">
                          <Clock size={11} /> {formatDate(o.createdAt)} · {orderNo(o)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {[o.fulfillment, o.deliveryMethod].filter(Boolean).join(" · ")}
                        </p>
                        <p className="text-yellow-700/89 font-semibold text-sm mt-1.5">{fmt(o.total)}</p>
                      </div>
                      <StatusPill status={o.status} />
                    </div>
                    <OrderProgress status={o.status} />
                  </div>
                ))}
              </div>
            </>
          ))}

        {/* ── SETTINGS TAB ── */}
        {tab === "settings" && (
          <div className="grid lg:grid-cols-2 gap-4 items-start">
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              <button
                onClick={() => { setTab("overview"); startEdit(); }}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <User size={16} className="text-gray-400" />
                <span className="flex-1 text-sm text-gray-700">Edit Profile Information</span>
                <ChevronRight size={15} className="text-gray-300" />
              </button>
              {[
                { icon: Sparkles, label: "My Designs", to: "/favorites?tab=custom" },
                { icon: Heart, label: "Favorites", to: "/favorites" },
                { icon: ShieldCheck, label: "Change Password", to: "/settings/password" },
              ].map(({ icon: Icon, label, to }) => (
                <Link key={label} to={to} className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors">
                  <Icon size={16} className="text-gray-400" />
                  <span className="flex-1 text-sm text-gray-700">{label}</span>
                  <ChevronRight size={15} className="text-gray-300" />
                </Link>
              ))}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Signed in as</p>
              <p className="text-sm text-gray-800 font-medium">{displayName}</p>
              <p className="text-xs text-gray-400 mb-4 break-all">{profile.email}</p>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
              >
                <LogOut size={15} /> Log Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}