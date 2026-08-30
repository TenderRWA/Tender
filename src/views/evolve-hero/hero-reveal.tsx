import type { CSSProperties, ReactNode } from "react";

import { FADE_CONFIG, FADE_LIFT } from "./hero-motion";
import { useHeroStage } from "./hero-stage";
import { Spring } from "./spring";

export interface HeroRevealProps {
  children: ReactNode;
  /** Milliseconds after the stage opens at which this block starts. */
  delay: number;
  tag?: string;
  className?: string;
  style?: CSSProperties;
  from?: "above" | "below";
}

/** The hero's default entrance: fade plus a short lift, on the shared curve. */
export const HeroReveal = ({
  children,
  delay,
  tag = "div",
  className,
  style,
  from = "below",
}: HeroRevealProps) => {
  const { started } = useHeroStage();

  return (
    <Spring
      tag={tag}
      enabled={started}
      className={className}
      style={style}
      from={{
        opacity: 0,
        transform: `translateY(${from === "above" ? "-" : ""}${FADE_LIFT})`,
      }}
      to={{ opacity: 1, transform: "translateY(0rem)" }}
      config={FADE_CONFIG}
      delayIn={delay}
    >
      {children}
    </Spring>
  );
};
