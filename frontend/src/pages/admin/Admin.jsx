import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  LayoutDashboard,
  Shirt,
  ClipboardList,
  Sparkles,
  MessageSquare,
  Users,
  BarChart3,
  LogOut,
  Menu,
  Bell,
  X,
  Check,
  Package,
  Star,
  Mail,
  Settings,
} from "lucide-react";
import { font, api, errMsg, initials } from "./adminLib";
import { PrimaryButton, Spinner } from "./ui";
import Forbidden from "../../components/Forbidden";
import DashboardView from "./DashboardView";
import ProductsView from "./ProductsView";
import OrdersView from "./OrdersView";
import CustomizationsView from "./CustomizationsView";
import MessagesView from "./MessagesView";
import InquiriesView from "./InquiriesView";
import ReviewsView from "./ReviewsView";
import UsersView from "./UsersView";
import ReportsView from "./ReportsView";
import SettingsView from "./SettingsView";

/**
 * MaikCraft: Admin / Owner console
 * This file is only the shell (sign-in check, sidebar, top bar, toasts).
 * Each tab lives in its own file in this folder and loads its own data.
 * Adding or editing a product has its own page: ProductForm.jsx.
 */

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "products", label: "Products", icon: Shirt },
  { key: "orders", label: "Orders", icon: ClipboardList },
  { key: "customizations", label: "Customizations", icon: Sparkles },
  { key: "messages", label: "Messages", icon: MessageSquare },
  { key: "inquiries", label: "Inquiries", icon: Mail },
  { key: "reviews", label: "Reviews", icon: Star },
  { key: "users", label: "Users", icon: Users },
  { key: "reports", label: "Reports", icon: BarChart3 },
  { key: "settings", label: "Settings", icon: Settings },
];
const TAB_KEYS = NAV.map((n) => n.key);
const REFRESH_OVERVIEW_MS = 30000;

