
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type * as THREE from "three";

import { useIntroStore } from "../use-intro-store";

/** Full frames that must render AFTER compilation before the scene counts as
 *  ready — they run through the real composer chain at real resolution, so any
 *  lazily-allocated render target or first texture sample is touched while the
 *  preloader still owns the screen. */
const READY_FRAMES = 3;

/**
 * Compiles every reachable program (and uploads their textures) once the model
 * has loaded — while the preloader still owns the screen — so the frame loop
 * never compiles a shader mid-scene, which is the classic WebGL micro-freeze.
 *
 * Mounted INSIDE the model's <Suspense>, so by the time this runs every material
 * (figure, rings, debris, beam, backdrop, particles) is in the graph. Uses
 * `compileAsync` (yields to the main thread) where available.
 *
 * Once compilation resolves and READY_FRAMES more frames have rendered (the
 * FrameGate invalidates continuously, so frames flow during the loader), it
 * flips `sceneReady` — the signal the preloader waits for before revealing.
 */
export const Prewarm = () => {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const compiled = useRef(false);
  const framesAfterCompile = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const markCompiled = () => {
      if (!cancelled) compiled.current = true;
    };
    const renderer = gl as THREE.WebGLRenderer & {
      compileAsync?: (
        scene: THREE.Object3D,
        camera: THREE.Camera,
      ) => Promise<unknown>;
    };
    if (typeof renderer.compileAsync === "function") {
      // Resolve OR reject both mark compiled — a compile error must never
      // strand the preloader.
      void renderer.compileAsync(scene, camera).then(markCompiled, markCompiled);
    } else {
      renderer.compile(scene, camera);
      markCompiled();
    }
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera]);

  useFrame(() => {
    if (!compiled.current) return;
    if (useIntroStore.getState().sceneReady) return;
    framesAfterCompile.current += 1;
    if (framesAfterCompile.current >= READY_FRAMES) {
      useIntroStore.getState().setSceneReady();
    }
  });

  return null;
};
