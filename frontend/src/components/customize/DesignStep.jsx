import OptionPicker from "./OptionPicker";
import SectionRail from "./SectionRail";
import ExtrasPanel from "./ExtrasPanel";
import StepFooter from "./StepFooter";

const EXTRAS_HINT = "Reference photos and notes help the AI and the boutique see exactly what you have in mind.";

// One section at a time, so the page stays calm instead of one endless scroll.
export default function DesignStep({
    groups, rows, activeId, onSection,
    selections, onSelect,
    refs, notes, onNotes, onPickRef, onClearRef,
    locked, baseProduct, missing, canReset, onReset,
    onBack, onContinue,
}) {
    const index = Math.max(0, rows.findIndex((r) => r.id === activeId));
    const row = rows[index];
    const prev = rows[index - 1];
    const next = rows[index + 1];
    const group = groups.find((g) => g.key === row.id); // undefined for "Photos & notes"
    const isLast = !next;

    const nextLabel = isLast
        ? "Continue to preview"
        : `${row.value || row.required ? "Next" : "Skip"}: ${next.title}`;

    const hint =
        missing.length > 0 ? (
            <>
                Still needed:{" "}
                {missing.map((g, i) => (
                    <span key={g.key}>
                        {i > 0 && ", "}
                        <button
                            type="button"
                            onClick={() => onSection(g.key)}
                            className="font-medium text-yellow-700/89 underline underline-offset-2"
                        >
                            {g.title}
                        </button>
                    </span>
                ))}
            </>
        ) : null;

    return (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
            <SectionRail
                rows={rows}
                activeId={row.id}
                onSelect={onSection}
                baseProduct={baseProduct}
                canReset={canReset}
                onReset={onReset}
                locked={locked}
            />

            <section className="rounded-lg border border-gray-200 bg-white p-5 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-neutral-800">{row.title}</h2>
                        <p className="mt-1 text-sm text-gray-500">{group ? group.hint : EXTRAS_HINT}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {group && row.value && !group.required && !locked && (
                            <button
                                type="button"
                                onClick={() => onSelect(group.key, "")}
                                className="text-xs font-medium text-gray-400 hover:text-red-600"
                            >
                                Clear
                            </button>
                        )}
                        <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.required ? "bg-rose-50 text-yellow-700/89" : "bg-gray-100 text-gray-500"
                                }`}
                        >
                            {row.required ? "Required" : "Optional"}
                        </span>
                    </div>
                </div>

                {group && row.value && (
                    <p className="flex items-center gap-2 text-sm text-gray-500">
                        Selected:
                        {row.swatch && (
                            <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: row.swatch }} />
                        )}
                        <span className="font-medium text-neutral-800">{row.value}</span>
                    </p>
                )}

                <div className="mt-5">
                    {group ? (
                        <OptionPicker
                            group={group}
                            value={selections[group.key] || ""}
                            colorHex={selections.colorHex || ""}
                            onChange={onSelect}
                            disabled={locked}
                        />
                    ) : (
                        <ExtrasPanel
                            refs={refs}
                            notes={notes}
                            onNotes={onNotes}
                            onPickRef={onPickRef}
                            onClearRef={onClearRef}
                            disabled={locked}
                        />
                    )}
                </div>

                <StepFooter
                    onBack={prev ? () => onSection(prev.id) : onBack}
                    onNext={isLast ? onContinue : () => onSection(next.id)}
                    nextLabel={nextLabel}
                    nextDisabled={isLast && missing.length > 0}
                    hint={hint}
                />
            </section>
        </div>
    );
}