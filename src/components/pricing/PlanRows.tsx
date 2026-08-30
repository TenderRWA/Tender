import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { AnimatePresence, motion } from "framer-motion";
import { gsap, prefersReducedMotion } from "@/hooks/useSectionReveal";

function Toggle({
  options,
  value,
  onChange,
  layoutKey,
}: {
  options: [string, string];
  value: number;
  onChange: (i: number) => void;
  layoutKey: string;
}) {
  return (
    <div className="inline-flex border border-hairline rounded p-0.5 gap-0.5 w-fit">
      {options.map((opt, i) => (
        <button
          key={opt}
          onClick={(e) => {
            e.stopPropagation();
            onChange(i);
          }}
          aria-pressed={value === i}
          className={`relative font-mono text-[11px] uppercase tracking-[0.1em] px-3 py-1.5 rounded-sm transition-colors ${
            value === i ? "text-white" : "text-muted2 hover:text-secondary2"
          }`}
        >
          {value === i && (
            <motion.span
              layoutId={layoutKey}
              className="absolute inset-0 bg-red rounded-sm"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{opt}</span>
        </button>
      ))}
    </div>
  );
}

function CrossfadeFigure({ value }: { value: string }) {
  return (
    <span className="block relative min-h-[3.75rem]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={value}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="block font-mono font-medium text-4xl md:text-5xl tracking-[-0.03em] text-ink whitespace-nowrap"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((f) => (
        <li key={f} className="flex items-start gap-3 font-body text-[15px] leading-relaxed text-secondary2">
          <span className="mt-[7px] w-1.5 h-1.5 bg-red shrink-0" aria-hidden />
          {f}
        </li>
      ))}
    </ul>
  );
}

const GHOST_BTN =
  "border border-hairline text-secondary2 hover:text-ink hover:border-red font-body font-semibold text-sm uppercase tracking-[0.08em] rounded px-6 py-3 transition-colors duration-150 w-full md:w-auto";
const RED_BTN =
  "bg-red hover:bg-red-hover text-white font-body font-semibold text-sm uppercase tracking-[0.08em] rounded px-6 py-3 transition-all duration-150 hover:-translate-y-0.5 w-full md:w-auto";

/**
 * P2 - Four full-detail fee-model blocks, anchored #fastpath / #settlement /
 * #payroll / #staker. Blocks stagger in (y 60px, 0.12s); toggles spring;
 * figures cross-fade; row hover lifts border to red.
 */
