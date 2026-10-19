import { useEffect } from "react";
import { X } from "lucide-react";
import { FILTER_GROUPS } from "./catalogConfig";

// Options are plain strings, except colors: those come from the products themselves as
// { name, hex } so a custom shade the admin added shows up with its real dot.
function FilterGroups({ groups, selected, onToggle }) {
    return (
        <div className="divide-y divide-stone-100">
            {groups.map((group) => {
                const count = selected[group.key].length;
                return (
                    <details key={group.key} open className="group py-4 first:pt-0">
                        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-neutral-800">
                            <span>
                                {group.label}
                                {count > 0 && <span className="ml-2 text-xs font-medium text-yellow-700/89">{count} selected</span>}
                            </span>
                            <span className="text-stone-400 transition-transform group-open:rotate-45" aria-hidden="true">
                                +
                            </span>
                        </summary>

                        <div className="mt-3 flex flex-wrap gap-2">
                            {group.options.map((option) => {
                                const value = typeof option === "string" ? option : option.name;
                                const dot = typeof option === "string" ? null : option.hex;
                                const active = selected[group.key].includes(value);
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => onToggle(group.key, value)}
                                        aria-pressed={active}
                                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${active
                                                ? "border-yellow-600/89 bg-yellow-600/89 text-white"
                                                : "border-stone-200 bg-white text-stone-600 hover:border-yellow-600/89 hover:text-yellow-700/89"
                                            }`}
                                    >
                                        {dot && (
                                            <span
                                                className="h-3 w-3 rounded-full border border-black/15"
                                                style={{ background: dot }}
                                                aria-hidden="true"
                                            />
                                        )}
                                        {value}
                                    </button>
                                );
                            })}
                        </div>
                    </details>
                );
            })}
        </div>
    );
}

export default function FilterSidebar({ selected, onToggle, onClear, activeCount, resultCount, open, onClose, groups = FILTER_GROUPS }) {
    // Close the mobile drawer with Escape
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    return (
        <>
            {/* Desktop: sticky sidebar */}
            <aside className="hidden w-64 shrink-0 lg:block" aria-label="Filters">
                <div className="sticky top-32 max-h-[calc(100vh-9rem)] overflow-y-auto pr-2">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="font-serif text-lg font-bold text-neutral-800">Filters</h2>
                        {activeCount > 0 && (
                            <button onClick={onClear} className="text-xs text-stone-500 underline hover:text-stone-700">
                                Clear all
                            </button>
                        )}
                    </div>
                    <FilterGroups groups={groups} selected={selected} onToggle={onToggle} />
                </div>
            </aside>

            {/* Mobile: slide-in drawer */}
            {open && (
                <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
                    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                    <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
                            <h2 className="font-serif text-lg font-bold text-neutral-800">Filters</h2>
                            <button onClick={onClose} aria-label="Close filters" className="text-stone-400 hover:text-stone-600">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-5">
                            <FilterGroups groups={groups} selected={selected} onToggle={onToggle} />
                        </div>

                        <div className="flex gap-3 border-t border-stone-200 px-5 py-4">
                            <button
                                onClick={onClear}
                                disabled={activeCount === 0}
                                className="flex-1 rounded-md border border-stone-300 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
                            >
                                Clear all
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 rounded-md border border-yellow-600/89 bg-yellow-600/89 py-2.5 text-sm font-medium text-white hover:bg-white hover:text-yellow-600/89 duration-200"
                            >
                                Show {resultCount} {resultCount === 1 ? "result" : "results"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}