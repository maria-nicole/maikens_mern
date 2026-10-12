import { useRef } from "react";
import { Upload, X } from "lucide-react";

export default function RefUpload({ title, hint, value, onPick, onClear, disabled }) {
    const inputRef = useRef(null);
    return (
        <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-sm font-semibold text-neutral-800">{title}</p>
            <p className="mb-3 mt-0.5 text-xs text-gray-400">{hint}</p>
            <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) onPick(file);
                }}
            />
            {value.preview ? (
                <div className="relative w-40">
                    <img src={value.preview} alt={title} className="aspect-[3/4] w-40 rounded-md border border-gray-200 object-cover" />
                    {!disabled && (
                        <button
                            type="button"
                            onClick={onClear}
                            aria-label={`Remove ${title.toLowerCase()}`}
                            className="absolute right-1.5 top-1.5 rounded-full bg-white/95 p-1 text-gray-600 shadow-sm hover:text-red-600"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            ) : (
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => inputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center transition-colors hover:border-yellow-600/89 hover:bg-rose-50 disabled:opacity-60"
                >
                    <Upload size={20} className="text-yellow-600/89" />
                    <span className="text-sm font-medium text-neutral-800">Upload a photo or sketch</span>
                    <span className="text-xs text-gray-400">JPG, PNG or WebP · up to 5 MB</span>
                </button>
            )}
        </div>
    );
}