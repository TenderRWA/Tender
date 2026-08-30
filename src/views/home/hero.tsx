import { Suspense, lazy, useEffect, useState } from "react";

import { useIntroStore } from "./use-intro-store";

// Client-only leaf: keeps `three` out of the SSR bundle and in its own chunk.
const MonkScene = lazy(() => import("./scene/monk-scene"));

/**
 * Full-bleed WebGL backdrop (ported from the Lumea monk scene). Mounted only
 * after hydration — three.js and its loaders must never run during SSR.
 */
export const HeroScene = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // No preloader in this app: the intro is considered started immediately so
    // the scene's frame gate and enter animations behave as intended.
    useIntroStore.getState().start();
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 transform-gpu [backface-visibility:hidden] will-change-transform">
      <Suspense fallback={null}>
        <MonkScene />
      </Suspense>
    </div>
  );
};

export default HeroScene;
