import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Package,
  Users,
  MessageSquare,
  LogOut,
  Menu,
  Bell,
  X,
  Check,
} from "lucide-react";
import { font, api, errMsg, initials } from "./staffLib";
import { PrimaryButton, Spinner } from "./ui";
import Forbidden from "../../components/Forbidden";
import DashboardView from "./DashboardView";
import NewSaleView from "./NewSaleView";
import OrdersView from "./OrdersView";
import InventoryView from "./InventoryView";
import CustomersView from "./CustomersView";
import MessagesView from "./MessagesView";

/**
 * MaikCraft: Staff / Cashier console
 * Order processing (New sale, Orders), receipts, record keeping (Orders),
 * inventory monitoring. Customers and Messages are read-only.
 * Each tab lives in its own file in this folder.
 */

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "sale", label: "New sale", icon: ShoppingCart },
  { key: "orders", label: "Orders", icon: ClipboardList },
  { key: "inventory", label: "Inventory", icon: Package },
  { key: "customers", label: "Customers", icon: Users },
  { key: "messages", label: "Messages", icon: MessageSquare },
];
const TAB_KEYS = NAV.map((n) => n.key);
const ROLES_ALLOWED = ["staff", "admin"];
const POLL_MESSAGES_MS = 20000;

export default function Staff({ setUser }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // The tab lives in the URL, so a refresh keeps you where you were
  const tab = TAB_KEYS.includes(searchParams.get("tab")) ? searchParams.get("tab") : "dashboard";
  const setTab = (key) => setSearchParams(key === "dashboard" ? {} : { tab: key });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [auth, setAuth] = useState("loading"); // loading | ok | denied | offline
  const [me, setMe] = useState(null);

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");

  const [conversations, setConversations] = useState([]);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);

  const [dashboardKey, setDashboardKey] = useState(0); // bump so the dashboard reloads

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
        setAuth(ROLES_ALLOWED.includes(data.role) ? "ok" : "denied");
      } catch (err) {
        if (!ignore) setAuth(err.response?.status === 401 ? "denied" : "offline");
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  /* ---- shared data ---- */
  const loadProducts = useCallback(async () => {
    try {
      const { data } = await api.get("/products");
      setProducts(Array.isArray(data) ? data : []);
      setProductsError("");
    } catch (err) {
      setProductsError(errMsg(err));
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await api.get("/staff/conversations");
      setConversations(data);
    } catch {
      /* the badge is a nice-to-have */
    } finally {
      setConversationsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (auth !== "ok") return;
    loadProducts();
    loadConversations();
    const t = setInterval(() => !document.hidden && loadConversations(), POLL_MESSAGES_MS);
    return () => clearInterval(t);
  }, [auth, loadProducts, loadConversations]);

  const afterSale = useCallback(() => {
    loadProducts();
    setDashboardKey((k) => k + 1);
  }, [loadProducts]);

  const unread = useMemo(() => conversations.reduce((s, c) => s + (c.unread || 0), 0), [conversations]);
  const activeLabel = NAV.find((n) => n.key === tab)?.label ?? "";

  const signOut = () => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common.Authorization;
    setUser?.(null);
    navigate("/login", { replace: true });
  };

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

  // Signed in, but this account isn't staff
  if (auth !== "ok") return <Forbidden onSignIn={signOut} />;

  return (
    <div className="min-h-screen bg-[#EFE9E3]">
      <button
        onClick={() => setSidebarOpen(true)}
        type="button"
        aria-label="Open sidebar"
        className="fixed left-3 top-3 z-30 rounded-lg border border-[#E3DACB] bg-white p-2 text-[#4A4136] sm:hidden"
      >
        <Menu size={18} />
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-full w-64 bg-[#241F1A] transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } sm:translate-x-0`}
        aria-label="Sidebar"
      >
        <div className="flex h-full flex-col px-4 py-6">
          <div className="mb-8 flex items-center justify-between px-2">
            <div>
              <p className="text-lg leading-tight text-[#F5EFE4]" style={font.display}>MAIKENS</p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#9C8C74]">Staff console</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} aria-label="Close sidebar" className="-mr-1 flex h-10 w-10 items-center justify-center rounded-lg text-[#C9BFAF] transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#C9A96A]/50 sm:hidden">
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 space-y-1">
            {NAV.map(({ key, label, icon: NavIcon }) => (
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
                {key === "messages" && unread > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#7C4A4A] px-1.5 text-[10px] font-medium text-white">
                    {unread}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <button onClick={signOut} className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#C9BFAF] hover:bg-white/5 hover:text-[#F5EFE4]">
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/30 sm:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main content */}
      <div className="sm:ml-64">
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[#E3DACB] bg-[#EFE9E3]/90 px-4 py-3 backdrop-blur sm:px-6">
          <p className="pl-9 text-sm text-[#8B8072] sm:pl-0">
            Staff <span className="text-[#B4A88F]">/</span> <span className="font-medium text-[#241F1A]">{activeLabel}</span>
          </p>
          <div className="flex items-center gap-3">
            <button onClick={() => setTab("messages")} aria-label={unread ? `${unread} unread messages` : "Messages"} className="relative rounded-lg p-2 text-[#4A4136] hover:bg-white">
              <Bell size={18} />
              {unread > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#7C4A4A]" />}
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
          {tab === "dashboard" && <DashboardView onNavigate={setTab} refreshKey={dashboardKey} />}
          {tab === "sale" && (
            <NewSaleView products={products} loading={productsLoading} loadError={productsError} onSold={afterSale} notify={notify} />
          )}
          {tab === "orders" && <OrdersView notify={notify} onChanged={() => setDashboardKey((k) => k + 1)} />}
          {tab === "inventory" && (
            <InventoryView products={products} loading={productsLoading} loadError={productsError} onRefresh={loadProducts} />
          )}
          {tab === "customers" && <CustomersView />}
          {tab === "messages" && (
            <MessagesView conversations={conversations} loaded={conversationsLoaded} onRefresh={loadConversations} />
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-sm ${toast.type === "success" ? "border-[#5B6E58]/30 bg-[#E7EDE3] text-[#3E4E3B]" : "border-[#7C4A4A]/30 bg-[#F3E4E2] text-[#6B3838]"
            }`}
        >
          {toast.type === "success" ? <Check size={16} /> : <X size={16} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}