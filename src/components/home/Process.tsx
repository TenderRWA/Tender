import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { AnimatePresence, motion } from "framer-motion";
import SectionMarker from "@/components/SectionMarker";
import { useSectionReveal } from "@/hooks/useSectionReveal";

const STEPS = [
  {
    title: "Step 1: Claim & Elect",
    copy: "Claim your handle and set your election - any mix of eligible assets, basis points summing to 100%. Update it any time; it's law at the next payment.",
    stat: "100%",
    statLabel: "ELECTION SUM, ENFORCED ON-CHAIN",
  },
  {
    title: "Step 2: Get Paid",
    copy: "The sender pays in whatever they hold. The settlement engine converts at receipt - slippage-capped, price-sane, authenticity-gated. Non-custodial, atomic, one transaction.",
    stat: "<1 SEC",
    statLabel: "AVERAGE SETTLEMENT FINALITY ON SOLANA",
  },
  {
    title: "Step 3: Split Natively",
    copy: "One handle, many recipients. Each share settles per that recipient's own election - no intermediate custody, ever.",
    stat: "N-WAY",
    statLabel: "NATIVE SPLITS PER HANDLE",
  },
  {
    title: "Step 4: Invoice & Payroll",
    copy: "Pay-links and QR with amount, memo, expiry - Solana Pay-compatible. Payroll vaults pay a roster on schedule, each in elected assets.",
    stat: "0",
    statLabel: "BALANCE HELD BY THE ROUTER AFTER SETTLEMENT",
  },
];

export default function Process() {
  const ref = useSectionReveal<HTMLElement>();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);
  const navigate = useNavigate();
  const timer = useRef<number | null>(null);

  const jump = (i: number) => {
    setDir(i > step ? 1 : -1);
    setStep(((i % STEPS.length) + STEPS.length) % STEPS.length);
  };

  useEffect(() => {
    if (paused) return;
    timer.current = window.setInterval(() => {
      setDir(1);
      setStep((s) => (s + 1) % STEPS.length);
    }, 6000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [paused]);

  const current = STEPS[step];

  return (
    <section id="process" ref={ref} className="border-t border-hairline">
      <div className="mx-auto max-w-container px-5 md:px-10 py-24 md:py-40">
        <SectionMarker index="004" label="PROCESS" />

        {/* Header row: mono label + red progress dots + prev/next arrows */}
        <div data-reveal className="flex flex-wrap items-center justify-between gap-4 md:gap-6 mb-10 md:mb-14">
          <div className="flex items-center gap-6">
            <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
              PLATFORM PROCESS
            </span>
            <div className="flex items-center gap-2">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => jump(i)}
                  aria-label={`Step ${i + 1}`}
                  className={`w-3 h-3 rounded-full border transition-colors duration-300 ${
                    i === step ? "bg-red border-red" : "bg-transparent border-muted2"
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => jump(step - 1)}
              aria-label="Previous step"
              className="w-12 h-12 border border-hairline rounded text-secondary2 hover:border-red hover:text-ink transition-colors"
            >
              ←
            </button>
            <button
              onClick={() => jump(step + 1)}
              aria-label="Next step"
              className="w-12 h-12 border border-hairline rounded text-secondary2 hover:border-red hover:text-ink transition-colors"
            >
              →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* LEFT: media card */}
          <div data-reveal className="lg:col-span-4 relative rounded overflow-hidden bg-ink min-h-[280px] lg:min-h-[420px]">
            <img
              src="/work-settlement.png"
              alt="TENDER settlement routing grid"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <span className="absolute top-5 left-5 z-10 font-mono text-xs uppercase tracking-[0.12em] text-white/70">
              HOW THE RAIL MOVES VALUE
            </span>
          </div>

          {/* CENTER: step heading + paragraph + big mono stat */}
          <div
            data-reveal
            className="lg:col-span-5 bg-card2 border border-hairline rounded p-8 md:p-10 flex flex-col min-h-[320px] lg:min-h-[420px]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ x: 60 * dir, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -60 * dir, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col flex-1"
              >
                <span className="font-mono text-xs uppercase tracking-[0.12em] text-red">
                  {String(step + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
                </span>
                <h3 className="mt-4 font-display font-medium text-[28px] md:text-[32px] leading-[1.1] tracking-[-0.02em] text-ink">
                  {current.title}
                </h3>
                <p className="mt-5 font-body text-[16px] leading-[1.65] text-secondary2">
                  {current.copy}
                </p>
                <div className="mt-auto pt-8">
                  <span className="font-mono font-medium text-[56px] md:text-[72px] leading-none tracking-[-0.03em] text-ink">
                    {current.stat}
                  </span>
                  <span className="block mt-3 font-mono text-xs uppercase tracking-[0.12em] text-secondary2 leading-loose">
                    {current.statLabel}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* RIGHT: narrow column - red button + grey note */}
          <div data-reveal className="lg:col-span-3 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-hairline pt-8 lg:pt-0 lg:pl-8">
            <button
              onClick={() => navigate("/dashboard/claim")}
              className="group bg-red hover:bg-red-hover text-white font-body font-semibold text-sm uppercase tracking-[0.08em] rounded px-8 py-4 transition-all duration-150 hover:-translate-y-0.5 w-full"
            >
              Claim Your Handle{" "}
              <span className="inline-block transition-transform duration-150 group-hover:translate-x-1.5">
                →
              </span>
            </button>
            <p className="mt-4 font-body text-sm leading-relaxed text-muted2">
              Free to claim. Your election is live at the next payment - no onboarding calls, no
              custody, no paperwork.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
