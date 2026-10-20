import { Check, Sparkles } from "lucide-react";

export default function CustomizeHeader({ editing, steps, current, canReach, onGo }) {
    return (
        <div className="bg-white border-b border-gray-200">
            <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
                <Sparkles size={20} className="text-yellow-700/89" />
                <div>
                    <h1 className="text-lg font-semibold text-gray-800">{editing ? "Edit your design" : "Design your own"}</h1>
                    <p className="text-xs text-gray-400">Pick your details, preview them with AI, then send to the boutique.</p>
                </div>
            </div>

            {/* A stepper that fits a phone: tighter gaps and compact buttons below sm,
                so all three steps are visible without swiping sideways. */}
            <ol className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 pb-3 sm:gap-2 sm:px-6">
                {steps.map((label, i) => {
                    const active = current === i;
                    const done = i < current;
                    const reachable = canReach(i);
                    return (
                        <li key={label} className="flex items-center gap-1 sm:gap-2">
                            <button
                                type="button"
                                onClick={() => reachable && onGo(i)}
                                disabled={!reachable}
                                aria-current={active ? "step" : undefined}
                                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full py-2 pl-1.5 pr-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed sm:gap-2 sm:pr-3.5 sm:text-sm ${active
                                        ? "bg-rose-50 text-yellow-700/89"
                                        : reachable
                                            ? "text-gray-600 hover:bg-gray-50"
                                            : "text-gray-300"
                                    }`}
                            >
                                <span
                                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${active || done ? "bg-yellow-600/89 text-white" : "bg-gray-100 text-gray-400"
                                        }`}
                                >
                                    {done ? <Check size={13} /> : i + 1}
                                </span>
                                {label}
                            </button>
                            {i < steps.length - 1 && <span aria-hidden className="h-px w-3 bg-gray-200 sm:w-10" />}
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}