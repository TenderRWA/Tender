import { FADE_CONFIG, HERO_DELAY, MARKER_STAGGER } from "./hero-motion";
import { useHeroStage } from "./hero-stage";
import { Spring } from "./spring";

export interface PlusMarkerProps {
  x: string;
  y: string;
  index: number;
}

/** The 11×11 crosshair dropped at grid intersections, drawing itself in. */
export const PlusMarker = ({ x, y, index }: PlusMarkerProps) => {
  const { started } = useHeroStage();

  return (
    <span
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: x, top: y, width: "0.6875rem", height: "0.6875rem" }}
    >
      <Spring
        tag="span"
        className="block size-full origin-center"
        from={{ opacity: 0, transform: "scale(0) rotate(-45deg)" }}
        to={{ opacity: 1, transform: "scale(1) rotate(0deg)" }}
        config={FADE_CONFIG}
        enabled={started}
        delayIn={HERO_DELAY.grid + index * MARKER_STAGGER}
      >
        <svg
          aria-hidden
          viewBox="0 0 11 11"
          className="block size-full text-black/40"
        >
          <path d="M6 5H11V6H6V11H5V6H0V5H5V0H6V5Z" fill="currentColor" />
        </svg>
      </Spring>
    </span>
  );
};
