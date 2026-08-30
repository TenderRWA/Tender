import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SectionMarker from "@/components/SectionMarker";
import { useSectionReveal } from "@/hooks/useSectionReveal";

const FAQS = [
  {
    q: "Why is same-asset free?",
    a: "Because nothing converts. A direct transfer costs the network a lamport-level fee - the rail adds nothing, so it charges nothing. It's Law 03.",
  },
  {
    q: "When is the settlement fee charged?",
    a: "Only on converted volume, bounded by the cap. If your payment needs no swap, no fee exists.",
  },
  {
    q: "Who sets the parameters?",
    a: "Stakers secure the parameters and the eligible-asset registry. Changes are on-chain and transparent.",
  },
  {
    q: "Is TENDER payroll or tax software?",
    a: "No. TENDER moves assets on schedule. Reporting, withholding and tax obligations remain with you.",
  },
];

function AccordionIcon({ open }: { open: boolean }) {
  return (
    <span className="relative w-6 h-6 shrink-0 flex items-center justify-center" aria-hidden>
      <motion.span
        animate={open ? { rotate: 45, width: 20 } : { rotate: 0, width: 20 }}
        className="absolute h-0.5 bg-red"
        style={{ width: 20 }}
      />
      <motion.span
        animate={open ? { rotate: -45, opacity: 1 } : { rotate: 0, opacity: 1, y: -5 }}
        className="absolute h-0.5 w-5 bg-red"
      />
      <motion.span
        animate={open ? { opacity: 0 } : { opacity: 1, y: 5 }}
        className="absolute h-0.5 w-5 bg-red"
      />
    </span>
  );
}

/** P4 - Pricing FAQ mini accordion (same morph as the home FAQ). */
export default function PricingFaq() {
  const ref = useSectionReveal<HTMLElement>();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="pricing-faq" ref={ref} className="border-t border-hairline">
      <div className="mx-auto max-w-container px-5 md:px-10 py-24 md:py-32">
        <SectionMarker index="005.1" label="PRICING FAQ" />

        <div data-reveal className="max-w-4xl flex flex-col">
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
      </div>
    </section>
  );
}