export default function PlanRows() {
  const rootRef = useRef<HTMLElement>(null);
  const [settleMode, setSettleMode] = useState(0);
  const [rosterSize, setRosterSize] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        root.querySelectorAll("[data-plan-row]"),
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

  const rowClass =
    "group grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-6 items-start bg-card2 hover:bg-raised border border-hairline hover:border-red rounded p-6 md:p-10 transition-colors duration-300 scroll-mt-24";

  return (
    <section ref={rootRef} className="mx-auto max-w-container px-5 md:px-10 py-16 md:py-24">
      <div className="flex flex-col gap-6">
        {/* 1 - Fast Path */}
        <div id="fastpath" data-plan-row className={rowClass}>
          <div className="md:col-span-3">
            <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
              FAST PATH · <span className="text-success">FREE</span>
            </span>
            <h3 className="mt-3 font-display font-medium text-[28px] leading-[1.1] tracking-[-0.02em] text-ink">
              Fast Path
            </h3>
            <span className="mt-3 inline-block font-mono text-xs uppercase tracking-[0.12em] text-muted2 border border-hairline rounded px-2.5 py-1">
              TYPE: SAME-ASSET
            </span>
          </div>
          <div className="md:col-span-3">
            <span className="block font-mono font-medium text-5xl md:text-6xl tracking-[-0.03em] text-ink">
              $0
            </span>
            <span className="block mt-2 font-mono text-xs uppercase tracking-[0.12em] text-success">
              FOREVER
            </span>
          </div>
          <div className="md:col-span-4">
            <FeatureList
              items={[
                "Direct wallet-to-wallet transfer",
                "Zero fee, forever",
                "No conversion touched",
                "Atomic",
                "Law 03 of the spec",
              ]}
            />
          </div>
          <div className="md:col-span-2 md:self-center md:text-right">
            <span className={`inline-block cursor-default ${GHOST_BTN.replace("hover:text-ink ", "").replace("hover:border-red ", "")}`}>
              ✓ Always Included
            </span>
          </div>
        </div>

        {/* 2 - Settlement */}
        <div id="settlement" data-plan-row className={rowClass}>
          <div className="md:col-span-3">
            <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
              SETTLEMENT · BOUNDED BPS
            </span>
            <h3 className="mt-3 font-display font-medium text-[28px] leading-[1.1] tracking-[-0.02em] text-ink">
              Settlement
            </h3>
            <span className="mt-3 inline-block font-mono text-xs uppercase tracking-[0.12em] text-muted2 border border-hairline rounded px-2.5 py-1">
              TYPE: CROSS-ASSET
            </span>
          </div>
          <div className="md:col-span-3 flex flex-col gap-3">
            <CrossfadeFigure value={settleMode === 0 ? "≤ 30 BPS" : "TIERED ↓"} />
            <Toggle
              layoutKey="pricing-settle-toggle"
              options={["PER-TX CAP", "VOLUME-TIERED"]}
              value={settleMode}
              onChange={setSettleMode}
            />
          </div>
          <div className="md:col-span-4">
            <FeatureList
              items={[
                "Fee only on converted volume",
                "Jupiter best-execution",
                "Slippage caps",
                "Pyth price sanity",
                "Breaching legs safe-settle to USDC + on-chain notice",
              ]}
            />
          </div>
          <div className="md:col-span-2 md:self-center md:text-right">
            <button onClick={() => navigate("/dashboard/claim")} className={RED_BTN}>
              ✓ Use the Rail
            </button>
          </div>
        </div>

        {/* 3 - Payroll Vault */}
        <div id="payroll" data-plan-row className={rowClass}>
          <div className="md:col-span-3">
            <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
              PAYROLL VAULT · TIERED
            </span>
            <h3 className="mt-3 font-display font-medium text-[28px] leading-[1.1] tracking-[-0.02em] text-ink">
              Payroll Vault
            </h3>
            <span className="mt-3 inline-block font-mono text-xs uppercase tracking-[0.12em] text-muted2 border border-hairline rounded px-2.5 py-1">
              TYPE: SCHEDULED
            </span>
          </div>
          <div className="md:col-span-3 flex flex-col gap-3">
            <CrossfadeFigure value={rosterSize === 0 ? "TIER I" : "TIER II"} />
            <Toggle
              layoutKey="pricing-roster-toggle"
              options={["ROSTER <25", "25+"]}
              value={rosterSize}
              onChange={setRosterSize}
            />
          </div>
          <div className="md:col-span-4">
            <FeatureList
              items={[
                "Funder vault",
                "Roster + schedule",
                "Per-recipient elections",
                "Permissionless crank",
                "Anyone can trigger a due run",
              ]}
            />
          </div>
          <div className="md:col-span-2 md:self-center md:text-right">
            <button onClick={() => navigate("/dashboard/claim")} className={RED_BTN}>
              ✓ Fund a Vault
            </button>
          </div>
        </div>

        {/* 4 - Staker */}
        <div id="staker" data-plan-row className={rowClass}>
          <div className="md:col-span-3">
            <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
              STAKER · FEE SHARE
            </span>
            <h3 className="mt-3 font-display font-medium text-[28px] leading-[1.1] tracking-[-0.02em] text-ink">
              Staker
            </h3>
            <span className="mt-3 inline-block font-mono text-xs uppercase tracking-[0.12em] text-muted2 border border-hairline rounded px-2.5 py-1">
              TYPE: STAKING
            </span>
          </div>
          <div className="md:col-span-3">
            <span className="block font-mono font-medium text-5xl md:text-6xl tracking-[-0.03em] text-red">
              EARN
            </span>
            <span className="block mt-2 font-mono text-xs uppercase tracking-[0.12em] text-muted2">
              NOT A COST
            </span>
          </div>
          <div className="md:col-span-4">
            <FeatureList
              items={[
                "Secures parameters & registry",
                "Share of converted-volume fees",
                "Fees fund open-market buyback + staker pay",
                "Governance over the Universe Gate",
              ]}
            />
          </div>
          <div className="md:col-span-2 md:self-center md:text-right">
            <button onClick={() => navigate("/dashboard/claim")} className={RED_BTN}>
              ✓ Stake TENDER
            </button>
          </div>
        </div>
      </div>

      <p className="mt-10 font-mono text-xs uppercase tracking-[0.12em] text-muted2">
        TENDER is settlement infrastructure - not payroll, tax, or investment software.
      </p>
    </section>
  );
}
