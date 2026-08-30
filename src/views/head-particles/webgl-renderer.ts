/**
 * WebGL renderer for the head particle field — a feature-local helper for
 * <HeadParticles>. Owns two GL programs on one canvas: a fullscreen background
 * (navy gradient + god rays) drawn first, then the head point cloud with
 * additive blending. It holds no animation clock: the component drives it each
 * frame with a `RenderState` (time + orientation + pointer light).
 *
 * This is not the spring animation engine — it is a canvas render surface. The
 * loop that calls `render` is the shared app ticker (ADR-0016). See
 * obsidian/frontend/animation-system.md → Shared render loop.
 *
 * How much of the scene is actually drawn is decided by the `SceneQuality`
 * profile handed in at construction (see `scene-quality.ts`, ADR-0021): the
 * mobile tier drops the second point pass, MSAA and the dispersion composite —
 * and when dispersion is off, the offscreen target/program are never created.
 */

import type { DecodedPointCloud } from "@/utils/particles/decode-points";
import * as mat4 from "@/utils/particles/mat4";

import type { SceneQuality } from "./scene-quality";

import {
  BACKGROUND_FRAGMENT_SHADER,
  BACKGROUND_VERTEX_SHADER,
  COMPOSITE_FRAGMENT_SHADER,
  PARTICLE_FRAGMENT_SHADER,
  PARTICLE_VERTEX_SHADER,
  RISING_FRAGMENT_SHADER,
  RISING_VERTEX_SHADER,
} from "./shaders";

export interface RenderState {
  /** Elapsed seconds — drives shimmer, drift, and the background rays. */
  time: number;
  /** Model yaw in radians. */
  yaw: number;
  /** Model pitch in radians. */
  pitch: number;
  /** Pointer position in normalised device coords, each axis in [-1, 1]. */
  pointer: readonly [number, number];
  /** Pointer-present factor 0..1 — enables the cursor-local burst. */
  burst: number;
  /** Intro scan progress 0..1 — the head materialises bottom→top; 1 = fully shown. */
  reveal: number;
}

export interface BackgroundConfig {
  top: readonly [number, number, number];
  bottom: readonly [number, number, number];
  ray: readonly [number, number, number];
  /** God-ray column centre in UV space (0..1). */
  lightUv: readonly [number, number];
}

const FOV_Y = (35 * Math.PI) / 180;
const AMBIENT = 0.06;
const FOG_MIN = 0.26;
/** Cursor hole radius, in NDC (aspect-corrected). */
const BURST_RADIUS = 0.24;
/** Default head transform — view-space offset + camera framing margin (smaller
 *  FILL = head fills more of the frame). Overridable at runtime via setTransform. */
export const DEFAULT_OFFSET_X = 0.0;
export const DEFAULT_OFFSET_Y = 0.02;
export const DEFAULT_FILL = 0.82;
/** Breathing room kept either side of the head when the frame is too narrow to
 *  show it at the vertical framing (portrait phones). 1 = head touches both edges. */
const PORTRAIT_MARGIN = 1.12;

const compileShader = (
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader => {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("failed to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`shader compile failed: ${log ?? "unknown"}`);
  }
  return shader;
};

const linkProgram = (
  gl: WebGLRenderingContext,
  vertexSrc: string,
  fragmentSrc: string,
): WebGLProgram => {
  const program = gl.createProgram();
  if (!program) throw new Error("failed to create program");
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`program link failed: ${log ?? "unknown"}`);
  }
  return program;
};

type Uniforms = Record<string, WebGLUniformLocation | null>;

const uniformsOf = (
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  names: string[],
): Uniforms =>
  Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(program, n)]));

export class ParticleRenderer {
  private readonly gl: WebGLRenderingContext;

  private readonly particleProgram: WebGLProgram;
  private readonly positionBuffer: WebGLBuffer;
  private readonly normalBuffer: WebGLBuffer;
  private readonly pUniforms: Uniforms;
  private readonly aPosition: number;
  private readonly aNormal: number;

  private readonly bgProgram: WebGLProgram;
  private readonly bgBuffer: WebGLBuffer;
  private readonly bgUniforms: Uniforms;
  private readonly aBgPos: number;

  private readonly risingProgram: WebGLProgram;
  private readonly risingBuffer: WebGLBuffer;
  private readonly risingUniforms: Uniforms;
  private readonly aSeed: number;

