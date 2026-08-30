import { cubicBezier } from "../../lib/scene-evolve/easing";

/**
 * The evolve hero's entrance timeline — one place, so the sequence can be
 * retimed without hunting through the components.
 */

/** Milliseconds after the stage opens at which each block starts. */
export const HERO_DELAY = {
  nav: 0,
  grid: 200,
  visual: 400,
  titleLead: 600,
  titleTrail: 1400,
  stats: 2000,
  cta: 2400,
} as const;

/** The design's curve — a long, decelerating settle. */
export const HERO_EASE = cubicBezier(0.16, 1, 0.3, 1);

/** Letter reveal: up from below, out of a blur, out of nothing. */
export const LETTER_OUT = {
  transform: "translateY(0.42em)",
  opacity: 0,
  filter: "blur(10px)",
};

export const LETTER_IN = {
  transform: "translateY(0em)",
  opacity: 1,
  filter: "blur(0px)",
};

export const HEADLINE_LETTER_CONFIG = { duration: 1150, easing: HERO_EASE };
export const HEADLINE_LETTER_STAGGER = 22;
export const HEADLINE_LINE_OFFSET = 150;

export const LEAD_LINE_CONFIG = { duration: 1000, easing: HERO_EASE };
export const LEAD_LINE_STAGGER = 130;

export const FADE_CONFIG = { duration: 700, easing: HERO_EASE };
export const VISUAL_CONFIG = { duration: 2500, easing: HERO_EASE };
export const HOVER_CONFIG = { duration: 420, easing: HERO_EASE };

export const MARKER_STAGGER = 40;
export const CHEVRON_STAGGER = 45;
export const SCRAMBLE_DURATION = 700;

export const FADE_LIFT = "0.75rem";
