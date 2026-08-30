import { useEffect, useRef } from "react";
import InkTicker from "@/components/InkTicker";
import { useNavigate } from "@/lib/router-compat";
import { gsap, prefersReducedMotion } from "@/hooks/useSectionReveal";

const ROLES = [
  {
    idx: "R1",
    param: "receiver",
    name: "Receiver",
    img: "/team-receiver.png",
    desc: "Set your election once - 60% SPYx, 30% USDC, 10% GLDx. Every tip, invoice and salary auto-DCAs your portfolio. You receive what you want, not what they sent.",
    tags: ["SETS THE LAW", "AUTO-DCA", "ZERO FRICTION"],
  },
  {
    idx: "R2",
    param: "sender",
    name: "Sender",
    img: "/team-sender.png",
    desc: "Pay a name, not an address, in any token you already hold. No swaps, no bridges, no pre-conversion. The rail handles the rest - atomically.",
    tags: ["ANY TOKEN", "PAY-BY-HANDLE", "ONE TX"],
  },
  {
    idx: "R3",
    param: "dao",
    name: "Team / DAO",
    img: "/team-dao.png",
    desc: "One payroll vault, one roster, salary-in-assets for everyone. Revenue splits route the moment funds land - each share in that recipient's election.",
    tags: ["PAYROLL VAULT", "NATIVE SPLITS", "SCHEDULED"],
  },
  {
    idx: "R4",
    param: "staker",
    name: "Staker",
    img: "/team-staker.png",
    scene: "ink" as const,
    desc: "Secure the parameters and the registry. Earn a share of every converted settlement. Fees fund open-market buyback - stakers get paid.",
    tags: ["SECURES PARAMS", "FEE SHARE", "BUYBACK"],
  },
];

/**
 * P2 - 2×2 role cards: image tile top (4:3), body below, hairline borders,
 * red corner arrow. Cards stagger 0.12s (y 60px); image scale on hover;
 * index flashes red; arrow rotates 45°.
 */
export default function RoleCards() {
  const rootRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        root.querySelectorAll("[data-role-card]"),
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: { trigger: root, start: "top 80%" },
        }
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="mx-auto max-w-container px-5 md:px-10 py-16 md:py-24">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {ROLES.map((r) => (
          <div
            key={r.idx}
            data-role-card
            className="group relative bg-card2 border border-hairline rounded overflow-hidden hover:border-red transition-colors duration-300"
          >
            <div className="relative overflow-hidden">
              {"scene" in r && (r as { scene?: string }).scene === "ink" ? (
                <InkTicker className="w-full aspect-[4/3] bg-base" />
              ) : (
                <img
                  src={r.img}
                  alt={`${r.name} - abstract role tile`}
                  className="w-full aspect-[4/3] object-cover transition-transform [transition-duration:600ms] group-hover:scale-105"
                />
              )}
              <span className="absolute top-5 left-5 font-mono text-xs uppercase tracking-[0.12em] text-white/70 group-hover:text-red transition-colors duration-200">
                {r.idx}
              </span>
              {/* red corner arrow button */}
              <button
                onClick={() => navigate(`/dashboard/claim?role=${r.param}`)}
                aria-label={`Take the ${r.name} role`}
                className="absolute top-5 right-5 w-10 h-10 bg-red rounded flex items-center justify-center text-white"
              >
                <span className="inline-block transition-transform duration-300 group-hover:rotate-45">
                  ↗
                </span>
              </button>
            </div>

            <div className="p-6 md:p-8">
              <h3 className="font-display font-medium text-[28px] leading-[1.1] tracking-[-0.02em] text-ink">
                {r.name}
              </h3>
              <p className="mt-3 font-body text-[15px] leading-relaxed text-secondary2">
                {r.desc}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {r.tags.map((t) => (
                  <span
                    key={t}
                    className="font-mono text-[11px] uppercase tracking-[0.1em] text-secondary2 border border-hairline rounded px-2.5 py-1"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <button
                onClick={() => navigate(`/dashboard/claim?role=${r.param}`)}
                className="group/link mt-7 inline-flex items-center gap-2 font-body font-semibold text-sm uppercase tracking-[0.08em] text-secondary2 hover:text-ink transition-colors duration-150"
              >
                Take this role
                <span className="inline-block text-red transition-transform duration-150 group-hover/link:translate-x-1.5">
                  →
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
