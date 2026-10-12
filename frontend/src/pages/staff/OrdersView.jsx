import { useEffect, useState } from "react";
import { Search, Receipt, HandCoins, RefreshCw } from "lucide-react";
import { font, api, errMsg, peso, orderNo, balanceOf, formatDate, formatTime, ORDER_STATUSES } from "./staffLib";
import { SectionHeader, GhostButton, StatusPill, PaymentPill, EmptyState, Spinner, ErrorNote, inputCls } from "./ui";
import ReceiptModal from "./ReceiptModal";
import CollectPaymentModal from "./CollectPaymentModal";

const EMPTY_FILTERS = { q: "", channel: "", status: "", payment: "", from: "", to: "" };

export default function OrdersView({ notify, onChanged }) {
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [q, setQ] = useState(""); // the search text, after a short pause in typing
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [tick, setTick] = useState(0); // bump to reload
    const [receipt, setReceipt] = useState(null);
    const [collecting, setCollecting] = useState(null);

    useEffect(() => {
        const t = setTimeout(() => {
            setQ(filters.q.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(t);
    }, [filters.q]);

    const { channel, status, payment, from, to } = filters;
    useEffect(() => {
        let ignore = false;
        setLoading(true);
        setError("");
        api
            .get("/staff/orders", { params: { q, channel, status, payment, from, to, page } })
            .then(({ data }) => !ignore && setData(data))
            .catch((err) => !ignore && setError(errMsg(err)))
            .finally(() => !ignore && setLoading(false));
        return () => {
            ignore = true;
        };
    }, [q, channel, status, payment, from, to, page, tick]);

    const setFilter = (key) => (e) => {
        setFilters((f) => ({ ...f, [key]: e.target.value }));
        if (key !== "q") setPage(1);
    };

    const replaceOrder = (updated) =>
        setData((d) => (d ? { ...d, orders: d.orders.map((o) => (o._id === updated._id ? updated : o)) } : d));

    const updateStatus = async (order, next) => {
        try {
            const { data: updated } = await api.patch(`/staff/orders/${order._id}/status`, { status: next });
            replaceOrder(updated);
            notify("success", `${orderNo(order)} is now "${next}".`);
            onChanged?.();
        } catch (err) {
            notify("error", errMsg(err));
        }
    };

    const paymentDone = (updated) => {
        replaceOrder(updated);
        setCollecting(null);
        setReceipt(updated); // show the updated receipt right away
        notify("success", "Payment recorded.");
        onChanged?.();
    };

    const orders = data?.orders || [];
    const summary = data?.summary;
    const hasFilters = Object.values(filters).some(Boolean);

    return (
        <div>
            <SectionHeader
                eyebrow="Record keeping"
                title="Orders"
                action={<GhostButton icon={RefreshCw} onClick={() => setTick((t) => t + 1)}>Refresh</GhostButton>}
            />

            {/* Filters */}
            <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-8">
                <div className="relative col-span-2 lg:col-span-3">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#B4A88F]" />
                    <input value={filters.q} onChange={setFilter("q")} placeholder="Search name, item or #order" aria-label="Search orders" className={`${inputCls} pl-8`} />
                </div>
                <select value={channel} onChange={setFilter("channel")} aria-label="Channel" className={inputCls}>
                    <option value="">All channels</option>
                    <option>Online</option>
                    <option>Walk-in</option>
                </select>
                <select value={status} onChange={setFilter("status")} aria-label="Status" className={inputCls}>
                    <option value="">All statuses</option>
                    {ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <select value={payment} onChange={setFilter("payment")} aria-label="Payment" className={inputCls}>
                    <option value="">All payments</option>
                    <option>Unpaid</option>
                    <option>Partial</option>
                    <option>Paid</option>
                </select>
                <div className="col-span-2 flex items-center gap-1">
                    <input
                        type="date"
                        value={from}
                        onChange={setFilter("from")}
                        aria-label="From date"
                        className={`${inputCls} min-w-0 flex-1`}
                    />
                    <span className="text-xs text-[#9C8C74]">to</span>
                    <input
                        type="date"
                        value={to}
                        min={from || undefined}
                        onChange={setFilter("to")}
                        aria-label="To date"
                        className={`${inputCls} min-w-0 flex-1`}
                    />
                </div>
            </div>
            {hasFilters && (
                <button onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }} className="mb-4 text-xs font-medium text-[#9C7A3C] hover:underline">
                    Clear filters
                </button>
            )}

            {summary && (
                <p className="mb-3 text-xs text-[#8B8072]">
                    {summary.count} {summary.count === 1 ? "order" : "orders"} · billed{" "}
                    <span style={font.mono}>{peso(summary.billed)}</span> · collected{" "}
                    <span style={font.mono}>{peso(summary.collected)}</span>
                </p>
            )}

            <ErrorNote onRetry={() => setTick((t) => t + 1)}>{error}</ErrorNote>

            <div className="overflow-x-auto rounded-2xl border border-[#E3DACB] bg-white">
                {loading && !data ? (
                    <Spinner label="Loading orders…" />
                ) : (
                    <table className={`w-full text-left text-sm ${loading ? "opacity-60" : ""}`}>
                        <thead>
                            <tr className="border-b border-[#EFE9E3] text-xs uppercase tracking-wide text-[#9C8C74]">
                                <th className="px-5 py-3 font-medium">Order</th>
                                <th className="px-5 py-3 font-medium">Customer</th>
                                <th className="px-5 py-3 font-medium">Items</th>
                                <th className="px-5 py-3 font-medium">Total</th>
                                <th className="px-5 py-3 font-medium">Payment</th>
                                <th className="px-5 py-3 font-medium">Status</th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((o) => {
                                const balance = balanceOf(o);
                                return (
                                    <tr key={o._id} className="border-b border-[#F3EEE4] align-top last:border-0 hover:bg-[#FBF8F3]">
                                        <td className="px-5 py-3">
                                            <p className="font-medium text-[#241F1A]" style={font.mono}>{orderNo(o)}</p>
                                            <p className="text-xs text-[#9C8C74]">{o.channel} · {formatDate(o.createdAt)}, {formatTime(o.createdAt)}</p>
                                        </td>
                                        <td className="px-5 py-3 text-[#4A4136]">{o.customerName}</td>
                                        <td className="max-w-[260px] px-5 py-3 text-[#4A4136]">
                                            <p className="line-clamp-2">{o.item}</p>
                                            <p className="text-xs text-[#9C8C74]">{o.fulfillment}{o.deliveryMethod ? ` · ${o.deliveryMethod}` : ""}</p>
                                        </td>
                                        <td className="px-5 py-3" style={font.mono}>{peso(o.total)}</td>
                                        <td className="px-5 py-3">
                                            <PaymentPill status={o.paymentStatus} />
                                            {balance > 0 && <p className="mt-1 text-xs text-[#6B3838]" style={font.mono}>Due {peso(balance)}</p>}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex flex-col items-start gap-1.5">
                                                <StatusPill status={o.status} />
                                                <select
                                                    value={o.status}
                                                    onChange={(e) => updateStatus(o, e.target.value)}
                                                    aria-label={`Update status of ${orderNo(o)}`}
                                                    className="rounded-lg border border-[#E3DACB] bg-white py-1 pl-2 pr-6 text-xs text-[#4A4136] outline-none focus:border-[#9C7A3C]"
                                                >
                                                    {ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
                                                </select>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex justify-end gap-2">
                                                {balance > 0 && <GhostButton icon={HandCoins} onClick={() => setCollecting(o)}>Collect</GhostButton>}
                                                <GhostButton icon={Receipt} onClick={() => setReceipt(o)}>Receipt</GhostButton>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
                {!loading && orders.length === 0 && (
                    <EmptyState
                        title={hasFilters ? "No orders match" : "No orders yet"}
                        hint={hasFilters ? "Try clearing a filter." : "Walk-in sales and online checkouts will appear here."}
                    />
                )}
            </div>

            {data && data.pages > 1 && (
                <div className="mt-4 flex items-center justify-between text-xs text-[#8B8072]">
                    <span>Page {data.page} of {data.pages}</span>
                    <div className="flex gap-2">
                        <GhostButton disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</GhostButton>
                        <GhostButton disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</GhostButton>
                    </div>
                </div>
            )}

            <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />
            {collecting && <CollectPaymentModal order={collecting} onClose={() => setCollecting(null)} onDone={paymentDone} />}
        </div>
    );
}