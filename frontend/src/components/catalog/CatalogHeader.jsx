import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export default function CatalogHeader() {
    return (
        <header className="bg-orange-100/89 px-6 pb-12 pt-10 md:px-10 lg:px-24">
            <nav aria-label="Breadcrumb" className="mb-6">
                <ol className="flex items-center gap-1.5 text-sm text-stone-600">
                    <li>
                        <Link to="/" className="hover:text-yellow-700/89 transition-colors">
                            Home
                        </Link>
                    </li>
                    <li aria-current="page" className="flex items-center gap-1.5">
                        <ChevronRight size={14} className="text-stone-400" />
                        <span className="text-stone-400">Catalog</span>
                    </li>
                </ol>
            </nav>

            <h1 className="font-serif text-4xl font-bold tracking-tight text-neutral-800 md:text-5xl">
                Gowns &amp; Barong
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-stone-600">
                Find something for your wedding, debut, or sponsor role. Filter by event, color, and size, or
                open any piece to try it on with your own photo.
            </p>
        </header>
    );
}