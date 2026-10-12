import { Link } from "react-router-dom";
import { BsFacebook, BsMessenger } from "react-icons/bs";
import { HiOutlineChatBubbleLeftRight } from "react-icons/hi2";

// TODO: replace the "#" links with your real Facebook page and Messenger link.
const SOCIALS = [
    { Icon: BsFacebook, href: "#", label: "Facebook" },
    { Icon: BsMessenger, href: "#", label: "Messenger" },
];

export default function ChatCard() {
    return (
        <aside className="flex flex-col rounded-lg bg-orange-100/89 p-6 md:p-8">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/70">
                <HiOutlineChatBubbleLeftRight className="h-5 w-5 text-yellow-700/89" />
            </div>

            <h3 className="font-serif text-2xl font-bold text-neutral-800">Prefer to chat?</h3>
            <p className="mb-6 mt-2 text-sm leading-relaxed text-stone-700">
                Skip the form and message us directly for a faster reply. Common questions get instant answers, and the
                boutique can chat with you live.
            </p>

            <Link
                to="/message"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-yellow-600/89 bg-yellow-600/89 p-3 font-medium text-white duration-200 hover:bg-white hover:text-yellow-600/89"
            >
                Go to messages
            </Link>

            <div className="mt-6 border-t border-yellow-700/20 pt-5">
                <p className="mb-3 text-sm text-stone-600">You can also find us on</p>
                <div className="flex gap-4">
                    {SOCIALS.map(({ Icon, href, label }) => (
                        <a
                            key={label}
                            href={href}
                            aria-label={label}
                            className="text-stone-600 transition-colors hover:text-yellow-700/89"
                        >
                            <Icon className="h-5 w-5" />
                        </a>
                    ))}
                </div>
            </div>
        </aside>
    );
}