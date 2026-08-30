import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { AnimatePresence, motion } from "framer-motion";
import SectionMarker from "@/components/SectionMarker";
import { gsap, prefersReducedMotion } from "@/hooks/useSectionReveal";

const EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* ------------------------------------------------------------------ */
/* P1. Page Hero                                                       */
/* ------------------------------------------------------------------ */

function CharLine({ text, className }: { text: string; className?: string }) {
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

function ServicesHero() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.2 });
      tl.fromTo(
        root.querySelectorAll("[data-hero-char]"),
        { yPercent: 110 },
        { yPercent: 0, duration: 0.8, ease: "power4.out", stagger: 0.03 }
      )
        .fromTo(
          root.querySelector("[data-hero-hairline]"),
          { scaleX: 0 },
          { scaleX: 1, duration: 0.6, ease: "power3.out", transformOrigin: "left center" },
          0.4
        )
        .fromTo(
          root.querySelectorAll("[data-hero-fade]"),
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, ease: "power3.out", stagger: 0.15 },
          0.5
        );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="bg-base/55">
      <div className="mx-auto max-w-container px-5 md:px-10 py-16 md:py-24">
        <SectionMarker index="002" label="CORE SERVICES" />
        <h1 className="font-display font-semibold text-[44px] md:text-[72px] leading-[0.95] tracking-[-0.04em]">
          <CharLine text="Four primitives." className="text-ink" />
          <CharLine text="One rail." className="text-red" />
        </h1>
        <p
          data-hero-fade
          className="mt-8 font-body text-[17px] leading-[1.65] text-secondary2 max-w-2xl"
        >
          Set an election. Receive atomically. Split natively. Pay a roster. The sender
          never sees any of it.
        </p>
        <div className="mt-12 flex items-center gap-4">
          <span
            data-hero-fade
            className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2 whitespace-nowrap"
          >
            CORE SERVICES 4/4 · SOLANA MAINNET-BETA
          </span>
          <span data-hero-hairline className="flex-1 h-px bg-hairline" aria-hidden />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* P2. Expandable Panels (full-page version)                           */
/* ------------------------------------------------------------------ */

const PANELS = [
  {
    num: "01",
    title: "Handle Elections",
    copy: "Claim your handle and set your election once - any mix of eligible assets, basis points summing to 100%. Every payment to your handle honors it exactly.",
    features: [
      "Claim once",
      "Any eligible mix",
      "bps sum to 100%",
      "Updateable anytime",
      "Standard, never forked",
    ],
    diagram: "HANDLE → REGISTRY → ELECTION[BPS=100%]",
  },
  {
    num: "02",
    title: "Atomic Settlement",
    copy: "Sender sends whatever they hold; you receive what you elected. Jupiter best-execution at receipt, slippage caps, Pyth price sanity. One atomic transaction.",
    features: [
      "One instruction, end to end",
      "Jupiter best-execution",
      "Slippage caps",
      "Pyth price sanity",
      "USDC safe-settle fallback",
    ],
    diagram: "SENDER → ROUTER → JUPITER → YOUR ELECTION",
  },
  {
    num: "03",
    title: "Splits & Invoices",
    copy: "A handle can route to many recipients - each share settled per that recipient's own election. Invoices and pay-links carry amount, memo, and expiry.",
    features: [
      "Multi-recipient handles",
      "Per-share elections",
      "Amount/memo/expiry links",
      "Solana Pay QR",
    ],
    diagram: "1 PAYMENT → N RECIPIENTS → N ELECTIONS",
  },
  {
    num: "04",
    title: "Payroll Vaults",
    copy: "Fund a vault, set a roster and a schedule. A permissionless crank pays everyone in their elected assets.",
    features: [
      "Funder vault",
      "Roster + schedule",
      "Permissionless crank",
      "Per-recipient elections",
    ],
    diagram: "VAULT → CRANK → ROSTER → ELECTED ASSETS",
  },
];

