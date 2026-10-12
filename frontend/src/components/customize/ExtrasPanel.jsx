import { inputClass } from "./customizeShared";
import RefUpload from "./RefUpload";

// Reference photos and a note to the boutique (the last section of the Design step)
export default function ExtrasPanel({ refs, notes, onNotes, onPickRef, onClearRef, disabled }) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
                <RefUpload
                    title="Shape reference"
                    hint="A photo or sketch of the shape or cut you like."
                    value={refs.content}
                    onPick={onPickRef("content")}
                    onClear={onClearRef("content")}
                    disabled={disabled}
                />
                <RefUpload
                    title="Style reference"
                    hint="A photo of the pattern, lace or embroidery you like."
                    value={refs.style}
                    onPick={onPickRef("style")}
                    onClear={onClearRef("style")}
                    disabled={disabled}
                />
            </div>

            <div>
                <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-700">
                    Anything else the boutique should know?
                </label>
                <textarea
                    id="notes"
                    rows={3}
                    maxLength={300}
                    value={notes}
                    disabled={disabled}
                    onChange={(e) => onNotes(e.target.value)}
                    placeholder="e.g. Needed for a church wedding in March, prefer modest sleeves."
                    className={inputClass}
                />
                <p className="mt-1 text-right text-xs text-gray-400">{notes.length}/300</p>
            </div>
        </div>
    );
}