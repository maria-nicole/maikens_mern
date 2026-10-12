import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { font, api, errMsg, peso, formatDate } from "./staffLib";
import { SectionHeader, Segmented, EmptyState, Spinner, ErrorNote, inputCls } from "./ui";

export default function CustomersView() {
    const [scope, setScope] = useState("Today");
    const [search, setSearch] = useState("");
    const [q, setQ] = useState("");
    const [rows, setRows] = useState(null);
    const [error, setError] = useState("");
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const t = setTimeout(() => setQ(search.trim()), 300);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        let ignore = false;
        setError("");
        api
            .get("/staff/customers", { params: { scope: scope === "Today" ? "today" : "all", q } })
            .then(({ data }) => !ignore && setRows(data))
            .catch((err) => !ignore && setError(errMsg(err)));
        return () => {
            ignore = true;
        };
    }, [scope, q, tick]);

    return (
        <div>
            <SectionHeader eyebrow="Read-only" title="Customers" />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <Segmented label="Time range" value={scope} options={["Today", "All time"]} onChange={(v) => { setRows(null); setScope(v); }} />
                <div className="relative min-w-[200px] max-w-xs flex-1">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#B4A88F]" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name…" aria-label="Search customers" className={`${inputCls} pl-8`} />
                </div>
            </div>

            <ErrorNote onRetry={() => setTick((t) => t + 1)}>{error}</ErrorNote>

            <div className="overflow-x-auto rounded-2xl border border-[#E3DACB] bg-white">
                {rows === null && !error ? (
                    <Spinner label="Loading customers…" />
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-[#EFE9E3] text-xs uppercase tracking-wide text-[#9C8C74]">
                                <th className="px-5 py-3 font-medium">Customer</th>
                                <th className="px-5 py-3 font-medium">Contact</th>
                                <th className="px-5 py-3 font-medium">Orders</th>
                                <th className="px-5 py-3 font-medium">Total ordered</th>
                                <th className="px-5 py-3 font-medium">Paid so far</th>
                                <th className="px-5 py-3 font-medium">Last order</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(rows || []).map((c) => (
                                <tr key={c.key} className="border-b border-[#F3EEE4] last:border-0 hover:bg-[#FBF8F3]">
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-[#241F1A]">{c.name}</p>
                                        <p className="text-xs text-[#9C8C74]">{c.registered ? "Has an account" : "Walk-in"}</p>
                                    </td>
                                    <td className="px-5 py-3 text-xs text-[#4A4136]">
                                        {c.phone || c.email ? (
                                            <>
                                                {c.phone && <p>{c.phone}</p>}
                                                {c.email && <p className="break-all">{c.email}</p>}
                                            </>
                                        ) : (
                                            <span className="text-[#B4A88F]">None on file</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 text-[#4A4136]">{c.orders}</td>
                                    <td className="px-5 py-3" style={font.mono}>{peso(c.spent)}</td>
                                    <td className="px-5 py-3" style={font.mono}>{peso(c.paid)}</td>
                                    <td className="px-5 py-3 text-[#8B8072]">{formatDate(c.last)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {rows && rows.length === 0 && (
                    <EmptyState
                        title={q ? "No customers match" : scope === "Today" ? "No customers yet today" : "No customers yet"}
                        hint={q ? "Try a different name." : "Customers appear here after their first order."}
                    />
                )}
            </div>
        </div>
    );
}