import * as THREE from "three";
import {
  Pass,
  FullScreenQuad,
} from "three/examples/jsm/postprocessing/Pass.js";
import { SavePass } from "three/examples/jsm/postprocessing/SavePass.js";
import type { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

/**
 * The scene's two temporal filters, in one pass at the end of the composer.
 *
 * A dense point cloud flickers for two separate reasons, and they need
 * different medicine:
 *
 * - **The points.** Alpha-blended sprites that also write depth, so a
 *   transparent sprite edge occludes a lit point behind it and a sub-pixel move
 *   flips the pixel. Fixed by mixing in a slice of the previous *frame*,
 *   weighted by how far the subject moved — heavy for sub-pixel drift, gone
 *   entirely for real movement, so nothing ever smears.
 * - **The glow.** `UnrealBloomPass` extracts its bright areas at about a sixth
 *   of the drawing buffer per axis, which is coarse enough that it
 *   point-samples 2px dots. Dots pop in and out of the bright pass as they
 *   move, each one becomes a *blurred blob*, and whole regions of the frame
 *   pulse. Measured while dragging the subject round, bloom multiplied the
 *   frame's local brightness jitter by 5.3× over the same scene with bloom off.
 *
 * The glow cannot be fixed the same way as the points: it needs far heavier
 * smoothing than any sharp image would survive. So it is smoothed *separately*,
 * and it can be, because bloom leaves its finished glow in a buffer of its own
 * before adding it to the frame:
 *
 * ```
 * bloomed = clean + glow          ← what the bloom pass leaves in the buffer
 * wanted  = clean + smoothedGlow
 *         = bloomed - (glow - smoothedGlow)
 * ```
 *
 * That correction is the only thing this needs from the full-resolution pass,
 * and it folds into the frame blend that was running anyway. The averaging
 * itself happens on bloom's own buffer — 360×215 against a 2160×1290 frame, so
 * it costs nothing. A halo lagging a few frames is invisible; the subject
 * underneath it never moves at all.
 *
 * 📖 Docs: obsidian/workflows/optimize-3d-scene.md
 */

const FULLSCREEN_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const GLOW_HISTORY_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D tGlow;
  uniform sampler2D tHistory;
  uniform float uWeight;

  varying vec2 vUv;

  void main() {
    gl_FragColor = mix(
      texture2D(tHistory, vUv),
      texture2D(tGlow, vUv),
      uWeight
    );
  }
`;

const FRAME_BLEND_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform sampler2D tFrameHistory;
  uniform sampler2D tGlow;
  uniform sampler2D tGlowHistory;
  uniform float uFrameMix;
  uniform float uGlowCorrection;

  varying vec2 vUv;

  void main() {
    // Sampled exactly the way the bloom pass sampled it on the way in, so the
    // raw glow cancels to the last bit and only the averaged one is left.
    vec4 excess =
      (texture2D(tGlow, vUv) - texture2D(tGlowHistory, vUv)) * uGlowCorrection;
    vec4 frame = texture2D(tDiffuse, vUv) - excess;

    gl_FragColor = mix(frame, texture2D(tFrameHistory, vUv), uFrameMix);
  }
`;

/**
 * Averages bloom's glow with the glow it produced last frame, on bloom's own
 * (small) buffer.
 */
class GlowHistoryPass extends Pass {
  readonly material: THREE.ShaderMaterial;
  private readonly targets: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
  private readonly quad: FullScreenQuad;
  private write = 0;
  private fresh = true;

  constructor(
    private readonly bloomPass: UnrealBloomPass,
    private readonly weight: number,
  ) {
    super();
    this.needsSwap = false;

    const makeTarget = () =>
      new THREE.WebGLRenderTarget(1, 1, {
        type: THREE.HalfFloatType,
        depthBuffer: false,
        stencilBuffer: false,
      });
    this.targets = [makeTarget(), makeTarget()];

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tGlow: { value: null },
        tHistory: { value: null },
        uWeight: { value: weight },
      },
      vertexShader: FULLSCREEN_VERTEX_SHADER,
      fragmentShader: GLOW_HISTORY_FRAGMENT_SHADER,
      blending: THREE.NoBlending,
    });
    this.quad = new FullScreenQuad(this.material);
  }

  /**
   * Bloom's finished glow, before it was added to the frame. Reaching into the
   * pass for it is the whole trick — and the one thing here that a `three`
   * upgrade could take away, so it is checked rather than assumed.
   */
  get source(): THREE.WebGLRenderTarget | null {
    return this.bloomPass.renderTargetsHorizontal?.[0] ?? null;
  }

  /** The averaged glow this frame — what the frame pass corrects towards. */
  get history(): THREE.Texture {
    return this.targets[this.write].texture;
  }

  /** Forget the stored glow: the next frame is taken whole. */
  invalidate() {
    this.fresh = true;
  }

  override render(renderer: THREE.WebGLRenderer) {
    const source = this.source;
    if (!source) return;

    // Bloom's buffer is sized per tier and per resize; follow it rather than
    // tracking the same arithmetic in a second place.
    if (
      this.targets[0].width !== source.width ||
      this.targets[0].height !== source.height
    ) {
      for (const target of this.targets) {
        target.setSize(source.width, source.height);
      }
      this.fresh = true;
    }

    this.write = 1 - this.write;
    this.material.uniforms.tGlow.value = source.texture;
    this.material.uniforms.tHistory.value =
      this.targets[1 - this.write].texture;
    // A full-weight frame *is* "start from this glow" — no separate reset path.
    this.material.uniforms.uWeight.value = this.fresh ? 1 : this.weight;
    this.fresh = false;

    renderer.setRenderTarget(this.targets[this.write]);
    this.quad.render(renderer);
  }

  override dispose() {
    for (const target of this.targets) target.dispose();
    this.material.dispose();
    this.quad.dispose();
  }
}

