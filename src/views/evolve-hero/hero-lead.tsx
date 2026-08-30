import TextEngine from "spring-text-engine";

import {
  HERO_DELAY,
  LEAD_LINE_CONFIG,
  LEAD_LINE_STAGGER,
  LETTER_IN,
  LETTER_OUT,
} from "./hero-motion";
import { useHeroStage } from "./hero-stage";

export interface HeroLeadProps {
  text: string;
  breakBefore?: string;
  className?: string;
}

/** The lead copy, revealed a wrapped line at a time. */
export const HeroLead = ({ text, breakBefore, className }: HeroLeadProps) => {
  const { started } = useHeroStage();
  const index = breakBefore ? text.indexOf(breakBefore) : -1;

  const children =
    breakBefore && index !== -1 ? (
      <>
        {text.slice(0, index)}
        <br className="hidden max-md:inline" />
        <span className="whitespace-nowrap">{breakBefore}</span>
        {text.slice(index + breakBefore.length)}
      </>
    ) : (
      text
    );

  return (
    <p className={className}>
      <TextEngine
        tag="span"
        mode="once"
        enabled={started}
        delayIn={HERO_DELAY.stats}
        lineOut={LETTER_OUT}
        lineIn={LETTER_IN}
        lineStaggerIn={LEAD_LINE_STAGGER}
        lineConfigIn={LEAD_LINE_CONFIG}
        className="flex flex-wrap"
      >
        {children}
      </TextEngine>
    </p>
  );
};
