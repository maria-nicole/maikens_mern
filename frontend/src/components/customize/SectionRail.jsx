import { Check, RotateCcw } from "lucide-react";
import { imageUrl } from "./customizeShared";

// The list of sections (Color, Silhouette, ...). It is both the menu and a live summary:
// every row shows what has been chosen so far.
export default function SectionRail({ rows, activeId, onSelect, baseProduct, canReset, onReset, locked }) {
    const required = rows.filter((r) => r.required);
    const requiredDone = required.filter((r) => r.value).length;

    return (
        <aside className="rounded-lg border border-gray-200 bg-white p-4 lg:sticky lg:top-24">
            {baseProduct && (
                <div className="mb-4 flex items-center gap-3 rounded-lg bg-gray-50 p-2">
                    {baseProduct.images?.[0] ? (
                        <img src={imageUrl(baseProduct.images[0])} alt="" className="h-12 w-9 shrink-0 rounded object-cover" />
                    ) : (
                        <div className="h-12 w-9 shrink-0 rounded bg-zinc-200" />
                    )}
                    <div className="min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Redesigning</p>
                        <p className="truncate text-sm font-semibold text-neutral-800">{baseProduct.name}</p>
                    </div>
                </div>
            )}

            <div className="mb-3">
                <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase tracking-wide text-gray-500">Your design</span>
                    <span className="text-gray-400">
                        Required {requiredDone}/{required.length}
                    </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                        className="h-full rounded-full bg-yellow-600/89 transition-all"
                        style={{ width: `${required.length ? (requiredDone / required.length) * 100 : 0}%` }}
                    />
                </div>
            </div>

            <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
                {rows.map((row, i) => {
                    const active = row.id === activeId;
                    return (
                        <li key={row.id} className="shrink-0 lg:shrink">
                            <button
                                type="button"
                                onClick={() => onSelect(row.id)}
                                aria-current={active ? "step" : undefined}
                                className={`flex w-44 items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition lg:w-full ${active ? "border-yellow-600/89 bg-rose-50" : "border-transparent hover:bg-gray-50"
                                    }`}
                            >
                                <span
                                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${row.value
                                            ? "bg-yellow-600/89 text-white"
                                            : row.required
                                                ? "border border-dashed border-yellow-600/89 text-yellow-700/89"
                                                : "border border-gray-300 text-gray-400"
                                        }`}
                                >
                                    {row.value ? <Check size={12} /> : i + 1}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium text-neutral-800">{row.title}</span>
                                    <span
                                        className={`flex items-center gap-1.5 truncate text-xs ${row.value ? "text-gray-600" : row.required ? "text-yellow-700/89" : "text-gray-400"
                                            }`}
                                    >
                                        {row.swatch && (
                                            <span
                                                className="h-3 w-3 shrink-0 rounded-full border border-black/10"
                                                style={{ background: row.swatch }}
                                            />
                                        )}
                                        <span className="truncate">{row.value || (row.required ? "Required" : "Optional")}</span>
                                    </span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>

            {canReset && !locked && (
                <button
                    type="button"
                    onClick={onReset}
                    className="mt-3 flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-yellow-700/89"
                >
                    <RotateCcw size={12} />
                    {baseProduct ? "Reset to the original design" : "Clear all choices"}
                </button>
            )}
        </aside>
    );
}