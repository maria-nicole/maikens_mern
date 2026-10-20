import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Minus, Trash2, Truck } from "lucide-react";
import { font, api, errMsg, assetUrl, peso, shortId } from "./staffLib";
import { SectionHeader, PrimaryButton, Segmented, Spinner, EmptyState, ErrorNote, StockPill, inputCls } from "./ui";
import ReceiptModal from "./ReceiptModal";

const MAX_LINE_QTY = 20; // keep in sync with MAX_QTY in staff.route.js

export default function NewSaleView({ products, loading, loadError, onSold, notify }) {
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("All");
    const [cart, setCart] = useState([]);
    const [customer, setCustomer] = useState("");
    const [method, setMethod] = useState("Cash");
    const [payInFull, setPayInFull] = useState(true);
    const [deposit, setDeposit] = useState("");
    const [cashReceived, setCashReceived] = useState("");
    const [shippingFee, setShippingFee] = useState(""); // only when the sale is being delivered
    const [shopFee, setShopFee] = useState(null); // the shop's usual delivery fee
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [receipt, setReceipt] = useState(null);

    // The usual delivery fee, so the common case is one click
    useEffect(() => {
        let ignore = false;
        api
            .get("/settings")
            .then(({ data }) => !ignore && setShopFee(data.deliveryFee))
            .catch(() => {});
        return () => {
            ignore = true;
        };
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return products
            .filter((p) => (category === "All" || p.category === category) && p.name.toLowerCase().includes(q))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [products, query, category]);

    const qtyInCart = (productId, size) =>
        cart.find((l) => l.productId === productId && l.size === size)?.quantity || 0;

    // Ready-to-wear is limited by stock. Made-to-order and unsized items are not.
    const limitFor = (p, size) => {
        const sized = p.sizes?.length > 0;
        if (!sized || p.fulfillment === "Made-to-order") return MAX_LINE_QTY;
        return Math.min(MAX_LINE_QTY, p.sizes.find((s) => s.size === size)?.stock ?? 0);
    };

    const addToCart = (p, size = "") => {
        const existing = cart.find((l) => l.productId === p._id && l.size === size);
        const limit = limitFor(p, size);
        if ((existing?.quantity || 0) >= limit) {
            notify("error", `No more ${p.name}${size ? ` (${size})` : ""} available.`);
            return;
        }
        setError("");
        setCart((prev) =>
            existing
                ? prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l))
                : [
                    ...prev,
                    {
                        productId: p._id,
                        name: p.name,
                        size,
                        unitPrice: p.price,
                        quantity: 1,
                        limit,
                        madeToOrder: p.fulfillment === "Made-to-order",
                    },
                ]
        );
    };

    const changeQty = (line, delta) =>
        setCart((prev) =>
            prev
                .map((l) => (l === line ? { ...l, quantity: Math.min(l.limit, l.quantity + delta) } : l))
                .filter((l) => l.quantity > 0)
        );

    const removeLine = (line) => setCart((prev) => prev.filter((l) => l !== line));

    /* ---- totals ---- */
    const shipping = shippingFee === "" ? 0 : Number(shippingFee);
    const shippingValid = Number.isFinite(shipping) && shipping >= 0;
    const total = cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0) + (shippingValid ? shipping : 0);
    const hasMadeToOrder = cart.some((l) => l.madeToOrder);
    const takingDeposit = hasMadeToOrder && !payInFull;
    const paying = takingDeposit ? Number(deposit) || 0 : total;
    const depositInvalid = takingDeposit && (!(paying > 0) || paying > total);
    const tendered = Number(cashReceived) || 0;
    const change = method === "Cash" && cashReceived !== "" ? tendered - paying : null;
    const cashShort = change !== null && change < 0;
    const canSubmit = cart.length > 0 && customer.trim() && !depositInvalid && !cashShort && shippingValid && !submitting;

    const submit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        setError("");
        try {
            const { data } = await api.post("/staff/sales", {
                customerName: customer.trim(),
                items: cart.map(({ productId, size, quantity }) => ({ productId, size, quantity })),
                paymentMethod: method,
                amountPaid: paying,
                cashReceived: method === "Cash" && cashReceived !== "" ? tendered : undefined,
                shippingFee: shipping,
            });
            setReceipt(data);
            setCart([]);
            setCustomer("");
            setDeposit("");
            setCashReceived("");
            setShippingFee("");
            setPayInFull(true);
            onSold(); // stock changed, so refresh the product list
        } catch (err) {
            setError(errMsg(err));
            if (err.response?.status === 409) onSold();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <SectionHeader eyebrow="Order processing" title="New walk-in sale" />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
                {/* ------------------------ Product picker ------------------------ */}
                <div className="rounded-2xl border border-[#E3DACB] bg-white p-5">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        <div className="relative min-w-[180px] flex-1">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#B4A88F]" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search products…"
                                aria-label="Search products"
                                className={`${inputCls} pl-8`}
                            />
                        </div>
                        <Segmented label="Category" value={category} options={["All", "Gown", "Barong"]} onChange={setCategory} />
                    </div>

                    <ErrorNote>{loadError}</ErrorNote>

                    {loading && products.length === 0 ? (
                        <Spinner label="Loading products…" />
                    ) : filtered.length === 0 ? (
                        <EmptyState title="No products found" hint="Try a different search or category." />
                    ) : (
                        <ul className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
                            {filtered.map((p) => {
                                const sized = p.sizes?.length > 0;
                                const madeToOrder = p.fulfillment === "Made-to-order";
                                return (
                                    <li key={p._id} className="flex gap-3 rounded-xl border border-[#EFE9E3] p-3">
                                        {p.images?.[0] ? (
                                            <img src={assetUrl(p.images[0])} alt="" className="h-20 w-16 shrink-0 rounded-md object-cover" />
                                        ) : (
                                            <div className="h-20 w-16 shrink-0 rounded-md bg-[#F3EEE4]" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-[#241F1A]">{p.name}</p>
                                                    <p className="text-xs text-[#9C8C74]" style={font.mono}>
                                                        {shortId("MK", p._id)} · {p.category}
                                                        {madeToOrder ? " · Made to order" : ""}
                                                    </p>
                                                </div>
                                                <p className="shrink-0 text-sm" style={font.mono}>{peso(p.price)}</p>
                                            </div>

                                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                {sized ? (
                                                    p.sizes.map(({ size, stock }) => {
                                                        const left = madeToOrder ? Infinity : stock - qtyInCart(p._id, size);
                                                        return (
                                                            <button
                                                                key={size}
                                                                type="button"
                                                                disabled={left <= 0}
                                                                onClick={() => addToCart(p, size)}
                                                                aria-label={`Add ${p.name}, size ${size}`}
                                                                className="rounded-full border border-[#E3DACB] bg-white px-2.5 py-1 text-xs font-medium text-[#4A4136] transition hover:border-[#9C7A3C] hover:bg-[#FBF8F3] disabled:cursor-not-allowed disabled:text-[#C9BFAF] disabled:line-through disabled:hover:border-[#E3DACB] disabled:hover:bg-white"
                                                            >
                                                                {size}
                                                                {!madeToOrder && <span className="ml-1 text-[#9C8C74]">{stock}</span>}
                                                            </button>
                                                        );
                                                    })
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => addToCart(p)}
                                                        className="inline-flex items-center gap-1 rounded-full border border-[#E3DACB] px-2.5 py-1 text-xs font-medium text-[#4A4136] hover:border-[#9C7A3C]"
                                                    >
                                                        <Plus size={12} /> Add
                                                    </button>
                                                )}
                                                {!madeToOrder && p.status !== "Active" && <StockPill status={p.status} />}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    <p className="mt-3 text-xs text-[#8B8072]">Tap a size to add one. The number beside a size is the stock on hand.</p>
                </div>

                {/* ------------------------ Sale panel ------------------------ */}
                <div className="h-fit rounded-2xl border border-[#E3DACB] bg-white p-5 xl:sticky xl:top-20">
                    <h3 className="mb-4 text-sm font-semibold text-[#241F1A]">Current sale</h3>

                    <div className="min-h-[72px] space-y-2">
                        {cart.length === 0 && <p className="text-sm text-[#8B8072]">Nothing added yet. Pick a product on the left.</p>}
                        {cart.map((l) => (
                            <div key={`${l.productId}|${l.size}`} className="flex items-center justify-between gap-3 rounded-lg bg-[#FBF8F3] px-3 py-2">
                                <div className="min-w-0">
                                    <p className="truncate text-sm text-[#241F1A]">
                                        {l.name}
                                        {l.size ? ` (${l.size})` : ""}
                                    </p>
                                    <p className="text-xs text-[#9C8C74]" style={font.mono}>
                                        {peso(l.unitPrice)} each{l.madeToOrder ? " · made to order" : ""}
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5">
                                    <button type="button" onClick={() => changeQty(l, -1)} aria-label="Decrease quantity" className="rounded-md border border-[#E3DACB] p-1 text-[#4A4136] hover:bg-white">
                                        <Minus size={12} />
                                    </button>
                                    <span className="w-5 text-center text-sm" style={font.mono}>{l.quantity}</span>
                                    <button type="button" onClick={() => changeQty(l, 1)} disabled={l.quantity >= l.limit} aria-label="Increase quantity" className="rounded-md border border-[#E3DACB] p-1 text-[#4A4136] hover:bg-white disabled:opacity-40">
                                        <Plus size={12} />
                                    </button>
                                    <button type="button" onClick={() => removeLine(l)} aria-label={`Remove ${l.name}`} className="rounded-md p-1 text-[#7C4A4A] hover:bg-[#F3E4E2]">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 space-y-4">
                        <div>
                            <label htmlFor="customer" className="mb-1.5 block text-sm font-medium text-[#241F1A]">Customer name</label>
                            <input id="customer" value={customer} onChange={(e) => setCustomer(e.target.value)} maxLength={80} placeholder="e.g. Maria Santos" className={inputCls} />
                        </div>

                        <div>
                            <p className="mb-1.5 text-sm font-medium text-[#241F1A]">Payment method</p>
                            <Segmented label="Payment method" value={method} options={["Cash", "GCash"]} onChange={setMethod} />
                        </div>

                        <div>
                            <label htmlFor="shipping-fee" className="mb-1.5 block text-sm font-medium text-[#241F1A]">
                                Shipping fee (optional)
                            </label>
                            <input
                                id="shipping-fee"
                                type="number"
                                min="0"
                                step="0.01"
                                value={shippingFee}
                                onChange={(e) => setShippingFee(e.target.value)}
                                placeholder="0"
                                className={inputCls}
                                style={font.mono}
                            />
                            <p className="mt-1.5 text-xs text-[#8B8072]">
                                Leave it at 0 for a pick-up. A delivery is carried by Lalamove.
                            </p>
                            {shopFee !== null && (
                                <button
                                    type="button"
                                    onClick={() => setShippingFee(String(shopFee))}
                                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-[#9C7A3C] hover:underline"
                                >
                                    <Truck size={12} /> Use the usual fee ({peso(shopFee)})
                                </button>
                            )}
                        </div>

                        {hasMadeToOrder && (
                            <div>
                                <p className="mb-1.5 text-sm font-medium text-[#241F1A]">Amount to pay now</p>
                                <Segmented
                                    label="Amount to pay now"
                                    value={payInFull ? "Pay in full" : "Deposit"}
                                    options={["Pay in full", "Deposit"]}
                                    onChange={(v) => setPayInFull(v === "Pay in full")}
                                />
                                {takingDeposit && (
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={deposit}
                                        onChange={(e) => setDeposit(e.target.value)}
                                        placeholder="Deposit amount"
                                        aria-label="Deposit amount"
                                        className={`${inputCls} mt-2`}
                                        style={font.mono}
                                    />
                                )}
                                <p className="mt-1.5 text-xs text-[#8B8072]">Made-to-order items can take a deposit. The balance is collected later from Orders.</p>
                            </div>
                        )}

                        {method === "Cash" && (
                            <div>
                                <label htmlFor="cash" className="mb-1.5 block text-sm font-medium text-[#241F1A]">Cash received (optional)</label>
                                <input id="cash" type="number" min="0" step="0.01" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} className={inputCls} style={font.mono} />
                                {change !== null && (
                                    <p className={`mt-1.5 text-xs ${cashShort ? "text-[#6B3838]" : "text-[#3E4E3B]"}`}>
                                        {cashShort ? `Short by ${peso(-change)}` : `Change: ${peso(change)}`}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <dl className="mt-5 space-y-1.5 border-t border-[#EFE9E3] pt-4 text-sm">
                        {shipping > 0 && (
                            <div className="flex justify-between">
                                <dt className="text-[#8B8072]">Shipping</dt>
                                <dd style={font.mono}>{peso(shipping)}</dd>
                            </div>
                        )}
                        <div className="flex justify-between"><dt className="text-[#8B8072]">Total</dt><dd className="text-lg" style={{ ...font.display, color: "#241F1A" }}>{peso(total)}</dd></div>
                        {takingDeposit && (
                            <>
                                <div className="flex justify-between"><dt className="text-[#8B8072]">Paying now</dt><dd style={font.mono}>{peso(paying)}</dd></div>
                                <div className="flex justify-between"><dt className="text-[#8B8072]">Balance</dt><dd style={font.mono}>{peso(Math.max(0, total - paying))}</dd></div>
                            </>
                        )}
                    </dl>

                    {error && <p role="alert" className="mt-4 rounded-lg bg-[#F3E4E2] px-3 py-2 text-sm text-[#6B3838]">{error}</p>}

                    <PrimaryButton onClick={submit} disabled={!canSubmit} loading={submitting} className="mt-4 w-full">
                        {submitting ? "Completing…" : "Complete sale"}
                    </PrimaryButton>
                </div>
            </div>

            <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />
        </div>
    );
}