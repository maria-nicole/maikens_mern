import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Eye, HandCoins, RefreshCw } from "lucide-react";
import { font, api, errMsg, peso, orderNo, balanceOf, formatDate, ORDER_STATUSES } from "./adminLib";
import { SectionHeader, GhostButton, StatusPill, PaymentPill, EmptyState, Spinner, ErrorNote, inputCls } from "./ui";
import { OrderDetailModal, PaymentModal } from "./OrderModals";

const PAGE_SIZE = 15;

export default function OrdersView({ notify, onChanged }) {
    const [orders, setOrders] = useState(null);
    const [error, setError] = useState("");
    const [query, setQuery] = useState("");
    const [channel, setChannel] = useState("");
    const [status, setStatus] = useState("");
    const [payment, setPayment] = useState("");
    const [page, setPage] = useState(1);
    const [detail, setDetail] = useState(null);
    const [collecting, setCollecting] = useState(null);

    const load = useCallback(async () => {
        try {
            const { data } = await api.get("/orders");
            setOrders(data);
            setError("");
        } catch (err) {
            setError(errMsg(err));
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => setPage(1), [query, channel, status, payment]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase().replace(/^#/, "");
        return (orders || []).filter(
            (o) =>
                (!channel || o.channel === channel) &&
                (!status || o.status === status) &&
                (!payment || (o.paymentStatus || "Unpaid") === payment) &&
                (!q ||
                    o.customerName.toLowerCase().includes(q) ||
                    o.item.toLowerCase().includes(q) ||
                    String(o._id).toLowerCase().endsWith(q))
        );
    }, [orders, query, channel, status, payment]);

    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const hasFilters = query || channel || status || payment;

    const replace = (updated) => setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));

    const updateStatus = async (order, next) => {
        try {
            const { data } = await api.patch(`/orders/${order._id}/status`, { status: next });
            replace(data);
            notify("success", `${orderNo(order)} is now "${next}".`);
            onChanged?.();
        } catch (err) {
            notify("error", errMsg(err));
        }
    };

    const paymentDone = (updated) => {
        replace(updated);
        setCollecting(null);
        setDetail(updated);
        notify("success", "Payment recorded.");
        onChanged?.();
    };

    return (
        <div>
            <SectionHeader
                eyebrow="Order & customization management"
                title="Orders"
                action={<GhostButton icon={RefreshCw} onClick={load}>Refresh</GhostButton>}
            />

            <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-5">
                <div className="relative col-span-2">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#B4A88F]" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, item or #order" aria-label="Search orders" className={`${inputCls} pl-8`} />
                </div>
                <select value={channel} onChange={(e) => setChannel(e.target.value)} aria-label="Channel" className={inputCls}>
                    <option value="">All channels</option>
                    <option>Online</option>
                    <option>Walk-in</option>
                </select>
                <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" className={inputCls}>
                    <option value="">All statuses</option>
                    {ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <select value={payment} onChange={(e) => setPayment(e.target.value)} aria-label="Payment" className={inputCls}>
                    <option value="">All payments</option>
                    <option>Unpaid</option>
                    <option>Partial</option>
                    <option>Paid</option>
                </select>
            </div>
            {hasFilters && (
                <button onClick={() => { setQuery(""); setChannel(""); setStatus(""); setPayment(""); }} className="mb-3 text-xs font-medium text-[#9C7A3C] hover:underline">
                    Clear filters
                </button>
            )}
            {orders && <p className="mb-3 text-xs text-[#8B8072]">{filtered.length} {filtered.length === 1 ? "order" : "orders"}</p>}

            <ErrorNote onRetry={load}>{error}</ErrorNote>

            <div className="overflow-x-auto rounded-2xl border border-[#E3DACB] bg-white">
                {orders === null && !error ? (
                    <Spinner label="Loading orders…" />
                ) : (
                    <table className="w-full text-left text-sm">
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
                            {shown.map((o) => {
                                const balance = balanceOf(o);
                                return (
                                    <tr key={o._id} className="border-b border-[#F3EEE4] align-top last:border-0 hover:bg-[#FBF8F3]">
                                        <td className="px-5 py-3">
                                            <p className="font-medium text-[#241F1A]" style={font.mono}>{orderNo(o)}</p>
                                            <p className="text-xs text-[#9C8C74]">{o.channel} · {formatDate(o.createdAt)}</p>
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
                                                {balance > 0 && <GhostButton icon={HandCoins} onClick={() => setCollecting(o)}>Payment</GhostButton>}
                                                <GhostButton icon={Eye} onClick={() => setDetail(o)}>Details</GhostButton>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
                {orders && filtered.length === 0 && (
                    <EmptyState
                        title={hasFilters ? "No orders match" : "No orders yet"}
                        hint={hasFilters ? "Try clearing a filter." : "Orders appear here as customers check out and staff record walk-ins."}
                    />
                )}
            </div>

            {pages > 1 && (
                <div className="mt-4 flex items-center justify-between text-xs text-[#8B8072]">
                    <span>Page {page} of {pages}</span>
                    <div className="flex gap-2">
                        <GhostButton disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</GhostButton>
                        <GhostButton disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</GhostButton>
                    </div>
                </div>
            )}

            {detail && <OrderDetailModal order={detail} onClose={() => setDetail(null)} />}
            {collecting && <PaymentModal order={collecting} onClose={() => setCollecting(null)} onDone={paymentDone} />}
        </div>
    );
}