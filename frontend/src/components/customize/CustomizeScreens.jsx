import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { imageUrl, primaryBtn, ghostBtn } from "./customizeShared";
import { NAVBAR_PT } from "../account/accountShared";

// Shown when a design can't be loaded (removed, not logged in, server down)
export function ErrorScreen({ message, loggedIn, location, onRestart }) {
    return (
        <div className={`flex min-h-screen items-center justify-center bg-gray-50 px-4 ${NAVBAR_PT}`}>
            <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-10 text-center">
                <p className="mb-5 text-sm text-red-700">{message}</p>
                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                    {!loggedIn && (
                        <Link to="/login" state={{ from: location }} className={`px-6 py-2.5 text-sm ${primaryBtn}`}>
                            Log in
                        </Link>
                    )}
                    <button type="button" onClick={onRestart} className={`px-6 py-2.5 text-sm ${ghostBtn}`}>
                        Start a new design
                    </button>
                </div>
            </div>
        </div>
    );
}

// Shown after the design was sent (or the changes saved)
export function SentScreen({ sent, onRestart }) {
    return (
        <div className={`flex min-h-screen items-center justify-center bg-gray-50 px-4 ${NAVBAR_PT}`}>
            <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-10 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                    <Check size={26} className="text-green-700" />
                </div>
                <h1 className="text-2xl font-bold text-neutral-800">
                    {sent.edited ? "Your design was updated" : "Your design is with the boutique"}
                </h1>
                <p className="mt-2 text-sm text-zinc-600">
                    The owner will review it and approve it or ask for changes. You can edit it any time until it's approved, and
                    you can share it in a message if you want to talk it through.
                </p>
                {sent.previewImage && (
                    <img
                        src={imageUrl(sent.previewImage)}
                        alt="Your design preview"
                        className="mx-auto mt-6 aspect-[3/4] w-48 rounded-md border border-gray-200 object-cover"
                    />
                )}
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                    <Link
                        to={sent._id ? `/message?share=customization&id=${sent._id}` : "/message"}
                        className={`px-6 py-2.5 text-sm ${primaryBtn}`}
                    >
                        Message the boutique
                    </Link>
                    <button type="button" onClick={onRestart} className={`px-6 py-2.5 text-sm ${ghostBtn}`}>
                        Design another
                    </button>
                </div>
            </div>
        </div>
    );
}