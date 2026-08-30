/**
 * Per-tier scene budget for <HeadParticles> — what the head costs on the device
 * it landed on. The *tier* itself (and DPR, frame budget, freeze policy) comes
 * from the shared `@/lib/scene/device`; this module only holds the knobs that are
 * specific to this scene, so there is still exactly one definition of "mobile".
 *
 * What the mobile tier gives up, in rough order of what it buys back:
 *
 * - the **second, jittered point pass** — halves 50 000 heavy vertex-shader
 *   invocations per frame; the head reads slightly sparser, so its sprites are
 *   drawn a touch larger to compensate;
 * - the **chromatic-dispersion composite** — an offscreen render target plus a
 *   fullscreen 3-tap texture read every frame, for a ~6/1000-UV colour split
 *   nobody sees on a 6" screen. At `dispersion: 0` the scene draws straight to
 *   the default framebuffer and the FBO/texture/program are never created;
 * - **MSAA** (`antialias`), which on tiled mobile GPUs is paid per pixel;
 * - most of the **rising embers**.
 *
 * It also turns **pointer interactivity off**. A coarse pointer has no hover:
 * "cursor" parallax on a phone can only fire mid-drag — motion the visitor never
 * asked for, paid for with a listener on every touch move.
 *
 * Resolved **once per mount**, like the tier and the DPR it carries: WebGL's
 * `antialias` is fixed at context creation, so re-tiering live would mean
 * rebuilding the renderer. See [[decisions-log]] ADR-0021.
 */

import {
  byTier,
  clampedPixelRatio,
  deviceTier,
  frameBudgetMs,
  sceneShouldFreeze,
  type DeviceTier,
} from "@/lib/scene/device";

export interface SceneQuality {
  tier: DeviceTier;
  /** Device-pixel ratio for the drawing buffer (clamped per tier). */
  dpr: number;
  /** Minimum ms between rendered frames; 0 = every rAF tick. */
  frameBudgetMs: number;
  /** Play the intro, then stop drawing entirely (reduced motion / energy saver). */
  freeze: boolean;
  /** Request MSAA on the WebGL context. */
  antialias: boolean;
  /** Draw the point cloud a second time, jittered, for a denser head. */
  doubleDraw: boolean;
  /** Base sprite diameter in CSS pixels, before perspective attenuation. */
  pointSizePx: number;
  /** Number of rising embers streaming up into the head. */
  risingCount: number;
  /** Chromatic dispersion (UV units). `0` skips the composite pass entirely. */
  dispersion: number;
  /** Let the pointer drive head parallax + the cursor light burst. */
  pointer: boolean;
  /**
   * Re-size the drawing buffer when the canvas box changes.
   *
   * Off on touch: iOS Safari changes the viewport every time the URL bar
   * collapses, and re-allocating the framebuffer mid-scroll reads as a
   * whole-scene flash. The canvas is sized against the *large* viewport
   * (`h-lvh`), so on a phone that first size is already the right one.
   */
  resize: boolean;
}

export const resolveSceneQuality = (): SceneQuality => {
  const tier = deviceTier();
  return {
    tier,
    dpr: clampedPixelRatio(tier),
    frameBudgetMs: frameBudgetMs(tier),
    freeze: sceneShouldFreeze(tier),
    antialias: byTier(tier, { mobile: false, tablet: false, desktop: true }),
    doubleDraw: byTier(tier, { mobile: false, tablet: true, desktop: true }),
    pointSizePx: byTier(tier, { mobile: 3.6, tablet: 3.4, desktop: 3.2 }),
    risingCount: byTier(tier, { mobile: 320, tablet: 600, desktop: 900 }),
    dispersion: byTier(tier, { mobile: 0, tablet: 0.006, desktop: 0.006 }),
    pointer: byTier(tier, { mobile: false, tablet: false, desktop: true }),
    resize: byTier(tier, { mobile: false, tablet: false, desktop: true }),
  };
};
