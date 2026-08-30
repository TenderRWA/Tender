import TextEngine from "spring-text-engine";

import {
  HEADLINE_LETTER_CONFIG,
  HEADLINE_LETTER_STAGGER,
  HEADLINE_LINE_OFFSET,
  LETTER_IN,
  LETTER_OUT,
} from "./hero-motion";
import { useHeroStage } from "./hero-stage";

export interface EvolveHeadlineProps {
  /** One entry per hard-broken line; each line animates as its own row. */
  lines: string[];
  /** Milliseconds after the stage opens at which the pair starts. */
  delay: number;
  align?: "left" | "right";
  className?: string;
}

/**
 * A headline pair, animated letter by letter through spring-text-engine:
 * letters rise, unblur and fade in together, staggered along the line.
 */
export const EvolveHeadline = ({
  lines,
  delay,
  align = "left",
  className,
}: EvolveHeadlineProps) => {
  const { started } = useHeroStage();
  const justify = align === "right" ? "justify-end" : "justify-start";

  return (
    <span className={className}>
      {lines.map((line, index) => (
        <TextEngine
          key={line}
          tag="span"
          mode="once"
          enabled={started}
          delayIn={delay + index * HEADLINE_LINE_OFFSET}
          letterOut={LETTER_OUT}
          letterIn={LETTER_IN}
          letterStaggerIn={HEADLINE_LETTER_STAGGER}
          letterConfigIn={HEADLINE_LETTER_CONFIG}
          className={`flex whitespace-nowrap ${justify}`}
        >
          {line}
        </TextEngine>
      ))}
    </span>
  );
};
