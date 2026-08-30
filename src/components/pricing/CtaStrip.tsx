import { useEffect, useRef } from "react";
import { useNavigate } from "@/lib/router-compat";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/hooks/useSectionReveal";

gsap.registerPlugin(ScrollTrigger);

interface CtaStripProps {
  heading: string;
  /** Optional mono disclaimer line rendered under the button. */
  disclaimer?: string;
}

/**
 * Full-width red CTA strip with dot-matrix texture, clip reveal, and a
 * "Claim Your Handle →" button wired to /dashboard/claim.
 */
export default function CtaStrip({ heading, disclaimer }: CtaStripProps) {
  const rootRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        root.querySelector("[data-cta-clip]"),
        { clipPath: "inset(0 0 100% 0)" },
        {
          clipPath: "inset(0 0 0% 0)",
          duration: 0.9,
          ease: "power3.inOut",
          scrollTrigger: { trigger: root, start: "top 85%" },
        }
      );
      gsap.fromTo(
        root.querySelectorAll("[data-cta-fade]"),
        { y: 32, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.1,
          delay: 0.25,
          scrollTrigger: { trigger: root, start: "top 85%" },
        }
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="border-t border-hairline">
      <div data-cta-clip className="relative bg-red overflow-hidden">
        <div className="absolute inset-0 dot-matrix" aria-hidden />
        <div className="relative mx-auto max-w-container px-5 md:px-10 py-20 md:py-28 flex flex-col md:flex-row md:items-center md:justify-between gap-10">
          <h2
            data-cta-fade
            className="font-display font-semibold text-4xl md:text-[56px] leading-[1.0] tracking-[-0.03em] text-white max-w-2xl"
          >
            {heading}
          </h2>
          <div data-cta-fade className="flex flex-col items-start md:items-end gap-5 shrink-0">
            <button
              onClick={() => navigate("/dashboard/claim")}
              className="group bg-white hover:bg-white/90 text-red-deep font-body font-semibold text-sm uppercase tracking-[0.08em] rounded px-8 py-4 transition-all duration-150 hover:-translate-y-0.5 inline-flex items-center gap-2"
            >
              Claim Your Handle
              <span className="inline-block transition-transform duration-150 group-hover:translate-x-1.5">
                →
              </span>
            </button>
            {disclaimer && (
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-red-deep max-w-sm md:text-right">
                {disclaimer}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
