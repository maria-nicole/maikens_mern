import { useState } from "react";
import { font, api, errMsg, peso, orderNo, balanceOf } from "./staffLib";
import { Modal, CloseButton, PrimaryButton, Field, Segmented, inputCls } from "./ui";

// Records a deposit, a balance, or confirms a customer's GCash payment.
export default function CollectPaymentModal({ order, onClose, onDone }) {
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
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal label="Collect payment" onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-lg" style={font.display}>Collect payment</h3>
                        <p className="text-xs text-[#8B8072]">
                            {orderNo(order)} · {order.customerName}
                        </p>
                    </div>
                    <CloseButton onClose={onClose} />
                </div>

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
                    <input
                        id="pay-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className={inputCls}
                        style={font.mono}
                    />
                </Field>

                {method === "Cash" && (
                    <Field
                        label="Cash handed over (optional)"
                        htmlFor="pay-cash"
                        hint={change === null ? "Enter it to work out the change." : change < 0 ? "That's less than the amount." : `Change: ${peso(change)}`}
                    >
                        <input
                            id="pay-cash"
                            type="number"
                            min="0"
                            step="0.01"
                            value={cashReceived}
                            onChange={(e) => setCashReceived(e.target.value)}
                            className={inputCls}
                            style={font.mono}
                        />
                    </Field>
                )}

                {error && <p role="alert" className="rounded-lg bg-[#F3E4E2] px-3 py-2 text-sm text-[#6B3838]">{error}</p>}

                <PrimaryButton type="submit" loading={saving} disabled={invalid} className="w-full">
                    Record payment
                </PrimaryButton>
            </form>
        </Modal>
    );
}