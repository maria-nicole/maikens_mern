import { ChevronLeft, ChevronRight } from "lucide-react";
import { primaryBtn } from "./customizeShared";

// Back / Next buttons with an optional hint underneath.
export default function StepFooter({ onBack, backLabel = "Back", onNext, nextLabel = "Next", nextDisabled, hint }) {
    return (
        <div className="mt-8 border-t border-gray-100 pt-5">
            <div className="flex items-center justify-between gap-3">
                {onBack ? (
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                        <ChevronLeft size={15} /> {backLabel}
                    </button>
                ) : (
                    <span />
                )}
                {onNext && (
                    <button
                        type="button"
                        onClick={onNext}
                        disabled={nextDisabled}
                        className={`flex items-center gap-1.5 px-5 py-2.5 text-sm ${primaryBtn}`}
                    >
                        {nextLabel} <ChevronRight size={15} />
                    </button>
                )}
            </div>
            {hint && <div className="mt-3 text-right text-xs text-gray-500">{hint}</div>}
        </div>
    );
}