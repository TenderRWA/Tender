import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSectionReveal } from "@/hooks/useSectionReveal";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const DOCS = [
  {
    key: "tos",
    label: "Terms of Service",
    body: [
      "TENDER provides non-custodial settlement infrastructure on Solana mainnet-beta. When you claim a handle and record an election, you instruct the settlement engine to convert every incoming payment into your elected asset mix at execution time. No balances are held between payments; settlement is atomic.",
      "Elections are bound to issuer restrictions. Tokenized equities and yield-bearing assets carry eligibility rules set by their issuers; if you cannot hold an asset under those rules, you cannot elect it. Eligibility is enforced at election, not after the fact.",
      "Fees apply only to converted volume and are bounded by on-chain caps published in the backend specification. The Fast Path - payments that already match your election - settles free. TENDER may update fee tiers and route parameters through on-chain governance; current parameters are always readable from the program itself.",
      "TENDER is settlement infrastructure - not payroll, tax, or investment software. Reporting, withholding, and tax obligations remain yours.",
    ],
  },
  {
    key: "privacy",
    label: "Privacy Policy",
    body: [
      "TENDER collects almost nothing by design. Handles and elections live on-chain; your election registry entry is public Solana state, readable by anyone, tied to a public key - not to an identity.",
      
      "This site sets no tracking cookies and runs no third-party analytics. Aggregate traffic may be measured at the edge by the hosting provider; nothing per-user leaves your browser.",
      "Questions about data handling go to the same place as everything else: the public Telegram channel.",
    ],
  },
];

/** P4. Legal / terms block (`#terms`) - footer links target this anchor. */
export default function TermsBlock() {
  const ref = useSectionReveal<HTMLElement>();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section id="terms" ref={ref} className="scroll-mt-24 border-t border-hairline">
      <div className="mx-auto max-w-container px-5 py-24 md:px-10 md:py-40">
        <div data-reveal className="rounded border border-hairline bg-card2 p-8 md:p-12">
          <span className="mb-6 inline-block h-1.5 w-1.5 bg-red" aria-hidden />
          <h3 className="font-display text-[28px] font-medium leading-[1.1] tracking-[-0.02em] text-ink md:text-4xl">
            Terms &amp; Service
          </h3>

          <div className="mt-8 max-w-3xl space-y-4 font-body text-[15px] leading-[1.65] text-secondary2">
            <p>
              TENDER is non-custodial settlement infrastructure on Solana
              mainnet-beta. It is not payroll, tax, or investment software.
            </p>
            <p>
              Tokenized assets carry issuer restrictions; eligibility is enforced
              at election. Fees apply only to converted volume and are bounded by
              on-chain caps.
            </p>
          </div>

          {/* In-page doc toggles */}
          <div className="mt-10 border-t border-hairline">
            {DOCS.map((doc) => {
              const isOpen = open === doc.key;
              return (
                <div key={doc.key} className="border-b border-hairline">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : doc.key)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left"
                  >
                    <span
                      className={cn(
                        "font-mono text-xs uppercase tracking-[0.12em] transition-colors duration-150",
                        isOpen ? "text-red" : "text-secondary2 hover:text-ink"
                      )}
                    >
                      {doc.label}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="font-mono text-lg leading-none text-red"
                      aria-hidden
                    >
                      +
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key={doc.key}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <div className="max-w-3xl space-y-4 pb-8 font-body text-[15px] leading-[1.65] text-secondary2">
                          {doc.body.map((p, i) => (
                            <p key={i}>{p}</p>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <p className="mt-8 font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] text-muted2">
            © 2026 TENDER · BUILT BY INFRANODES · NON-CUSTODIAL · SOLANA MAINNET-BETA
          </p>
        </div>
      </div>
    </section>
  );
}
