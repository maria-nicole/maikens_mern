import { useEffect, useState } from "react";
import { ShoppingCart, ClipboardList } from "lucide-react";
import { font, api, errMsg, peso, orderNo, formatWhen } from "./staffLib";
import { SectionHeader, StatCard, PrimaryButton, GhostButton, PaymentPill, StatusPill, StockPill, Spinner, ErrorNote } from "./ui";
import ReceiptModal from "./ReceiptModal";

const REFRESH_MS = 60000;

export default function DashboardView({ onNavigate, refreshKey }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [tick, setTick] = useState(0);
    const [receipt, setReceipt] = useState(null);

    useEffect(() => {
        const t = setInterval(() => !document.hidden && setTick((n) => n + 1), REFRESH_MS);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        let ignore = false;
        api
            .get("/staff/dashboard")
            .then(({ data }) => {
                if (ignore) return;
                setData(data);
                setError("");
            })
            .catch((err) => !ignore && setError(errMsg(err)));
        return () => {
            ignore = true;
        };
    }, [tick, refreshKey]);

    return (
        <div>
            <SectionHeader
                eyebrow="Overview"
                title="Today at the counter"
                action={
                    <div className="flex gap-2">
                        <GhostButton icon={ClipboardList} onClick={() => onNavigate("orders")}>View orders</GhostButton>
                        <PrimaryButton icon={ShoppingCart} onClick={() => onNavigate("sale")}>New sale</PrimaryButton>
                    </div>
                }
            />

            <ErrorNote onRetry={() => setTick((n) => n + 1)}>{error}</ErrorNote>

            {!data ? (
                !error && <Spinner />
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard label="Walk-in sales today" value={data.walkIns.count} sub={`${peso(data.walkIns.total)} billed`} />
                        <StatCard
                            label="Collected today"
                            value={peso(data.collected.total)}
                            sub={`Cash ${peso(data.collected.cash)} · GCash ${peso(data.collected.gcash)}`}
                        />
                        <StatCard
                            label="New online orders"
                            value={data.toProcess}
                            sub={data.toProcess ? `${data.inProgress} in production` : "Nothing waiting"}
                            accent={data.toProcess ? "#7C4A4A" : "#5B6E58"}
                        />
                        <StatCard
                            label="Balances to collect"
                            value={peso(data.balances.due)}
                            sub={data.balances.count ? `${data.balances.count} unpaid or partial` : "All paid up"}
                            accent={data.balances.count ? "#7C4A4A" : "#5B6E58"}
                        />
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="rounded-2xl border border-[#E3DACB] bg-white p-5 lg:col-span-2">
                            <h3 className="mb-4 text-sm font-semibold text-[#241F1A]">Recent orders</h3>
                            {data.recent.length === 0 ? (
                                <p className="py-6 text-sm text-[#8B8072]">No orders yet. Start with a new sale.</p>
                            ) : (
                                <div className="divide-y divide-[#EFE9E3]">
                                    {data.recent.map((o) => (
                                        <button
                                            key={o._id}
                                            onClick={() => setReceipt(o)}
                                            className="flex w-full items-center justify-between gap-4 py-3 text-left hover:bg-[#FBF8F3]"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-[#241F1A]">{o.customerName}</p>
                                                <p className="truncate text-xs text-[#8B8072]">{o.item}</p>
                                                <p className="text-xs text-[#9C8C74]" style={font.mono}>
                                                    {orderNo(o)} · {o.channel} · {formatWhen(o.createdAt)}
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 flex-col items-end gap-1">
                                                <p className="text-sm" style={font.mono}>{peso(o.total)}</p>
                                                <PaymentPill status={o.paymentStatus} />
                                                <StatusPill status={o.status} />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="rounded-2xl border border-[#E3DACB] bg-white p-5">
                            <h3 className="mb-4 text-sm font-semibold text-[#241F1A]">Stock to watch</h3>
                            <div className="space-y-3">
                                {data.lowStock.length === 0 && <p className="text-sm text-[#8B8072]">All items well stocked.</p>}
                                {data.lowStock.map((p) => (
                                    <div key={p._id} className="flex items-center justify-between gap-2 rounded-lg bg-[#FBF8F3] px-3 py-2">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-[#241F1A]">{p.name}</p>
                                            <p className="text-xs text-[#8B8072]">{p.category} · {p.totalStock} left</p>
                                        </div>
                                        <StockPill status={p.status} />
                                    </div>
                                ))}
                                {data.lowStock.length > 0 && (
                                    <button onClick={() => onNavigate("inventory")} className="text-xs font-medium text-[#9C7A3C] hover:underline">
                                        Open inventory
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />
        </div>
    );
}