/** Swaps the raw glow for the averaged one, and blends the frame with the last. */
class FrameBlendPass extends Pass {
  readonly material: THREE.ShaderMaterial;
  private readonly quad: FullScreenQuad;

  constructor(
    private readonly glow: GlowHistoryPass,
    frameHistory: SavePass,
  ) {
    super();

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tFrameHistory: { value: frameHistory.renderTarget.texture },
        tGlow: { value: null },
        tGlowHistory: { value: null },
        uFrameMix: { value: 0 },
        uGlowCorrection: { value: 0 },
      },
      vertexShader: FULLSCREEN_VERTEX_SHADER,
      fragmentShader: FRAME_BLEND_FRAGMENT_SHADER,
      blending: THREE.NoBlending,
    });
    this.quad = new FullScreenQuad(this.material);
  }

  override render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
  ) {
    const source = this.glow.source;
    const correct = this.glow.enabled && source !== null;

    this.material.uniforms.tDiffuse.value = readBuffer.texture;
    this.material.uniforms.tGlow.value = source ? source.texture : null;
    this.material.uniforms.tGlowHistory.value = this.glow.history;
    this.material.uniforms.uGlowCorrection.value = correct ? 1 : 0;

    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    if (this.clear) renderer.clear();
    this.quad.render(renderer);
  }

  override dispose() {
    this.material.dispose();
    this.quad.dispose();
  }
}

export interface TemporalFilter {
  /** Add these to the composer, in order, right after the bloom pass. */
  passes: Pass[];
  /**
   * Weight of the previous frame, 0–1. 0 draws the frame as authored; the
   * scene raises it as the subject slows down.
   */
  setFrameMix: (mix: number) => void;
  /** Bloom is off, or the tier has none — there is no glow to correct. */
  setGlowEnabled: (enabled: boolean) => void;
  /** Keep nothing from the last frame: resize, context loss, a one-off render. */
  invalidate: () => void;
  dispose: () => void;
}

export interface TemporalFilterOptions {
  bloomPass: UnrealBloomPass;
  /**
   * Weight of the newest glow, 0–1. Lower is steadier and lags further behind
   * — and the lag only shows up while the subject is moving fast, which is
   * exactly when nobody can see it.
   */
  glowWeight: number;
}

export const createTemporalFilter = ({
  bloomPass,
  glowWeight,
}: TemporalFilterOptions): TemporalFilter => {
  const glowPass = new GlowHistoryPass(bloomPass, glowWeight);
  const savePass = new SavePass();
  const framePass = new FrameBlendPass(glowPass, savePass);

  return {
    passes: [glowPass, framePass, savePass],
    setFrameMix: (mix) => {
      framePass.material.uniforms.uFrameMix.value = mix;
    },
    setGlowEnabled: (enabled) => {
      glowPass.enabled = enabled;
    },
    invalidate: () => {
      glowPass.invalidate();
      framePass.material.uniforms.uFrameMix.value = 0;
    },
    dispose: () => {
      glowPass.dispose();
      framePass.dispose();
      savePass.dispose();
    },
  };
};
