import { useEffect, useState } from "react";
import { Truck } from "lucide-react";
import { api, errMsg, peso } from "./adminLib";
import { SectionHeader, Field, PrimaryButton, Spinner, ErrorNote, inputCls } from "./ui";

/* The shop's own settings.

   The delivery fee set here is what new online delivery orders are charged — the
   customer sees it at checkout. Orders already placed keep the fee they were
   charged; that one can be changed on the order itself (see OrdersView). */
export default function SettingsView({ notify }) {
    const [fee, setFee] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [tick, setTick] = useState(0); // bump to reload

    useEffect(() => {
        let ignore = false;
        (async () => {
            try {
                const { data } = await api.get("/settings");
                if (ignore) return;
                setFee(String(data.deliveryFee ?? 0));
                setError("");
            } catch (err) {
                if (!ignore) setError(errMsg(err));
            } finally {
                if (!ignore) setLoading(false);
            }
        })();
        return () => {
            ignore = true;
        };
    }, [tick]);

    const amount = Number(fee);
    const invalid = fee === "" || !Number.isFinite(amount) || amount < 0;

    const save = async (e) => {
        e.preventDefault();
        if (invalid) return;
        setSaving(true);
        try {
            const { data } = await api.put("/settings", { deliveryFee: amount });
            setFee(String(data.deliveryFee));
            notify("success", `Delivery fee is now ${peso(data.deliveryFee)}.`);
        } catch (err) {
            notify("error", errMsg(err));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Spinner label="Loading settings…" />;

    return (
        <div>
            <SectionHeader eyebrow="Shop settings" title="Settings" />

            <ErrorNote onRetry={() => setTick((t) => t + 1)}>{error}</ErrorNote>

            <form onSubmit={save} className="max-w-lg space-y-5">
                <div className="rounded-2xl border border-[#E3DACB] bg-white p-5">
                    <h3 className="text-sm font-semibold text-[#241F1A]">Delivery</h3>

                    <div className="mt-4 space-y-4">
                        <Field
                            label="Delivery fee (₱)"
                            htmlFor="delivery-fee"
                            hint="Charged on new online delivery orders. Orders already placed keep the fee they were charged."
                            error={invalid && fee !== "" ? "Enter a number of 0 or more." : null}
                        >
                            <input
                                id="delivery-fee"
                                type="number"
                                min="0"
                                step="0.01"
                                value={fee}
                                onChange={(e) => setFee(e.target.value)}
                                className={inputCls}
                            />
                        </Field>

                        <div className="flex items-start gap-2 rounded-xl bg-[#FBF8F3] px-3 py-2.5 text-sm text-[#4A4136]">
                            <Truck size={15} className="mt-0.5 shrink-0 text-[#9C7A3C]" />
                            <span>
                                Deliveries are carried by <strong className="font-semibold text-[#241F1A]">Lalamove</strong>. The
                                customer is told this when they check out and on their order slip.
                            </span>
                        </div>
                    </div>
                </div>

                <PrimaryButton type="submit" loading={saving} disabled={invalid}>
                    Save settings
                </PrimaryButton>
            </form>
        </div>
    );
}