/** Mono flow diagram that types itself character-by-character on activation. */
function TypewriterDiagram({ text, active }: { text: string; active: boolean }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (prefersReducedMotion) {
      setShown(text.length);
      return;
    }
    let n = 0;
    setShown(0);
    const iv = window.setInterval(() => {
      n += 1;
      setShown(n);
      if (n >= text.length) window.clearInterval(iv);
    }, 20);
    return () => window.clearInterval(iv);
  }, [active, text]);

  return (
    <span className="block font-mono text-xs md:text-sm uppercase tracking-[0.12em] text-white bg-black/25 border border-white/20 rounded px-4 py-3 whitespace-nowrap overflow-hidden">
      {text.slice(0, shown)}
      <span className="inline-block w-2 h-3.5 bg-white/80 align-middle ml-0.5 animate-pulse" aria-hidden />
    </span>
  );
}

function ServicePanels() {
  const [active, setActive] = useState(0);

  return (
    <section className="border-t border-hairline">
      <div className="mx-auto max-w-container px-5 md:px-10 py-24 md:py-40">
        <div className="flex items-center gap-3 mb-12 md:mb-16">
          <span className="w-1.5 h-1.5 bg-red shrink-0" aria-hidden />
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2 whitespace-nowrap">
            [ THE FOUR PRIMITIVES ]
          </span>
          <span className="flex-1 h-px bg-hairline" aria-hidden />
        </div>

        <div className="flex flex-col lg:flex-row gap-3 lg:h-[70vh] lg:min-h-[560px]">
          {PANELS.map((p, i) => {
            const isActive = i === active;
            return (
              <div
                key={p.num}
                onMouseEnter={() => {
                  if (window.matchMedia("(pointer: fine)").matches) setActive(i);
                }}
                onClick={() => setActive(i)}
                role="button"
                aria-expanded={isActive}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setActive(i);
                }}
                className={`relative rounded border overflow-hidden cursor-pointer transition-all [transition-duration:600ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
                  isActive
                    ? "bg-red border-red lg:flex-[5.5]"
                    : "bg-card2 border-hairline hover:border-red/50 lg:flex-[1.5]"
                } flex flex-col justify-between p-6 min-h-[72px] lg:min-h-0 ${
                  isActive ? "lg:p-8" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`font-mono text-sm ${
                      isActive ? "text-white/80" : "text-muted2"
                    }`}
                  >
                    {p.num}
                  </span>
                </div>

                {/* Desktop: vertical keyword when inactive */}
                <span
                  className={`hidden lg:block font-display font-medium text-lg tracking-[-0.02em] [writing-mode:vertical-rl] rotate-180 ${
                    isActive ? "lg:hidden" : "text-secondary2"
                  }`}
                >
                  {p.title}
                </span>

                {/* Mobile collapsed label */}
                <div className="lg:hidden">
                  <span
                    className={`font-display font-medium text-lg ${
                      isActive ? "text-white" : "text-secondary2"
                    }`}
                  >
                    {p.title}
                  </span>
                </div>

                <AnimatePresence initial={false}>
                  {isActive && (
                    <motion.div
                      key="copy"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                      className="mt-4 lg:mt-0"
                    >
                      <h3 className="hidden lg:block font-display font-medium text-[28px] leading-[1.1] tracking-[-0.02em] text-white mb-4">
                        {p.title}
                      </h3>
                      <p className="font-body text-[15px] leading-relaxed text-white/85 max-w-md">
                        {p.copy}
                      </p>
                      <ul className="mt-5 flex flex-col gap-2">
                        {p.features.map((f) => (
                          <li
                            key={f}
                            className="flex items-center gap-3 font-body text-sm text-white/85"
                          >
                            <span className="w-1.5 h-1.5 bg-white shrink-0" aria-hidden />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-6 max-w-full overflow-x-auto">
                        <TypewriterDiagram text={p.diagram} active={isActive} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* P3. How A Payment Flows (pinned vertical stepper)                   */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    title: "Sender initiates",
    body: "Pays @yourhandle in any token they hold.",
    stat: "ANY TOKEN",
  },
  {
    title: "Router validates",
    body: "Reads your election from the registry; checks asset eligibility.",
    stat: "ON-CHAIN",
  },
  {
    title: "Conversion at receipt",
    body: "Jupiter route, slippage-capped, Pyth-sane.",
    stat: "BEST-EXEC",
  },
  {
    title: "Delivery",
    body: "Your elected assets land in your wallet. Atomic. No custody. One transaction.",
    stat: "YOUR ASSETS",
  },
];

function PaymentFlow() {
  const rootRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (prefersReducedMotion) {
      setActive(STEPS.length - 1);
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: "top 80px",
          end: "+=150%",
          pin: true,
          scrub: 0.5,
          onUpdate: (self) => {
            const idx = Math.min(STEPS.length - 1, Math.floor(self.progress * STEPS.length));
            setActive((prev) => (prev === idx ? prev : idx));
          },
        },
      });

      // hairline draws down as you scroll
      tl.fromTo(
        root.querySelector("[data-flow-line]"),
        { scaleY: 0 },
        { scaleY: 1, ease: "none", duration: 1, transformOrigin: "top center" },
        0
      );

      // steps brighten sequentially
      root.querySelectorAll("[data-flow-step]").forEach((el, i) => {
        tl.fromTo(
          el,
          { opacity: 0.3, y: 24 },
          { opacity: 1, y: 0, duration: 0.18, ease: "power2.out" },
          (i / STEPS.length) * 0.85
        );
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="border-t border-hairline bg-base/55 overflow-hidden">
      <div className="mx-auto max-w-container px-5 md:px-10 py-24 min-h-[calc(100dvh-5rem)] flex flex-col justify-center">
        <div className="flex items-center gap-3 mb-12 md:mb-16">
          <span className="w-1.5 h-1.5 bg-red shrink-0" aria-hidden />
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2 whitespace-nowrap">
            [ HOW A PAYMENT FLOWS ]
          </span>
          <span className="flex-1 h-px bg-hairline" aria-hidden />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8">
          {/* Timeline */}
          <div className="relative pl-10">
            {/* rail */}
            <span
              className="absolute left-[11px] top-2 bottom-2 w-px bg-hairline"
              aria-hidden
            />
            <span
              data-flow-line
              className="absolute left-[11px] top-2 bottom-2 w-px bg-red origin-top"
              aria-hidden
            />
            <ol className="flex flex-col gap-12 md:gap-16">
              {STEPS.map((s, i) => {
                const passed = i <= active;
                return (
                  <li key={s.title} data-flow-step className="relative">
                    <span
                      aria-hidden
                      className={`absolute -left-10 top-1.5 w-6 h-6 rounded-full border flex items-center justify-center transition-colors duration-300 ${
                        passed ? "border-red bg-red/15" : "border-hairline bg-base"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                          passed ? "bg-red" : "bg-muted2/40"
                        }`}
                      />
                    </span>
                    <span className="font-mono text-xs uppercase tracking-[0.12em] text-muted2">
                      STEP {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-2 font-display font-medium text-[28px] leading-[1.1] tracking-[-0.02em] text-ink">
                      {s.title}
                    </h3>
                    <p className="mt-3 font-body text-[17px] leading-[1.65] text-secondary2 max-w-md">
                      {s.body}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Sticky stat (cross-fades per visible step) */}
          <div className="relative hidden lg:flex items-center justify-end min-h-[320px]">
            {STEPS.map((s, i) => (
              <span
                key={s.stat}
                aria-hidden={i !== active}
                className={`absolute right-0 font-mono font-medium text-[56px] xl:text-[88px] leading-none tracking-[-0.03em] text-right transition-opacity duration-500 ${
                  i === active ? "opacity-100 text-red" : "opacity-0 text-red"
                }`}
              >
                {s.stat}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* P4. Service Comparison Strip                                        */
/* ------------------------------------------------------------------ */

const COMPARE_COLS = [
  "HANDLE ELECTIONS",
  "ATOMIC SETTLEMENT",
  "SPLITS & INVOICES",
  "PAYROLL VAULTS",
];

const COMPARE_ROWS: { label: string; values: string[] }[] = [
  { label: "CUSTODY", values: ["NONE", "NONE", "NONE", "NONE"] },
  { label: "FEE", values: ["0 BPS", "BOUNDED BPS", "0 BPS", "TIERED"] },
  { label: "FINALITY", values: ["<1 SEC", "<1 SEC", "<1 SEC", "EPOCH RUN"] },
  {
    label: "FALLBACK",
    values: ["USDC SAFE-SETTLE", "USDC SAFE-SETTLE", "USDC SAFE-SETTLE", "USDC SAFE-SETTLE"],
  },
];

function ComparisonStrip() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        root.querySelectorAll("[data-cell]"),
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
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
      <div className="mx-auto max-w-container px-5 md:px-10 py-24 md:py-40">
        <div className="flex items-center gap-3 mb-12 md:mb-16">
          <span className="w-1.5 h-1.5 bg-red shrink-0" aria-hidden />
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2 whitespace-nowrap">
            [ SERVICE COMPARISON ]
          </span>
          <span className="flex-1 h-px bg-hairline" aria-hidden />
        </div>

        <div className="bg-card2 border border-hairline rounded overflow-x-auto">
          <div className="min-w-[820px] grid grid-cols-5">
            {/* header row */}
            <div data-cell className="p-5 border-b border-r border-hairline" />
            {COMPARE_COLS.map((c) => (
              <div
                key={c}
                data-cell
                className="p-5 border-b border-hairline last:border-r-0 border-r font-mono text-xs uppercase tracking-[0.12em] text-secondary2"
              >
                {c}
              </div>
            ))}
            {/* body rows */}
            {COMPARE_ROWS.map((row) => (
              <div key={row.label} className="contents">
                <div
                  data-cell
                  className="p-5 border-b last:border-b-0 border-r border-hairline font-mono text-xs uppercase tracking-[0.12em] text-muted2"
                >
                  {row.label}
                </div>
                {row.values.map((v, vi) => (
                  <div
                    key={vi}
                    data-cell
                    className={`p-5 border-b last:border-b-0 border-r last:border-r-0 border-hairline font-mono text-sm uppercase tracking-[0.08em] ${
                      v === "NONE" || v === "0 BPS" ? "text-success" : "text-ink"
                    }`}
                  >
                    {v}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <p className="mt-8 font-mono text-xs uppercase tracking-[0.12em] text-muted2">
          TENDER is settlement infrastructure - not payroll, tax, or investment software.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* P5. CTA Strip                                                       */
/* ------------------------------------------------------------------ */

function CtaStrip() {
  const navigate = useNavigate();

  return (
    <motion.section
      initial={prefersReducedMotion ? false : { clipPath: "inset(100% 0 0 0)" }}
      whileInView={{ clipPath: "inset(0% 0 0 0)" }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.9, ease: EXPO }}
      className="bg-red"
    >
      <div className="mx-auto max-w-container px-5 md:px-10 py-24 md:py-32 flex flex-col md:flex-row md:items-center justify-between gap-10">
        <h2 className="font-display font-semibold text-4xl md:text-[64px] leading-[1.0] tracking-[-0.03em] text-white max-w-3xl">
          Start with an election.
        </h2>
        <motion.button
          onClick={() => navigate("/dashboard/claim")}
          animate={prefersReducedMotion ? undefined : { scale: [1, 1.02, 1] }}
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="shrink-0 font-body font-semibold text-sm uppercase tracking-[0.08em] text-red-deep border-2 border-red-deep rounded px-8 py-4 hover:bg-red-deep hover:text-white transition-colors duration-200"
        >
          Claim Your Handle →
        </motion.button>
      </div>
    </motion.section>
  );
}

/* ------------------------------------------------------------------ */

export default function Services() {
  return (
    <>
      <ServicesHero />
      <ServicePanels />
      <PaymentFlow />
      <ComparisonStrip />
      <CtaStrip />
    </>
  );
}
