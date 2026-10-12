import { Printer } from "lucide-react";
import { font, peso, orderNo, balanceOf, formatDateTime } from "./staffLib";
import { Modal, CloseButton, GhostButton, PaymentPill } from "./ui";

// Works for any order: walk-in sales and online orders alike.
export default function ReceiptModal({ order, onClose }) {
    if (!order) return null;

    const lines = order.items?.length
        ? order.items
        : [{ name: order.item, quantity: 1, unitPrice: order.total, size: "" }];
    const balance = balanceOf(order);
    const payments = order.payments || [];

    return (
        <Modal label={`Receipt ${orderNo(order)}`} onClose={onClose} maxWidth="max-w-sm">
            {/* Only the receipt is printed */}
            <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #receipt-print, #receipt-print * { visibility: visible !important; }
          #receipt-print { position: fixed; left: 0; top: 0; width: 100%; padding: 16px; background: white; }
          .no-print { display: none !important; }
        }
      `}</style>

            <div id="receipt-print">
                <div className="mb-4 flex items-start justify-between">
                    <div>
                        <p className="text-lg" style={font.display}>MAIKENS</p>
                        <p className="text-xs text-[#9C8C74]">Gown &amp; Barong · Pandi, Bulacan</p>
                    </div>
                    <CloseButton onClose={onClose} />
                </div>

                <div className="rounded-lg border border-dashed border-[#D9D0C3] p-4">
                    <p className="text-xs text-[#9C8C74]" style={font.mono}>
                        {orderNo(order)} · {order.channel}
                    </p>
                    <p className="text-xs text-[#9C8C74]">{formatDateTime(order.createdAt)}</p>
                    <p className="mt-2 text-sm font-medium text-[#241F1A]">{order.customerName}</p>
                    {order.servedByName && <p className="text-xs text-[#8B8072]">Served by {order.servedByName}</p>}

                    <div className="mt-3 space-y-1.5 border-t border-[#EFE9E3] pt-3">
                        {lines.map((l, i) => (
                            <div key={i} className="flex justify-between gap-3 text-xs text-[#4A4136]">
                                <span>
                                    {l.name}
                                    {l.size ? ` (${l.size})` : ""} ×{l.quantity}
                                </span>
                                <span style={font.mono}>{peso(l.unitPrice * l.quantity)}</span>
                            </div>
                        ))}
                        {order.shippingFee > 0 && (
                            <div className="flex justify-between text-xs text-[#4A4136]">
                                <span>Shipping</span>
                                <span style={font.mono}>{peso(order.shippingFee)}</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-3 flex justify-between border-t border-[#EFE9E3] pt-3 text-sm font-semibold text-[#241F1A]">
                        <span>Total</span>
                        <span style={font.mono}>{peso(order.total)}</span>
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-[#4A4136]">
                        {payments.map((p) => (
                            <div key={p._id} className="flex justify-between gap-3">
                                <span>
                                    {p.method} · {formatDateTime(p.at)}
                                    {p.tendered ? ` (received ${peso(p.tendered)}, change ${peso(p.tendered - p.amount)})` : ""}
                                </span>
                                <span style={font.mono}>{peso(p.amount)}</span>
                            </div>
                        ))}
                        {payments.length === 0 && <p className="text-[#8B8072]">No payment recorded yet.</p>}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-[#EFE9E3] pt-3 text-xs">
                        <PaymentPill status={order.paymentStatus} />
                        {balance > 0 ? (
                            <span className="font-semibold text-[#6B3838]" style={font.mono}>Balance {peso(balance)}</span>
                        ) : (
                            <span className="text-[#3E4E3B]">Paid in full</span>
                        )}
                    </div>
                </div>

                <p className="mt-3 text-center text-xs text-[#9C8C74]">Thank you for shopping with us!</p>
            </div>

            <div className="no-print mt-5 flex gap-2">
                <GhostButton icon={Printer} onClick={() => window.print()}>Print receipt</GhostButton>
                <button onClick={onClose} className="ml-auto text-xs font-medium text-[#9C7A3C] hover:underline">Done</button>
            </div>
        </Modal>
    );
}