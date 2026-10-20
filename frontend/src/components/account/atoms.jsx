import { Link, useLocation } from "react-router-dom";
import { Check, Info, Lock, Loader2, Package, Sparkles } from "lucide-react";
import { DESIGN_STATUS, FALLBACK_STATUS, NAVBAR_PT, ORDER_STATUS, PAYMENT_POLICY, assetUrl, cardClass, primaryLink } from "./accountShared";

/* Small building blocks shared by the account panels. Keeping them here means the
   order card, the design card and the overview all show the same badges and thumbnails. */

/* How the boutique takes payment: half up front, and payments are not refundable.
   Shown at checkout and in My Orders, so the customer meets the same terms in both
   places. It reads as a gentle notice box rather than a warning, matching the delivery
   note beside it, because it is information the customer needs and not an error. */
export function PaymentPolicyNote({ className = "" }) {
  return (
    <div className={`mt-3 flex items-start gap-2 rounded-xl bg-[#FBF8F3] px-3 py-2.5 text-sm text-[#4A4136] ${className}`}>
      <Info size={15} className="mt-0.5 shrink-0 text-[#9C7A3C]" />
      <div className="space-y-1.5">
        {PAYMENT_POLICY.map((rule) => (
          <p key={rule.title}>
            <strong className="font-semibold text-[#241F1A]">{rule.title}.</strong> {rule.body}
          </p>
        ))}
      </div>
    </div>
  );
}

export function Toast({ text }) {
  if (!text) return null;
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-800 text-white px-5 py-3 rounded-md shadow-lg text-sm flex items-center gap-2"
    >
      <Check size={14} className="text-yellow-500" />
      {text}
    </div>
  );
}

export function Spinner({ size = 28 }) {
  return <Loader2 size={size} className="animate-spin text-yellow-600/89" />;
}

export function Skeleton({ className = "" }) {
  return <div className={`bg-zinc-100 animate-pulse rounded-md ${className}`} />;
}

export function LoadingScreen() {
  return (
    <div className={`min-h-screen bg-gray-50 ${NAVBAR_PT} flex items-center justify-center`}>
      <Spinner />
    </div>
  );
}

export function LoggedOutScreen({ message }) {
  const location = useLocation();
  return (
    <div className={`min-h-screen bg-gray-50 ${NAVBAR_PT} px-4 flex items-center justify-center`}>
      <div className="bg-white rounded-lg border border-gray-200 p-10 text-center w-full max-w-md">
        <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
          <Lock size={24} className="text-yellow-600/89" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-800">Please log in first</h1>
        <p className="text-sm text-zinc-600 mt-2 mb-6">
          {message || "Log in to see your orders, custom designs, favorites and cart."}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/login" state={{ from: location }} className={`w-full sm:w-auto ${primaryLink}`}>
            Log In
          </Link>
          <Link
            to="/register"
            className="px-6 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ErrorScreen({ message }) {
  return (
    <div className={`min-h-screen bg-gray-50 ${NAVBAR_PT} px-4 flex items-center justify-center`}>
      <div className="bg-white rounded-lg border border-gray-200 p-10 text-center w-full max-w-md">
        <p className="text-sm text-red-700 mb-4">{message || "Something went wrong."}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-yellow-600/89 text-white text-sm font-medium rounded-md hover:bg-yellow-700/89"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

/* A white card with the same small uppercase label every panel uses */
export function SectionCard({ title, icon, action, children, className = "", bodyClass = "" }) {
  const Icon = icon;
  const hasHeader = Boolean(title || action);
  return (
    <div className={`${cardClass} ${className}`}>
      {hasHeader && (
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
            {Icon && <Icon size={12} />}
            {title}
          </p>
          {action}
        </div>
      )}
      <div className={bodyClass || (hasHeader ? "px-5 pb-5" : "p-5")}>{children}</div>
    </div>
  );
}

export function EmptyState({ icon, title, text, action }) {
  const Icon = icon;
  return (
    <div className="text-center py-20 text-gray-400">
      {Icon && <Icon size={40} className="mx-auto mb-3 opacity-30" />}
      <p className="text-sm">{title}</p>
      {text && <p className="text-xs mt-1">{text}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/* ── Order bits ── */

export function StatusPill({ status }) {
  const tone = (ORDER_STATUS[status] || FALLBACK_STATUS).color;
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${tone}`}>{status}</span>
  );
}

export function OrderProgress({ status }) {
  const tone = ORDER_STATUS[status] || FALLBACK_STATUS;

  // A cancelled order never reached a stage, so an empty or full bar would both mislead:
  // show a flat bar that reads as stopped.
  if (tone.cancelled) {
    return (
      <div
        className="h-1.5 w-full rounded-full bg-red-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={0}
        aria-label={`Order progress: ${status}`}
      />
    );
  }

  return (
    <div
      className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={5}
      aria-valuenow={tone.step}
      aria-label={`Order progress: ${status}`}
    >
      <div className="h-full rounded-full bg-yellow-600/89 transition-all" style={{ width: `${(tone.step / 5) * 100}%` }} />
    </div>
  );
}

export function OrderThumb({ order, className = "" }) {
  const image = order?.items?.[0]?.image;
  return image ? (
    <img src={assetUrl(image)} alt="" className={`object-cover rounded-md border border-gray-100 ${className}`} />
  ) : (
    <div className={`rounded-md border border-gray-100 bg-zinc-100 flex items-center justify-center text-zinc-400 ${className}`}>
      <Package size={16} />
    </div>
  );
}

/* ── Design bits ── */

export function DesignPill({ status }) {
  const tone = DESIGN_STATUS[status] || DESIGN_STATUS["Pending review"];
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${tone}`}>{status}</span>
  );
}

export function DesignThumb({ design, className = "", iconSize = 16 }) {
  return design?.previewImage ? (
    <img src={assetUrl(design.previewImage)} alt={design.base} className={`object-cover rounded-md border border-gray-100 ${className}`} />
  ) : (
    <div className={`rounded-md border border-gray-100 bg-zinc-100 flex items-center justify-center text-zinc-400 ${className}`}>
      <Sparkles size={iconSize} />
    </div>
  );
}
