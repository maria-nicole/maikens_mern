import { useEffect, useRef, useState } from "react";

import img1 from "../../assets/img_maikens_1/199503546.jpg";
import img2 from "../../assets/img_maikens_1/196525763.jpg";
import img3 from "../../assets/img_maikens_1/471228577.jpg";
import img4 from "../../assets/img_maikens_1/471318371.jpg";

const SLIDES = [
    { src: img1, className: "absolute left-1/2 top-1/2 block w-full -translate-x-1/2 -translate-y-1/2 pt-24 sm:pt-50" },
    { src: img2, className: "absolute left-1/2 top-1/2 block w-full -translate-x-1/2 -translate-y-1/2 pt-8 sm:pt-15 2xl:pt-5" },
    { src: img3, className: "absolute left-1/2 top-1/2 block w-full -translate-x-1/2 -translate-y-1/2" },
    { src: img4, className: "absolute left-1/2 top-1/2 block w-full -translate-x-1/2 -translate-y-1/2 pt-8 sm:pt-15 2xl:pt-5" },
];

const SLIDE_INTERVAL = 3000;

export default function HeroCarousel() {
    const [current, setCurrent] = useState(0);
    const timerRef = useRef(null);

    useEffect(() => {
        timerRef.current = setInterval(() => {
            setCurrent((prev) => (prev + 1) % SLIDES.length);
        }, SLIDE_INTERVAL);
        return () => clearInterval(timerRef.current);
    }, []);

    return (
        <div className="mt-3 2xl:mt-15">
            {/* Full width on a phone, and tall enough to read as a hero rather than a
                strip. The extra height keeps the photos from being cropped hard. */}
            <div className="relative w-full pb-6 sm:pb-10">
                <div className="relative h-[60vh] min-h-[320px] max-h-[520px] overflow-hidden sm:h-[420px] sm:max-h-none xl:h-130 2xl:h-130">
                    {SLIDES.map((slide, i) => (
                        <div
                            key={i}
                            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${i === current ? "opacity-100 z-10" : "opacity-0 z-0"
                                }`}
                        >
                            <img src={slide.src} className={slide.className} alt={`Featured look ${i + 1}`} />
                        </div>
                    ))}
                </div>

                {/* Dots: on a phone there is no hover, so the slide count needs a hint. */}
                <div className="mt-3 flex justify-center gap-2 sm:hidden">
                    {SLIDES.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setCurrent(i)}
                            aria-label={`Show slide ${i + 1}`}
                            aria-current={i === current}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? "w-5 bg-yellow-700/89" : "w-1.5 bg-stone-300"
                                }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}