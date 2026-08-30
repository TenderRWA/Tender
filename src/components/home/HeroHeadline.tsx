/**
 * HeroHeadline - the split display headline from the Noema source, animated
 * letter-by-letter with the spring text engine. The LEFT word's letters
 * resolve left→right, the RIGHT word's resolve right→left, each fading up
 * out of a blur.
 *
 * Layout (as in the source): from `sm` up the two words are pinned to the
 * left/right edges, vertically centred; below `sm` the wrapper is a flow
 * band and the words stack centred.
 */

import { easings } from "@react-spring/web";
import TextEngine from "spring-text-engine";

/** Per-letter stagger, ms. */
const STAGGER = 60;

/** Blur-up reveal targets. `dir` sets which side the glyph drifts in from. */
const letterStates = (dir: 1 | -1) => ({
  letterOut: { opacity: 0, filter: "blur(16px)", x: 14 * dir },
  letterIn: { opacity: 1, filter: "blur(0px)", x: 0 },
});

/** Long, duration-based ease-out for each glyph. */
const LETTER_CONFIG = { duration: 1300, easing: easings.easeOutQuart };

const nonSpaceCount = (s: string): number => s.replace(/\s+/g, "").length;

export interface HeroHeadlineProps {
  left: string;
  right: string;
  /** Delay (ms) before the first letter of each word appears. */
  delayIn?: number;
}

export const HeroHeadline = ({ left, right, delayIn = 0 }: HeroHeadlineProps) => {
  const leftDir = letterStates(-1);
  const rightDir = letterStates(1);
  const rightDelayIn = (nonSpaceCount(right) - 1) * STAGGER;

  const displayClass =
    "justify-center text-center font-display uppercase text-[clamp(2.4rem,11vw,4rem)] leading-[0.95] tracking-[-0.02em] sm:justify-start sm:text-left sm:text-[clamp(4rem,6.6vw,7.5rem)]";
  const displayClassRight =
    "justify-center text-center font-display uppercase text-[clamp(2.4rem,11vw,4rem)] leading-[0.95] tracking-[-0.02em] sm:justify-end sm:text-right sm:text-[clamp(4rem,6.6vw,7.5rem)]";

  return (
    <div className="pointer-events-none flex flex-none flex-col items-center gap-0 px-5 pt-2 sm:absolute sm:inset-0 sm:block sm:p-0">
      {/* Left word - top of the band on mobile, pinned left on ≥sm. */}
      <div aria-hidden="true" className="sm:absolute sm:left-[1.875rem] sm:top-1/2 sm:-translate-y-1/2">
        <TextEngine
          tag="span"
          mode="once"
          seo={false}
          className={displayClass}
          letterOut={leftDir.letterOut}
          letterIn={leftDir.letterIn}
          letterStaggerIn={STAGGER}
          letterConfig={LETTER_CONFIG}
          delayIn={delayIn}
        >
          {left}
        </TextEngine>
      </div>

      {/* Right word - foot of the band on mobile, pinned right on ≥sm. */}
      <div aria-hidden="true" className="sm:absolute sm:right-[1.875rem] sm:top-1/2 sm:-translate-y-1/2">
        <TextEngine
          tag="span"
          mode="once"
          seo={false}
          className={displayClassRight}
          letterOut={rightDir.letterOut}
          letterIn={rightDir.letterIn}
          letterStaggerIn={-STAGGER}
          letterDelayIn={rightDelayIn}
          letterConfig={LETTER_CONFIG}
          delayIn={delayIn}
        >
          {right}
        </TextEngine>
      </div>
    </div>
  );
};
