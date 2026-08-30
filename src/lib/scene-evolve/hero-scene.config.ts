/**
 * Authored settings for the hero particle scene.
 *
 * Everything here is live-tunable from the on-screen panel
 * (`views/home/hero/scene-controls.tsx`) and cheap to apply — a uniform, a
 * transform or a pass parameter. Nothing in this file rebuilds geometry, which
 * is why the panel can drive it at 60fps.
 *
 * Values the *device* owns (DPR clamp, point stride, frame budget) are not
 * here — they live in `device.ts` so a tuned config stays portable across
 * tiers. See obsidian/workflows/optimize-3d-scene.md §2.
 */

export interface ParticleSettings {
  /** Rendered point diameter in CSS px, at the camera's reference distance. */
  size: number;
}

export interface BloomSettings {
  enabled: boolean;
  /** Overall glow intensity. */
  strength: number;
  /** Spread of the blur pyramid. */
  radius: number;
  /** Luminance below which nothing blooms. */
  threshold: number;
}

/** Model placement, in world units. The source cloud is ~1.85 × 1.9 × 1.09. */
export interface ModelSettings {
  x: number;
  y: number;
  z: number;
  scale: number;
  /**
   * Resting orientation **in degrees** — degrees rather than radians because
   * these are hand-dialled in the panel. Parallax swings around these, it does
   * not replace them.
   */
  rotationX: number;
  rotationY: number;
  rotationZ: number;
}

export interface CameraSettings {
  /** Distance from the model on +Z. Also the point-size reference distance. */
  distance: number;
  fov: number;
}

/** Cursor repulsion — particles flee the pointer and spring back behind it. */
export interface ScatterSettings {
  enabled: boolean;
  /** How far a particle at the very centre is pushed, in world units. */
  force: number;
  /** World-space radius of the affected area. */
  radius: number;
  /** How much of the push is randomised per particle vs purely radial (0–1). */
  turbulence: number;
  /** Per-frame low-pass on the cursor — lower is lazier. */
  ease: number;
}

/**
 * The idle drift — every point wanders along the surface it sits on, forever,
 * so the cloud reads as suspended matter rather than a frozen scan. It is
 * deliberately small: enough to shimmer, never enough to blur the form.
 */
export interface DriftSettings {
  enabled: boolean;
  /** Peak excursion from the authored position, in world units. */
  amount: number;
  /** Angular rate of the wander, in radians per second. */
  speed: number;
}

/**
 * Depth fade — points thin out with distance **from the camera**, so the far
 * side of the subject falls away however parallax has turned it. The band is
 * anchored to the subject's own bounding sphere, which is rotation-invariant:
 * `start` and `strength` mean the same thing at every angle.
 */
export interface DepthSettings {
  enabled: boolean;
  /**
   * Where the fade begins, 0–1 across the subject's depth — 0 is the nearest
   * point of the bounding sphere, 1 the furthest.
   */
  start: number;
  /** How much is taken off at the very back, 0–1. 1 fades it to nothing. */
  strength: number;
}

export interface ParallaxSettings {
  /** Peak yaw / pitch in radians at the edge of the viewport. */
  yaw: number;
  pitch: number;
  ease: number;
}

/**
 * The two-light rig, as hex.
 *
 * These mirror the `--raw-color-scene-*` tokens in `globals.css`, which stay
 * the design-system home for the values (hard rule #4). They are duplicated
 * here so the panel can drive them as live uniforms — the Colors group's
 * **Copy** emits CSS custom-property lines, not JSON, so a tuned rig is pasted
 * back into `globals.css` rather than into this file.
 */
export interface ColorSettings {
  /** Key light — front-left. */
  key: string;
  /** Rim light — back-right. */
  rim: string;
  /** Ambient fill everything sits on. */
  fill: string;
}

