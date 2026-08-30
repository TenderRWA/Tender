import { lazy, Suspense, useEffect, useState } from "react";

/** Served from `public/` — see the note in `SiteBackground`. */
const WAVES_VIDEO_SRC = "/waves.mp4";
const WAVES_POSTER_SRC = "/waves-poster.jpg";

const HeadParticles = lazy(() =>
  import("./HeadParticles").then((m) => ({ default: m.HeadParticles }))
);

import { HEAD_MANIFEST, HEAD_POINTS_URL } from "./manifest";

/**
 * Client-only wrapper for the point-cloud head. Mounted after hydration so the
 * WebGL chunk (renderer + shaders + decoder) never runs during SSR.
 *
 * The canvas is CSS-inverted: the scene is authored as white points over a
 * near-black backdrop, so inverted it becomes a black/grey figure on white -
 * matching the rest of the site.
 */
export default function HeroHeadScene() {
  const [mounted, setMounted] = useState(false);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    setMounted(true);
    setNarrow(window.innerWidth < 768);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-0 overflow-clip bg-white [mask-image:linear-gradient(to_bottom,#000_0%,#000_74%,rgba(0,0,0,0.6)_90%,transparent_100%)]"
    >
      {/* Glass-waves film behind the figure, blended into the white stage. */}
      {mounted ? (
        <video
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.1] mix-blend-multiply blur-[1px] [filter:hue-rotate(291deg)_saturate(1.5)_contrast(1.05)] [mask-image:linear-gradient(to_bottom,#000_0%,#000_62%,transparent_100%)] motion-reduce:hidden"
          src={WAVES_VIDEO_SRC}
          poster={WAVES_POSTER_SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      ) : null}
      {/* Soft grey gradient wash behind the figure */}
      <div className="absolute inset-0 bg-[radial-gradient(60rem_40rem_at_50%_38%,rgba(0,0,0,0.07),transparent_70%),radial-gradient(40rem_28rem_at_82%_78%,rgba(0,0,0,0.05),transparent_70%),linear-gradient(to_bottom,rgba(0,0,0,0.05),transparent_22%)]" />
      {mounted ? (
        <Suspense fallback={null}>
          <div
            className={
              narrow
                ? "absolute left-1/2 top-[16%] h-[48vh] w-[min(120vh,900px)] max-w-none -translate-x-1/2 [mask-image:linear-gradient(to_bottom,#000_0%,#000_62%,transparent_100%)] [filter:invert(1)] [-webkit-filter:invert(1)]"
                : "absolute left-1/2 top-1/2 h-[min(88vh,780px)] w-[min(150vh,1300px)] max-w-none -translate-x-1/2 -translate-y-1/2 [mask-image:radial-gradient(closest-side,#000_72%,transparent_100%)] [filter:invert(1)] [-webkit-filter:invert(1)]"
            }
          >
          <HeadParticles
            manifest={HEAD_MANIFEST}
            bufferUrl={HEAD_POINTS_URL}
            fill={narrow ? 1.25 : 0.95}
            offsetY={narrow ? 0.04 : 0.0}
          />
          </div>
        </Suspense>
      ) : null}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[62%] bg-[linear-gradient(to_top,rgba(255,255,255,0)_0%,rgba(255,255,255,0.75)_38%,rgba(255,255,255,0.35)_70%,rgba(255,255,255,0)_100%)] lg:hidden" />
    </div>
  );
}
