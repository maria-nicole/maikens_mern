import { BsFacebook } from "react-icons/bs";

// Fill in real photo URLs as they're posted. Empty strings are filtered out
// so a blank entry never renders a broken <img>.
const FB_GALLERY = [
    "https://raw.githubusercontent.com/maria-nicole/maikfit_images/refs/heads/main/images/196322087.jpg",
    "https://raw.githubusercontent.com/maria-nicole/maikfit_images/refs/heads/main/images/473797177.jpg",
    "https://raw.githubusercontent.com/maria-nicole/maikfit_images/refs/heads/main/images/196407131.jpg",
    "https://raw.githubusercontent.com/maria-nicole/maikfit_images/refs/heads/main/images/471228577.jpg",
    "https://raw.githubusercontent.com/maria-nicole/maikfit_images/refs/heads/main/images/473718400.jpg",
    "https://raw.githubusercontent.com/maria-nicole/maikfit_images/refs/heads/main/images/197797734.jpg",
    "https://raw.githubusercontent.com/maria-nicole/maikfit_images/refs/heads/main/images/473749941.jpg",
    "https://raw.githubusercontent.com/maria-nicole/maikfit_images/refs/heads/main/images/199503546.jpg",
    "https://raw.githubusercontent.com/maria-nicole/maikfit_images/refs/heads/main/images/471323733.jpg",
].filter(Boolean);

export default function FacebookGallery() {
    if (FB_GALLERY.length === 0) return null;

    return (
        <section className="px-6 pb-16 pt-4 md:px-10 lg:px-24">
            <div className="mb-8 flex items-center gap-3">
                <BsFacebook className="h-7 w-7 text-yellow-700/89" aria-hidden="true" />
                <div>
                    <p className="text-sm text-stone-500">Follow us on Facebook</p>
                    <h2 className="font-serif text-2xl font-bold text-neutral-800 md:text-3xl">M&amp;N Gowns and Suits</h2>
                </div>
            </div>

            <div className="columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4">
                {FB_GALLERY.map((src, i) => (
                    <img
                        key={src}
                        src={src}
                        alt={`Boutique post ${i + 1}`}
                        loading="lazy"
                        className="w-full rounded-lg"
                    />
                ))}
            </div>
        </section>
    );
}