import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/hooks/useSectionReveal";
import SectionMarker from "@/components/SectionMarker";

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

interface PageHeroProps {
  index: string;
  label: string;
  line1: string;
  /** Rendered in accent red below line1. */
  line2: string;
  sub: string;
}

/**
 * Sub-page hero: section marker, char-reveal H1 (white line + red line),
 * staggered fade-up sub, hairline draw. GSAP-only subtree.
 */
export default function PageHero({ index, label, line1, line2, sub }: PageHeroProps) {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.2 });
      tl.fromTo(
        root.querySelectorAll("[data-hero-char]"),
        { yPercent: 110 },
        { yPercent: 0, duration: 0.9, ease: "power4.out", stagger: 0.025 }
      )
        .fromTo(
          root.querySelectorAll("[data-hero-fade]"),
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, ease: "power3.out", stagger: 0.1 },
          "-=0.5"
        )
        .fromTo(
          root.querySelectorAll("[data-hero-hairline]"),
          { scaleX: 0 },
          { scaleX: 1, duration: 0.7, ease: "power3.out", transformOrigin: "left center" },
          "-=0.6"
        );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="relative overflow-hidden">
      <div className="mx-auto max-w-container px-5 md:px-10 pt-14 md:pt-20 pb-20 md:pb-28">
        <SectionMarker index={index} label={label} />
        <h1 className="font-display font-semibold text-[44px] md:text-[72px] lg:text-[96px] leading-[0.95] tracking-[-0.04em] text-ink max-w-5xl">
          <SplitLine text={line1} />
          <SplitLine text={line2} className="text-red" />
        </h1>
        <p
          data-hero-fade
          className="mt-8 max-w-2xl font-body text-[17px] leading-[1.65] text-secondary2"
        >
          {sub}
        </p>
      </div>
      <span
        data-hero-hairline
        className="absolute bottom-0 left-0 right-0 h-px bg-hairline"
        aria-hidden
      />
    </section>
  );
}
