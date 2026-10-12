import { ClipboardList, Shirt } from "lucide-react";
import { font, peso, orderNo, formatWhen } from "./adminLib";
import { SectionHeader, StatCard, GhostButton, PrimaryButton, StatusPill, PaymentPill, ProductPill, Spinner, ErrorNote } from "./ui";

export default function DashboardView({ data, error, onRefresh, onNavigate }) {
    return (
        <div>
            <SectionHeader
                eyebrow="Overview"
                title="Today at the boutique"
                action={
                    <div className="flex gap-2">
                        <GhostButton icon={ClipboardList} onClick={() => onNavigate("orders")}>View orders</GhostButton>
                        <PrimaryButton icon={Shirt} onClick={() => onNavigate("products")}>Manage products</PrimaryButton>
                    </div>
                }
            />

            <ErrorNote onRetry={onRefresh}>{error}</ErrorNote>

            {!data ? (
                !error && <Spinner />
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label="Orders in progress"
                            value={data.activeOrders}
                            sub={`${data.today.count} placed today · ${peso(data.today.total)}`}
                            onClick={() => onNavigate("orders")}
                        />
                        <StatCard
                            label="New orders to start"
                            value={data.newOrders}
                            sub={data.newOrders ? "Waiting at Order Received" : "Nothing waiting"}
                            accent={data.newOrders ? "#7C4A4A" : "#5B6E58"}
                            onClick={() => onNavigate("orders")}
                        />
                        <StatCard
                            label="Designs to review"
                            value={data.pendingDesigns}
                            sub={data.pendingDesigns ? "Awaiting your review" : "Nothing waiting"}
                            accent={data.pendingDesigns ? "#7C4A4A" : "#5B6E58"}
                            onClick={() => onNavigate("customizations")}
                        />
                        <StatCard
                            label="Unread messages"
                            value={data.unreadMessages}
                            sub={data.unreadMessages ? "Customers are waiting" : "All caught up"}
                            accent={data.unreadMessages ? "#7C4A4A" : "#5B6E58"}
                            onClick={() => onNavigate("messages")}
                        />
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <StatCard
                            label="Balances to collect"
                            value={peso(data.balances.due)}
                            sub={data.balances.count ? `${data.balances.count} unpaid or partial orders` : "All paid up"}
                            accent={data.balances.count ? "#7C4A4A" : "#5B6E58"}
                        />
                        <StatCard
                            label="Low / out of stock"
                            value={data.lowStock.length}
                            sub={data.lowStock.length ? "Needs restock" : "All stocked"}
                            accent={data.lowStock.length ? "#7C4A4A" : "#5B6E58"}
                            onClick={() => onNavigate("products")}
                        />
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="rounded-2xl border border-[#E3DACB] bg-white p-5 lg:col-span-2">
                            <h3 className="mb-4 text-sm font-semibold text-[#241F1A]">Recent orders</h3>
                            {data.recent.length === 0 ? (
                                <p className="py-6 text-sm text-[#8B8072]">No orders yet.</p>
                            ) : (
                                <div className="divide-y divide-[#EFE9E3]">
                                    {data.recent.map((o) => (
                                        <div key={o._id} className="flex items-center justify-between gap-4 py-3">
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
                                        </div>
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
                                        <ProductPill status={p.status} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}