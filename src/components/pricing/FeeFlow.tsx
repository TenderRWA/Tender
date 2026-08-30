import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/hooks/useSectionReveal";

gsap.registerPlugin(ScrollTrigger);

const NODES = ["CONVERTED VOLUME", "PROTOCOL FEE", "OPEN-MARKET BUYBACK", "STAKER PAY"];

/**
 * P3 - Fee flow diagram: outlined mono chips connected by red arrows.
 * Chips slide in from the left (0.15s stagger), arrows draw (scaleX), and a
 * red pulse dot travels the path once on scroll scrub. GSAP-only subtree.
 */
export default function FeeFlow() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        root.querySelectorAll("[data-flow-chip]"),
        { x: -48, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.15,
          scrollTrigger: { trigger: root, start: "top 80%" },
        }
      );
      gsap.fromTo(
        root.querySelectorAll("[data-flow-arrow]"),
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 0.5,
          ease: "power3.out",
          stagger: 0.15,
          delay: 0.3,
          transformOrigin: "left center",
          scrollTrigger: { trigger: root, start: "top 80%" },
        }
      );
      // Red pulse dot travels the path once, scrubbed by scroll (GPU transform).
      const track = root.querySelector<HTMLElement>("[data-flow-track]");
      gsap.fromTo(
        root.querySelector("[data-flow-pulse]"),
        { x: 0, opacity: 0 },
        {
          x: () => (track ? track.offsetWidth : 0),
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: track,
            start: "top 85%",
            end: "bottom 35%",
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        }
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="border-t border-hairline">
      <div className="mx-auto max-w-container px-5 md:px-10 py-20 md:py-28">
        <div className="flex items-center gap-3 mb-10">
          <span className="w-1.5 h-1.5 bg-red shrink-0" aria-hidden />
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
            [ FEE FLOW ]
          </span>
          <span className="flex-1 h-px bg-hairline" aria-hidden />
        </div>

        <div className="bg-card2 border border-hairline rounded p-6 md:p-12 overflow-hidden">
          <div data-flow-track className="relative pt-4 pb-8">
            {/* traveling pulse dot */}
            <span
              data-flow-pulse
              className="absolute top-0 left-0 w-2 h-2 bg-red motion-reduce:hidden"
              aria-hidden
            />
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-0">
              {NODES.map((node, i) => (
                <div key={node} className="flex flex-col lg:flex-row lg:items-center lg:flex-1 gap-4 lg:gap-0">
                  <span
                    data-flow-chip
                    className="font-mono text-xs md:text-sm uppercase tracking-[0.12em] text-ink border border-hairline bg-base rounded px-5 py-4 text-center whitespace-nowrap"
                  >
                    {node}
                  </span>
                  {i < NODES.length - 1 && (
                    <span
                      data-flow-arrow
                      className="hidden lg:flex flex-1 items-center mx-3 h-px bg-red relative"
                      aria-hidden
                    >
                      <span className="absolute right-0 -top-[3px] w-0 h-0 border-y-[3.5px] border-y-transparent border-l-[6px] border-l-red" />
                    </span>
                  )}
                  {i < NODES.length - 1 && (
                    <span
                      data-flow-arrow
                      className="lg:hidden self-center w-px h-6 bg-red relative"
                      aria-hidden
                    >
                      <span className="absolute bottom-0 -left-[3px] w-0 h-0 border-x-[3.5px] border-x-transparent border-t-[6px] border-t-red" />
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <p className="mt-6 font-body text-[15px] leading-relaxed text-secondary2">
            Every basis point the rail earns flows back through the protocol.
          </p>
        </div>
      </div>
    </section>
  );
}
