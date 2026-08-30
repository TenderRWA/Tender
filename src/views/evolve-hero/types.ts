/** A metric pinned to a grid intersection. */
export interface HeroStatData {
  /** Hard-broken lines — one entry per forced line. */
  lines: string[];
  /** Grid rule the label aligns to, as a CSS percentage of the width. */
  x: string;
  /** Rule to use below 1280. Omit to keep `x`. */
  xTablet?: string;
  /** Offset from the hero top, as a CSS percentage of the height. */
  y: string;
  /** Measure of the label block, as a CSS length. */
  width: string;
}
