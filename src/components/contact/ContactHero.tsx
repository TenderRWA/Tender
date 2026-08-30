import { useEffect, useRef } from "react";
import SectionMarker from "@/components/SectionMarker";
import { gsap, prefersReducedMotion } from "@/hooks/useSectionReveal";

function SplitLine({ text, className }: { text: string; className?: string }) {
  return (
    <span className={`block overflow-hidden ${className ?? ""}`}>
      {text.split("").map((ch, i) => (
        <span key={i} data-hero-char className="inline-block will-change-transform">
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </span>
  );
}

/** P1. Page hero - `[ 010 / CONTACT ]` marker + char-reveal display heading. */
export default function ContactHero() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.25 });
      tl.fromTo(
        root.querySelectorAll("[data-hero-fade]"),
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: "power3.out", stagger: 0.1 }
      ).fromTo(
        root.querySelectorAll("[data-hero-char]"),
        { yPercent: 110 },
        { yPercent: 0, duration: 0.9, ease: "power4.out", stagger: 0.028 },
        0.15
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="relative">
      <div className="mx-auto max-w-container px-5 md:px-10 pt-16 pb-24 md:pt-24 md:pb-32">
        <div data-hero-fade>
          <SectionMarker index="010" label="CONTACT" />
        </div>
        <h1 className="font-display font-semibold text-[clamp(44px,7vw,96px)] leading-[0.92] tracking-[-0.04em] text-ink">
          <SplitLine text="Talk to the" />
          <SplitLine text="TENDER team." className="text-red" />
        </h1>
        <p
          data-hero-fade
          className="mt-8 max-w-2xl font-body text-[17px] leading-[1.65] text-secondary2"
        >
          Questions about settlement, elections, or mainnet-beta? Reach us
          directly through the channels below.
        </p>
      </div>
    </section>
  );
}
