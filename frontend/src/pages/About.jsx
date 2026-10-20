import { Link } from "react-router-dom";
import { ChevronRight, Scissors, Sparkles, Store } from "lucide-react";

import Footer from "../components/Footer";
import { NAVBAR_PT } from "../components/account/accountShared";

/* About the boutique.

   The address and the Facebook page name are the real ones used in the footer and the
   home gallery; nothing here is invented. It answers what a first-time visitor asks:
   where the shop is, what it makes, and how to reach it. */
const POINTS = [
  {
    icon: Store,
    title: "Made in Pandi, Bulacan",
    body: "Stall A18 Disenyo Pandi, Wedding Depot, Grace Park Street, Bagong Barrio, Pandi, 3014 Bulacan.",
  },
  {
    icon: Scissors,
    title: "Made to order",
    body: "Gowns and barong are cut and finished per order, so a piece can be adjusted to the wearer rather than pulled off a rack.",
  },
  {
    icon: Sparkles,
    title: "Design it with us",
    body: "Start from a design of your own and see a preview before we make it, or bring a reference and we will work from that.",
  },
];

const About = () => {
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
              <span className="text-stone-400">About</span>
            </li>
          </ol>
        </nav>

        <h1 className="font-serif text-4xl font-bold tracking-tight text-neutral-800 md:text-5xl">
          About Maikens
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-stone-600">
          Maikens Gown &amp; Barong is a boutique in Pandi, Bulacan, making gowns and barong to order —
          for weddings, debuts and every celebration in between.
        </p>
      </header>

      <main className="px-6 py-14 md:px-10 lg:px-24">
        <div className="mx-auto max-w-3xl space-y-5">
          {POINTS.map((point) => {
            const Icon = point.icon;
            return (
              <section key={point.title} className="flex gap-4 rounded-2xl border border-[#E3DACB] bg-[#FBF8F3] p-6">
                <Icon size={22} className="mt-0.5 shrink-0 text-[#9C7A3C]" />
                <div>
                  <h2 className="font-serif text-lg font-bold text-[#241F1A]">{point.title}</h2>
                  <p className="mt-1.5 text-base leading-relaxed text-[#4A4136]">{point.body}</p>
                </div>
              </section>
            );
          })}

          <p className="text-sm leading-relaxed text-stone-500">
            Send us a message on{" "}
            <Link to="/contact" className="font-medium text-yellow-700/89 hover:underline">
              the contact page
            </Link>{" "}
            or find us on Facebook as <strong className="font-semibold">M&amp;N Gowns and Suits</strong>.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;
