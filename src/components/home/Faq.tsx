import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SectionMarker from "@/components/SectionMarker";
import { useSectionReveal } from "@/hooks/useSectionReveal";
import { useComingSoon } from "@/components/ComingSoonModal";

const FAQS = [
  {
    q: "Does TENDER ever hold my funds?",
    a: "No. TENDER is non-custodial - no held balances, ever. Settlement is atomic: the router PDA holds zero after the instruction completes.",
  },
  {
    q: "What about geo-restrictions on tokenized stocks?",
    a: "xStocks and Ondo carry issuer restrictions. Eligibility is stated at election time - if you can't hold an asset, you can't elect it.",
  },
  {
    q: "What happens if a swap fills badly?",
    a: "Never fill badly; never strand funds. A breaching leg safe-settles in USDC with an on-chain notice - your funds never get stuck mid-route.",
  },
  {
    q: "How are corporate actions handled?",
    a: "Token-2022 Scaled UI multipliers are tracked automatically. Splits and distributions flow through without touching your election.",
  },
  {
    q: "Is TENDER payroll or tax software?",
    a: "No. TENDER is settlement infrastructure. Payroll vaults move assets on schedule - reporting, withholding and tax remain yours.",
  },
  {
    q: "Is the routing secure?",
    a: "The Jupiter route is validated on-chain, slippage is capped, and prices are sanity-checked against Pyth. Authenticity-gated: only registry assets settle.",
  },
];

/** Red 3-line icon that morphs into an X when open. */
function AccordionIcon({ open }: { open: boolean }) {
  return (
    <span className="relative w-6 h-6 shrink-0 flex items-center justify-center" aria-hidden>
      <motion.span
        animate={open ? { rotate: 45, y: 0 } : { rotate: 0, y: -5 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="absolute h-0.5 w-5 bg-red"
      />
      <motion.span
        animate={open ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="absolute h-0.5 w-5 bg-red"
      />
      <motion.span
        animate={open ? { rotate: -45, y: 0 } : { rotate: 0, y: 5 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="absolute h-0.5 w-5 bg-red"
      />
    </span>
  );
}

export default function Faq() {
  const ref = useSectionReveal<HTMLElement>();
  const [open, setOpen] = useState<number | null>(0);
  const comingSoon = useComingSoon();

  return (
    <section id="faq" ref={ref} className="border-t border-hairline">
      <div className="mx-auto max-w-container px-5 md:px-10 py-24 md:py-40">
        <SectionMarker index="006" label="FAQ" />

        <div data-reveal className="mb-12 md:mb-16 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          <h2 className="font-display font-semibold text-4xl md:text-[64px] leading-[1.0] tracking-[-0.03em] text-ink max-w-3xl">
            Answers,
            <br />
            on the record.
          </h2>
          <p className="font-body text-[15px] leading-[1.65] text-muted2 max-w-xs lg:text-right lg:pt-3">
            Everything below is enforceable behavior of the contracts, not marketing. If it can't
            be verified on-chain, it isn't here.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Accordion */}
          <div data-reveal className="lg:col-span-3 flex flex-col border-t border-hairline">
            {FAQS.map((f, i) => {
              const isOpen = open === i;
              return (
                <div key={f.q} className="border-b border-hairline">
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-6 py-6 text-left group"
                  >
                    <span
                      className={`font-display font-medium text-xl md:text-2xl tracking-[-0.02em] transition-colors ${
                        isOpen ? "text-ink" : "text-secondary2 group-hover:text-ink"
                      }`}
                    >
                      {f.q}
                    </span>
                    <AccordionIcon open={isOpen} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="pb-6 pr-10 font-body text-[16px] leading-[1.65] text-secondary2 max-w-2xl">
                          {f.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div data-reveal className="relative bg-card2 border border-hairline rounded overflow-hidden group">
              <img
                src="/faq-portrait.png"
                alt="Abstract settlement-flow diagram"
                className="w-full aspect-[4/5] object-cover grayscale group-hover:contrast-110 transition-all duration-500"
              />
              {/* rotating red badge */}
              <div className="absolute top-5 right-5 w-28 h-28 md:w-32 md:h-32 animate-spin-slow motion-reduce:animate-none">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <defs>
                    <path id="badge-circle" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
                  </defs>
                  <circle cx="50" cy="50" r="48" fill="#E8322A" />
                  <text fill="#FFFFFF" fontSize="11.5" fontFamily="'IBM Plex Mono', monospace" letterSpacing="2">
                    <textPath href="#badge-circle">SETTLED · ATOMIC · YOURS ·</textPath>
                  </text>
                  <text x="50" y="55" textAnchor="middle" fill="#B3251E" fontSize="16" fontFamily="'Space Grotesk', sans-serif" fontWeight="700">
                    ✓
                  </text>
                </svg>
              </div>
            </div>

            <div data-reveal className="bg-card2 border border-hairline rounded p-6 md:p-8">
              <h3 className="font-display font-medium text-[28px] leading-[1.1] tracking-[-0.02em] text-ink">
                You still have questions?
              </h3>
              <p className="mt-4 font-body text-[15px] leading-relaxed text-secondary2">
                The spec is public and the team answers. Bring the hardest question you have.
              </p>
              <div className="mt-6 flex items-center justify-between gap-4">
                <button
                  onClick={comingSoon.open}
                  className="group font-body font-semibold text-sm uppercase tracking-[0.08em] text-ink hover:text-red transition-colors"
                >
                  Let's have a chat
                </button>
                <button
                  onClick={comingSoon.open}
                  aria-label="Let's have a chat"
                  className="group w-10 h-10 bg-red hover:bg-red-hover rounded flex items-center justify-center transition-colors"
                >
                  <span className="text-white text-lg leading-none transition-transform duration-300 group-hover:rotate-45 inline-block">
                    ↗
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
