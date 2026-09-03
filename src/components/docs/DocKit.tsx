import { motion, useReducedMotion } from "framer-motion";
import SectionMarker from "@/components/SectionMarker";

/**
 * Shared building blocks for the long-form document pages (/whitepaper,
 * /roadmap). Framer-only subtree by design - keep GSAP out of these pages so
 * the two animation systems never fight over the same nodes.
 */

export const EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number];

/** Fade-up wrapper. Tagged for the print stylesheet, which forces it open. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      data-wp-reveal
      initial={reduced ? false : { y: 24, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-6% 0px" }}
      transition={{ duration: 0.65, ease: EXPO, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SectionHead({ num, title, lede }: { num: string; title: string; lede?: string }) {
  return (
    <Reveal>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs uppercase tracking-[0.12em] text-red">{num}</span>
        <span className="flex-1 h-px bg-hairline" aria-hidden />
      </div>
      <h2 className="mt-5 font-display font-semibold text-[30px] md:text-[42px] leading-[1.05] tracking-[-0.03em] text-ink">
        {title}
      </h2>
      {lede && <p className="mt-4 font-body text-[17px] leading-[1.65] text-secondary2">{lede}</p>}
    </Reveal>
  );
}

export function DocSection({
  id,
  num,
  title,
  lede,
  children,
}: {
  id: string;
  num: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <SectionHead num={num} title={title} lede={lede} />
      <div className="mt-8 flex flex-col gap-6">{children}</div>
    </section>
  );
}

export function Para({ children }: { children: React.ReactNode }) {
  return (
    <Reveal>
      <p className="font-body text-[17px] leading-[1.75] text-secondary2">{children}</p>
    </Reveal>
  );
}

/** Keyed definition rows - the documents' workhorse list. */
export function DefList({ items }: { items: { term: string; body: string }[] }) {
  return (
    <Reveal>
      <dl className="flex flex-col">
        {items.map((it) => (
          <div
            key={it.term}
            className="grid grid-cols-1 gap-1.5 border-t border-hairline py-5 last:border-b sm:grid-cols-12 sm:gap-6"
          >
            <dt className="font-mono text-xs uppercase tracking-[0.12em] text-ink sm:col-span-4">
              {it.term}
            </dt>
            <dd className="font-body text-[15px] leading-relaxed text-secondary2 sm:col-span-8">
              {it.body}
            </dd>
          </div>
        ))}
      </dl>
    </Reveal>
  );
}

/** Bordered mono block for flow diagrams and endpoint lists. */
export function MonoBlock({ children, caption }: { children: string; caption?: string }) {
  return (
    <Reveal>
      <figure className="bg-card2 border border-hairline rounded">
        <div className="overflow-x-auto p-5 md:p-7">
          <pre className="font-mono text-[11px] md:text-[13px] leading-[1.7] text-ink whitespace-pre">
            {children}
          </pre>
        </div>
        {caption && (
          <figcaption className="border-t border-hairline px-5 md:px-7 py-4 font-mono text-xs uppercase tracking-[0.12em] text-muted2">
            {caption}
          </figcaption>
        )}
      </figure>
    </Reveal>
  );
}

export function Callout({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Reveal>
      <div className="border-l-2 border-red bg-card2 rounded-r px-5 py-5 md:px-7 md:py-6">
        <span className="block font-mono text-xs uppercase tracking-[0.12em] text-red">
          {label}
        </span>
        <p className="mt-3 font-body text-[17px] leading-[1.7] text-ink">{children}</p>
      </div>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

export const DOC_ACTION_PRIMARY =
  "group bg-red hover:bg-red-hover text-white font-body font-semibold text-sm uppercase tracking-[0.08em] rounded px-7 py-3.5 transition-all duration-150 hover:-translate-y-0.5 inline-flex items-center gap-2";

export const DOC_ACTION_GHOST =
  "group border border-hairline text-secondary2 hover:text-ink hover:border-red font-body font-semibold text-sm uppercase tracking-[0.08em] rounded px-7 py-3.5 transition-colors duration-150 inline-flex items-center gap-2";

/** Print button is real behaviour, not a stub - the print stylesheet backs it. */
export function PrintButton() {
  return (
    <button onClick={() => window.print()} className={DOC_ACTION_GHOST}>
      Print / save as PDF
    </button>
  );
}

export function DocHero({
  index,
  label,
  line1,
  line2,
  sub,
  meta,
  children,
}: {
  index: string;
  label: string;
  line1: string;
  /** Rendered in accent red beneath line1. */
  line2: string;
  sub: string;
  meta: [string, string][];
  /** Action buttons; hidden when printing. */
  children?: React.ReactNode;
}) {
  const reduced = useReducedMotion();

  return (
    <section className="relative border-b border-hairline bg-base/55">
      <div className="mx-auto max-w-container px-5 md:px-10 pt-14 md:pt-20 pb-16 md:pb-24">
        <SectionMarker index={index} label={label} />

        <motion.h1
          initial={reduced ? false : { y: 32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: EXPO, delay: 0.1 }}
          className="font-display font-semibold text-[40px] md:text-[68px] lg:text-[88px] leading-[0.95] tracking-[-0.04em] text-ink max-w-5xl"
        >
          {line1}
          <span className="block text-red">{line2}</span>
        </motion.h1>

        <motion.p
          initial={reduced ? false : { y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: EXPO, delay: 0.25 }}
          className="mt-8 max-w-2xl font-body text-[17px] leading-[1.65] text-secondary2"
        >
          {sub}
        </motion.p>

        <motion.div
          initial={reduced ? false : { y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: EXPO, delay: 0.35 }}
          className="mt-10 flex flex-col gap-8"
        >
          <dl className="flex flex-wrap gap-x-10 gap-y-5">
            {meta.map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1.5">
                <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted2">
                  {k}
                </dt>
                <dd
                  className={`font-mono text-[13px] uppercase tracking-[0.08em] ${
                    v === "LIVE" || v === "SHIPPED" ? "text-success" : "text-ink"
                  }`}
                >
                  {v}
                </dd>
              </div>
            ))}
          </dl>

          {children && (
            <div data-print-hide className="flex flex-wrap items-center gap-3">
              {children}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
