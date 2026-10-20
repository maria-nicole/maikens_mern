import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import Footer from "../components/Footer";
import { NAVBAR_PT, PAYMENT_POLICY } from "../components/account/accountShared";

/* The payment terms, in one place a customer can be sent to.

   The same sentences appear at checkout, in My Orders and on the order slip — all three
   read PAYMENT_POLICY, so there is only one wording to keep true.

   What is written here is the boutique's practice, not something the checkout enforces:
   half the price may be paid to start an order, and payments are not refundable. An
   online order is recorded as unpaid and staff enter each payment by hand, so the page
   says "you may pay", which is what actually happens. */
const PaymentPolicy = () => {
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
              <span className="text-stone-400">Payment Options</span>
            </li>
          </ol>
        </nav>

        <h1 className="font-serif text-4xl font-bold tracking-tight text-neutral-800 md:text-5xl">
          Payment Options
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-stone-600">
          How payment works at Maikens, before you place an order.
        </p>
      </header>

      <main className="px-6 py-14 md:px-10 lg:px-24">
        <div className="mx-auto max-w-3xl space-y-5">
          {PAYMENT_POLICY.map((rule) => (
            <section key={rule.title} className="rounded-2xl border border-[#E3DACB] bg-[#FBF8F3] p-6">
              <h2 className="font-serif text-xl font-bold text-[#241F1A]">{rule.title}</h2>
              <p className="mt-2 text-base leading-relaxed text-[#4A4136]">{rule.body}</p>
            </section>
          ))}

          <p className="text-sm leading-relaxed text-stone-500">
            If the boutique cancels an order it cannot fulfil, any payment received is sorted out with
            you directly. Message us on Messenger or through the{" "}
            <Link to="/contact" className="font-medium text-yellow-700/89 hover:underline">
              contact page
            </Link>{" "}
            and we will help.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentPolicy;
