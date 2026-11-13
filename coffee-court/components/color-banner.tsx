"use client";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { heroSlides, type HeroSlide } from "../lib/hero";
import type { Product } from "../lib/domain";
import CafeScene from "./cafe-scene";
export default function ColorBanner({
  business,
  products,
}: {
  business: Record<string, any>;
  products: Product[];
}) {
  const slides = heroSlides(business).filter((s) => s.active);
  const [slide, setSlide] = useState(0);
  const slideKey = slides.map((s) => `${s.id}:${s.image}`).join("|");
  useEffect(() => setSlide(0), [slideKey]);
  const current: HeroSlide = slides[slide] || slides[0];
  return (
    <div
      className="cafe-hero-scene"
      aria-roledescription="carousel"
      aria-label="Coffee house highlights"
    >
      <CafeScene
        key={current.image}
        slide={current}
        products={products}
        priority
      />
      {slides.length > 1 && (
        <div className="cafe-slide-controls">
          <button
            aria-label="Previous banner"
            onClick={() =>
              setSlide((slide + slides.length - 1) % slides.length)
            }
          >
            <ChevronLeft size={18} />
          </button>
          <span aria-live="polite">
            {slide + 1} / {slides.length}
          </span>
          <button
            aria-label="Next banner"
            onClick={() => setSlide((slide + 1) % slides.length)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
