import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle, PackageSearch, Sparkles } from "lucide-react";

const FEATURES = [
    {
        icon: Sparkles,
        title: "Design your own",
        description:
            "Start from an existing gown or a blank page. Pick colors, styles and sleeves, or upload a reference photo, and see an AI preview before you order.",
        link: "/customize",
        cta: "Start designing",
    },
    {
        icon: PackageSearch,
        title: "Track your order",
        description:
            "See where your order is, from received and in production to ready for pick-up or delivery, without having to ask for updates.",
        link: "/profile?tab=orders",
        cta: "Track an order",
    },
    {
        icon: MessageCircle,
        title: "Message the boutique",
        description:
            "Ask about store hours, prices or a custom request any time. Common questions get instant answers, and the owner replies to the rest.",
        link: "/message",
        cta: "Send a message",
    },
];

export default function FeatureHighlights() {
    return (
        <section className="bg-orange-100/89 px-5 py-12 sm:px-6 sm:py-16 md:px-10 lg:px-24">
            <div className="mb-8 max-w-xl sm:mb-10">
                <h2 className="font-serif text-2xl font-bold text-neutral-800 sm:text-3xl md:text-4xl">
                    Everything in one place
                </h2>
                <p className="mt-3 text-sm text-stone-600 sm:text-base">
                    From first idea to pick-up day, the boutique's most-requested services are now online.
                </p>
            </div>

            {/* On a phone the three cards sit in a single column, so each one is kept
                compact: the icon sits beside the title rather than above it, and the
                copy is trimmed by the card's own padding. */}
            <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
                {FEATURES.map(({ icon: Icon, title, description, link, cta }) => (
                    <div key={title} className="flex flex-col rounded-lg bg-white p-5 ring-1 ring-stone-200 sm:p-6">
                        <div className="mb-3 flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100/89">
                                <Icon size={18} className="text-yellow-700/89" />
                            </div>
                            <h3 className="font-serif text-lg font-bold leading-tight text-neutral-800 sm:text-xl">
                                {title}
                            </h3>
                        </div>
                        <p className="mb-4 flex-1 text-sm leading-relaxed text-stone-600">{description}</p>
                        <Link
                            to={link}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-yellow-700/89 transition-all hover:gap-2.5"
                        >
                            {cta}
                            <ArrowRight size={14} />
                        </Link>
                    </div>
                ))}
            </div>
        </section>
    );
}