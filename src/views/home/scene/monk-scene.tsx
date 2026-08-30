
import { Suspense, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  Noise,
  SMAA,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction, NoiseEffect } from "postprocessing";
import * as THREE from "three";

import { Backdrop } from "./backdrop";
import { CameraRig } from "./camera-rig";
import { ContentGroup } from "./content-group";
import { DebrisField } from "./debris-field";
import {
  MULTISAMPLING,
  clampedPixelRatio,
  deviceTier,
} from "./device";
import { DustParticles } from "./dust-particles";
import { FrameGate } from "./frame-gate";
import { LightRays } from "./light-rays";
import { Lighting } from "./lighting";
import {
  DispersionMaskRenderer,
  MaskedDispersion,
  type MaskedDispersionEffect,
} from "./masked-dispersion";
import { MonkModel } from "./monk-model";
import { Prewarm } from "./prewarm";
import { SceneControls } from "./scene-controls";
import { usePostStore } from "./post-store";
import { CAMERA, FOG, POST } from "./scene-config";

const IS_DEV = process.env.NODE_ENV === "development";

/**
 * Drives the film-grain opacity imperatively from the post store each frame.
 * Grain is the one post value tuned live, and subscribing to it at the <Canvas>
 * root would re-render the whole scene graph on every tweak — which trips r3f's
 * reconciler ("Converting circular structure to JSON"). Updating the effect's
 * blend opacity through a ref keeps the graph static, like every other control.
 */
const GrainControl = ({
  noiseRef,
}: {
  noiseRef: RefObject<NoiseEffect | null>;
}) => {
  useFrame(() => {
    const noise = noiseRef.current;
    if (noise) noise.blendMode.opacity.value = usePostStore.getState().grain;
  });
  return null;
};

/**
 * The full hero scene. Loaded as a client-only leaf via next/dynamic
 * (ssr:false) so `three` stays in its own chunk and never runs on the server —
 * see obsidian/workflows/optimize-3d-scene.md (rule 6 mapping).
 */
const MonkScene = () => {
  const dispersionRef = useRef<MaskedDispersionEffect | null>(null);
  const noiseRef = useRef<NoiseEffect | null>(null);
  // Tier once at construction — DPR, shadows, MSAA, bloom and the render budget
  // all read from it (optimize-3d-scene skill).
  const tier = useMemo(() => deviceTier(), []);
  const isDesktop = tier === "desktop";
  const bloomIntensity = POST.bloom.intensity * (tier === "mobile" ? 0.5 : 1);
  // The dispersion mask costs two extra scene passes per frame — on a phone
  // that's the two most expensive passes for a sub-pixel fringe. Mobile skips
  // the effect AND the mask renderer (decided at construction, never toggled).
  const dispersionOn = tier !== "mobile";
  // SMAA is the AA only where the composer has no MSAA (mobile). Stacking it on
  // top of MSAA was three redundant full-screen passes per frame.
  const smaaOn = MULTISAMPLING[tier] === 0;

  return (
    <Canvas
      // On-demand: nothing renders unless <FrameGate> invalidates, which it does
      // at the tier's frame budget and never while the tab is hidden.
      frameloop="demand"
      shadows={isDesktop}
      dpr={clampedPixelRatio(tier)}
      gl={{
        antialias: false, // DPR clamp + soft edges hide it; MSAA is via the composer
        alpha: false, // opaque canvas (paints its own background) → skip the page blend
        stencil: false,
        depth: true, // the dispersion/beam depth pre-passes need it
        powerPreference: isDesktop ? "high-performance" : "default",
      }}
      camera={{ position: [...CAMERA.position], fov: CAMERA.fov }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.98;
      }}
    >
      <color attach="background" args={[FOG.color]} />
      <fog attach="fog" args={[FOG.color, FOG.near, FOG.far]} />

      <FrameGate />
      <CameraRig />
      {IS_DEV && <SceneControls />}

      <Backdrop />

      <ContentGroup>
        <Lighting />
        <Suspense fallback={null}>
          <MonkModel />
          <DebrisField />
          <Prewarm />
        </Suspense>
      </ContentGroup>

      <LightRays />
      <DustParticles />

      {dispersionOn && <DispersionMaskRenderer effectRef={dispersionRef} />}
      <GrainControl noiseRef={noiseRef} />

      <EffectComposer multisampling={MULTISAMPLING[tier]}>
        {[
          // Dispersion runs BEFORE bloom, so the monk's bloom halo is computed
          // from the clean image and never picks up the rocks' RGB split.
          ...(dispersionOn
            ? [
                <MaskedDispersion
                  key="dispersion"
                  ref={dispersionRef}
                  strength={POST.dispersion.strength}
                />,
              ]
            : []),
          <Bloom
            key="bloom"
            intensity={bloomIntensity}
            luminanceThreshold={POST.bloom.luminanceThreshold}
            luminanceSmoothing={POST.bloom.luminanceSmoothing}
            mipmapBlur={POST.bloom.mipmapBlur}
          />,
          <Vignette
            key="vignette"
            offset={POST.vignette.offset}
            darkness={POST.vignette.darkness}
          />,
          <Noise
            key="noise"
            ref={noiseRef}
            opacity={POST.noise.opacity}
            blendFunction={BlendFunction.OVERLAY}
          />,
          ...(smaaOn ? [<SMAA key="smaa" />] : []),
        ]}
      </EffectComposer>
    </Canvas>
  );
};

export default MonkScene;
