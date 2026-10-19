import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { api, errMsg, productToShare } from "./messageConfig";
import ShareCard from "./ShareCard";

// Lets the customer pick one of their customizations or orders, or a catalog product
export default function SharePicker({ initialTab, onPick, onClose }) {
  const [tab, setTab] = useState(initialTab);
  const [mine, setMine] = useState(null); // { customizations, orders }
  const [products, setProducts] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let ignore = false;
    Promise.all([api.get("/messages/shareables"), api.get("/products")])
      .then(([a, b]) => {
        if (ignore) return;
        setMine(a.data);
        setProducts(b.data);
      })
      .catch((err) => {
        if (!ignore) setError(errMsg(err));
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const loading = !error && (mine === null || products === null);

  const items = useMemo(() => {
    if (tab === "customization") {
      return (mine?.customizations || []).map((c) => ({
        kind: "customization",
        refId: c.id,
        title: c.title,
        subtitle: c.subtitle,
        detail: "",
        image: c.image || "",
      }));
    }
    if (tab === "order") {
      return (mine?.orders || []).map((o) => ({
        kind: "order",
        refId: o.id,
        title: o.title,
        subtitle: o.subtitle,
        detail: "",
        image: o.image || "",
      }));
    }
    const q = query.trim().toLowerCase();
    return (products || []).filter((p) => p.name.toLowerCase().includes(q)).map(productToShare);
  }, [tab, mine, products, query]);

  const TABS = [
    { id: "customization", label: "My customizations" },
    { id: "order", label: "My orders" },
    { id: "product", label: "Catalog" },
  ];

  const emptyText =
    tab === "customization"
      ? "You haven't submitted any customizations yet. Designs you send to us will show up here."
      : tab === "order"
      ? "You don't have any orders yet. Your orders will show up here."
      : "No products match your search.";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share in chat"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full flex-col rounded-t-2xl bg-white sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-neutral-800">Share in chat</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-1 border-b border-gray-100 px-3 pt-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "border-yellow-600/89 text-yellow-700/89"
                  : "border-transparent text-zinc-500 hover:text-neutral-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "product" && (
          <div className="relative px-4 pt-3">
            <Search size={14} className="absolute left-7 top-1/2 mt-1.5 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the catalog…"
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500/89"
            />
          </div>
        )}

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {loading && (
            <div className="flex justify-center py-8 text-zinc-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          )}
          {error && <p className="py-6 text-center text-sm text-red-700">{error}</p>}
          {!loading && !error && items.length === 0 && (
            <p className="py-8 text-center text-sm text-zinc-500">{emptyText}</p>
          )}
          {items.map((item) => (
            <button
              key={`${item.kind}-${item.refId}`}
              type="button"
              onClick={() => onPick(item)}
              className="block w-full cursor-pointer rounded-xl transition-colors hover:bg-gray-50"
            >
              <ShareCard share={item} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
