import { useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { motion } from "framer-motion";
import SectionMarker from "@/components/SectionMarker";
import OnyxCubes from "@/components/OnyxCubes";
import { useSectionReveal } from "@/hooks/useSectionReveal";

function Toggle({
  options,
  value,
  onChange,
}: {
  options: [string, string];
  value: number;
  onChange: (i: number) => void;
}) {
  return (
    <div className="inline-flex border border-hairline rounded p-0.5 gap-0.5">
      {options.map((opt, i) => (
        <button
          key={opt}
          onClick={(e) => {
            e.stopPropagation();
            onChange(i);
          }}
          className={`relative font-mono text-[11px] uppercase tracking-[0.1em] px-3 py-1.5 rounded-sm transition-colors ${
            value === i ? "text-white" : "text-muted2 hover:text-secondary2"
          }`}
        >
          {value === i && (
            <motion.span
              layoutId={undefined}
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

interface PlanRow {
  name: string;
  tagline: string;
  img: string;
  scene?: "onyx";
  price: string;
  priceAlt?: string;
  priceAccent?: boolean;
  sub: [string, string];
  toggle?: [string, string];
  model: string;
  scope: string;
  features: string[];
  cta: string;
  href: string;
}

const PLANS: PlanRow[] = [
  {
    name: "Fast Path",
    tagline: "Same-asset, direct, zero fee.",
    img: "/work-settlement.png",
    price: "$0",
    sub: ["FOREVER", "FOREVER"],
    model: "Zero-fee",
    scope: "Same-asset",
    features: ["Direct transfer", "No conversion", "Atomic"],
    cta: "✓ Select Plan",
    href: "/pricing#fastpath",
  },
  {
    name: "Settlement",
    tagline: "Cross-asset, converted at receipt.",
    img: "/work-invoice.png",
    price: "30 bps",
    priceAlt: "10 bps",
    sub: ["PER-TX CAP", "VOLUME-TIERED"],
    toggle: ["PER-TX", "CAPPED"],
    model: "Bounded bps",
    scope: "Cross-asset",
    features: ["Jupiter best-execution", "Slippage caps", "Pyth price sanity", "USDC safe-settle"],
    cta: "✓ Select Plan",
    href: "/pricing#settlement",
  },
  {
    name: "Payroll Vault",
    tagline: "Rosters paid on schedule.",
    img: "/work-payroll.png",
    price: "TIERED",
    sub: ["ROSTER < 25", "ROSTER 25+"],
    toggle: ["<25", "25+"],
    model: "Tiered",
    scope: "Scheduled",
    features: ["Per-recipient elections", "Permissionless crank", "Funder vault"],
    cta: "✓ Select Plan",
    href: "/pricing#payroll",
  },
  {
    name: "Staker",
    tagline: "Secure the rail, share the fees.",
    img: "/work-token.png",
    scene: "onyx",
    price: "EARN",
    priceAccent: true,
    sub: ["FEE SHARE", "FEE SHARE"],
    model: "Fee share",
    scope: "Staking",
    features: ["Secures params & registry", "Open-market buyback", "Governance"],
    cta: "✓ Select Plan",
    href: "/pricing#staker",
  },
];

function Row({ plan }: { plan: PlanRow }) {
  const [mode, setMode] = useState(0);
  const navigate = useNavigate();

  return (
    <div
      data-reveal
      className="group grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-5 items-center border-t border-hairline py-6 md:py-8 transition-colors duration-300 hover:bg-card2/60"
    >
      {/* Media tile: plan name + tagline */}
      <div className="md:col-span-3 relative rounded overflow-hidden bg-ink min-h-[160px] md:min-h-[180px]">
        {plan.scene === "onyx" ? (
          <>
            <OnyxCubes className="absolute inset-0 w-full h-full" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/45 via-transparent to-ink/45" />
          </>
        ) : (
          <img
            src={plan.img}
            alt={`${plan.name} - abstract tile`}
            className="absolute inset-0 w-full h-full object-cover transition-transform [transition-duration:600ms] group-hover:scale-105"
          />
        )}
        <div className="pointer-events-none relative z-10 flex flex-col p-5 min-h-[160px] md:min-h-[180px]">
          <span className="font-display font-medium text-xl tracking-[-0.02em] text-white">
            {plan.name}
          </span>
          <span className="mt-auto font-mono text-[10px] uppercase tracking-[0.12em] text-white/70">
            {plan.tagline}
          </span>
        </div>
      </div>

      {/* Price + red toggle */}
      <div className="md:col-span-2 flex flex-col gap-2.5">
        <span
          className={`font-mono font-medium text-4xl xl:text-5xl tracking-[-0.03em] ${
            plan.priceAccent ? "text-red" : "text-ink"
          }`}
        >
          {plan.price}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted2">
          {plan.sub[mode]}
        </span>
        {plan.toggle ? (
          <Toggle options={plan.toggle} value={mode} onChange={setMode} />
        ) : (
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-success">
            {plan.priceAccent ? "STAKERS ONLY" : "ALWAYS FREE"}
          </span>
        )}
      </div>

      {/* Plan cell */}
      <div className="md:col-span-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted2 block mb-1">
          MODEL
        </span>
        <span className="font-body text-[15px] text-ink">{plan.model}</span>
      </div>

      {/* Scope cell */}
      <div className="md:col-span-1">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted2 block mb-1">
          SCOPE
        </span>
        <span className="font-body text-[15px] text-ink">{plan.scope}</span>
      </div>

      {/* Features bullet list */}
      <ul className="md:col-span-2 flex flex-col gap-1.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 font-body text-sm text-secondary2 leading-snug">
            <span className="w-1.5 h-1.5 bg-red shrink-0 mt-1.5" aria-hidden />
            {f}
          </li>
        ))}
      </ul>

      {/* Red select button */}
      <div className="md:col-span-2 md:text-right">
        <button
          onClick={() => navigate(plan.href)}
          className="bg-red hover:bg-red-hover text-white font-body font-semibold text-sm uppercase tracking-[0.08em] rounded px-6 py-3 transition-all duration-150 hover:-translate-y-0.5"
        >
          {plan.cta}
        </button>
      </div>
    </div>
  );
}

export default function Pricing() {
  const ref = useSectionReveal<HTMLElement>();

  return (
    <section id="pricing" ref={ref} className="border-t border-hairline">
      <div className="mx-auto max-w-container px-5 md:px-10 py-24 md:py-40">
        <SectionMarker index="005" label="PRICING" />

        <div data-reveal className="mb-12 md:mb-16 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          <h2 className="font-display font-semibold text-4xl md:text-[64px] leading-[1.0] tracking-[-0.03em] text-ink max-w-3xl">
            Fees that behave
            <br />
            like the rail.
          </h2>
          <p className="font-body text-[15px] leading-[1.65] text-muted2 max-w-xs lg:text-right lg:pt-3">
            No subscriptions. No custody. Fees only exist where value is added - and same-asset
            payments are free, forever.
          </p>
        </div>

        <div className="border-b border-hairline">
          {PLANS.map((p) => (
            <Row key={p.name} plan={p} />
          ))}
        </div>

        <p data-reveal className="mt-10 font-mono text-xs uppercase tracking-[0.12em] text-muted2">
          TENDER is settlement infrastructure - not payroll, tax, or investment software.
        </p>
      </div>
    </section>
  );
}
