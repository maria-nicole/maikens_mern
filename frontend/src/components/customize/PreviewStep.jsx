import { Link, useLocation } from "react-router-dom";
import { Loader2, Lock, RefreshCw, Send, Sparkles } from "lucide-react";
import { imageUrl, primaryBtn, ghostBtn } from "./customizeShared";
import DesignSummary from "./DesignSummary";
import StepFooter from "./StepFooter";

export default function PreviewStep({
    loggedIn, locked, editing,
    category, mode, baseProduct, rows, onEdit,
    preview, stale, generating, submitting, canSend, refsNeedUpload, remaining,
    genError, submitError,
    onGenerate, onSend, onZoom, onBack,
}) {
    const location = useLocation();

    const helper = refsNeedUpload
        ? "Generate a preview first so your reference photos are saved with your request."
        : !preview
            ? "You can send without a preview, but one helps the boutique see what you have in mind."
            : remaining !== null
                ? `${remaining} preview${remaining === 1 ? "" : "s"} left this hour.`
                : "";

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-5 sm:p-8">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-neutral-800">Preview and send</h2>
                <p className="mt-1 text-sm text-gray-500">
                    The AI makes a front-facing preview to help you and the tailors see the idea. The boutique confirms the final
                    details with you.
                </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr]">
                {/* Preview picture, or a login prompt */}
                <div>
                    {!loggedIn ? (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50">
                                <Lock size={20} className="text-yellow-600/89" />
                            </div>
                            <p className="text-sm font-semibold text-neutral-800">Log in to generate a preview</p>
                            <p className="mb-5 mt-1 text-xs text-gray-400">Your choices are saved, so you can pick up right here.</p>
                            <div className="flex flex-col justify-center gap-3 sm:flex-row lg:flex-col">
                                <Link to="/login" state={{ from: location }} className={`px-6 py-2.5 text-sm text-center ${primaryBtn}`}>
                                    Log in
                                </Link>
                                <Link to="/register" className={`px-6 py-2.5 text-sm text-center ${ghostBtn}`}>
                                    Create an account
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div
                                className={`relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-center ${preview && !generating ? "cursor-zoom-in" : ""
                                    }`}
                                onClick={() => preview && !generating && onZoom()}
                                title={preview && !generating ? "Click to enlarge" : undefined}
                            >
                                {generating ? (
                                    <div className="flex flex-col items-center gap-2 px-6">
                                        <Loader2 size={28} className="animate-spin text-yellow-600/89" />
                                        <p className="text-sm font-medium text-neutral-800">Creating your preview…</p>
                                        <p className="text-xs text-gray-400">This can take up to a minute.</p>
                                    </div>
                                ) : preview ? (
                                    <img
                                        src={imageUrl(preview)}
                                        alt="AI preview of your design"
                                        className={`h-full w-full object-cover ${stale ? "opacity-50" : ""}`}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 px-6">
                                        <Sparkles size={28} className="text-yellow-600/89" />
                                        <p className="text-sm text-gray-500">Your preview will appear here.</p>
                                    </div>
                                )}
                            </div>
                            {stale && (
                                <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                                    You've changed your design since this preview. Generate a new one to update it.
                                </p>
                            )}
                        </>
                    )}
                </div>

                {/* Summary + actions */}
                <div className="space-y-6">
                    <DesignSummary
                        category={category}
                        mode={mode}
                        baseProduct={baseProduct}
                        rows={rows}
                        onEdit={onEdit}
                        locked={locked}
                    />

                    {loggedIn && (
                        <div className="space-y-3">
                            {genError && (
                                <p role="alert" className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                                    {genError}
                                </p>
                            )}
                            {submitError && (
                                <p role="alert" className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                                    {submitError}
                                </p>
                            )}

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={onGenerate}
                                    disabled={generating || submitting || locked}
                                    className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm ${preview
                                            ? "rounded-md border border-yellow-700/89 font-medium text-yellow-700/89 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                            : primaryBtn
                                        }`}
                                >
                                    {generating ? (
                                        <Loader2 size={15} className="animate-spin" />
                                    ) : preview ? (
                                        <RefreshCw size={15} />
                                    ) : (
                                        <Sparkles size={15} />
                                    )}
                                    {generating ? "Generating…" : preview ? "Generate again" : "Generate preview"}
                                </button>
                                <button
                                    type="button"
                                    onClick={onSend}
                                    disabled={!canSend}
                                    className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm ${primaryBtn}`}
                                >
                                    {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                                    {submitting ? "Sending…" : editing ? "Save changes" : "Send to boutique"}
                                </button>
                            </div>

                            {helper && <p className="text-xs text-gray-400">{helper}</p>}
                        </div>
                    )}
                </div>
            </div>

            <StepFooter onBack={onBack} />
        </div>
    );
}