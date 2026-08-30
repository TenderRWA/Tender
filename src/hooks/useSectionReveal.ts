import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const reduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Scroll-driven section entrance: children tagged `[data-reveal]` stagger in
 * (y 40px → 0, opacity 0 → 1, power3.out, 0.8s, stagger 0.08s) when the section
 * hits 15% of the viewport. Hairlines tagged `[data-hairline]` draw scaleX 0→1.
 * GSAP-only; keep Framer Motion out of the same subtree.
 */
export function useSectionReveal<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || reduced) return;

    const ctx = gsap.context(() => {
      const items = root.querySelectorAll("[data-reveal]");
      const hairlines = root.querySelectorAll("[data-hairline]");

      if (items.length) {
        gsap.fromTo(
          items,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power3.out",
            stagger: 0.08,
            scrollTrigger: { trigger: root, start: "top 85%" },
          }
        );
      }
      if (hairlines.length) {
        gsap.fromTo(
          hairlines,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 0.6,
            ease: "power3.out",
            transformOrigin: "left center",
            scrollTrigger: { trigger: root, start: "top 85%" },
          }
        );
      }
    }, root);

    return () => ctx.revert();
  }, []);

  return ref;
}

export { gsap, ScrollTrigger, reduced as prefersReducedMotion };