export default function Admin({ setUser }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // The tab lives in the URL, so a refresh keeps you where you were
  const tab = TAB_KEYS.includes(searchParams.get("tab")) ? searchParams.get("tab") : "dashboard";
  const setTab = (key) => setSearchParams(key === "dashboard" ? {} : { tab: key });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [auth, setAuth] = useState("loading"); // loading | ok | denied | offline
  const [me, setMe] = useState(null);

  // Numbers for the dashboard and the sidebar badges, refreshed in the background
  const [overview, setOverview] = useState(null);
  const [overviewError, setOverviewError] = useState("");

  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const notify = useCallback((type, message) => {
    setToast({ type, message });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  /* ---- who is this? ---- */
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!localStorage.getItem("token")) return setAuth("denied");
      try {
        const { data } = await api.get("/users/me");
        if (ignore) return;
        setMe(data);
        setAuth(data.role === "admin" ? "ok" : "denied");
      } catch (err) {
        if (!ignore) setAuth([401, 403].includes(err.response?.status) ? "denied" : "offline");
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const loadOverview = useCallback(async () => {
    try {
      const { data } = await api.get("/reports/dashboard");
      setOverview(data);
      setOverviewError("");
    } catch (err) {
      setOverviewError(errMsg(err));
    }
  }, []);

  useEffect(() => {
    if (auth !== "ok") return;
    loadOverview();
    const t = setInterval(() => !document.hidden && loadOverview(), REFRESH_OVERVIEW_MS);
    return () => clearInterval(t);
  }, [auth, loadOverview]);

  const signOut = () => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common.Authorization;
    setUser?.(null);
    navigate("/login", { replace: true });
  };

  const badge = (key) =>
    ({
      orders: overview?.newOrders,
      customizations: overview?.pendingDesigns,
      messages: overview?.unreadMessages,
      inquiries: overview?.newInquiries,
      users: overview?.unverifiedUsers,
    })[key] || 0;
  const totalAlerts = badge("orders") + badge("customizations") + badge("messages") + badge("inquiries") + badge("users");
  const activeLabel = NAV.find((n) => n.key === tab)?.label ?? "";

  /* ---- gates ---- */
  if (auth === "loading") {
    return (
      <div className="min-h-screen bg-[#EFE9E3]">
        <Spinner />
      </div>
    );
  }

  if (auth === "offline") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#EFE9E3] px-4">
        <div className="w-full max-w-md rounded-2xl border border-[#E3DACB] bg-white p-8 text-center">
          <h1 className="text-xl text-[#241F1A]" style={font.display}>
            Can&apos;t reach the server
          </h1>
          <p className="mt-2 text-sm text-[#8B8072]">Make sure the backend is running, then try again.</p>
          <div className="mt-5 flex justify-center gap-2">
            <PrimaryButton onClick={() => window.location.reload()}>Try again</PrimaryButton>
          </div>
        </div>
      </div>
    );
  }

  // Signed in, but this account isn't the owner's
  if (auth !== "ok") return <Forbidden onSignIn={signOut} />;

  return (
    <div className="min-h-screen bg-[#EFE9E3]">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-full w-64 bg-[#241F1A] transition-transform print:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } sm:translate-x-0`}
        aria-label="Sidebar"
      >
        <div className="flex h-full flex-col px-4 py-6">
          <div className="mb-8 flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#9C7A3C]/20 text-[#C9A96A]">
                <Package size={18} />
              </div>
              <div>
                <p className="text-lg leading-tight text-[#F5EFE4]" style={font.display}>MAIKENS</p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#9C8C74]">Admin console</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} aria-label="Close sidebar" className="text-[#C9BFAF] hover:text-white sm:hidden">
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 space-y-1">
            {NAV.map(({ key, label, icon: NavIcon }) => {
              const count = badge(key);
              return (
                <button
                  key={key}
                  onClick={() => {
                    setTab(key);
                    setSidebarOpen(false);
                  }}
                  aria-current={tab === key ? "page" : undefined}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${tab === key ? "bg-[#9C7A3C]/20 text-[#F0E4C8]" : "text-[#C9BFAF] hover:bg-white/5 hover:text-[#F5EFE4]"
                    }`}
                >
                  <NavIcon size={17} />
                  <span className="flex-1 text-left">{label}</span>
                  {count > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#7C4A4A] px-1.5 text-[10px] font-medium text-white">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <button onClick={signOut} className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#C9BFAF] hover:bg-white/5 hover:text-[#F5EFE4]">
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/30 sm:hidden print:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main content */}
      <div className="sm:ml-64 print:ml-0">
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[#E3DACB] bg-[#EFE9E3]/90 px-4 py-3 backdrop-blur sm:px-6 print:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} aria-label="Open sidebar" className="rounded-lg p-2 text-[#4A4136] hover:bg-white sm:hidden">
              <Menu size={18} />
            </button>
            <p className="text-sm text-[#8B8072]">
              Admin <span className="text-[#B4A88F]">/</span> <span className="font-medium text-[#241F1A]">{activeLabel}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTab(badge("messages") ? "messages" : badge("users") ? "users" : badge("customizations") ? "customizations" : badge("inquiries") ? "inquiries" : "orders")}
              aria-label={totalAlerts ? `${totalAlerts} items need attention` : "Nothing needs attention"}
              className="relative rounded-lg p-2 text-[#4A4136] hover:bg-white"
            >
              <Bell size={18} />
              {totalAlerts > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#7C4A4A]" />}
            </button>
            <div className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#9C7A3C]/20 text-xs font-semibold text-[#6B5426]">
                {initials(me?.username)}
              </div>
              <span className="hidden text-xs font-medium text-[#4A4136] sm:inline">{me?.username}</span>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {tab === "dashboard" && (
            <DashboardView data={overview} error={overviewError} onRefresh={loadOverview} onNavigate={setTab} />
          )}
          {tab === "products" && <ProductsView notify={notify} onChanged={loadOverview} />}
          {tab === "orders" && <OrdersView notify={notify} onChanged={loadOverview} />}
          {tab === "customizations" && <CustomizationsView notify={notify} onChanged={loadOverview} />}
          {tab === "messages" && <MessagesView notify={notify} onChanged={loadOverview} />}
          {tab === "inquiries" && <InquiriesView notify={notify} onChanged={loadOverview} />}
          {tab === "reviews" && <ReviewsView notify={notify} />}
          {tab === "users" && <UsersView me={me} notify={notify} />}
          {tab === "reports" && <ReportsView notify={notify} />}
          {tab === "settings" && <SettingsView notify={notify} />}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-sm print:hidden ${toast.type === "success" ? "border-[#5B6E58]/30 bg-[#E7EDE3] text-[#3E4E3B]" : "border-[#7C4A4A]/30 bg-[#F3E4E2] text-[#6B3838]"
            }`}
        >
          {toast.type === "success" ? <Check size={16} /> : <X size={16} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}