export interface HeroSceneConfig {
  particles: ParticleSettings;
  bloom: BloomSettings;
  model: ModelSettings;
  camera: CameraSettings;
  scatter: ScatterSettings;
  drift: DriftSettings;
  depth: DepthSettings;
  parallax: ParallaxSettings;
  colors: ColorSettings;
}

/** Maps a colour field onto the token it belongs in. */
export const SCENE_COLOR_TOKENS: Record<keyof ColorSettings, string> = {
  key: "--raw-color-scene-key",
  rim: "--raw-color-scene-rim",
  fill: "--raw-color-scene-fill",
};

export const DEFAULT_HERO_SCENE_CONFIG: HeroSceneConfig = {
  particles: { size: 4.6 },
  bloom: { enabled: false, strength: 0, radius: 0.4, threshold: 1 },
  model: {
    x: 0.04,
    y: -0.37,
    z: 0,
    scale: 1.33,
    rotationX: 0,
    rotationY: 24,
    rotationZ: 0,
  },
  camera: { distance: 3.4, fov: 32 },
  /**
   * The original repulsion, tightened and softened: radius 0.49 → **0.34** and
   * force 0.36 → **0.2**. Same gesture, roughly half the throw over two thirds
   * of the reach, so the pointer disturbs the cloud where it passes instead of
   * opening a hole in it.
   */
  scatter: {
    enabled: true,
    force: 0.3,
    radius: 0.44,
    turbulence: 1,
    ease: 0.24,
  },
  /**
   * Small on purpose. The excursion lands on screen multiplied by the model
   * scale *and* by ~460 px per world unit, so 0.003 is roughly a 1–2 px
   * wander — a shimmer, which is the brief. Doubling it starts to soften the
   * silhouette.
   */
  drift: { enabled: true, amount: 0.003, speed: 1 },
  depth: { enabled: true, start: 0.35, strength: 0.85 },
  parallax: { yaw: 0.45, pitch: 0.28, ease: 0.14 },
  colors: { key: "#e8322a", rim: "#8f8f8f", fill: "#3a3a3a" },
};

/** Bounds for the tuning panel — also the sane range for hand-edited values. */
export const HERO_SCENE_LIMITS = {
  "particles.size": { min: 0.5, max: 8, step: 0.1 },
  "bloom.strength": { min: 0, max: 3, step: 0.01 },
  "bloom.radius": { min: 0, max: 2, step: 0.01 },
  "bloom.threshold": { min: 0, max: 1, step: 0.01 },
  "model.x": { min: -2, max: 2, step: 0.01 },
  "model.y": { min: -2, max: 2, step: 0.01 },
  "model.z": { min: -2, max: 2, step: 0.01 },
  "model.scale": { min: 0.2, max: 3, step: 0.01 },
  "model.rotationX": { min: -180, max: 180, step: 1 },
  "model.rotationY": { min: -180, max: 180, step: 1 },
  "model.rotationZ": { min: -180, max: 180, step: 1 },
  "camera.distance": { min: 1, max: 10, step: 0.05 },
  "camera.fov": { min: 10, max: 90, step: 1 },
  "scatter.force": { min: 0, max: 2, step: 0.01 },
  "scatter.radius": { min: 0.05, max: 3, step: 0.01 },
  "scatter.turbulence": { min: 0, max: 1, step: 0.01 },
  "scatter.ease": { min: 0.01, max: 1, step: 0.01 },
  "drift.amount": { min: 0, max: 0.05, step: 0.001 },
  "drift.speed": { min: 0, max: 3, step: 0.05 },
  "depth.start": { min: 0, max: 1, step: 0.01 },
  "depth.strength": { min: 0, max: 1, step: 0.01 },
  "parallax.yaw": { min: 0, max: 1.5, step: 0.01 },
  "parallax.pitch": { min: 0, max: 1.5, step: 0.01 },
  "parallax.ease": { min: 0.01, max: 1, step: 0.01 },
} as const satisfies Record<string, { min: number; max: number; step: number }>;

export type HeroSceneLimitKey = keyof typeof HERO_SCENE_LIMITS;
