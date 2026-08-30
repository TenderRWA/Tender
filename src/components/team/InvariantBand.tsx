import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/hooks/useSectionReveal";

gsap.registerPlugin(ScrollTrigger);

/**
 * P4 - The Invariant Band: full-width dark band with a huge scrub heading.
 * Text color (grey → white) and letter-spacing (-0.04em → -0.02em) animate
 * across 100vh of scroll. GSAP-only subtree.
 */
export default function InvariantBand() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        root.querySelector("[data-invariant-heading]"),
        { color: "#9A9AA0", letterSpacing: "-0.04em" },
        {
          color: "#101012",
          letterSpacing: "-0.02em",
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top bottom",
            end: "+=100%",
            scrub: true,
          },
        }
      );
      gsap.fromTo(
        root.querySelector("[data-invariant-sub]"),
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top 60%",
            end: "top 20%",
            scrub: true,
          },
        }
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="border-t border-hairline bg-base/55">
      <div className="mx-auto max-w-container px-5 md:px-10 py-28 md:py-44 text-center">
        <h2
          data-invariant-heading
          className="font-display font-semibold text-[40px] md:text-[72px] lg:text-[96px] leading-[1.0] text-muted2 max-w-6xl mx-auto"
          style={{ letterSpacing: "-0.04em" }}
        >
          The receiver's election is law.
        </h2>
        <p
          data-invariant-sub
          className="mt-8 font-mono text-xs md:text-sm uppercase tracking-[0.12em] text-secondary2"
        >
          EVERY ROLE. EVERY PAYMENT. NO EXCEPTIONS. <span className="text-red">LAW 01</span>
        </p>
      </div>
    </section>
  );
}
