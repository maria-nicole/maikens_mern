import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import Footer from "../components/Footer";
import { NAVBAR_PT } from "../components/account/accountShared";

/* What the shop actually collects, written from the real models rather than boilerplate.

   The account, order, customization, message and contact records are the ones in
   backend/models; the address/phone come from the profile and checkout forms. Keeping
   this list true to the code is the point — a privacy page that describes data the shop
   does not hold (or misses data it does) is worse than none. */
const COLLECTED = [
  {
    title: "Your account",
    body: "Your username, email address, and a password stored only as a one-way hash. We never keep the password itself. A profile photo and address are optional and only if you add them.",
  },
  {
    title: "Your orders and designs",
    body: "What you ordered, the sizes, the price, the payment records the boutique enters, and any custom design you save — including the reference photos you upload for it.",
  },
  {
    title: "Messages with the boutique",
    body: "The messages you send us and our replies, so the conversation can be picked up again later.",
  },
  {
    title: "Only what you give us",
    body: "We do not buy data about you from anyone, and we do not track you around other websites.",
  },
];

const USES = [
  "To make and deliver your order, and to keep you updated on it",
  "To answer your messages and design requests",
  "To keep your account secure, which is why we verify your email",
];

const PrivacyPolicy = () => {
  return (
    <div className={`min-h-screen bg-white ${NAVBAR_PT}`}>
      <header className="bg-orange-100/89 px-6 pb-12 pt-10 md:px-10 lg:px-24">
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-1.5 text-sm text-stone-600">
            <li>
              <Link to="/" className="transition-colors hover:text-yellow-700/89">
                Home
              </Link>
            </li>
            <li aria-current="page" className="flex items-center gap-1.5">
              <ChevronRight size={14} className="text-stone-400" />
              <span className="text-stone-400">Privacy Policies</span>
            </li>
          </ol>
        </nav>

        <h1 className="font-serif text-4xl font-bold tracking-tight text-neutral-800 md:text-5xl">
          Privacy
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-stone-600">
          What we keep, and what we do with it.
        </p>
      </header>

      <main className="px-6 py-14 md:px-10 lg:px-24">
        <div className="mx-auto max-w-3xl space-y-8">
          <section>
            <h2 className="font-serif text-2xl font-bold text-neutral-800">What we collect</h2>
            <div className="mt-4 space-y-5">
              {COLLECTED.map((item) => (
                <div key={item.title}>
                  <h3 className="font-semibold text-[#241F1A]">{item.title}</h3>
                  <p className="mt-1 text-base leading-relaxed text-[#4A4136]">{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold text-neutral-800">What we use it for</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-relaxed text-[#4A4136]">
              {USES.map((use) => (
                <li key={use}>{use}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-[#E3DACB] bg-[#FBF8F3] p-6">
            <h2 className="font-serif text-lg font-bold text-[#241F1A]">Who can see it</h2>
            <p className="mt-2 text-base leading-relaxed text-[#4A4136]">
              Only the boutique's own staff and owner, and only for the reasons above. We do not sell or rent
              your details to anyone. Deliveries are carried by Lalamove, so a courier receives the delivery
              name, address and phone number needed to hand the parcel over.
            </p>
          </section>

          <p className="text-sm leading-relaxed text-stone-500">
            Want your details corrected or removed? Message us on{" "}
            <Link to="/contact" className="font-medium text-yellow-700/89 hover:underline">
              the contact page
            </Link>{" "}
            and we will sort it out.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
