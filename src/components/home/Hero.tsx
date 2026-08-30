import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { scrollToHash } from "@/lib/lenis";
import { EvolveVisual } from "@/views/evolve-hero/evolve-visual";
import { HeroCta } from "@/views/evolve-hero/hero-cta";
import { HeroGrid } from "@/views/evolve-hero/hero-grid";
import { EvolveHeadline } from "@/views/evolve-hero/hero-headline";
import { HeroLead } from "@/views/evolve-hero/hero-lead";
import { HERO_DELAY } from "@/views/evolve-hero/hero-motion";
import { HeroReveal } from "@/views/evolve-hero/hero-reveal";
import { HeroStage } from "@/views/evolve-hero/hero-stage";
import { HeroStat } from "@/views/evolve-hero/hero-stat";
import type { HeroStatData } from "@/views/evolve-hero/types";

const STATS: HeroStatData[] = [
  {
    lines: ["2,400+", "Handles claimed"],
    x: "87.5%",
    y: "27.125%",
    width: "7.125rem",
  },
  {
    lines: ["$38M+ Settled onchain"],
    x: "75%",
    xTablet: "87.5%",
    y: "52.25%",
    width: "7.125rem",
  },
  {
    lines: ["120+", "Countries served"],
    x: "12.5%",
    y: "70.875%",
    width: "9.375rem",
  },
];

/**
 * Hero — the evolve source layout: a pointer-reactive point-cloud human in
 * red and grey over a white field with black rule grid, split display
 * headline, grid-pinned stats, lead copy and a gradient CTA. The site
 * navbar above is untouched and overlays the section (`-mt-20`).
 *
 * Below 768 the positioned canvas becomes a flex column: headline first,
 * then the CTA, the metrics in flow, and the lead pushed to the bottom.
 */
export default function Hero() {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  // Fade + gentle lift as the hero scrolls out, so it dissolves into Work
  // instead of a hard section edge passing the fold.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const stageOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const stageY = useTransform(scrollYProgress, [0, 0.55], ["0px", "-72px"]);

  return (
    <section
      ref={sectionRef}
      id="top"
      aria-labelledby="hero-title"
      className="relative -mt-20 h-svh min-h-[580px] w-full overflow-hidden
                 bg-white text-neutral-900
                 max-md:flex max-md:flex-col max-md:px-4 max-md:pt-24
                 max-md:pb-6"
    >
      <motion.div
        aria-hidden={false}
        className="h-full w-full max-md:contents"
        style={reduceMotion ? undefined : { opacity: stageOpacity, y: stageY }}
      >
      <HeroStage>
        {/* Rule grid first: the subject stands in front of it. */}
        <HeroGrid />

        <EvolveVisual />

        {/* Bottom fade so the scene dissolves into the Work section. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-56
                     bg-gradient-to-b from-transparent via-white/60 to-white
                     md:h-72 max-md:h-32"
        />

        {/* Scroll cue, centred under the navbar on wide frames. */}
        <span className="absolute top-[6.25rem] left-1/2 -translate-x-1/2 max-xl:hidden">
          <HeroReveal tag="span" delay={HERO_DELAY.nav} from="above" className="block">
            <button
              type="button"
              onClick={() => scrollToHash("#work")}
              aria-label="Scroll to the work"
              className="pointer-events-auto block cursor-pointer"
            >
              <svg
                width="27"
                height="11"
                viewBox="0 0 27 11"
                aria-hidden
                className="block h-[0.6875rem] w-[1.6875rem]"
              >
                <defs>
                  <linearGradient
                    id="hero-cue"
                    x1="14"
                    y1="0"
                    x2="14"
                    y2="11"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#ff5040" />
                    <stop offset="0.45" stopColor="#e8322a" />
                    <stop offset="1" stopColor="#a1241c" />
                  </linearGradient>
                </defs>
                <path
                  d="M0.640035 0L0 1.125L13.5495 11L27 1.125L26.36 0H15.0276L13.5495 1.5L12.0714 0H0.640035Z"
                  fill="url(#hero-cue)"
                />
              </svg>
            </button>
          </HeroReveal>
        </span>

        <HeroCta label="Dashboard" href="/dashboard" />

        <h1
          id="hero-title"
          className="pointer-events-none absolute inset-0 font-hero text-[5.75rem]
                     leading-none font-normal text-primary
                     max-xl:text-[clamp(42px,6.3889vw,82px)]
                     max-md:static max-md:order-1 max-md:mt-6"
        >
          <EvolveHeadline
            lines={["Envision,"]}
            delay={HERO_DELAY.titleLead}
            className="absolute top-[8.625rem] left-[2.5rem] max-md:static max-md:text-left"
          />
          <EvolveHeadline
            lines={["Materialize"]}
            delay={HERO_DELAY.titleTrail}
            align="right"
            className="absolute right-[2.5rem] bottom-[2.5rem] text-right
                       max-md:static max-md:text-left"
          />
        </h1>

        <div
          className="contents max-md:order-3 max-md:mt-6 max-md:flex
                     max-md:flex-col max-md:gap-2"
        >
          {STATS.map((stat) => (
            <HeroStat key={stat.lines[0]} stat={stat} />
          ))}
        </div>

        <HeroLead
          text="Art direction, identity, and interactive web. AI is our instrument, the intent is ours."
          breakBefore="instrument,"
          className="absolute bottom-[2.5rem] left-[2.5rem] w-[14.5625rem]
                     font-hero-mono text-[1.125rem] leading-[1.2] tracking-[-0.03em]
                     text-black/70
                     max-xl:text-[clamp(14px,1.25vw,16px)]
                     max-md:static max-md:order-4 max-md:mt-auto max-md:w-auto
                     max-md:pt-6"
        />
      </HeroStage>
      </motion.div>
    </section>
  );
}
