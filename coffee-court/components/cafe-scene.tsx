import type { HeroSlide } from "../lib/hero";
import type { Product } from "../lib/domain";
import GlassMenuBoards from "./glass-menu-boards";
export default function CafeScene({
  slide,
  products,
  priority = false,
}: {
  slide: HeroSlide;
  products: Product[];
  priority?: boolean;
}) {
  if (slide.image !== "/images/lost-origin-glass-cafe.png")
    return (
      <img
        src={slide.image}
        alt={slide.alt}
        style={{ objectPosition: slide.position }}
        fetchPriority={priority ? "high" : "auto"}
      />
    );
  return (
    <div
      className="cafe-scene-stage"
      style={{
        left:
          slide.position === "left"
            ? "0%"
            : slide.position === "right"
              ? "100%"
              : "50%",
        transform: `translate(${slide.position === "left" ? "0" : slide.position === "right" ? "-100%" : "-50%"}, -50%)`,
      }}
    >
      <img
        src={slide.image}
        alt={slide.alt}
        fetchPriority={priority ? "high" : "auto"}
      />
      <GlassMenuBoards products={products} />
      <span className="cafe-mobile-hint" aria-hidden="true">
        Swipe to explore our café menu →
      </span>
    </div>
  );
}
