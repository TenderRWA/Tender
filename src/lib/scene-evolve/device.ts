/**
 * Device tiering for WebGL scenes.
 *
 * One module owns what "mobile" means — DPR clamp, particle budget, frame
 * budget and how the subject is framed — rather than those being sprinkled
 * through render code (AGENTS.md hard rule #4; see
 * obsidian/workflows/optimize-3d-scene.md §2).
 *
 * 📖 Docs: obsidian/workflows/optimize-3d-scene.md
 */

export type SceneTierName = "mobile" | "tablet" | "desktop";

/**
 * How the subject is framed on a tier. `null` means "use the authored config
 * untouched" — the desktop composition is pixel-matched to Figma and must not
 * be re-derived.
 */
export interface SceneFraming {
  /** Vertical placement in world units. Negative pushes the subject down. */
  modelY: number;
  modelScale: number;
  /** Camera distance. Larger pulls back, which is how the head gains air. */
  cameraDistance: number;
}

export interface SceneTier {
  name: SceneTierName;
  /** Upper bound on `renderer.setPixelRatio` — a 3× phone renders 9× the fragments. */
  maxPixelRatio: number;
  /**
   * Keep every Nth point. The source buffer is spatially sorted, so it must be
   * **strided, never truncated** — slicing the tail deletes one whole side of
   * the model (optimize-3d-scene §7).
   */
  pointStride: number;
  /** Minimum ms between rendered frames, passed to the shared ticker. 0 = uncapped. */
  frameBudgetMs: number;
  /**
   * Multiplier on the authored point size. A strided tier draws fewer points,
   * so it can grow each one to keep the cloud reading as solid — or shrink
   * them, where the tier's viewing distance makes the authored size read as
   * blobs rather than as particles.
   */
  pointSizeScale: number;
  /**
   * Whether bloom may run. A composer costs a full-resolution blur pyramid, so
   * the cheapest tier skips it entirely (optimize-3d-scene §6).
   */
  allowBloom: boolean;
  /** Tier-specific framing, or `null` to keep the authored composition. */
  framing: SceneFraming | null;
}

/**
 * Hard ceiling on pixel ratio for every tier. A 3× phone gains nothing
 * visible from the third sample and pays 2.25× the fragments for it.
 */
export const MAX_PIXEL_RATIO = 1.5;

const TIERS: Record<SceneTierName, SceneTier> = {
  mobile: {
    name: "mobile",
    // §6. The cloud is soft-edged sprites, which is exactly the case the skill
    // sanctions going below 1.0 for. Down from 1.5 this is 3.1x fewer fragments.
    maxPixelRatio: 0.85,
    // A quarter of the cloud. At this scale the phone cannot resolve the
    // difference, and it is the single biggest saving available.
    pointStride: 4,
    frameBudgetMs: 1000 / 30 - 1,
    /**
     * Half the size the strided cloud would otherwise need. A phone is held
     * close, so the authored 4.6px point — grown to 6.2 to hide the stride —
     * read as blobs rather than as a cloud; at this scale the form is drawn in
     * points again. Also the cheapest fill saving on the tier that needs it
     * most (optimize-3d-scene §7).
     */
    pointSizeScale: 0.68,
    allowBloom: false,
    /**
     * Portrait is narrow, so the head — not the bust — has to be the subject.
     * Pulling the camera back gives the skull air instead of letting it run
     * off the top, and dropping the model well below centre keeps the face
     * clear of the headline, which owns the upper third on mobile.
     */
    framing: { modelY: -0.62, modelScale: 0.78, cameraDistance: 4.3 },
  },
  tablet: {
    name: "tablet",
    maxPixelRatio: 1.25,
    pointStride: 2,
    frameBudgetMs: 1000 / 45 - 1,
    pointSizeScale: 1.1,
    allowBloom: true,
    /**
     * Scaled up to carry the frame, then dropped: the subject has to clear the
     * headline block in the upper left and still leave air above the crown, so
     * the extra size is spent downward into the cropped shoulders.
     */
    framing: { modelY: -0.62, modelScale: 1.24, cameraDistance: 4.0 },
  },
  desktop: {
    name: "desktop",
    maxPixelRatio: MAX_PIXEL_RATIO,
    pointStride: 1,
    frameBudgetMs: 0,
    pointSizeScale: 1,
    allowBloom: true,
    framing: null,
  },
};

const MOBILE_MAX_WIDTH = 767;
const TABLET_MAX_WIDTH = 1279;

/** Resolve the tier for the current viewport. */
export const getSceneTier = (): SceneTier => {
  if (typeof window === "undefined") return TIERS.desktop;

  const width = window.innerWidth;
  if (width <= MOBILE_MAX_WIDTH) return TIERS.mobile;
  if (width <= TABLET_MAX_WIDTH) return TIERS.tablet;

  // A coarse pointer on a wide viewport is still a touch device — treat as tablet.
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  return coarse ? TIERS.tablet : TIERS.desktop;
};

/** True when the visitor asked for less motion — the scene then holds still. */
export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);

/** True when a pointer can actually hover — no cursor listener otherwise (§11). */
export const hasFinePointer = (): boolean =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(pointer: fine)").matches ?? false);

interface ConstrainedNavigator extends Navigator {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
}

/**
 * The nearest web-exposed proxy for iOS Low Power Mode, which has no API of its
 * own: Data Saver, or a device reporting 2GB or less (§2).
 */
export const isEnergySaver = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as ConstrainedNavigator;
  return Boolean(nav.connection?.saveData) || (nav.deviceMemory ?? 8) <= 2;
};

/**
 * Whether the scene should settle on one frame instead of running a loop (§2).
 *
 * Reduced motion is an accessibility promise and holds on every tier; an
 * energy-constrained phone gets the same treatment. WebGL keeps the last frame
 * on the canvas, so a frozen scene costs nothing at all.
 */
export const sceneShouldFreeze = (): boolean =>
  prefersReducedMotion() ||
  (getSceneTier().name === "mobile" && isEnergySaver());