  // Dispersion post-FX — only allocated when the quality tier asks for it.
  private readonly compositeProgram: WebGLProgram | null = null;
  private readonly compositeUniforms: Uniforms = {};
  private readonly aCompPos: number = -1;
  private readonly sceneFbo: WebGLFramebuffer | null = null;
  private sceneTex: WebGLTexture | null = null;

  private count = 0;
  private radius = 1;
  private halfWidth = 1;
  private cameraDistance = 3;
  private dpr = 1;
  private width = 1;
  private height = 1;
  private offsetX = DEFAULT_OFFSET_X;
  private offsetY = DEFAULT_OFFSET_Y;
  private fill = DEFAULT_FILL;
  private readonly color = new Float32Array([1, 1, 1]);
  private readonly bgTop = new Float32Array([0.04, 0.08, 0.2]);
  private readonly bgBottom = new Float32Array([0.01, 0.02, 0.06]);
  private readonly bgRay = new Float32Array([0.23, 0.44, 0.83]);
  private readonly bgLightUv = new Float32Array([0.6, 0.72]);
  private projection = mat4.identity();

  // Per-frame scratch. `mat4`'s helpers each return a fresh Float32Array, so
  // building the model-view every frame allocated six typed arrays per draw —
  // ~360 a second, i.e. a GC stall on a schedule. These are reused instead.
  private readonly viewMatrix = mat4.identity();
  private readonly rotX = mat4.identity();
  private readonly rotY = mat4.identity();
  private readonly modelMatrix = mat4.identity();
  private readonly modelView = mat4.identity();
  private readonly normalMatrix = new Float32Array(9);
  private readonly lightPos = new Float32Array(3);
  private readonly lightDir = new Float32Array(3);

  constructor(
    canvas: HTMLCanvasElement,
    private readonly quality: SceneQuality,
  ) {
    const gl =
      canvas.getContext("webgl", {
        antialias: quality.antialias,
        alpha: false,
        premultipliedAlpha: false,
        // Nothing in this scene depth- or stencil-tests (the passes are drawn in
        // order with DEPTH_TEST off), so asking for neither buffer saves their
        // allocation and their per-frame clear.
        depth: false,
        stencil: false,
        // Only where there is a discrete GPU worth waking: on a phone the
        // high-performance hint is at best ignored and at worst picks the
        // thirstier core.
        powerPreference:
          quality.tier === "desktop" ? "high-performance" : "default",
        // Debug-only: lets an on-demand render be read back via toDataURL.
        preserveDrawingBuffer: false,
      }) ?? null;
    if (!gl) throw new Error("WebGL is not available");
    this.gl = gl;

    this.particleProgram = linkProgram(
      gl,
      PARTICLE_VERTEX_SHADER,
      PARTICLE_FRAGMENT_SHADER,
    );
    this.bgProgram = linkProgram(
      gl,
      BACKGROUND_VERTEX_SHADER,
      BACKGROUND_FRAGMENT_SHADER,
    );
    this.risingProgram = linkProgram(
      gl,
      RISING_VERTEX_SHADER,
      RISING_FRAGMENT_SHADER,
    );
    if (quality.dispersion > 0) {
      this.compositeProgram = linkProgram(
        gl,
        BACKGROUND_VERTEX_SHADER,
        COMPOSITE_FRAGMENT_SHADER,
      );
      const sceneFbo = gl.createFramebuffer();
      if (!sceneFbo) throw new Error("failed to create framebuffer");
      this.sceneFbo = sceneFbo;
    }

    const positionBuffer = gl.createBuffer();
    const normalBuffer = gl.createBuffer();
    const bgBuffer = gl.createBuffer();
    const risingBuffer = gl.createBuffer();
    if (!positionBuffer || !normalBuffer || !bgBuffer || !risingBuffer)
      throw new Error("failed to create buffers");
    this.positionBuffer = positionBuffer;
    this.normalBuffer = normalBuffer;
    this.bgBuffer = bgBuffer;
    this.risingBuffer = risingBuffer;

    // Fullscreen triangle for the background pass.
    gl.bindBuffer(gl.ARRAY_BUFFER, bgBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );

    // Per-ember seeds: x[-1,1], z[-1,1], phase[0,1], rnd[0,1]. Static; the shader
    // derives each ember's rising position from the seed + time every frame.
    const seeds = new Float32Array(quality.risingCount * 4);
    for (let i = 0; i < quality.risingCount; i++) {
      seeds[i * 4] = Math.random() * 2 - 1;
      seeds[i * 4 + 1] = Math.random() * 2 - 1;
      seeds[i * 4 + 2] = Math.random();
      seeds[i * 4 + 3] = Math.random();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, risingBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);

    this.aPosition = gl.getAttribLocation(this.particleProgram, "aPosition");
    this.aNormal = gl.getAttribLocation(this.particleProgram, "aNormal");
    this.pUniforms = uniformsOf(gl, this.particleProgram, [
      "uProjection", "uModelView", "uNormalMatrix", "uLightPos", "uLightDir",
      "uColor", "uTime", "uRadius", "uPointScale", "uAmbient", "uDissolve",
      "uFogNear", "uFogFar", "uFogMin", "uJitter", "uBurst",
      "uCursor", "uBurstRadius", "uAspect", "uReveal",
    ]);

    this.aBgPos = gl.getAttribLocation(this.bgProgram, "aPos");
    this.bgUniforms = uniformsOf(gl, this.bgProgram, [
      "uResolution", "uTime", "uBgTop", "uBgBottom", "uRayColor", "uLightUv",
    ]);

    this.aSeed = gl.getAttribLocation(this.risingProgram, "aSeed");
    this.risingUniforms = uniformsOf(gl, this.risingProgram, [
      "uProjection", "uCenter", "uTime", "uRadius", "uPointScale", "uColor",
      "uReveal",
    ]);

    if (this.compositeProgram) {
      this.aCompPos = gl.getAttribLocation(this.compositeProgram, "aPos");
      this.compositeUniforms = uniformsOf(gl, this.compositeProgram, [
        "uScene", "uDispersion",
      ]);
    }

    gl.clearColor(0, 0, 0, 1);
    gl.disable(gl.DEPTH_TEST);
  }

