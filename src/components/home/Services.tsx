import { useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { AnimatePresence, motion } from "framer-motion";
import SectionMarker from "@/components/SectionMarker";
import { useSectionReveal } from "@/hooks/useSectionReveal";

const SERVICES = [
  {
    num: "01",
    title: "Handle Elections",
    keyword: "ELECT",
    img: "/work-registry.png",
    copy: "Claim your handle and set your election once - any mix of eligible assets, basis points summing to 100%. Every payment to your handle honors it exactly.",
  },
  {
    num: "02",
    title: "Atomic Settlement",
    keyword: "SETTLE",
    img: "/work-settlement.png",
    copy: "Sender sends whatever they hold; you receive what you elected. Jupiter best-execution at receipt, slippage caps, Pyth price sanity. One atomic transaction.",
  },
  {
    num: "03",
    title: "Splits & Invoices",
    keyword: "SPLIT",
    img: "/work-invoice.png",
    copy: "A handle can route to many recipients - each share settled per that recipient's own election. Invoices and pay-links carry amount, memo, and expiry.",
  },
  {
    num: "04",
    title: "Payroll Vaults",
    keyword: "PAY",
    img: "/work-payroll.png",
    copy: "Fund a vault, set a roster and a schedule. A permissionless crank pays everyone in their elected assets.",
  },
];

/** Tiny up/down arrow pair rendered above each panel number. */
function UpDownArrows({ active }: { active: boolean }) {
  return (
    <span
      className={`flex flex-col items-center leading-none text-[10px] ${
        active ? "text-white/80" : "text-muted2"
      }`}
      aria-hidden
    >
      <span>↑</span>
      <span>↓</span>
    </span>
  );
}

/** 3x3 dot-grid icon. */
function DotGridIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={className} aria-hidden>
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <circle key={`${r}-${c}`} cx={2 + c * 4} cy={2 + r * 4} r="1.2" fill="currentColor" />
        ))
      )}
    </svg>
  );
}

export default function Services() {
  const ref = useSectionReveal<HTMLElement>();
  const [active, setActive] = useState(0);
  const navigate = useNavigate();

  return (
    <section id="services" ref={ref} className="border-t border-hairline">
      <div className="mx-auto max-w-container px-5 md:px-10 py-24 md:py-40">
        <SectionMarker index="002" label="CORE SERVICES" />

        <div className="flex flex-col lg:flex-row gap-10 lg:gap-8">
          {/* Panels - desktop: horizontal expandable; mobile: vertical accordion */}
          <div data-reveal className="order-2 lg:order-1 lg:w-[65%] flex flex-col lg:flex-row gap-3 lg:h-[560px]">
            {SERVICES.map((s, i) => {
              const isActive = i === active;
              return (
                <div
                  key={s.num}
                  onMouseEnter={() => {
                    if (window.matchMedia("(pointer: fine)").matches) setActive(i);
                  }}
                  onClick={() => setActive(i)}
                  className={`relative rounded border overflow-hidden cursor-pointer transition-all [transition-duration:600ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
                    isActive
                      ? "bg-red border-red lg:flex-[5.5]"
                      : "bg-card2 border-hairline hover:border-red/50 lg:flex-[1.5]"
                  } flex flex-col justify-between p-6 min-h-[72px] lg:min-h-0 ${
                    isActive ? "lg:p-7" : ""
                  }`}
                  role="button"
                  aria-expanded={isActive}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setActive(i);
                  }}
                >
                  {/* Top: up/down arrows above number; diagonal arrow on active */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col items-start gap-2">
                      <UpDownArrows active={isActive} />
                      <span
                        className={`font-mono text-sm ${
                          isActive ? "text-white" : "text-muted2"
                        }`}
                      >
                        {s.num}
                      </span>
                    </div>
                    {isActive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/services");
                        }}
                        aria-label={`${s.title} details`}
                        className="w-8 h-8 flex items-center justify-center rounded text-white hover:bg-white/10 transition-colors"
                      >
                        ↗
                      </button>
                    )}
                  </div>

                  {/* Inactive: bottom keyword only (vertical on desktop) */}
                  {!isActive && (
                    <>
                      <span className="hidden lg:block font-display font-medium text-lg tracking-[-0.02em] text-secondary2 [writing-mode:vertical-rl] rotate-180">
                        {s.keyword}
                      </span>
                      <span className="lg:hidden font-display font-medium text-lg text-secondary2">
                        {s.title}
                      </span>
                    </>
                  )}

                  {/* Active: title + paragraph + centered media + bottom keyword/icon */}
                  <AnimatePresence initial={false}>
                    {isActive && (
                      <motion.div
                        key="copy"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="flex-1 flex flex-col mt-4 lg:mt-2 min-h-0"
                      >
                        <h3 className="font-display font-medium text-[24px] lg:text-[28px] leading-[1.1] tracking-[-0.02em] text-white mb-3">
                          {s.title}
                        </h3>
                        <p className="font-body text-[15px] leading-relaxed text-white/85 max-w-md">
                          {s.copy}
                        </p>
                        <div className="hidden lg:flex flex-1 items-center justify-center py-4 min-h-0">
                          <img
                            src={s.img}
                            alt={`${s.title} - abstract tile`}
                            className="max-h-[180px] w-auto max-w-full rounded border border-white/20 object-cover"
                          />
                        </div>
                        <div className="hidden lg:flex items-center justify-between mt-auto pt-4">
                          <span className="font-mono text-xs uppercase tracking-[0.12em] text-white/80">
                            {s.keyword}
                          </span>
                          <DotGridIcon className="w-3.5 h-3.5 text-white/80" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Right column */}
          <div data-reveal className="order-1 lg:order-2 lg:w-[35%] relative flex flex-col">
            <div className="absolute -top-6 -right-6 w-40 h-40 dot-matrix-dark opacity-60 hidden lg:block" aria-hidden />
            <div className="relative flex items-center justify-between gap-4">
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
                CORE SERVICES
              </span>
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-muted2">
                4/4
              </span>
            </div>
            <h2 className="relative mt-4 font-display font-semibold text-4xl md:text-[64px] leading-[1.0] tracking-[-0.03em] text-ink">
              Four primitives. One rail.
            </h2>
            <p className="relative mt-6 font-body text-[17px] leading-[1.65] text-secondary2 max-w-md">
              Set an election. Receive atomically. Split natively. Pay a roster. Everything else is
              a detail the sender never sees.
            </p>
            <div className="relative mt-auto pt-10 hidden lg:flex items-center gap-3 border-t border-hairline lg:mt-10">
              <DotGridIcon className="w-3.5 h-3.5 text-red shrink-0" />
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-muted2">
                EVERYTHING ELSE IS A DETAIL THE SENDER NEVER SEES
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
