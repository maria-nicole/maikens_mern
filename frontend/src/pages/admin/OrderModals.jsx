import { useState } from "react";
import { font, api, errMsg, assetUrl, peso, orderNo, balanceOf, formatDate, formatDateTime } from "./adminLib";
import { Modal, ModalHeader, StatusPill, PaymentPill, PrimaryButton, Field, Segmented, inputCls } from "./ui";

// Everything about one order: what was bought, who gets it, how it was paid.
export function OrderDetailModal({ order, onClose }) {
    const lines = order.items?.length ? order.items : [{ name: order.item, quantity: 1, unitPrice: order.total, size: "" }];
    const balance = balanceOf(order);

    return (
        <Modal label={`Order ${orderNo(order)}`} onClose={onClose} maxWidth="max-w-lg">
            <ModalHeader title={`Order ${orderNo(order)}`} subtitle={`${order.channel} · ${formatDateTime(order.createdAt)}`} onClose={onClose} />

            <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={order.status} />
                <PaymentPill status={order.paymentStatus} />
                <span className="text-xs text-[#8B8072]">{order.fulfillment}</span>
            </div>

            <div className="mt-4 rounded-xl border border-[#EFE9E3] p-4">
                <p className="text-sm font-medium text-[#241F1A]">{order.customerName}</p>
                <div className="mt-3 space-y-3">
                    {lines.map((l, i) => (
                        <div key={i} className="flex gap-3">
                            {l.image ? (
                                <img src={assetUrl(l.image)} alt="" className="h-16 w-12 shrink-0 rounded-md object-cover" />
                            ) : (
                                <div className="h-16 w-12 shrink-0 rounded-md bg-[#F3EEE4]" />
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-sm text-[#241F1A]">{l.name}</p>
                                <p className="text-xs text-[#8B8072]">{[l.size && `Size ${l.size}`, `×${l.quantity}`].filter(Boolean).join(" · ")}</p>
                            </div>
                            <p className="text-sm" style={font.mono}>{peso(l.unitPrice * l.quantity)}</p>
                        </div>
                    ))}
                </div>
                <div className="mt-3 space-y-1 border-t border-[#EFE9E3] pt-3 text-sm">
                    {order.shippingFee > 0 && (
                        <div className="flex justify-between text-[#4A4136]"><span>Shipping</span><span style={font.mono}>{peso(order.shippingFee)}</span></div>
                    )}
                    <div className="flex justify-between font-semibold text-[#241F1A]"><span>Total</span><span style={font.mono}>{peso(order.total)}</span></div>
                    <div className="flex justify-between text-[#4A4136]"><span>Paid so far</span><span style={font.mono}>{peso(order.amountPaid)}</span></div>
                    {balance > 0 && <div className="flex justify-between text-[#6B3838]"><span>Balance due</span><span style={font.mono}>{peso(balance)}</span></div>}
                </div>
            </div>

            {(order.deliveryMethod || order.paymentMethod) && (
                <dl className="mt-4 space-y-1.5 text-sm">
                    {order.deliveryMethod && (
                        <div className="flex justify-between gap-4"><dt className="text-[#8B8072]">Fulfillment</dt><dd className="text-right text-[#241F1A]">{order.deliveryMethod}</dd></div>
                    )}
                    {order.deliveryMethod === "Delivery" && order.address && (
                        <div className="flex justify-between gap-4"><dt className="text-[#8B8072]">Address</dt><dd className="text-right text-[#241F1A]">{order.address}</dd></div>
                    )}
                    {order.deliveryMethod === "Pick-up" && order.pickupDate && (
                        <div className="flex justify-between gap-4"><dt className="text-[#8B8072]">Pick-up date</dt><dd className="text-right text-[#241F1A]">{formatDate(order.pickupDate)}</dd></div>
                    )}
                    {order.paymentMethod && (
                        <div className="flex justify-between gap-4"><dt className="text-[#8B8072]">Payment</dt><dd className="text-right text-[#241F1A]">{order.paymentMethod}{order.gcashNumber ? ` · ${order.gcashNumber}` : ""}</dd></div>
                    )}
                </dl>
            )}

            <div className="mt-4">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#8B8072]">Payments received</p>
                {order.payments?.length ? (
                    <div className="space-y-1 text-xs text-[#4A4136]">
                        {order.payments.map((p) => (
                            <div key={p._id} className="flex justify-between gap-3">
                                <span>{p.method} · {formatDateTime(p.at)}{p.receivedByName ? ` · ${p.receivedByName}` : ""}</span>
                                <span style={font.mono}>{peso(p.amount)}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-[#8B8072]">No payment recorded yet.</p>
                )}
            </div>
        </Modal>
    );
}

// Records a deposit, a balance, or confirms a customer's GCash payment.
// Uses the same endpoint the staff console uses, so both stay in step.
export function PaymentModal({ order, onClose, onDone }) {
    const balance = balanceOf(order);
    const [method, setMethod] = useState(order.paymentMethod === "GCash" ? "GCash" : "Cash");
    const [amount, setAmount] = useState(String(balance));
    const [cashReceived, setCashReceived] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const paying = Number(amount) || 0;
    const received = Number(cashReceived) || 0;
    const change = method === "Cash" && cashReceived !== "" ? received - paying : null;
    const invalid = !(paying > 0) || paying > balance || (change !== null && change < 0);

    const submit = async (e) => {
        e.preventDefault();
        if (invalid) return;
        setSaving(true);
        setError("");
        try {
            const { data } = await api.post(`/staff/orders/${order._id}/payments`, {
                method,
                amount: paying,
                cashReceived: method === "Cash" && cashReceived !== "" ? received : undefined,
            });
            onDone(data);
        } catch (err) {
            setError(errMsg(err));
            setSaving(false);
        }
    };

    return (
        <Modal label="Record payment" onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <ModalHeader title="Record payment" subtitle={`${orderNo(order)} · ${order.customerName}`} onClose={onClose} />

                <div className="flex justify-between rounded-lg bg-[#FBF8F3] px-3 py-2 text-sm">
                    <span className="text-[#8B8072]">Balance due</span>
                    <span style={font.mono}>{peso(balance)}</span>
                </div>

                <Field label="Payment method">
                    <Segmented label="Payment method" value={method} options={["Cash", "GCash"]} onChange={setMethod} />
                </Field>

                {order.channel === "Online" && order.gcashNumber && method === "GCash" && (
                    <p className="text-xs text-[#8B8072]">Customer's GCash number: {order.gcashNumber}</p>
                )}

                <Field label="Amount received" htmlFor="pay-amount">
                    <input id="pay-amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} style={font.mono} />
                </Field>

                {method === "Cash" && (
                    <Field
                        label="Cash handed over (optional)"
                        htmlFor="pay-cash"
                        hint={change === null ? "Enter it to work out the change." : change < 0 ? "That's less than the amount." : `Change: ${peso(change)}`}
                    >
                        <input id="pay-cash" type="number" min="0" step="0.01" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} className={inputCls} style={font.mono} />
                    </Field>
                )}

                {error && <p role="alert" className="rounded-lg bg-[#F3E4E2] px-3 py-2 text-sm text-[#6B3838]">{error}</p>}

                <PrimaryButton type="submit" loading={saving} disabled={invalid} className="w-full">Record payment</PrimaryButton>
            </form>
        </Modal>
    );
}