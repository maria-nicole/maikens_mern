import { useEffect } from "react";
import { Loader2, X } from "lucide-react";
import { font, STATUS_TONE, PAYMENT_TONE, STOCK_TONE } from "./staffLib";

export const inputCls =
    "w-full rounded-lg border border-[#E3DACB] bg-white px-3 py-2 text-sm text-[#241F1A] outline-none transition placeholder:text-[#B4A88F] focus:border-[#9C7A3C] focus:ring-2 focus:ring-[#9C7A3C]/20 disabled:bg-[#FBF8F3] disabled:text-[#B4A88F]";

export function StatCard({ label, value, sub, accent }) {
    return (
        <div className="rounded-2xl border border-[#E3DACB] bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-[#8B8072]">{label}</p>
            <p className="mt-2 text-3xl" style={{ ...font.display, color: "#241F1A" }}>{value}</p>
            {sub && <p className="mt-1 text-xs" style={{ color: accent || "#5B6E58" }}>{sub}</p>}
        </div>
    );
}

export function SectionHeader({ eyebrow, title, action }) {
    return (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
                {eyebrow && <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#9C7A3C]">{eyebrow}</p>}
                <h2 className="mt-1 text-2xl" style={{ ...font.display, color: "#241F1A" }}>{title}</h2>
            </div>
            {action}
        </div>
    );
}

export function PrimaryButton({ children, onClick, icon: IconEl, disabled, loading, type = "button", className = "" }) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`inline-flex items-center justify-center gap-2 rounded-lg bg-[#241F1A] px-4 py-2 text-sm font-medium text-[#F5EFE4] transition hover:bg-[#3a3229] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
        >
            {loading ? <Loader2 size={15} className="animate-spin" /> : IconEl && <IconEl size={15} />}
            {children}
        </button>
    );
}

export function GhostButton({ children, onClick, icon: IconEl, disabled, type = "button", className = "" }) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex items-center gap-1.5 rounded-lg border border-[#E3DACB] bg-white px-3 py-1.5 text-xs font-medium text-[#4A4136] transition hover:border-[#C9BBA3] hover:bg-[#FBF8F3] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
        >
            {IconEl && <IconEl size={13} />}
            {children}
        </button>
    );
}

export function StatusPill({ status }) {
    const tone = STATUS_TONE[status] || { dot: "#8a8a8a", bg: "#eee", text: "#444" };
    return (
        <span
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed px-2.5 py-1 text-xs font-medium"
            style={{ background: tone.bg, color: tone.text, borderColor: tone.dot + "80" }}
        >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.dot }} />
            {status}
        </span>
    );
}

export function PaymentPill({ status = "Unpaid" }) {
    const tone = PAYMENT_TONE[status] || PAYMENT_TONE.Unpaid;
    return (
        <span className="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: tone.bg, color: tone.text }}>
            {status}
        </span>
    );
}

export function StockPill({ status }) {
    const tone = STOCK_TONE[status] || STOCK_TONE.Active;
    return (
        <span
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed px-2.5 py-1 text-xs font-medium"
            style={{ background: tone.bg, color: tone.text, borderColor: tone.dot + "80" }}
        >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.dot }} />
            {tone.label}
        </span>
    );
}

export function EmptyState({ title, hint, action }) {
    return (
        <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-[#241F1A]">{title}</p>
            {hint && <p className="mt-1 text-xs text-[#8B8072]">{hint}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

export function Spinner({ label = "Loading…" }) {
    return (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#8B8072]">
            <Loader2 size={18} className="animate-spin text-[#9C7A3C]" /> {label}
        </div>
    );
}

export function ErrorNote({ children, onRetry }) {
    if (!children) return null;
    return (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#7C4A4A]/30 bg-[#F3E4E2] px-4 py-3 text-sm text-[#6B3838]">
            <span>{children}</span>
            {onRetry && <GhostButton onClick={onRetry}>Retry</GhostButton>}
        </div>
    );
}

export function Field({ label, htmlFor, hint, children }) {
    return (
        <div>
            <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-[#241F1A]">{label}</label>
            {children}
            {hint && <p className="mt-1.5 text-xs text-[#8B8072]">{hint}</p>}
        </div>
    );
}

export function Segmented({ value, options, onChange, label }) {
    return (
        <div role="group" aria-label={label} className="flex w-fit gap-1 rounded-lg border border-[#E3DACB] bg-white p-1">
            {options.map((opt) => (
                <button
                    key={opt}
                    type="button"
                    aria-pressed={value === opt}
                    onClick={() => onChange(opt)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${value === opt ? "bg-[#241F1A] text-[#F5EFE4]" : "text-[#6B6153] hover:bg-[#FBF8F3]"
                        }`}
                >
                    {opt}
                </button>
            ))}
        </div>
    );
}

export function Modal({ label, onClose, children, maxWidth = "max-w-md" }) {
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={label}
                className={`max-h-[90vh] w-full ${maxWidth} overflow-y-auto rounded-2xl bg-white p-6`}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
}

export function CloseButton({ onClose }) {
    return (
        <button onClick={onClose} aria-label="Close" className="no-print rounded-md p-1 text-[#8B8072] hover:bg-[#FBF8F3]">
            <X size={16} />
        </button>
    );
}