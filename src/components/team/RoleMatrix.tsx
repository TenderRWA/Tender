import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/hooks/useSectionReveal";

const COLUMNS = ["ROLE", "CUSTODY", "WHAT YOU SET", "WHAT YOU GET"];

const ROWS: string[][] = [
  ["RECEIVER", "NONE", "YOUR ELECTION", "YOUR PORTFOLIO"],
  ["SENDER", "NONE", "THE HANDLE + TOKEN", "ATOMIC SETTLEMENT"],
  ["TEAM / DAO", "NONE", "ROSTER + SCHEDULE", "SALARY-IN-ASSETS"],
  ["STAKER", "NONE", "THE PARAMETERS", "FEE SHARE"],
];

/**
 * P3 - Role × Benefit matrix: mono table in a dark card. Cells cascade in
 * (0.03s stagger); row hover highlights a red left border. GSAP-only subtree.
 */
export default function RoleMatrix() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        root.querySelectorAll("[data-matrix-cell]"),
        { y: 14, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: "power3.out",
          stagger: 0.03,
          scrollTrigger: { trigger: root, start: "top 80%" },
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
            [ ROLE × BENEFIT ]
          </span>
          <span className="flex-1 h-px bg-hairline" aria-hidden />
        </div>

        <div className="bg-card2 border border-hairline rounded overflow-hidden">
          {/* header */}
          <div className="grid grid-cols-2 md:grid-cols-4 border-b border-hairline">
            {COLUMNS.map((c) => (
              <span
                key={c}
                data-matrix-cell
                className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted2 px-5 md:px-8 py-4"
              >
                {c}
              </span>
            ))}
          </div>
          {ROWS.map((row) => (
            <div
              key={row[0]}
              className="grid grid-cols-2 md:grid-cols-4 border-b border-hairline last:border-b-0 border-l-2 border-l-transparent hover:border-l-red hover:bg-raised transition-colors duration-200"
            >
              {row.map((cell, ci) => (
                <span
                  key={ci}
                  data-matrix-cell
                  className={`font-mono text-xs md:text-sm uppercase tracking-[0.1em] px-5 md:px-8 py-5 md:py-6 ${
                    ci === 0 ? "text-red" : ci === row.length - 1 ? "text-ink" : "text-secondary2"
                  }`}
                >
                  {cell}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
