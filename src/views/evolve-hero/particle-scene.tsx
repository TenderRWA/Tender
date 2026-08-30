"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

import { subscribeToTicker } from "../../lib/scene-evolve/ticker";
import { buildHeroCloud } from "../../lib/scene-evolve/build-hero-cloud";
import {
  MAX_PIXEL_RATIO,
  getSceneTier,
  hasFinePointer,
  sceneShouldFreeze,
} from "../../lib/scene-evolve/device";
import {
  HERO_CLOUD_FRAGMENT_SHADER,
  HERO_CLOUD_VERTEX_SHADER,
} from "../../lib/scene-evolve/hero-cloud.shaders";
import type { HeroSceneConfig } from "../../lib/scene-evolve/hero-scene.config";
import { createTemporalFilter } from "../../lib/scene-evolve/temporal-filter";

export interface ParticleSceneProps {
  /** URL of the vertex buffer (`{ objects: { <name>: { verts: number[] } } }`). */
  src: string;
  /** Live settings — every field applies without rebuilding geometry. */
  config: HeroSceneConfig;
  /** Fired once the first frame is on screen — the loading cover waits on it. */
  onReady?: () => void;
  /** Fired if the GPU drops the context, so the host can react. */
  onLost?: () => void;
  className?: string;
}

/**
 * Fraction of the **CSS** size the bloom chain runs at (§7).
 *
 * Read that again before changing it: the pass halves internally as well, and
 * the drawing buffer is another 1.5× on top, so the bright pass lands at about
 * a sixth of the buffer per axis. That is coarse enough to be a real part of
 * the artwork — it smears the glow into a haze covering **96%** of the frame,
 * which is the atmosphere behind the subject. Raising it to a quarter of the
 * buffer confines the glow to 71% of the frame and lifts the haze off the
 * composition entirely.
 *
 * It is also where the bloom flicker comes from, since a bright pass that
 * coarse point-samples 2px dots. That is dealt with in `temporal-filter.ts`
 * instead, which leaves the look alone.
 */
const BLOOM_RESOLUTION_SCALE = 0.5;

/**
 * Flicker control. Nothing below changes the artwork — colour, occlusion,
 * point size and bloom are all exactly as authored; what changes is *when* a
 * frame is drawn and how much of the last one it keeps. The two mechanisms and
 * the measurements behind them are documented in `temporal-filter.ts`; these
 * are the numbers the scene drives them with.
 */

/**
 * Per-frame subject motion, in CSS px, below which the frame is not redrawn.
 * An identical frame cannot flicker, and the parallax ease is asymptotic — it
 * would otherwise keep the cloud trembling below a pixel for the whole visit.
 */
const IDLE_MOTION_PX = 0.05;
/** Weight of the newest glow in the bloom layer's own, much heavier average. */
const GLOW_SMOOTHING = 0.15;
/** Weight of the newest frame when the subject is only drifting sub-pixel. */
const TEMPORAL_MIN_WEIGHT = 0.22;
/** Motion, in CSS px per frame, at which no history is mixed in at all. */
const TEMPORAL_FULL_MOTION_PX = 1.5;
/** Distance from the model centre used to turn a rotation into screen motion. */
const SUBJECT_RADIUS = 1;

/**
 * Fallback half-depth of the fade band, used only if the geometry somehow
 * arrives without a bounding sphere. The real one is the subject's own radius.
 */
const FALLBACK_SUBJECT_RADIUS = 1;

const readColor = (styles: CSSStyleDeclaration, token: string) =>
  new THREE.Color(styles.getPropertyValue(token).trim() || "#000000");

/** Imperative handles the config effect writes into after the build resolves. */
interface SceneHandle {
  applyConfig: (next: HeroSceneConfig) => void;
  resize: () => void;
  renderOnce: () => void;
}

