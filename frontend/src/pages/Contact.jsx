import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import ContactForm from "../components/contact/ContactForm";
import ChatCard from "../components/contact/ChatCard";
import Footer from "../components/Footer";

const Contact = () => {
  return (
    <div className="min-h-screen bg-white pt-16">
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
              <span className="text-stone-400">Contact</span>
            </li>
          </ol>
        </nav>

        <h1 className="font-serif text-4xl font-bold tracking-tight text-neutral-800 md:text-5xl">Get in touch</h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-stone-600">
          Send us a message about a gown, a barong or a custom request. Our staff is always happy to help.
        </p>
      </header>

      <main className="px-6 py-14 md:px-10 lg:px-24">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-5 md:items-start">
          <div className="md:col-span-3">
            <ContactForm />
          </div>
          <div className="md:col-span-2">
            <ChatCard />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;