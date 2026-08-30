import { lazy, Suspense, useEffect, useState } from "react";

import {
  DEFAULT_HERO_SCENE_CONFIG,
  type HeroSceneConfig,
} from "../../lib/scene-evolve/hero-scene.config";
import verticesAsset from "../../assets/evolve-vertices.json.asset.json";
import { FADE_CONFIG, HERO_DELAY, VISUAL_CONFIG } from "./hero-motion";
import { useHeroStage } from "./hero-stage";
import { Spring } from "./spring";

/** Keeps `three` out of the initial bundle and off the server. */
const ParticleScene = lazy(() =>
  import("./particle-scene").then((module) => ({
    default: module.ParticleScene,
  })),
);

/**
 * The hero subject: the evolve point-cloud human bust, shaded in TENDER red
 * and grey over the white field. Two nested springs — the subject fades in
 * on the shared curve, then settles out of a 1.06 oversize over 2.5s.
 */
export const EvolveVisual = () => {
  const [mounted, setMounted] = useState(false);
  const { started, reportSceneReady } = useHeroStage();
  const [config] = useState<HeroSceneConfig>(DEFAULT_HERO_SCENE_CONFIG);

  useEffect(() => setMounted(true), []);

  return (
    <Spring
      tag="div"
      className="absolute inset-x-0 top-0 h-full"
      from={{ opacity: 0 }}
      to={{ opacity: 1 }}
      config={FADE_CONFIG}
      enabled={started}
      delayIn={HERO_DELAY.visual}
    >
      <Spring
        tag="div"
        className="absolute inset-0 origin-center"
        from={{ transform: "scale(1.06)" }}
        to={{ transform: "scale(1)" }}
        config={VISUAL_CONFIG}
        enabled={started}
        delayIn={HERO_DELAY.visual}
      >
        {mounted && (
          <Suspense fallback={null}>
            <ParticleScene
              src={verticesAsset.url}
              config={config}
              onReady={reportSceneReady}
              className="absolute inset-0 transform-gpu backface-hidden will-change-transform"
            />
          </Suspense>
        )}
      </Spring>
    </Spring>
  );
};
