/**
 * Device tiering for the WebGL scene.
 *
 * One place decides what "mobile" means, so pixel ratio, particle passes, frame
 * budget and whether the pointer is listened to at all can never drift apart.
 * Every value here is read once at scene construction — a device does not change
 * tier mid-session, and rebuilding buffers (or the GL context, whose `antialias`
 * is fixed at creation) on a resize costs more than the mismatch is worth.
 *
 * Ported from the canonical `helion`/`mycelia` `lib/scene/device.ts` — same API,
 * same numbers, so an agent moving between projects can predict it. The only
 * omission is `viewScale()`: this scene's sprites already attenuate with the
 * camera distance, which grows as the frame narrows, so it has no use for it.
 *
 * 📖 Docs: obsidian/frontend/animation-system.md → Scene tiering
 */

export type DeviceTier = "mobile" | "tablet" | "desktop";

/** Matches the breakpoints the layout uses. */
const TABLET_MAX = 1180;
const MOBILE_MAX = 768;

export const deviceTier = (): DeviceTier => {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  const coarse =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  if (width < MOBILE_MAX || coarse) return "mobile";
  if (width < TABLET_MAX) return "tablet";
  return "desktop";
};

/**
 * Hard ceiling on the mobile render scale, in backing-store px per CSS px.
 *
 * Below 1.0 because the scene is a decorative backdrop behind the content, it is
 * entirely fill-bound, and the point sprites are soft (a smoothstep falloff, then
 * additively blended) — so rendering at 0.85× and letting the browser upscale is
 * invisible on the cloud while cutting roughly a third of the fragments.
 */
const MOBILE_MAX_DPR = 0.85;

/**
 * Device pixel ratio, clamped.
 *
 * A 3× phone renders 9× the fragments of a 1× screen for no perceptible gain on a
 * point cloud. The floor keeps a 1× laptop from rendering below native.
 */
export const clampedPixelRatio = (tier: DeviceTier = deviceTier()): number => {
  if (typeof window === "undefined") return 1;
  const dpr = window.devicePixelRatio || 1;
  if (tier === "mobile") return Math.min(dpr, MOBILE_MAX_DPR);
  return Math.min(Math.max(dpr, 0.75), 1.5);
};

/**
 * The OS "reduce motion" accessibility setting.
 *
 * Distinct from react-spring's global `skipAnimation` (mounted <ReducedMotion>,
 * which only skips spring/DOM animation): this is read by the WebGL scene to
 * decide whether to keep drawing at all. A plain function, not a hook — the scene
 * loop lives outside React.
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

/**
 * Best-effort "this device wants us to spend less" signal. Every input is
 * optional and absent on most desktops, so it only ever trips on a constrained
 * client: Data Saver on (the nearest web-exposed proxy for iOS Low Power Mode,
 * which has no API) or a device reporting ≤ 2 GB of memory.
 */
export const isEnergySaver = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  if (nav.connection?.saveData === true) return true;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory > 0) {
    return nav.deviceMemory <= 2;
  }
  return false;
};

/**
 * Whether the scene should drop to its cheapest path: play the intro scan once,
 * then freeze on the settled frame so nothing animates on idle. True when the
 * user asked for reduced motion (any device — an accessibility promise), or on a
 * phone flagged as energy-constrained, where a continuous WebGL loop is the thing
 * that drags the whole page down. WebGL keeps the last frame on the canvas, so a
 * frozen scene costs exactly nothing.
 */
export const sceneShouldFreeze = (tier: DeviceTier = deviceTier()): boolean => {
  if (prefersReducedMotion()) return true;
  return tier === "mobile" && isEnergySaver();
};

/**
 * Minimum milliseconds between scene frames, per tier.
 *
 * The ticker throttles each subscriber independently, so capping the scene does
 * not slow the springs and text animation sharing the loop. Halving the frame
 * rate on a phone is the single biggest win available: this scene is fill-bound,
 * not motion-bound — the shimmer and the god rays evolve slowly enough that the
 * cap is hard to see.
 */
export const frameBudgetMs = (tier: DeviceTier = deviceTier()): number => {
  if (tier === "mobile") return 1000 / 30;
  if (tier === "tablet") return 1000 / 45;
  return 0; // desktop: every rAF tick
};

/** Picks the value for the current tier. */
export const byTier = <T>(tier: DeviceTier, values: Record<DeviceTier, T>): T =>
  values[tier];
