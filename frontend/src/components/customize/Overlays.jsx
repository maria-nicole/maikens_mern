import { useEffect } from "react";
import { Check, X } from "lucide-react";

export function Toast({ message }) {
    if (!message) return null;
    return (
        <div
            role="status"
            className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-md bg-neutral-800 px-5 py-3 text-sm text-white shadow-lg"
        >
            <Check size={14} className="text-yellow-500" />
            {message}
        </div>
    );
}

// Full-screen picture viewer. Press Escape or click outside to close.
export function Lightbox({ src, onClose }) {
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    if (!src) return null;
    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Preview, enlarged"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
            onClick={onClose}
        >
            <button
                type="button"
                className="absolute right-5 top-5 text-white/80 hover:text-white"
                aria-label="Close"
                onClick={onClose}
            >
                <X size={28} />
            </button>
            <img
                src={src}
                alt="Preview, enlarged"
                className="max-h-[90vh] max-w-[90vw] rounded-md object-contain"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
}