  setGeometry(cloud: DecodedPointCloud): void {
    const { gl } = this;
    this.count = cloud.count;
    this.radius = cloud.radius;
    this.halfWidth = cloud.halfWidth;
    this.updateCamera();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cloud.positions, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cloud.normals, gl.STATIC_DRAW);
  }

  setColor(color: readonly [number, number, number]): void {
    this.color.set(color);
  }

  /** Runtime head transform (from the dev controls panel). */
  setTransform(offsetX: number, offsetY: number, fill: number): void {
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.fill = fill;
    this.updateCamera();
  }

  /**
   * Place the camera so the head is framed by whichever axis is tighter.
   *
   * The FOV is **vertical**, so a landscape frame is framed by `fill` (< 1 pulls
   * the camera in, letting the head overflow the top and bottom as designed).
   * A **portrait** frame — every phone — is narrower than it is tall, and that
   * same distance would slice the head's sides off; there the horizontal fit
   * wins and the camera pulls back until the full width fits with a margin.
   */
  private updateCamera(): void {
    const aspect = this.width / this.height;
    const vertical = (this.radius / Math.sin(FOV_Y / 2)) * this.fill;
    const horizontal =
      (this.halfWidth * PORTRAIT_MARGIN) / (aspect * Math.tan(FOV_Y / 2));
    this.cameraDistance = Math.max(vertical, horizontal);
  }

  setBackground(config: BackgroundConfig): void {
    this.bgTop.set(config.top);
    this.bgBottom.set(config.bottom);
    this.bgRay.set(config.ray);
    this.bgLightUv.set(config.lightUv);
  }

  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    const { gl } = this;
    this.dpr = dpr;
    this.width = Math.max(1, Math.round(cssWidth * dpr));
    this.height = Math.max(1, Math.round(cssHeight * dpr));
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.width = this.width;
    canvas.height = this.height;
    gl.viewport(0, 0, this.width, this.height);
    this.projection = mat4.perspective(FOV_Y, this.width / this.height, 0.01, 100);
    // The framing depends on the aspect ratio (see updateCamera), so a resize —
    // a phone rotating, a window being dragged — has to re-place the camera.
    this.updateCamera();

    if (!this.sceneFbo) return; // no dispersion pass → no offscreen target

    // (Re)create the offscreen scene texture at the new size and attach to the FBO.
    if (!this.sceneTex) this.sceneTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTex);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.sceneTex, 0,
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Force every program, uniform branch and render target into existence *now* —
   * called while the preloader curtain is still up, so nothing compiles, links or
   * allocates on a frame the visitor can see.
   *
   * Linking a program (the constructor) is not the whole cost: drivers finalise
   * the program on its first *use*, and a render target allocates on its first
   * bind. So this draws a full frame at each end of the `reveal` range (the one
   * uniform the intro sweeps) with the cursor burst on, which is the only other
   * state that changes what the shader does. The frames land in the back buffer
   * and are overwritten by the real first frame.
   */
  prewarm(): void {
    if (this.count === 0) return;
    for (const reveal of [0, 0.5, 1]) {
      this.render({
        time: 0,
        yaw: 0,
        pitch: 0,
        pointer: [0, 0],
        burst: 1,
        reveal,
      });
    }
    // Flush the queued work rather than letting it land on the first real frame.
    this.gl.finish();
  }

  render(state: RenderState): void {
    const { gl } = this;

    // Render background + head into the offscreen texture (these get dispersion)...
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFbo);
    gl.viewport(0, 0, this.width, this.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.drawBackground(state.time);
    if (this.count > 0) this.drawParticles(state);
    // ...composite to the screen with chromatic dispersion. Without the post-FX
    // (mobile tier) `sceneFbo` is null, so the two passes above already went
    // straight to the screen and there is nothing to composite.
    if (this.sceneFbo) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.width, this.height);
      this.drawComposite();
    }
    // Rising embers go on top, straight to the screen, so the bottom-up stream
    // is NOT dispersed (only the head is).
    if (this.count > 0) this.drawRising(state.time, state.reveal);
  }

  private drawComposite(): void {
    const { gl } = this;
    if (!this.compositeProgram) return;
    gl.useProgram(this.compositeProgram);
    gl.disable(gl.BLEND);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bgBuffer);
    gl.enableVertexAttribArray(this.aCompPos);
    gl.vertexAttribPointer(this.aCompPos, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTex);
    gl.uniform1i(this.compositeUniforms.uScene, 0);
    gl.uniform1f(this.compositeUniforms.uDispersion, this.quality.dispersion);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private drawBackground(time: number): void {
    const { gl } = this;
    gl.useProgram(this.bgProgram);
    gl.disable(gl.BLEND);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bgBuffer);
    gl.enableVertexAttribArray(this.aBgPos);
    gl.vertexAttribPointer(this.aBgPos, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(this.bgUniforms.uResolution, this.width, this.height);
    gl.uniform1f(this.bgUniforms.uTime, time);
    gl.uniform3fv(this.bgUniforms.uBgTop, this.bgTop);
    gl.uniform3fv(this.bgUniforms.uBgBottom, this.bgBottom);
    gl.uniform3fv(this.bgUniforms.uRayColor, this.bgRay);
    gl.uniform2fv(this.bgUniforms.uLightUv, this.bgLightUv);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private drawParticles(state: RenderState): void {
    const { gl } = this;

    // Built into pre-allocated scratch — this runs every frame (see mat4's note
    // on the `*Into` variants).
    const view = mat4.translationInto(
      this.viewMatrix,
      this.offsetX * this.radius,
      this.offsetY * this.radius,
      -this.cameraDistance,
    );
    const model = mat4.multiplyInto(
      this.modelMatrix,
      mat4.rotationXInto(this.rotX, state.pitch),
      mat4.rotationYInto(this.rotY, state.yaw),
    );
    const modelView = mat4.multiplyInto(this.modelView, view, model);
    const normalMatrix = this.normalMatrix;
    normalMatrix[0] = modelView[0];
    normalMatrix[1] = modelView[1];
    normalMatrix[2] = modelView[2];
    normalMatrix[3] = modelView[4];
    normalMatrix[4] = modelView[5];
    normalMatrix[5] = modelView[6];
    normalMatrix[6] = modelView[8];
    normalMatrix[7] = modelView[9];
    normalMatrix[8] = modelView[10];

    // Fixed key light to the LEFT of the head (left lit, right in shadow) — no
    // pointer tracking. Slightly elevated and in front for a side-lit face.
    const cx = this.offsetX * this.radius;
    const cy = this.offsetY * this.radius;
    const cz = -this.cameraDistance;
    // FRONT key light near the camera (slightly up-left) so the face surface is
    // lit and its features read, with gentle side-modelling.
    const lightPos = this.lightPos;
    lightPos[0] = cx - this.radius * 0.8;
    lightPos[1] = cy + this.radius * 0.7;
    lightPos[2] = cz + this.radius * 3.0;
    const lx = lightPos[0] - cx;
    const ly = lightPos[1] - cy;
    const lz = lightPos[2] - cz;
    const ll = Math.hypot(lx, ly, lz) || 1;
    const lightDir = this.lightDir;
    lightDir[0] = lx / ll;
    lightDir[1] = ly / ll;
    lightDir[2] = lz / ll;

    gl.useProgram(this.particleProgram);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // additive glow

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(this.aPosition);
    gl.vertexAttribPointer(this.aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.enableVertexAttribArray(this.aNormal);
    gl.vertexAttribPointer(this.aNormal, 3, gl.FLOAT, false, 0, 0);

    const u = this.pUniforms;
    gl.uniformMatrix4fv(u.uProjection, false, this.projection);
    gl.uniformMatrix4fv(u.uModelView, false, modelView);
    gl.uniformMatrix3fv(u.uNormalMatrix, false, normalMatrix);
    gl.uniform3fv(u.uLightPos, lightPos);
    gl.uniform3fv(u.uLightDir, lightDir);
    gl.uniform3fv(u.uColor, this.color);
    gl.uniform1f(u.uTime, state.time);
    gl.uniform1f(u.uRadius, this.radius);
    gl.uniform1f(
      u.uPointScale,
      this.quality.pointSizePx * this.dpr * this.cameraDistance,
    );
    gl.uniform1f(u.uAmbient, AMBIENT);
    gl.uniform1f(u.uDissolve, 1.0);
    gl.uniform1f(u.uFogNear, this.cameraDistance - this.radius);
    gl.uniform1f(u.uFogFar, this.cameraDistance + this.radius);
    gl.uniform1f(u.uFogMin, FOG_MIN);
    gl.uniform1f(u.uBurst, state.burst);
    gl.uniform2f(u.uCursor, state.pointer[0], state.pointer[1]);
    gl.uniform1f(u.uBurstRadius, BURST_RADIUS);
    gl.uniform1f(u.uAspect, this.width / this.height);
    gl.uniform1f(u.uReveal, state.reveal);

    // Draw the cloud twice: once as-is, once nudged along a hashed direction, so
    // the head reads as roughly double the particle count (finer, denser). The
    // mobile tier draws the base layer only — half the vertex work — and pays for
    // the lost density with a slightly larger sprite (quality.pointSizePx).
    gl.uniform1f(u.uJitter, 0.0);
    gl.drawArrays(gl.POINTS, 0, this.count);
    if (this.quality.doubleDraw) {
      gl.uniform1f(u.uJitter, 1.0);
      gl.drawArrays(gl.POINTS, 0, this.count);
    }
  }

  private drawRising(time: number, reveal: number): void {
    const { gl } = this;
    gl.useProgram(this.risingProgram);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // additive glow

    gl.bindBuffer(gl.ARRAY_BUFFER, this.risingBuffer);
    gl.enableVertexAttribArray(this.aSeed);
    gl.vertexAttribPointer(this.aSeed, 4, gl.FLOAT, false, 0, 0);

    const u = this.risingUniforms;
    gl.uniformMatrix4fv(u.uProjection, false, this.projection);
    gl.uniform3f(
      u.uCenter,
      this.offsetX * this.radius,
      this.offsetY * this.radius,
      -this.cameraDistance,
    );
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uRadius, this.radius);
    gl.uniform1f(
      u.uPointScale,
      this.quality.pointSizePx * 0.9 * this.dpr * this.cameraDistance,
    );
    gl.uniform3fv(u.uColor, this.color);
    gl.uniform1f(u.uReveal, reveal);

    gl.drawArrays(gl.POINTS, 0, this.quality.risingCount);
  }

  dispose(): void {
    const { gl } = this;
    gl.deleteBuffer(this.positionBuffer);
    gl.deleteBuffer(this.normalBuffer);
    gl.deleteBuffer(this.bgBuffer);
    gl.deleteBuffer(this.risingBuffer);
    gl.deleteProgram(this.particleProgram);
    gl.deleteProgram(this.bgProgram);
    gl.deleteProgram(this.risingProgram);
    if (this.compositeProgram) gl.deleteProgram(this.compositeProgram);
    if (this.sceneFbo) gl.deleteFramebuffer(this.sceneFbo);
    if (this.sceneTex) gl.deleteTexture(this.sceneTex);
    // Not calling WEBGL_lose_context — Strict-Mode remount reuses the <canvas>.
  }
}
