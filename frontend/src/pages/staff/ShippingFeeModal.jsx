import { useEffect, useState } from "react";
import { Truck } from "lucide-react";
import { font, api, errMsg, peso, orderNo } from "./staffLib";
import { Modal, CloseButton, PrimaryButton, Field, inputCls } from "./ui";

/* Sets the shipping fee on an order — the courier's actual charge, which may differ
   from the flat fee the order was placed with. The total and the balance follow it.
   Uses the same endpoint the admin console uses, so both stay in step. */
export default function ShippingFeeModal({ order, onClose, onDone }) {
    const [fee, setFee] = useState(String(order.shippingFee || 0));
    const [shopFee, setShopFee] = useState(null); // the shop's usual delivery fee
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // The usual fee, so the common case is one click
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

    const amount = Number(fee);
    const invalid = fee === "" || !Number.isFinite(amount) || amount < 0;

    const submit = async (e) => {
        e.preventDefault();
        if (invalid) return;
        setSaving(true);
        setError("");
        try {
            const { data } = await api.patch(`/staff/orders/${order._id}/shipping`, { shippingFee: amount });
            onDone(data);
        } catch (err) {
            setError(errMsg(err));
            setSaving(false);
        }
    };

    return (
        <Modal label="Set shipping fee" onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-lg" style={font.display}>Set shipping fee</h3>
                        <p className="text-xs text-[#8B8072]">
                            {orderNo(order)} · {order.customerName}
                        </p>
                    </div>
                    <CloseButton onClose={onClose} />
                </div>

                <div className="flex items-start gap-2 rounded-lg bg-[#FBF8F3] px-3 py-2 text-xs text-[#4A4136]">
                    <Truck size={14} className="mt-0.5 shrink-0 text-[#9C7A3C]" />
                    <span>Deliveries are carried by Lalamove. The total and the balance follow this fee.</span>
                </div>

                <Field label="Shipping fee (₱)" htmlFor="staff-shipping-fee" hint="Enter 0 if the order is picked up instead.">
                    <input
                        id="staff-shipping-fee"
                        type="number"
                        min="0"
                        step="0.01"
                        value={fee}
                        onChange={(e) => setFee(e.target.value)}
                        className={inputCls}
                        style={font.mono}
                    />
                </Field>

                {shopFee !== null && (
                    <button
                        type="button"
                        onClick={() => setFee(String(shopFee))}
                        className="text-xs font-medium text-[#9C7A3C] hover:underline"
                    >
                        Use the usual fee ({peso(shopFee)})
                    </button>
                )}

                {error && <p role="alert" className="rounded-lg bg-[#F3E4E2] px-3 py-2 text-sm text-[#6B3838]">{error}</p>}

                <PrimaryButton type="submit" loading={saving} disabled={invalid} className="w-full">
                    Save shipping fee
                </PrimaryButton>
            </form>
        </Modal>
    );
}
