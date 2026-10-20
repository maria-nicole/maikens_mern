import { Link } from "react-router-dom";
import { BsFacebook } from "react-icons/bs";
import { MESSENGER_URL } from "./account/accountShared";

const linkClass = "text-sm text-gray-600 hover:text-gray-900 hover:underline";

export default function Footer() {
    return (
        <footer className="w-full border-t border-gray-200 bg-white px-6 py-10">
            <div className="flex flex-col sm:flex-row sm:justify-between">
                <div className="my-5 mb-6 gap-2 sm:mb-0 lg:mx-5">
                    <span className="text-2xl font-bold text-gray-800">MAIKENS</span>
                    <p className="py-5 text-gray-400">
                        Stall A18 Disenyo Pandi
                        <br />
                        Wedding Depot
                        <br />
                        Grace Park Street, Bagong Barrio, Pandi, 3014 Bulacan
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-8 sm:mt-4 sm:grid-cols-3 sm:gap-6">
                    <div>
                        <h2 className="mb-6 text-sm font-semibold uppercase text-gray-900">Link</h2>
                        <ul className="flex flex-col gap-5">
                            <li><Link to="/" className={linkClass}>Home</Link></li>
                            <li><Link to="/catalog" className={linkClass}>Shop</Link></li>
                            <li><Link to="/about" className={linkClass}>About</Link></li>
                            <li><Link to="/contact" className={linkClass}>Contact</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="mb-6 text-sm font-semibold uppercase text-gray-900">Help</h2>
                        <ul className="flex flex-col gap-5">
                            <li><Link to="/payment-policy" className={linkClass}>Payment Options</Link></li>
                            <li><Link to="/payment-policy" className={linkClass}>Returns</Link></li>
                            <li><Link to="/privacy-policy" className={linkClass}>Privacy Policies</Link></li>
                        </ul>
                    </div>
                </div>
            </div>

            <hr className="my-6 border-gray-200" />

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                <span className="text-sm text-gray-500">
                    © 2026 <Link to="/" className="hover:underline">MAIKENS GOWN &amp; BARONG</Link>. All Rights Reserved.
                </span>
                <a
                    href={MESSENGER_URL}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Maikens on Facebook"
                    className="text-gray-500 transition-colors hover:text-gray-900"
                >
                    <BsFacebook className="h-5 w-5" />
                </a>
            </div>
        </footer>
    );
}