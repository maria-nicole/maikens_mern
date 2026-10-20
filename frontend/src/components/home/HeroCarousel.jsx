import { useEffect, useRef, useState } from "react";

import img1 from "../../assets/img_maikens_1/199503546.jpg";
import img2 from "../../assets/img_maikens_1/196525763.jpg";
import img3 from "../../assets/img_maikens_1/471228577.jpg";
import img4 from "../../assets/img_maikens_1/471318371.jpg";

// Every photo is a 3:2 landscape shot. Each one fills its slide box edge to edge
// (object-cover), so no white gap can show through anywhere in the carousel.
const SLIDES = [img1, img2, img3, img4];

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
            {/* The box keeps roughly the 3:2 shape of the photos, so object-cover fills
                it with very little cropping. It is taller on wide screens, where the
                extra width would otherwise leave the hero looking short. */}
            <div className="relative w-full pb-6 sm:pb-10">
                <div className="relative h-[60vh] min-h-[320px] max-h-[520px] overflow-hidden sm:h-[440px] lg:h-[520px] xl:h-[600px] 2xl:h-[640px]">
                    {SLIDES.map((src, i) => (
                        <div
                            key={i}
                            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${i === current ? "opacity-100 z-10" : "opacity-0 z-0"
                                }`}
                        >
                            <img src={src} className="h-full w-full object-cover" alt={`Featured look ${i + 1}`} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}