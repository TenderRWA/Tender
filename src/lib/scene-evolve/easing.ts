/**
 * `cubic-bezier()` as a plain easing function.
 *
 * react-spring's `config` accepts `{ duration, easing }`, where `easing` is a
 * `(t: number) => number`. Its bundled `easings` set has no way to express an
 * arbitrary CSS curve, so this solves one — letting a design hand over a
 * `cubic-bezier(...)` and get it back exactly rather than approximated.
 */

const a = (c1: number, c2: number) => 1 - 3 * c2 + 3 * c1;
const b = (c1: number, c2: number) => 3 * c2 - 6 * c1;
const c = (c1: number) => 3 * c1;

/** Evaluates the polynomial form of the bezier on one axis. */
const evaluate = (t: number, c1: number, c2: number) =>
  ((a(c1, c2) * t + b(c1, c2)) * t + c(c1)) * t;

const slope = (t: number, c1: number, c2: number) =>
  3 * a(c1, c2) * t * t + 2 * b(c1, c2) * t + c(c1);

const NEWTON_ITERATIONS = 8;

/**
 * Returns the easing for `cubic-bezier(x1, y1, x2, y2)`.
 *
 * Inverts x(t) with Newton–Raphson, then reads y at that t — the same method
 * browsers use. Eight iterations put the error well below a pixel at any
 * realistic duration.
 */
export const cubicBezier =
  (x1: number, y1: number, x2: number, y2: number) =>
  (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    let t = x;
    for (let i = 0; i < NEWTON_ITERATIONS; i += 1) {
      const currentSlope = slope(t, x1, x2);
      if (currentSlope === 0) break;
      t -= (evaluate(t, x1, x2) - x) / currentSlope;
    }

    return evaluate(t, y1, y2);
  };
