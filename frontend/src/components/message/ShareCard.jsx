import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { SHARE_ICON, SHARE_LABEL, SHARE_THUMB, fileUrl } from "./messageConfig";

// A product / customization / order, shown in bubbles and in the composer
export default function ShareCard({ share, onRemove }) {
  const Icon = SHARE_ICON[share.kind] || SHARE_ICON.product;
  const card = (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-2 text-left text-neutral-800">
      {share.image ? (
        <img
          src={fileUrl(share.image)}
          alt=""
          className={`${SHARE_THUMB[share.kind] || SHARE_THUMB.product} aspect-[3/4] shrink-0 rounded-md object-cover`}
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-rose-50 text-yellow-700/89">
          <Icon size={20} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-yellow-700/89">{SHARE_LABEL[share.kind]}</p>
        <p className="truncate text-sm font-semibold">{share.title}</p>
        {share.subtitle && <p className="truncate text-xs text-zinc-500">{share.subtitle}</p>}
        {share.detail && <p className="mt-0.5 line-clamp-2 text-xs text-zinc-600">{share.detail}</p>}
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove shared item"
          className="shrink-0 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-gray-100 hover:text-zinc-700"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );

  if (!onRemove && share.kind === "product" && share.refId) {
    return (
      <Link to={`/product/${share.refId}`} className="block transition-opacity hover:opacity-90">
        {card}
      </Link>
    );
  }
  return card;
}
