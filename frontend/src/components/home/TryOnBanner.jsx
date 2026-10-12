import { Link } from "react-router-dom";
import { Camera } from "lucide-react";

export default function TryOnBanner() {
    return (
        <section className="px-6 py-16 md:px-10 lg:px-24">
            <div className="rounded-2xl bg-orange-100/89 px-6 py-16 text-center md:px-16 md:py-24">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-yellow-700/89">
                    <Camera size={14} />
                    AI-powered try-on
                </div>

                <h2 className="mx-auto max-w-2xl font-serif text-4xl font-bold leading-tight text-neutral-800 md:text-5xl">
                    See it on you before you wear it
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-base text-stone-700 md:text-lg">
                    Upload a full-body photo on any product page and get a preview of the gown or barong on you.
                </p>

                <Link
                    to="/catalog"
                    className="mt-8 inline-flex items-center justify-center rounded-md border border-yellow-600/89 bg-yellow-600/89 px-6 py-3 font-medium text-white duration-200 hover:bg-white hover:text-yellow-600/89 focus:outline-none focus:ring-4 focus:ring-yellow-300"
                >
                    Choose a piece to try on
                </Link>
            </div>
        </section>
    );
}