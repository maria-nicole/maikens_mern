import { useState } from "react";
import { Check } from "lucide-react";
import { chipClass } from "./customizeShared";
import { isLightColor } from "./designOptions";

// Thumbnails are optional: if the picture is missing the option shows as a plain label card
function Thumb({ src, alt }) {
    const [failed, setFailed] = useState(false);
    if (!src || failed) return null;
    return (
        <img
            src={src}
            alt={alt}
            onError={() => setFailed(true)}
            className="aspect-[3/4] w-full rounded-lg bg-zinc-100 object-cover"
        />
    );
}

// Shows the choices of ONE option group (color, silhouette, ...)
export default function OptionPicker({ group, value, onChange, disabled }) {
    // Optional choices can be un-picked by tapping them again
    const pick = (v) => onChange(group.key, value === v && !group.required ? "" : v);

    if (group.kind === "swatch") {
        return (
            <div className="flex flex-wrap gap-3" role="group" aria-label={group.title}>
                {group.options.map(({ value: v, swatch }) => {
                    const selected = value === v;
                    return (
                        <button
                            key={v}
                            type="button"
                            onClick={() => pick(v)}
                            disabled={disabled}
                            title={v}
                            aria-label={v}
                            aria-pressed={selected}
                            className={`relative flex h-11 w-11 items-center justify-center rounded-full border border-black/10 transition disabled:cursor-not-allowed disabled:opacity-60 ${selected ? "ring-2 ring-yellow-600/89 ring-offset-2" : "hover:scale-110"
                                }`}
                            style={{ background: swatch }}
                        >
                            {selected && <Check size={16} className={isLightColor(swatch) ? "text-neutral-800" : "text-white"} />}
                        </button>
                    );
                })}
            </div>
        );
    }

    if (group.kind === "image") {
        return (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" role="group" aria-label={group.title}>
                {group.options.map(({ value: v, img }) => {
                    const selected = value === v;
                    return (
                        <button
                            key={v}
                            type="button"
                            onClick={() => pick(v)}
                            disabled={disabled}
                            aria-pressed={selected}
                            className={`relative rounded-xl border p-1.5 text-center transition disabled:cursor-not-allowed disabled:opacity-60 ${selected
                                    ? "border-yellow-600/89 bg-rose-50 ring-2 ring-yellow-600/89"
                                    : "border-gray-200 bg-white hover:border-yellow-200/89 hover:shadow-sm"
                                }`}
                        >
                            <Thumb src={img} alt={v} />
                            {selected && (
                                <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-600/89 text-white">
                                    <Check size={12} />
                                </span>
                            )}
                            <span className="block px-0.5 py-2 text-xs font-medium text-gray-700">{v}</span>
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-2" role="group" aria-label={group.title}>
            {group.options.map(({ value: v }) => (
                <button
                    key={v}
                    type="button"
                    onClick={() => pick(v)}
                    disabled={disabled}
                    aria-pressed={value === v}
                    className={chipClass(value === v)}
                >
                    {v}
                </button>
            ))}
        </div>
    );
}