import { useEffect, useRef } from "react";
import SectionMarker from "@/components/SectionMarker";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/hooks/useSectionReveal";
import { useComingSoon } from "@/components/ComingSoonModal";

gsap.registerPlugin(ScrollTrigger);

/** Served from `public/` — see the note in `SiteBackground`. */
const LABS_VIDEO_SRC = "/labs2.mp4";

const MILESTONES = [
  { t: "T1", desc: "Handle elections + pay-by-handle settlement." },
  { t: "T2", desc: "Splits + invoices & pay-links (Solana Pay QR)." },
  { t: "T3", desc: "Payroll vaults + staking genesis." },
  { t: "T4", desc: ".sol adapter + social-binding pay + cross-chain pay-in." },
];

export default function Labs() {
  const rootRef = useRef<HTMLElement>(null);
  const comingSoon = useComingSoon();

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      // word-by-word grey to near-black scrub on the big heading
      gsap.fromTo(
        root.querySelectorAll("[data-lab-word]"),
        { color: "#9A9AA0" },
        {
          color: "#101012",
          stagger: 0.15,
          ease: "none",
          scrollTrigger: { trigger: root, start: "top 75%", end: "top 30%", scrub: true },
        }
      );
      // general reveals
      gsap.fromTo(
        root.querySelectorAll("[data-reveal]"),
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
      // milestone nodes pop in sequence
      gsap.fromTo(
        root.querySelectorAll("[data-node]"),
        { scale: 0 },
        {
          scale: 1,
          duration: 0.5,
          ease: "back.out(2)",
          stagger: 0.15,
          scrollTrigger: { trigger: root.querySelector("[data-nodes]"), start: "top 85%" },
        }
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section id="labs" ref={rootRef} className="border-t border-hairline">
      <div className="mx-auto max-w-container px-5 md:px-10 py-24 md:py-40">
        <div data-reveal>
          <SectionMarker index="009" label="TENDER LABS®" />
        </div>

        <h2 className="font-display font-bold text-[44px] md:text-[96px] leading-[1.0] tracking-[-0.03em]">
          {"Tender Labs®".split(" ").map((w, i) => (
            <span key={i} data-lab-word className="inline-block mr-4 text-muted2">
              {w}
            </span>
          ))}
        </h2>
        <div data-reveal className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <p className="font-body text-[17px] leading-[1.65] text-secondary2 max-w-md">
            The roadmap is public. The rail ships in tranches.
          </p>
          <button
            onClick={comingSoon.open}
            className="group inline-flex items-center gap-2 bg-red hover:bg-red-hover text-white font-body font-semibold text-sm uppercase tracking-[0.08em] rounded px-8 py-4 transition-all duration-150 hover:-translate-y-0.5 w-fit shrink-0"
          >
            Read the backend spec
            <span className="inline-block transition-transform duration-150 group-hover:translate-x-1.5">
              →
            </span>
          </button>
        </div>

        {/* Roadmap tile */}
        <div data-reveal className="mt-12 bg-card2 border border-hairline rounded overflow-hidden">
          <video
            src={LABS_VIDEO_SRC}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            aria-label="TENDER labs roadmap motion loop"
            className="block w-full aspect-video object-cover"
          />
          <div data-nodes className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-6 md:p-8 border-t border-hairline">
            {MILESTONES.map((m) => (
              <div key={m.t} data-node className="flex gap-4">
                <span className="w-10 h-10 shrink-0 bg-red rounded flex items-center justify-center font-mono text-sm font-medium text-white">
                  {m.t}
                </span>
                <p className="font-body text-sm leading-relaxed text-secondary2">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
