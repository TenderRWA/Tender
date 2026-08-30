import { useEffect, useRef, useState } from "react";
import wavesVideo from "@/assets/waves.mp4.asset.json";
import wavesPoster from "@/assets/waves-poster.jpg.asset.json";

/**
 * Site-wide ambient background: the looping "glass waves" film, hue-shifted
 * from its original lime into the TENDER red / white palette and held at a low
 * opacity so it blends under every page without fighting the content.
 */
export default function SiteBackground() {
  const [mounted, setMounted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const play = () => {
      void v.play().catch(() => {});
    };
    play();
    document.addEventListener("visibilitychange", play);
    return () => document.removeEventListener("visibilitychange", play);
  }, [mounted]);

  return (
    <div aria-hidden="true" className="fixed inset-0 z-0 overflow-hidden bg-base pointer-events-none">
      {mounted ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover opacity-[0.34] [filter:hue-rotate(291deg)_saturate(1.5)_contrast(1.05)] motion-reduce:hidden"
          src={wavesVideo.url}
          poster={wavesPoster.url}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      ) : null}
      {/* Soft white wash so text keeps full contrast over the film. */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.72),rgba(255,255,255,0.6)_45%,rgba(255,255,255,0.74))]" />
    </div>
  );
}
