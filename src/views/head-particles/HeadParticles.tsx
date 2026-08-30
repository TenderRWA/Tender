/**
 * HeadParticles — the decorative WebGL scene behind the hero: a 3D head point
 * cloud (front-lit face, real PCA normals) over a navy god-ray background, with
 * a dark-side upward particle flow, rising embers, and chromatic dispersion. It
 * fills its positioned parent (`absolute inset-0`) and is `aria-hidden` — the
 * hero's real text/headings live in the overlay above it.
 *
 * A client leaf (WebGL + pointer + rAF) kept out of the Server-Component view.
 * The loop runs on the shared app ticker (ADR-0016); a first frame is drawn
 * imperatively so the scene appears without waiting on rAF. In dev a `window.__hp`
 * hook renders on demand and POSTs PNGs to /api/debug-capture.
 *
 * How heavy the scene is allowed to be — and whether the pointer drives it at
 * all — comes from the `SceneQuality` tier resolved at mount (`scene-quality.ts`,
 * ADR-0021). On a coarse pointer the parallax/burst listeners are never attached:
 * there is no cursor to follow, only drags to misread.
 */

import { useEffect, useRef, useState } from "react";

import { subscribeToTicker } from "@/lib/animation/ticker";
import { usePointCloud } from "@/hooks/use-point-cloud";
import type { PointCloudManifest } from "@/types/particles";

import { resolveSceneQuality } from "./scene-quality";
import { ParticleRenderer } from "./webgl-renderer";

export interface HeadParticlesProps {
  /** Inline point-cloud manifest. */
  manifest: PointCloudManifest;
  /** URL of the binary point buffer. */
  bufferUrl: string;
  /** Optional extra classes for the canvas. */
  className?: string;
  /** Camera framing margin — larger = smaller head in frame. */
  fill?: number;
  /** Vertical offset of the head in view space. */
  offsetY?: number;
}

const DEBUG = false;
export const HERO_INTRO_DELAY_MS = 300;

// Fixed base orientation; the head only turns slightly with the pointer.
const BASE_YAW = -2.088;
const BASE_PITCH = 0.05;
const POINTER_PARALLAX = 0.22;
const PITCH_RANGE = 0.12;
const POINTER_EASE = 0.06;
const BURST_EASE = 0.12; // how fast the hover burst ramps in/out
const SETTLE_EPSILON = 0.0002;
// Sci-fi intro: how long the bottom→top scan takes to fully materialise the head.
const INTRO_MS = 3000;
/** How long to keep drawing after the intro settles, before the freeze path
 *  (reduced motion / energy saver) stops the loop on a fully-formed frame. */
const FREEZE_SETTLE_MS = 600;

type Rgb = [number, number, number];

const parseColor = (value: string): Rgb | null => {
  const v = value.trim();
  const hex = v.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const nums = v.match(/-?\d+(?:\.\d+)?/g);
  if (nums && nums.length >= 3)
    return [Number(nums[0]) / 255, Number(nums[1]) / 255, Number(nums[2]) / 255];
  return null;
};

const readColor = (el: Element, prop: string, fallback: Rgb): Rgb =>
  parseColor(getComputedStyle(el).getPropertyValue(prop)) ?? fallback;

