import { X } from "lucide-react";

export default function ActiveFilters({ chips, onRemove, onClear }) {
    if (chips.length === 0) return null;

    return (
        <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-stone-500">Active filters:</span>
            {chips.map(({ groupKey, option }) => (
                <span
                    key={`${groupKey}-${option}`}
                    className="flex items-center gap-1 rounded-full border border-yellow-600/89 bg-orange-100/89 py-1 pl-3 pr-2 text-xs font-medium text-yellow-700/89"
                >
                    {option}
                    <button
                        onClick={() => onRemove(groupKey, option)}
                        aria-label={`Remove ${option} filter`}
                        className="rounded-full p-0.5 hover:bg-white/70"
                    >
                        <X size={11} />
                    </button>
                </span>
            ))}
            <button onClick={onClear} className="ml-1 text-xs text-stone-500 underline hover:text-stone-700">
                Clear all
            </button>
        </div>
    );
}