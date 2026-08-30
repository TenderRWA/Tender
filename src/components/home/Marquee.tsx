import { memo } from "react";

/**
 * Full-width red marquee band. Pure CSS infinite x-translate loop (40s),
 * pause on hover, disabled under prefers-reduced-motion.
 */
const Marquee = memo(function Marquee() {
  const phrase = "TENDER® · GET PAID IN THE ASSETS YOU'D RATHER HOLD · ";
  return (
    <section aria-hidden className="bg-red border-y border-red-deep/40 overflow-hidden">
      <div className="flex whitespace-nowrap py-10 md:py-12 animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none">
        {[0, 1].map((n) => (
          <span
            key={n}
            className="font-display font-bold uppercase tracking-[-0.03em] text-red-deep text-[clamp(64px,10vw,140px)] leading-none pr-8"
          >
            {phrase.repeat(3)}
          </span>
        ))}
      </div>
    </section>
  );
});

export default Marquee;
