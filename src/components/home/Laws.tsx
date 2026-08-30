import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SectionMarker from "@/components/SectionMarker";
import { useSectionReveal } from "@/hooks/useSectionReveal";

const LAWS = [
  {
    quote: "The receiver's election is law.",
    note: "Every settlement honors the election exactly, atomically, with no custody.",
    attr: "LAW 01 · TENDER BACKEND SPEC",
    img: "/team-receiver.png",
  },
  {
    quote: "Never fill badly; never strand funds.",
    note: "A breaching leg safe-settles in USDC with an on-chain notice.",
    attr: "LAW 02 · TENDER BACKEND SPEC",
    img: "/team-sender.png",
  },
  {
    quote: "Same-asset fast path is free.",
    note: "Direct transfer, zero fee, forever.",
    attr: "LAW 03 · TENDER BACKEND SPEC",
    img: "/team-dao.png",
  },
  {
    quote: "Consume the handle standard, don't fork it.",
    note: "Identity lives in the on-chain handle registry.",
    attr: "LAW 04 · TENDER BACKEND SPEC",
    img: "/team-staker.png",
  },
];

export default function Laws() {
  const ref = useSectionReveal<HTMLElement>();
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);

  const jump = (i: number) => {
    setDir(i > idx ? 1 : -1);
    setIdx(((i % LAWS.length) + LAWS.length) % LAWS.length);
  };

  const law = LAWS[idx];

  return (
    <section id="laws" ref={ref} className="border-t border-hairline">
      <div className="mx-auto max-w-container px-5 md:px-10 py-24 md:py-40">
        <SectionMarker index="008" label="DESIGN LAWS" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div data-reveal className="lg:col-span-5">
            <h2 className="font-display font-semibold text-4xl md:text-[64px] leading-[1.0] tracking-[-0.03em] text-ink">
              The laws the code obeys.
            </h2>
            <p className="mt-6 font-body text-[17px] leading-[1.65] text-secondary2 max-w-md">
              Part 0 of the backend spec isn't features - it's physics.
            </p>
            <div className="mt-10 flex items-center gap-3">
              <button
                onClick={() => jump(idx - 1)}
                aria-label="Previous law"
                className="w-12 h-12 border border-hairline rounded text-secondary2 hover:border-red hover:text-ink transition-colors"
              >
                ←
              </button>
              <button
                onClick={() => jump(idx + 1)}
                aria-label="Next law"
                className="w-12 h-12 border border-hairline rounded text-secondary2 hover:border-red hover:text-ink transition-colors"
              >
                →
              </button>
              <span className="ml-3 font-mono text-xs uppercase tracking-[0.12em] text-muted2">
                {String(idx + 1).padStart(2, "0")} / {String(LAWS.length).padStart(2, "0")}
              </span>
            </div>
          </div>

          <div data-reveal className="lg:col-span-7">
            <div className="relative bg-card2 border border-hairline rounded p-8 md:p-12 min-h-[320px] overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={idx}
                  initial={{ x: 60 * dir, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -60 * dir, opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="flex flex-col sm:flex-row gap-8">
                    <div className="relative w-28 h-28 md:w-36 md:h-36 shrink-0 rounded overflow-hidden bg-ink">
                      <img
                        src={law.img}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover grayscale"
                      />
                    </div>
                    <div>
                      <motion.span
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 18 }}
                        className="block font-display text-red text-[80px] leading-[0.6] mb-8"
                        aria-hidden
                      >
                        “
                      </motion.span>
                      <blockquote className="font-display font-medium text-2xl md:text-4xl leading-[1.2] tracking-[-0.02em] text-ink italic">
                        {law.quote}
                      </blockquote>
                      <p className="mt-5 font-body text-[16px] leading-[1.65] text-secondary2 italic">
                        {law.note}
                      </p>
                      <p className="mt-8 font-mono text-xs uppercase tracking-[0.12em] text-muted2">
                        {law.attr}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