/**
 * Point-cloud bust rendered with three.js.
 *
 * Follows the project's WebGL rules (obsidian/workflows/optimize-3d-scene.md):
 * renders from the shared app ticker rather than its own rAF (§4/§5), clamps
 * DPR on **both** renderer and composer per device tier (§6), strides the
 * point buffer instead of truncating it (§7), keeps the cursor repulsion, the
 * idle drift and the depth fade on the GPU (§9), prewarms before handing off
 * (§3), skips the cursor listener on touch (§11) and disposes everything on
 * unmount (§13).
 *
 * The loop is gated three ways: it stops when the section scrolls out of view,
 * when the tab is hidden, and it never starts at all under reduced motion —
 * which gets a single static frame instead.
 */
export const ParticleScene = ({
  src,
  config,
  onReady,
  onLost,
  className,
}: ParticleSceneProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<SceneHandle | null>(null);

  const onReadyRef = useRef(onReady);
  const onLostRef = useRef(onLost);
  const configRef = useRef(config);

  useEffect(() => {
    onReadyRef.current = onReady;
    onLostRef.current = onLost;
    configRef.current = config;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const tier = getSceneTier();
    const frozen = sceneShouldFreeze();
    let disposed = false;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        // The canvas is transparent so the rule grid can sit *behind* it and be
        // occluded by the subject. It clears to `--background` at alpha 0 and
        // the section paints that same colour underneath, so every pixel the
        // cloud does not cover looks exactly as it did when the canvas was
        // opaque. §7 would rather have `alpha: false`; this is the one thing it
        // buys that the flag cannot.
        alpha: true,
        // Nothing is stencilled, and asking a phone for the discrete GPU only
        // burns battery — the flag is a desktop-only request.
        stencil: false,
        powerPreference:
          tier.name === "desktop" ? "high-performance" : "default",
      });
    } catch {
      // No WebGL — `onReady` never fires, and the cover lifts on its failsafe.
      return;
    }

    const styles = getComputedStyle(document.documentElement);
    const palette = {
      key: readColor(styles, "--scene-key"),
      rim: readColor(styles, "--scene-rim"),
      fill: readColor(styles, "--scene-fill"),
    };

    renderer.setClearColor(readColor(styles, "--background"), 0);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      configRef.current.camera.fov,
      1,
      0.1,
      100,
    );
    const group = new THREE.Group();
    scene.add(group);

    const material = new THREE.ShaderMaterial({
      vertexShader: HERO_CLOUD_VERTEX_SHADER,
      fragmentShader: HERO_CLOUD_FRAGMENT_SHADER,
      uniforms: {
        uSize: { value: 1 },
        uScale: { value: 1 },
        uTime: { value: 0 },
        uCursor: { value: new THREE.Vector3() },
        uScatterRadius: { value: configRef.current.scatter.radius },
        uScatterForce: { value: 0 },
        uTurbulence: { value: configRef.current.scatter.turbulence },
        uDriftAmount: { value: 0 },
        uDriftSpeed: { value: configRef.current.drift.speed },
        uDepthNear: { value: 0 },
        uDepthFar: { value: 1 },
        uDepthStart: { value: configRef.current.depth.start },
        uDepthStrength: { value: 0 },
        uKeyColor: { value: new THREE.Color(configRef.current.colors.key) },
        uRimColor: { value: new THREE.Color(configRef.current.colors.rim) },
        uFillColor: { value: new THREE.Color(configRef.current.colors.fill) },
      },
      transparent: true,
      depthWrite: true,
    });

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      configRef.current.bloom.strength,
      configRef.current.bloom.radius,
      configRef.current.bloom.threshold,
    );
    composer.addPass(bloomPass);

    // Both temporal filters — the frame blend that steadies the points and the
    // separate, much heavier average over bloom's glow. See `temporal-filter`.
    const temporal = createTemporalFilter({
      bloomPass,
      glowWeight: GLOW_SMOOTHING,
    });
    for (const pass of temporal.passes) composer.addPass(pass);

    composer.addPass(new OutputPass());

    let geometry: THREE.BufferGeometry | null = null;
    let unsubscribe: (() => void) | null = null;
    let built = false;
    let onScreen = true;

    const pointer = { x: 0, y: 0 };
    const eased = { x: 0, y: 0 };
    const easedCursor = new THREE.Vector3();
    const worldCursor = new THREE.Vector3();
    const localCursor = new THREE.Vector3();
    let hovering = false;
    let scatterAmount = 0;

    /** The subject's own bounding sphere — the depth fade band is built on it. */
    const subjectCentre = new THREE.Vector3();
    const subjectWorldCentre = new THREE.Vector3();
    let subjectRadius = FALLBACK_SUBJECT_RADIUS;

    /** Seconds since the scene started — the drift's clock. */
    const started = performance.now();
    let elapsed = 0;

    /**
     * The authored composition, with the tier's framing laid over it. Desktop
     * has no framing entry, so it reads the config verbatim and stays exactly
     * as drawn.
     */
    const framing = () => {
      const { model, camera: cameraConfig } = configRef.current;
      const override = getSceneTier().framing;
      return {
        x: model.x,
        y: override ? override.modelY : model.y,
        z: model.z,
        scale: override ? override.modelScale : model.scale,
        distance: override ? override.cameraDistance : cameraConfig.distance,
      };
    };

    /**
      * §7. A bloom pass whose strength rounds to nothing still costs a
      * full-screen blur chain every frame, so it is switched off rather than
      * run empty. The composer itself always runs now — the temporal pair
      * lives in it, and two full-screen quads is not a chain worth bypassing.
      */
    const bloomContributes = () => {
      const { bloom } = configRef.current;
      return bloom.enabled && tier.allowBloom && bloom.strength > 0.001;
    };

    /** Whether a frame has been drawn that the next one can be blended against. */
    let hasHistory = false;

    /** A one-off frame — a resize, a panel edit — never blends with the past. */
    const renderOnce = () => {
      // Under reduced motion this is the *only* frame there will ever be and
      // `elapsed` never leaves 0, so every one-off render lands on the same
      // slice of the drift — a still, not a wander caught at an arbitrary
      // moment that shifts each time the panel is touched.
      material.uniforms.uTime.value = elapsed;
      temporal.invalidate();
      composer.render();
      hasHistory = true;
    };

    /** CSS px a world unit spans at the model's plane — the motion yardstick. */
    let pixelsPerWorldUnit = 1;

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      if (!clientWidth || !clientHeight) return;

      // The saved frames are about to be reallocated, so nothing may blend
      // against them until a fresh one has been drawn at the new size.
      hasHistory = false;
      temporal.invalidate();

      const pixelRatio = Math.min(
        window.devicePixelRatio,
        tier.maxPixelRatio,
        MAX_PIXEL_RATIO,
      );
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(clientWidth, clientHeight, false);

      // Clamping the renderer but not the composer throws the saving away (§6).
      composer.setPixelRatio(pixelRatio);
      composer.setSize(clientWidth, clientHeight);

      // §7. Bloom is a blur — it does not need the full buffer. Sized off the
      // CSS box on purpose (see the constant): this is the resolution the
      // scene's haze was authored at, not just a fill saving.
      bloomPass.setSize(
        clientWidth * BLOOM_RESOLUTION_SCALE,
        clientHeight * BLOOM_RESOLUTION_SCALE,
      );

      const { distance } = framing();
      camera.aspect = clientWidth / clientHeight;
      camera.position.z = distance;
      camera.updateProjectionMatrix();

      // Half the frustum height at the subject, turned into px per world unit,
      // so the frame loop can ask "how far did that actually move on screen?".
      const halfHeight =
        distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      pixelsPerWorldUnit = clientHeight / (2 * halfHeight);

      // three's own attenuation scale: half the drawing-buffer height. Solving
      // `gl_PointSize = uSize * uScale / z` at the camera distance lets `size`
      // stay authored in CSS px instead of world units.
      const scale = clientHeight * pixelRatio * 0.5;
      const { particles } = configRef.current;
      material.uniforms.uScale.value = scale;
      material.uniforms.uSize.value =
        (particles.size * tier.pointSizeScale * pixelRatio * distance) / scale;
    };

    /** Keeps parallax inside its authored swing wherever the pointer is. */
    const clampToUnit = (value: number) => Math.max(-1, Math.min(1, value));

    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      // The listener is on `window`, so the pointer can sit far outside the
      // canvas — unclamped that drives the yaw well past its configured
      // maximum and can swing the subject out of frame entirely.
      pointer.x = clampToUnit(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
      );
      pointer.y = clampToUnit(
        ((event.clientY - rect.top) / rect.height) * 2 - 1,
      );
      hovering =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
    };

    /** Ray from the camera through the cursor, met with the model's z-plane. */
    const projectCursor = (
      ndcX: number,
      ndcY: number,
      target: THREE.Vector3,
    ) => {
      target.set(ndcX, -ndcY, 0.5).unproject(camera).sub(camera.position);
      const t = (configRef.current.model.z - camera.position.z) / target.z;
      target.multiplyScalar(t).add(camera.position);
    };

    /**
     * Re-derives the depth-fade band from where the subject actually sits in
     * front of the lens.
     *
     * Anchored to the bounding **sphere**, which is the one measure of the
     * subject that a rotation cannot change — so `start` and `strength` mean
     * the same thing at every angle and it is always the far side that thins
     * out, which is the whole point of doing this in view space. Cheap enough
     * to run per frame: parallax rotates the group, and that moves the centre
     * whenever it is not exactly on the axis.
     */
    const updateDepthBand = () => {
      const { depth } = configRef.current;
      material.uniforms.uDepthStart.value = depth.start;
      material.uniforms.uDepthStrength.value = depth.enabled ? depth.strength : 0;
      if (!depth.enabled) return;

      group.updateMatrixWorld();
      subjectWorldCentre.copy(subjectCentre).applyMatrix4(group.matrixWorld);
      // The camera sits on +Z looking down it and is never rotated, so the
      // view-space depth of a point is just the gap along Z.
      const centreDepth = camera.position.z - subjectWorldCentre.z;
      const halfBand = subjectRadius * group.scale.x;
      material.uniforms.uDepthNear.value = centreDepth - halfBand;
      material.uniforms.uDepthFar.value = centreDepth + halfBand;
    };

    const applyConfig = (next: HeroSceneConfig) => {
      const place = framing();
      camera.fov = next.camera.fov;
      camera.position.z = place.distance;
      camera.updateProjectionMatrix();

      group.position.set(place.x, place.y, place.z);
      group.scale.setScalar(place.scale);
      group.rotation.set(
        THREE.MathUtils.degToRad(next.model.rotationX),
        THREE.MathUtils.degToRad(next.model.rotationY),
        THREE.MathUtils.degToRad(next.model.rotationZ),
      );

      bloomPass.strength = next.bloom.strength;
      bloomPass.radius = next.bloom.radius;
      bloomPass.threshold = next.bloom.threshold;
      bloomPass.enabled = bloomContributes();
      // No glow to separate out when bloom is not running — on the mobile tier
      // that is the whole chain, and it costs nothing there.
      temporal.setGlowEnabled(bloomPass.enabled);
      temporal.invalidate();

      material.uniforms.uScatterRadius.value = next.scatter.radius;
      material.uniforms.uTurbulence.value = next.scatter.turbulence;
      // Frozen scenes get no drift: a still that wanders is not a still.
      material.uniforms.uDriftAmount.value =
        next.drift.enabled && !frozen ? next.drift.amount : 0;
      material.uniforms.uDriftSpeed.value = next.drift.speed;
      updateDepthBand();

      material.uniforms.uKeyColor.value.set(next.colors.key);
      material.uniforms.uRimColor.value.set(next.colors.rim);
      material.uniforms.uFillColor.value.set(next.colors.fill);
    };

    /** The subject's state as of the last frame that was actually drawn. */
    const drawn = {
      pitch: 0,
      yaw: 0,
      force: 0,
      time: 0,
      cursor: new THREE.Vector3(),
    };

    const renderFrame = (time: number) => {
      const settings = configRef.current;
      const place = framing();

      elapsed = (time - started) / 1000;
      material.uniforms.uTime.value = elapsed;

      eased.x += (pointer.x - eased.x) * settings.parallax.ease;
      eased.y += (pointer.y - eased.y) * settings.parallax.ease;

      const pitch =
        THREE.MathUtils.degToRad(settings.model.rotationX) +
        eased.y * settings.parallax.pitch;
      const yaw =
        THREE.MathUtils.degToRad(settings.model.rotationY) +
        eased.x * settings.parallax.yaw;
      group.rotation.set(
        pitch,
        yaw,
        THREE.MathUtils.degToRad(settings.model.rotationZ),
      );

      const target = settings.scatter.enabled && hovering ? 1 : 0;
      scatterAmount += (target - scatterAmount) * settings.scatter.ease;

      let force = 0;
      if (scatterAmount > 0.001) {
        projectCursor(eased.x, eased.y, worldCursor);
        easedCursor.lerp(worldCursor, settings.scatter.ease);
        // The shader displaces in object space, and parallax rotates that
        // space, so the cursor has to be converted every frame.
        localCursor.copy(easedCursor);
        group.worldToLocal(localCursor);
        material.uniforms.uCursor.value.copy(localCursor);
        force = settings.scatter.force * scatterAmount;
        material.uniforms.uScatterForce.value = force;
      } else {
        material.uniforms.uScatterForce.value = 0;
        group.position.set(place.x, place.y, place.z);
      }

      // After the group is fully placed for this frame, so the band is built
      // on where the subject *is* rather than where it was last frame.
      updateDepthBand();

      // Measured against the last frame that was *drawn*, not the last frame
      // that was computed — otherwise a creep of a thousandth of a pixel per
      // frame would be thrown away a thousand times over and the subject would
      // silently drift out of the composition.
      const turned =
        (Math.abs(pitch - drawn.pitch) + Math.abs(yaw - drawn.yaw)) *
        SUBJECT_RADIUS;
      const pushed =
        Math.abs(force - drawn.force) +
        (force > 0 ? easedCursor.distanceTo(drawn.cursor) : 0);
      // Peak rate of the drift's own wander, scaled into the same world units
      // the other two are measured in. The points keep moving whether or not
      // anything else does, so this is what stops the idle skip below from
      // freezing the scene mid-drift.
      const drifting = material.uniforms.uDriftAmount.value > 0;
      const wandered = drifting
        ? settings.drift.amount *
          settings.drift.speed *
          place.scale *
          Math.max(0, elapsed - drawn.time)
        : 0;
      const motionPx = (turned + pushed + wandered) * pixelsPerWorldUnit;

      // Still — and an identical frame cannot flicker, so it is not drawn. The
      // parallax ease is asymptotic and would otherwise keep the cloud
      // trembling below a pixel for the rest of the visit. With the drift on
      // there is no such thing as an identical frame, and `wandered` above
      // accumulates until it clears the threshold — so the skip thins the
      // wander's framerate rather than stopping it.
      if (hasHistory && motionPx < IDLE_MOTION_PX) return;

      temporal.setFrameMix(
        hasHistory
          ? 1 -
              (TEMPORAL_MIN_WEIGHT +
                (1 - TEMPORAL_MIN_WEIGHT) *
                  THREE.MathUtils.smoothstep(
                    motionPx,
                    0,
                    TEMPORAL_FULL_MOTION_PX,
                  ))
          : 0,
      );
      composer.render();
      hasHistory = true;

      drawn.pitch = pitch;
      drawn.yaw = yaw;
      drawn.force = force;
      drawn.time = elapsed;
      drawn.cursor.copy(easedCursor);
    };

    /**
     * Under reduced motion the loop never starts — the scene is a still. Off
     * screen or in a hidden tab it stops, so scrolling past does not keep a
     * phone's GPU busy.
     */
    const startLoop = () => {
      if (unsubscribe || frozen || !built) return;
      if (!onScreen || document.hidden) return;
      unsubscribe = subscribeToTicker(renderFrame, () => tier.frameBudgetMs);
    };

    const stopLoop = () => {
      unsubscribe?.();
      unsubscribe = null;
    };

    const controller = new AbortController();
    const { signal } = controller;

    const build = async () => {
      const response = await fetch(src, { signal });
      // A miss is served the SPA shell, not a 404 body — without this the
      // failure surfaces as an opaque JSON parse error on an empty hero.
      if (!response.ok) {
        throw new Error(`${src} → ${response.status} ${response.statusText}`);
      }
      const payload: { objects: Record<string, { verts: number[] }> } =
        await response.json();
      if (disposed) return;

      const verts = Object.values(payload.objects)[0]?.verts;
      if (!verts) return;

      geometry = buildHeroCloud({
        verts,
        stride: tier.pointStride,
        ...palette,
      });
      // The depth fade's band is the subject's own extent, so it is read off
      // the geometry once rather than guessed at from the config.
      const bounds = geometry.boundingSphere;
      if (bounds) {
        subjectCentre.copy(bounds.center);
        subjectRadius = bounds.radius;
      }

      const points = new THREE.Points(geometry, material);
      // §9. Positions are computed in the vertex shader (the scatter), so the
      // bounding sphere is stale by construction and would cull wrongly.
      points.frustumCulled = false;
      group.add(points);

      handleRef.current = { applyConfig, resize, renderOnce };
      applyConfig(configRef.current);
      resize();


      // Prewarm: compile, upload and draw one frame *before* the cover lifts,
      // so nothing links mid-scroll (§3).
      renderer.compile(scene, camera);
      renderOnce();
      built = true;
      onReadyRef.current?.();

      startLoop();
    };

    void build().catch((error) => {
      if ((error as Error).name !== "AbortError") {
        console.error("[particle-scene] failed to build:", error);
      }
    });

    // A lost context leaves a blank canvas, and the host is told rather than
    // left showing a dead scene.
    renderer.domElement.addEventListener(
      "webglcontextlost",
      (event) => {
        event.preventDefault();
        stopLoop();
        built = false;
        // Every render target died with the context — the saved frames with them.
        hasHistory = false;
        temporal.invalidate();
        onLostRef.current?.();
      },
      { signal },
    );

    /**
      * §13. Touch browsers fire resize every time the URL bar collapses during
      * scroll, and handling it re-allocates the framebuffer mid-scroll, which
      * reads as a whole-scene flash. The canvas is sized once there and left
      * alone; only a device with a real pointer keeps a live observer.
      */
    const resizeObserver = hasFinePointer()
      ? new ResizeObserver(() => {
          resize();
          applyConfig(configRef.current);
          if (frozen || !unsubscribe) renderOnce();
        })
      : null;
    resizeObserver?.observe(container);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen) startLoop();
        else stopLoop();
      },
      // A little margin so the scene is already warm on arrival.
      { rootMargin: "20%" },
    );
    intersectionObserver.observe(container);

    document.addEventListener(
      "visibilitychange",
      () => (document.hidden ? stopLoop() : startLoop()),
      { signal },
    );

    if (hasFinePointer() && !frozen) {
      window.addEventListener("pointermove", handlePointerMove, {
        passive: true,
        signal,
      });
    }

    return () => {
      disposed = true;
      handleRef.current = null;
      controller.abort();
      stopLoop();
      resizeObserver?.disconnect();
      intersectionObserver.disconnect();
      geometry?.dispose();
      material.dispose();
      bloomPass.dispose();
      temporal.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // Rebuilding on a config change would re-fetch and re-shade the cloud —
    // live settings are applied by the effect below, which is why `config` is
    // read through a ref rather than listed here.
  }, [src]);

  // Live-apply settings to the already-built scene. It goes through the scene's
  // own `applyConfig` rather than repeating it: the passes that hang off bloom
  // have to be switched with it, and a second copy of that rule would drift.
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;

    handle.applyConfig(config);
    handle.resize();
    // Keeps the panel usable when the loop is parked (reduced motion, off screen).
    handle.renderOnce();
  }, [config]);

  return <div ref={containerRef} className={className} aria-hidden />;
};

export default ParticleScene;
