import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { chipClass } from "./customizeShared";
import { isLightColor } from "./designOptions";
import { DEFAULT_SHADE, isHex, normalizeHex } from "../../lib/colors";

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
export default function OptionPicker({ group, value, colorHex, onChange, disabled }) {
    // Optional choices can be un-picked by tapping them again
    const pick = (v) => onChange(group.key, value === v && !group.required ? "" : v);

    // A shade of the customer's own is any value that isn't one of the presets
    const customShade = value && !group.options.some((o) => o.value === value) ? value : "";
    const shade = normalizeHex(colorHex) || (isHex(value) ? normalizeHex(value) : "");

    // The custom shade editor: closed until the customer asks for it
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState({ hex: DEFAULT_SHADE, name: "" });

    const toggleCustom = () => {
        if (!open) setDraft({ hex: shade || DEFAULT_SHADE, name: customShade && !isHex(customShade) ? customShade : "" });
        setOpen(!open);
    };

    const useCustomShade = () => {
        const hex = isHex(draft.hex) ? draft.hex.toUpperCase() : DEFAULT_SHADE;
        const name = draft.name.trim().replace(/\s+/g, " ").slice(0, 24);
        onChange(group.key, name || hex, { colorHex: hex });
        setOpen(false);
    };

    if (group.kind === "swatch") {
        return (
            <div className="flex flex-wrap items-center gap-3" role="group" aria-label={group.title}>
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

                {/* The customer's own shade, instead of being limited to the presets above */}
                <button
                    type="button"
                    onClick={toggleCustom}
                    disabled={disabled}
                    title="Add your own color"
                    aria-label="Add your own color"
                    aria-expanded={open}
                    aria-pressed={!!customShade}
                    className={`relative flex h-11 w-11 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-60 ${customShade
                            ? "border-black/10 ring-2 ring-yellow-600/89 ring-offset-2"
                            : "border-dashed border-black/25 bg-white hover:scale-110"
                        }`}
                    style={customShade && shade ? { background: shade } : undefined}
                >
                    {customShade ? (
                        <Check size={16} className={isLightColor(shade || "#FFFFFF") ? "text-neutral-800" : "text-white"} />
                    ) : (
                        <Plus size={16} className="text-neutral-600" />
                    )}
                </button>
                {customShade && !open && <span className="text-xs font-medium text-gray-600">{customShade}</span>}

                {open && (
                    <div className="w-full rounded-xl border border-gray-200 bg-white p-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="color"
                                value={draft.hex}
                                onChange={(e) => setDraft((d) => ({ ...d, hex: e.target.value }))}
                                aria-label="Shade"
                                className="h-9 w-12 shrink-0 cursor-pointer rounded border border-gray-200 bg-white p-0.5"
                            />
                            <input
                                type="text"
                                value={draft.name}
                                maxLength={24}
                                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                                placeholder="Name this shade (optional)"
                                aria-label="Name this shade"
                                className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-neutral-800 outline-none focus:border-yellow-600/89 sm:max-w-56"
                            />
                            <button
                                type="button"
                                disabled={disabled}
                                onClick={useCustomShade}
                                className="rounded-lg border border-yellow-600/89 bg-yellow-600/89 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white hover:text-yellow-600/89 disabled:opacity-60"
                            >
                                Use this color
                            </button>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="text-xs font-medium text-gray-400 hover:text-gray-700"
                            >
                                Cancel
                            </button>
                        </div>
                        <p className="mt-2 text-[11px] leading-snug text-gray-500">
                            Pick any shade you like. A name helps the boutique and the AI talk about it.
                        </p>
                    </div>
                )}
            </div>
        );
    }

    if (group.kind === "image") {
        return (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" role="group" aria-label={group.title}>
                {group.options.map(({ value: v, img, desc }) => {
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
                            <span className="block px-1 py-2">
                                <span className="block text-xs font-medium text-gray-700">{v}</span>
                                {desc && <span className="mt-0.5 block text-[11px] leading-snug text-gray-500">{desc}</span>}
                            </span>
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-2" role="group" aria-label={group.title}>
            {group.options.map(({ value: v, desc }) => (
                <button
                    key={v}
                    type="button"
                    onClick={() => pick(v)}
                    disabled={disabled}
                    title={desc || v}
                    aria-pressed={value === v}
                    className={chipClass(value === v)}
                >
                    {v}
                </button>
            ))}
        </div>
    );
}
