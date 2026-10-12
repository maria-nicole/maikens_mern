import { useCallback, useEffect, useState } from "react";
import { Download, Printer } from "lucide-react";
import { font, api, errMsg, peso, shortDate, formatDate, downloadBlob, toInputDate } from "./adminLib";
import { SectionHeader, StatCard, GhostButton, Spinner, ErrorNote, ProductPill, Segmented, inputCls } from "./ui";

const PRESETS = [
    { value: "7", label: "7 days" },
    { value: "30", label: "30 days" },
    { value: "90", label: "90 days" },
    { value: "month", label: "This month" },
];

function rangeFor(preset) {
    const to = new Date();
    const from = new Date();
    if (preset === "month") from.setDate(1);
    else from.setDate(to.getDate() - (Number(preset) - 1));
    return { from: toInputDate(from), to: toInputDate(to) };
}

// A simple labelled bar: width is relative to the biggest value
function Bar({ value, max, color = "#9C7A3C" }) {
    return (
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#F3EEE4]">
            <div className="h-full rounded-full" style={{ width: `${max ? (value / max) * 100 : 0}%`, background: color }} />
        </div>
    );
}

export default function ReportsView({ notify }) {
    const [preset, setPreset] = useState("30");
    const [range, setRange] = useState(() => rangeFor("30"));
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/reports/summary", { params: range });
            setData(data);
            setError("");
        } catch (err) {
            setError(errMsg(err));
        } finally {
            setLoading(false);
        }
    }, [range]);

    useEffect(() => {
        load();
    }, [load]);

    const choosePreset = (value) => {
        setPreset(value);
        setRange(rangeFor(value));
    };

    const setDate = (key) => (e) => {
        setPreset("");
        setRange((r) => ({ ...r, [key]: e.target.value }));
    };

    const exportCsv = async () => {
        setExporting(true);
        try {
            const res = await api.get("/reports/orders.csv", { params: range, responseType: "blob" });
            downloadBlob(res.data, `maikens-orders-${range.from}-to-${range.to}.csv`);
        } catch (err) {
            // a failed blob download arrives as a Blob, so read the message out of it
            let message = errMsg(err);
            try {
                message = JSON.parse(await err.response.data.text()).message || message;
            } catch {
                /* keep the generic message */
            }
            notify("error", message);
        } finally {
            setExporting(false);
        }
    };

    const maxDay = data ? Math.max(1, ...data.daily.map((d) => d.billed)) : 1;
    const maxStatus = data ? Math.max(1, ...data.byStatus.map((s) => s.count)) : 1;
    const maxProduct = data ? Math.max(1, ...data.topProducts.map((p) => p.revenue)) : 1;
    const labelEvery = data ? Math.ceil(data.daily.length / 8) : 1;

    return (
        <div>
            <SectionHeader
                eyebrow="Reports"
                title="Sales, orders & inventory"
                action={
                    <div className="flex gap-2 print:hidden">
                        <GhostButton icon={Download} onClick={exportCsv} disabled={exporting}>{exporting ? "Exporting…" : "Export orders (CSV)"}</GhostButton>
                        <GhostButton icon={Printer} onClick={() => window.print()}>Print / Save as PDF</GhostButton>
                    </div>
                }
            />

            <div className="mb-5 flex flex-wrap items-center gap-3 print:hidden">
                <Segmented label="Date range" value={preset} options={PRESETS} onChange={choosePreset} />
                <div className="flex items-center gap-2 text-xs text-[#8B8072]">
                    <input type="date" value={range.from} max={range.to} onChange={setDate("from")} aria-label="From date" className={`${inputCls} w-auto`} />
                    to
                    <input type="date" value={range.to} min={range.from} onChange={setDate("to")} aria-label="To date" className={`${inputCls} w-auto`} />
                </div>
            </div>

            <ErrorNote onRetry={load}>{error}</ErrorNote>

            {!data ? (
                loading && <Spinner label="Building the report…" />
            ) : (
                <div className={loading ? "opacity-60" : ""}>
                    <p className="mb-4 text-xs text-[#8B8072]">
                        {formatDate(data.range.from)} to {formatDate(data.range.to)} · based on the date each order was placed
                    </p>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard label="Orders" value={data.totals.orders} sub={`${data.channels.Online.orders} online · ${data.channels["Walk-in"].orders} walk-in`} />
                        <StatCard label="Billed" value={peso(data.totals.billed)} sub={`Average ${peso(data.totals.average)} per order`} />
                        <StatCard label="Collected" value={peso(data.totals.collected)} sub="Payments recorded" />
                        <StatCard
                            label="Still to collect"
                            value={peso(data.totals.outstanding)}
                            sub={data.totals.outstanding ? "Unpaid balances" : "All paid up"}
                            accent={data.totals.outstanding ? "#7C4A4A" : "#5B6E58"}
                        />
                    </div>

                    <div className="mt-6 rounded-2xl border border-[#E3DACB] bg-white p-5">
                        <h3 className="mb-4 text-sm font-semibold text-[#241F1A]">Billed per day</h3>
                        <div className="flex h-40 items-end gap-px sm:gap-0.5" role="img" aria-label="Bar chart of the amount billed each day">
                            {data.daily.map((d) => (
                                <div key={d.date} className="group relative flex h-full flex-1 items-end">
                                    <div
                                        className="w-full rounded-t bg-[#9C7A3C]"
                                        style={{ height: `${(d.billed / maxDay) * 100}%`, minHeight: d.billed ? 2 : 0 }}
                                        title={`${shortDate(d.date)}: ${peso(d.billed)} (${d.orders} ${d.orders === 1 ? "order" : "orders"})`}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="mt-2 flex gap-px text-[10px] text-[#8B8072] sm:gap-0.5">
                            {data.daily.map((d, i) => (
                                <span key={d.date} className="flex-1 overflow-visible whitespace-nowrap">{i % labelEvery === 0 ? shortDate(d.date) : ""}</span>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="rounded-2xl border border-[#E3DACB] bg-white p-5">
                            <h3 className="mb-4 text-sm font-semibold text-[#241F1A]">Orders by production stage</h3>
                            <div className="space-y-3">
                                {data.byStatus.map((b) => (
                                    <div key={b.status} className="flex items-center gap-3">
                                        <span className="w-36 shrink-0 text-xs text-[#6B6153]">{b.status}</span>
                                        <Bar value={b.count} max={maxStatus} />
                                        <span className="w-6 shrink-0 text-right text-xs" style={font.mono}>{b.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-[#E3DACB] bg-white p-5">
                            <h3 className="mb-4 text-sm font-semibold text-[#241F1A]">Top sellers</h3>
                            {data.topProducts.length === 0 ? (
                                <p className="text-sm text-[#8B8072]">No itemized sales in this period.</p>
                            ) : (
                                <div className="space-y-3">
                                    {data.topProducts.map((p) => (
                                        <div key={p.name}>
                                            <div className="flex justify-between gap-3 text-xs">
                                                <span className="truncate text-[#241F1A]">{p.name}</span>
                                                <span className="shrink-0 text-[#6B6153]" style={font.mono}>{p.units} sold · {peso(p.revenue)}</span>
                                            </div>
                                            <div className="mt-1.5 flex"><Bar value={p.revenue} max={maxProduct} color="#5B6E58" /></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p className="mt-4 text-xs text-[#8B8072]">Walk-in sales recorded without item details aren't included here.</p>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="rounded-2xl border border-[#E3DACB] bg-white p-5">
                            <h3 className="mb-4 text-sm font-semibold text-[#241F1A]">Inventory snapshot (today)</h3>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {[
                                    ["Designs listed", data.inventory.designs],
                                    ["Units in stock", data.inventory.units],
                                    ["Low stock", data.inventory.low],
                                    ["Out of stock", data.inventory.out],
                                ].map(([label, value]) => (
                                    <div key={label} className="rounded-lg bg-[#FBF8F3] p-3">
                                        <p className="text-xs text-[#8B8072]">{label}</p>
                                        <p className="mt-1 text-xl" style={font.display}>{value}</p>
                                    </div>
                                ))}
                            </div>
                            {data.inventory.watch.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {data.inventory.watch.map((p) => (
                                        <div key={p._id} className="flex items-center justify-between gap-2 text-sm">
                                            <span className="truncate text-[#241F1A]">{p.name} <span className="text-xs text-[#8B8072]">· {p.totalStock} left</span></span>
                                            <ProductPill status={p.status} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="rounded-2xl border border-[#E3DACB] bg-white p-5">
                            <h3 className="mb-4 text-sm font-semibold text-[#241F1A]">Design requests (all time)</h3>
                            <div className="space-y-3">
                                {data.designs.map((d) => (
                                    <div key={d.status} className="flex justify-between text-sm">
                                        <span className="text-[#6B6153]">{d.status}</span>
                                        <span style={font.mono}>{d.count}</span>
                                    </div>
                                ))}
                            </div>
                            <h3 className="mb-3 mt-6 text-sm font-semibold text-[#241F1A]">By channel</h3>
                            {["Online", "Walk-in"].map((c) => (
                                <div key={c} className="flex justify-between border-t border-[#F3EEE4] py-2 text-sm">
                                    <span className="text-[#6B6153]">{c} · {data.channels[c].orders} orders</span>
                                    <span style={font.mono}>{peso(data.channels[c].billed)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}