import { ChevronDown, LayoutGrid, List, Search, SlidersHorizontal, X } from "lucide-react";
import { SHOW_OPTIONS, SORT_OPTIONS } from "./catalogConfig";

const selectClass =
    "appearance-none rounded-lg border border-stone-200 bg-white py-1.5 pl-3 pr-7 text-sm text-stone-700 " +
    "focus:outline-none focus:ring-2 focus:ring-yellow-500/89 cursor-pointer";

function SelectField({ label, value, onChange, children }) {
    return (
        <label className="flex items-center gap-2 text-sm text-stone-500">
            <span className="whitespace-nowrap">{label}</span>
            <span className="relative">
                <select value={value} onChange={onChange} className={selectClass}>
                    {children}
                </select>
                <ChevronDown
                    size={12}
                    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400"
                />
            </span>
        </label>
    );
}

export default function CatalogToolbar({
    searchTerm,
    onSearchChange,
    activeFilterCount,
    onOpenFilters,
    resultText,
    viewMode,
    onViewModeChange,
    show,
    onShowChange,
    sortBy,
    onSortChange,
}) {
    const viewBtn = (mode) =>
        `p-2 transition-colors ${viewMode === mode ? "bg-yellow-600/89 text-white" : "text-stone-400 hover:bg-stone-50"
        }`;

    return (
        <div className="sticky top-[61px] z-10 border-b border-stone-200 bg-white/90 backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-3 px-6 py-3 md:px-10 lg:px-24">
                {/* Search */}
                <div className="relative w-full sm:w-72">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search gowns and barong"
                        aria-label="Search gowns and barong"
                        className="w-full rounded-lg border border-stone-200 py-2 pl-9 pr-8 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-yellow-500/89"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => onSearchChange("")}
                            aria-label="Clear search"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>

                {/* Filters button: only on screens without the sidebar */}
                <button
                    onClick={onOpenFilters}
                    className="flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors lg:hidden"
                >
                    <SlidersHorizontal size={15} />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="rounded-full bg-yellow-600/89 px-1.5 py-0.5 text-xs font-semibold text-white">
                            {activeFilterCount}
                        </span>
                    )}
                </button>

                <p className="min-w-[140px] flex-1 text-sm text-stone-500" aria-live="polite">
                    {resultText}
                </p>

                <div className="ml-auto flex flex-wrap items-center gap-3">
                    <div className="flex items-center overflow-hidden rounded-lg border border-stone-200">
                        <button onClick={() => onViewModeChange("grid")} className={viewBtn("grid")} aria-label="Grid view">
                            <LayoutGrid size={15} />
                        </button>
                        <button onClick={() => onViewModeChange("list")} className={viewBtn("list")} aria-label="List view">
                            <List size={15} />
                        </button>
                    </div>

                    <SelectField label="Show" value={show} onChange={(e) => onShowChange(Number(e.target.value))}>
                        {SHOW_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                                {n}
                            </option>
                        ))}
                    </SelectField>

                    <SelectField label="Sort by" value={sortBy} onChange={(e) => onSortChange(e.target.value)}>
                        {SORT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </SelectField>
                </div>
            </div>
        </div>
    );
}