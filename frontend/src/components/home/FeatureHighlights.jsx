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
        link: "/profile?tab=history",
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
        <section className="bg-orange-100/89 px-6 py-16 md:px-10 lg:px-24">
            <div className="mb-10 max-w-xl">
                <h2 className="font-serif text-3xl font-bold text-neutral-800 md:text-4xl">Everything in one place</h2>
                <p className="mt-3 text-stone-600">
                    From first idea to pick-up day, the boutique's most-requested services are now online.
                </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
                {FEATURES.map(({ icon: Icon, title, description, link, cta }) => (
                    <div key={title} className="flex flex-col rounded-lg bg-white p-6 ring-1 ring-stone-200">
                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-orange-100/89">
                            <Icon size={20} className="text-yellow-700/89" />
                        </div>
                        <h3 className="mb-2 font-serif text-xl font-bold text-neutral-800">{title}</h3>
                        <p className="mb-5 flex-1 text-sm leading-relaxed text-stone-600">{description}</p>
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