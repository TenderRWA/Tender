import { Fragment, type CSSProperties } from "react";

import { HERO_DELAY } from "./hero-motion";
import { HeroReveal } from "./hero-reveal";
import { StatScramble } from "./stat-scramble";
import type { HeroStatData } from "./types";

/**
 * One grid-pinned metric, mono uppercase, its leading figure settling out of
 * noise. Below 768 it leaves absolute positioning and joins the flow.
 */
export const HeroStat = ({ stat }: { stat: HeroStatData }) => (
  <HeroReveal
    tag="p"
    delay={HERO_DELAY.stats}
    style={
      {
        "--stat-x": stat.x,
        "--stat-x-tablet": stat.xTablet ?? stat.x,
        "--stat-y": stat.y,
        "--stat-w": stat.width,
      } as CSSProperties
    }
    className="absolute top-[var(--stat-y)] left-[calc(var(--stat-x)+0.625rem)]
               w-[var(--stat-w)] font-hero-mono text-[0.75rem] leading-[1.2]
               tracking-[0.02em] text-black/55 uppercase
               max-xl:left-[calc(var(--stat-x-tablet)_+_10px)]
               max-xl:max-w-[calc(100%_-_var(--stat-x-tablet)_-_20px)]
               max-md:static max-md:left-auto max-md:w-auto max-md:max-w-none"
  >
    {stat.lines.map((line, index) => (
      <Fragment key={line}>
        {index > 0 && (
          <>
            <br className="max-md:hidden" />
            <span className="hidden max-md:inline"> </span>
          </>
        )}
        {index === 0 ? (
          <StatScramble text={line} delay={HERO_DELAY.stats} />
        ) : (
          line
        )}
      </Fragment>
    ))}
  </HeroReveal>
);