export const HeadParticles = ({
  manifest,
  bufferUrl,
  className,
  fill = 0.82,
  offsetY = 0.02,
}: HeadParticlesProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ParticleRenderer | null>(null);
  const drawRef = useRef<() => void>(() => {});
  const needsRenderRef = useRef(true);
  // Timestamp (performance.now ms) when the intro scan started — set once the
  // head geometry is available so the reveal begins as the head appears.
  const introStartRef = useRef<number | null>(null);
  // Mount time, so the scan can be scheduled relative to the preloader handoff.
  const mountTimeRef = useRef(0);
  const [rendererReady, setRendererReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const { status, data, error } = usePointCloud(manifest, bufferUrl);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const quality = resolveSceneQuality();

    let renderer: ParticleRenderer;
    try {
      renderer = new ParticleRenderer(canvas, quality);
    } catch (err) {
      setInitError(err instanceof Error ? err.message : "WebGL unavailable");
      return;
    }
    rendererRef.current = renderer;
    renderer.setTransform(0, offsetY, fill);
    // The canvas is CSS-inverted by the hero: authored black background reads
    // as the site's white, and the cyan points below read as TENDER red.
    // Authored as the complement of TENDER red (#e8322a) — the canvas is
    // CSS-inverted, so these cyan points display as the site's red.
    renderer.setColor([0.09, 0.8, 0.84]);
    renderer.setBackground({
      top: [0.0, 0.0, 0.0],
      bottom: [0.0, 0.0, 0.0],
      ray: [0.09, 0.62, 0.66],
      lightUv: [0.54, 0.74],
    });

    const dpr = quality.dpr;
    let appliedW = 0;
    let appliedH = 0;
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let burst = 0;
    let pointerInside = false;
    let elapsed = 0;
    let lastFrameMs = performance.now();
    const start = performance.now();
    mountTimeRef.current = start;

    // Re-sizing the drawing buffer re-allocates the framebuffer (and the
    // dispersion target), which mid-scroll on iOS reads as a whole-scene flash —
    // and iOS changes the viewport every time the URL bar collapses. So on touch
    // the surface is sized once and kept: the canvas is `h-lvh`, the *large*
    // viewport, so that first size already covers the screen in both URL-bar
    // states. Desktop keeps following its box.
    const syncSize = (): boolean => {
      if (appliedW > 0 && !quality.resize) return false;
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (cw > 0 && ch > 0 && (cw !== appliedW || ch !== appliedH)) {
        renderer.resize(cw, ch, dpr);
        appliedW = cw;
        appliedH = ch;
        return true;
      }
      return false;
    };
    const hasSize = (): boolean => appliedW > 0 && appliedH > 0;

    // Render-on-demand gate. A hidden tab paints nothing (rAF is already paused,
    // but a `visibilitychange` can land mid-frame), and a canvas scrolled out of
    // view is pure waste — the observer keeps a viewport of margin so the scene is
    // already warm when it arrives back.
    let onScreen = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen) needsRenderRef.current = true;
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(canvas);
    const isVisible = (): boolean => onScreen && !document.hidden;

    // Reduced-motion + intro-reveal state (declared before the first draw so the
    // imperative frame can already ask for the current reveal value).
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motionQuery.matches;
    const smooth01 = (t: number): number => {
      const c = t < 0 ? 0 : t > 1 ? 1 : t;
      // easeOutCubic: starts at full speed (the reveal begins promptly, not after
      // a slow ramp) and reaches zero velocity at the end (settles without a snap).
      const inv = 1 - c;
      return 1 - inv * inv * inv;
    };
    // 0 = head hidden, 1 = fully materialised. Jumps to 1 under reduced motion.
    const computeReveal = (nowMs: number): number => {
      if (reduced) return 1;
      const startedAt = introStartRef.current;
      return startedAt === null ? 0 : smooth01((nowMs - startedAt) / INTRO_MS);
    };

    const renderAt = (time: number, burstVal: number, reveal: number): void => {
      if (!hasSize()) return;
      const yaw = BASE_YAW + curX * POINTER_PARALLAX;
      const pitch = BASE_PITCH + curY * PITCH_RANGE;
      renderer.render({ time, yaw, pitch, pointer: [curX, curY], burst: burstVal, reveal });
    };
    const draw = (): void => {
      syncSize();
      renderAt(elapsed, burst, computeReveal(performance.now()));
    };
    drawRef.current = draw;
    draw();

    const onPointerMove = (event: PointerEvent): void => {
      const rect = canvas.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      targetY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      pointerInside = true;
      needsRenderRef.current = true;
    };
    const onPointerLeave = (): void => {
      targetX = 0;
      targetY = 0;
      pointerInside = false;
      needsRenderRef.current = true;
    };
    // Listen on the window so the pointer still drives the scene through the
    // overlaid hero content (which sits above the canvas). Skipped entirely on a
    // coarse pointer: with no cursor the head just stays at its base pose.
    if (quality.pointer) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.addEventListener("pointerleave", onPointerLeave, {
        passive: true,
      });
    }

    // Freeze bookkeeping (see the end of `frame`).
    let frozen = false;
    let settleStart = 0;

    const onMotionChange = (): void => {
      reduced = motionQuery.matches;
      needsRenderRef.current = true;
    };
    motionQuery.addEventListener("change", onMotionChange);

    const onVisibility = (): void => {
      if (!document.hidden) needsRenderRef.current = true;
    };
    document.addEventListener("visibilitychange", onVisibility);

    const frame = (time: number): void => {
      if (frozen || !isVisible()) return;
      if (syncSize()) needsRenderRef.current = true;

      // Accumulated from a *clamped* delta, not `time - start`: coming back from a
      // hidden tab (or a long stall) would otherwise hand the shader a multi-second
      // jump and teleport every particle mid-drift.
      const dt = Math.min(0.05, Math.max(0, (time - lastFrameMs) / 1000));
      lastFrameMs = time;
      if (!reduced) {
        elapsed += dt; // animate shimmer + rays continuously
        needsRenderRef.current = true;
      }

      if (quality.pointer) {
        const nextX = curX + (targetX - curX) * POINTER_EASE;
        const nextY = curY + (targetY - curY) * POINTER_EASE;
        if (Math.abs(nextX - curX) > SETTLE_EPSILON) needsRenderRef.current = true;
        if (Math.abs(nextY - curY) > SETTLE_EPSILON) needsRenderRef.current = true;
        curX = nextX;
        curY = nextY;

        const bt = pointerInside ? 1 : 0;
        const nextBurst = burst + (bt - burst) * BURST_EASE;
        if (Math.abs(nextBurst - burst) > SETTLE_EPSILON)
          needsRenderRef.current = true;
        burst = nextBurst;
      }

      const reveal = computeReveal(time);
      if (reveal < 1) needsRenderRef.current = true; // keep animating the intro

      if (!needsRenderRef.current) return;
      needsRenderRef.current = false;
      renderAt(elapsed, burst, reveal);

      // Reduced-motion / energy-saver path: once the intro has fully materialised,
      // stop drawing. WebGL keeps the last frame on the canvas, so the head stays
      // on screen at zero cost — the continuous loop is exactly what drags a
      // constrained phone down.
      if (quality.freeze && reveal >= 1) {
        if (settleStart === 0) settleStart = time;
        else if (time - settleStart > FREEZE_SETTLE_MS) frozen = true;
      }
    };
    const unsubscribe = subscribeToTicker(frame, () => quality.frameBudgetMs);
    setRendererReady(true);

    if (DEBUG) {
      const debug = {
        frame: (
          time = 0,
          px = 0,
          py = 0,
          burstOverride?: number,
          revealOverride = 1,
        ): string => {
          syncSize();
          curX = px;
          curY = py;
          burst = burstOverride ?? 1;
          renderAt(time, burst, revealOverride);
          return canvas.toDataURL("image/png");
        },
        pose: (yaw = 0, pitch = 0, time = 0): string => {
          syncSize();
          renderer.render({ time, yaw, pitch, pointer: [0, 0], burst: 0, reveal: 1 });
          return canvas.toDataURL("image/png");
        },
        capture: async (name = "capture", time = 0, px = 0, py = 0) => {
          const dataUrl = debug.frame(time, px, py);
          const res = await fetch("/api/debug-capture", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ dataUrl, name }),
          });
          return res.json();
        },
      };
      (window as unknown as { __hp?: typeof debug }).__hp = debug;
    }

    return () => {
      unsubscribe();
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      motionQuery.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibility);
      renderer.dispose();
      rendererRef.current = null;
      drawRef.current = () => {};
      if (DEBUG) delete (window as unknown as { __hp?: unknown }).__hp;
      setRendererReady(false);
    };
  }, []);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !rendererReady || status !== "ready" || !data) return;
    renderer.setGeometry(data);
    // Compile/link/allocate everything *now*, while the preloader curtain is
    // still up — a program finalised or a render target allocated on a frame the
    // visitor can see is a micro-freeze.
    renderer.prewarm();
    // Begin the scan when the preloader curtain starts lifting (mount + handoff
    // delay), or as soon as the geometry is ready if that lands later — never
    // while the curtain still covers the head.
    if (introStartRef.current === null)
      introStartRef.current = Math.max(
        mountTimeRef.current + HERO_INTRO_DELAY_MS,
        performance.now(),
      );
    needsRenderRef.current = true;
    drawRef.current();
  }, [rendererReady, status, data]);

  const failed = status === "error" || initError !== null;

  return (
    <>
      {/* `h-lvh`, not `h-full`: sized against the *large* viewport so a phone's
          collapsing URL bar never changes the box (the scene doesn't re-size on
          touch — see `syncSize`). `transform-gpu backface-hidden` promotes it to
          its own compositor layer; without that, a neighbouring fixed element
          repainting invalidates the WebGL composite on WebKit and the whole scene
          flickers. */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 block h-full w-full transform-gpu ${className ?? ""}`}
        style={{ backfaceVisibility: "hidden" }}
      />
      {failed ? <span className="sr-only">{initError ?? error?.message}</span> : null}
    </>
  );
};
