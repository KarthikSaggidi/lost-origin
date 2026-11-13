import { z } from "zod";

export const heroSlideSchema = z.object({
  id: z.string().min(1).max(80),
  image: z
    .string()
    .max(240)
    .regex(/^\/(?:images\/[a-zA-Z0-9._-]+|api\/v1\/media\/[a-zA-Z0-9._-]+)$/),
  alt: z.string().trim().min(2).max(180),
  active: z.boolean(),
  position: z.enum(["center", "left", "right"]).default("center"),
});
export const heroSlidesSchema = z
  .array(heroSlideSchema)
  .min(1)
  .max(6)
  .refine(
    (slides) => slides.some((s) => s.active),
    "Keep at least one hero image visible.",
  )
  .refine(
    (slides) => new Set(slides.map((s) => s.id)).size === slides.length,
    "Each hero image must have a unique ID.",
  );
export type HeroSlide = z.infer<typeof heroSlideSchema>;
export const defaultHeroSlides: HeroSlide[] = [
  {
    id: "lost-origin-glass-cafe",
    image: "/images/lost-origin-glass-cafe.png",
    alt: "Lost Origin Coffee House with glass menu boards, black lettering and warm white interiors",
    active: true,
    position: "center",
  },
];
export function heroSlides(business: Record<string, any>): HeroSlide[] {
  const parsed = heroSlidesSchema.safeParse(business.heroSlides);
  if (!parsed.success) return defaultHeroSlides;
  // Refresh the earlier built-in scene while keeping every administrator upload.
  return parsed.data.map((slide) =>
    slide.id === "lost-origin-cafe" &&
    slide.image === "/images/lost-origin-cafe.png"
      ? {
          ...defaultHeroSlides[0],
          active: slide.active,
          position: slide.position,
        }
      : slide,
  );
}
