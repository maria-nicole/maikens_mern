import { Pencil } from "lucide-react";

// A tidy recap of the design. Each row has a pencil that jumps back to that section.
export default function DesignSummary({ category, mode, baseProduct, rows, onEdit, locked }) {
    return (
        <div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Your design</h3>
                <span className="text-xs text-gray-400">
                    {category} · {mode === "redesign" ? `Redesign of ${baseProduct?.name || "a design"}` : "From scratch"}
                </span>
            </div>

            <dl className="mt-2 divide-y divide-gray-100">
                {rows.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                        <dt className="text-sm text-gray-400">{r.title}</dt>
                        <dd className="flex min-w-0 items-center gap-2 text-sm text-gray-700">
                            {r.swatch && (
                                <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10" style={{ background: r.swatch }} />
                            )}
                            {r.value ? (
                                <span className="truncate">{r.value}</span>
                            ) : (
                                <span className={r.required ? "text-yellow-700/89" : "text-gray-300"}>
                                    {r.required ? "Required" : "Not chosen"}
                                </span>
                            )}
                            {!locked && (
                                <button
                                    type="button"
                                    onClick={() => onEdit(r.id)}
                                    aria-label={`Edit ${r.title}`}
                                    className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-300 hover:bg-gray-50 hover:text-yellow-700/89"
                                >
                                    <Pencil size={13} />
                                </button>
                            )}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}