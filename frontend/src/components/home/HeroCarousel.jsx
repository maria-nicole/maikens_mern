import { useEffect, useRef, useState } from "react";

import img1 from "../../assets/img_maikens_1/199503546.jpg";
import img2 from "../../assets/img_maikens_1/196525763.jpg";
import img3 from "../../assets/img_maikens_1/471228577.jpg";
import img4 from "../../assets/img_maikens_1/471318371.jpg";

const SLIDES = [
    { src: img1, className: "absolute left-1/2 top-1/2 pt-50 block w-full -translate-x-1/2 -translate-y-1/2" },
    { src: img2, className: "absolute left-1/2 top-1/2 pt-15 2xl:pt-5 block w-full -translate-x-1/2 -translate-y-1/2" },
    { src: img3, className: "absolute left-1/2 top-1/2 block w-full -translate-x-1/2 -translate-y-1/2" },
    { src: img4, className: "absolute left-1/2 top-1/2 pt-15 2xl:pt-5 block w-full -translate-x-1/2 -translate-y-1/2" },
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
            <div className="relative w-full pb-10">
                <div className="relative h-60 overflow-hidden rounded-base sm:h-64 xl:h-130 2xl:h-130">
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

                {/* Slide indicators */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
                    {SLIDES.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrent(i)}
                            aria-label={`Go to slide ${i + 1}`}
                            className={`h-1.5 rounded-full transition-all ${i === current ? "w-6 bg-yellow-600/89" : "w-1.5 bg-gray-300"
                                }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}