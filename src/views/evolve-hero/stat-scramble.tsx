import { useEffect, useRef, useState } from "react";

import { SCRAMBLE_DURATION } from "./hero-motion";
import { useHeroStage } from "./hero-stage";

export interface StatScrambleProps {
  text: string;
  delay: number;
}

/** Matches the figure at the head of a stat line: `99.99%`, `45B+`, `120+`. */
const FIGURE = /^[\d.,]+[A-Za-z]*[%+]?/;
const GLYPHS = "0123456789#%$&*+<>/\\";
const noise = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

/**
 * Settles a stat's figure out of random glyphs. Progressive: the finished
 * text is what renders first and what stays in the DOM.
 */
export const StatScramble = ({ text, delay }: StatScrambleProps) => {
  const { started } = useHeroStage();
  const [display, setDisplay] = useState(text);
  const frameRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!started) return;

    const figure = text.match(FIGURE)?.[0];
    if (!figure) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rest = text.slice(figure.length);
    const chars = [...figure];

    const scramble = (startedAt: number) => {
      const step = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / SCRAMBLE_DURATION);
        const settled = Math.floor(progress * chars.length);

        setDisplay(
          chars
            .map((char, index) =>
              index < settled || char === "." || char === "," ? char : noise(),
            )
            .join("") + rest,
        );

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(step);
          return;
        }
        setDisplay(text);
      };

      frameRef.current = requestAnimationFrame(step);
    };

    setDisplay(chars.map(() => noise()).join("") + rest);
    timeoutRef.current = window.setTimeout(
      () => scramble(performance.now()),
      delay,
    );

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
      setDisplay(text);
    };
  }, [text, delay, started]);

  return <>{display}</>;
};
