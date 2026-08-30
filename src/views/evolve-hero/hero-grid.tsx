import { FADE_CONFIG, HERO_DELAY } from "./hero-motion";
import { useHeroStage } from "./hero-stage";
import { PlusMarker } from "./plus-marker";
import { Spring } from "./spring";

/** Eight-column rule grid — black hairlines on the white hero. */
const INNER_RULES = ["12.5%", "25%", "37.5%", "50%", "62.5%", "75%"] as const;

/** The 87.5% rule is interrupted by the CTA. */
const SPLIT_RULE_X = "87.5%";

/** The horizontal rule, as a share of the frame height. */
const HORIZONTAL_RULE_Y = "74.875%";

/** Crosshairs, each centred on a rule intersection. Order = reveal order. */
const MARKERS = [
  { x: "75%", y: "1.9375%" },
  { x: "37.5%", y: "11.6875%" },
  { x: SPLIT_RULE_X, y: "25.8125%" },
  { x: "25%", y: "50.9375%" },
  { x: "75%", y: "50.9375%" },
  { x: "12.5%", y: HORIZONTAL_RULE_Y },
  { x: SPLIT_RULE_X, y: HORIZONTAL_RULE_Y },
  { x: "25%", y: "99.3125%" },
] as const;

/**
 * Decorative rule grid + intersection markers behind the hero subject.
 * Lines are black at hairline strength so the white field keeps its structure.
 */
export const HeroGrid = () => {
  const { started } = useHeroStage();

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 max-xl:opacity-60 max-md:hidden"
    >
      <Spring
        tag="div"
        className="absolute inset-0"
        from={{ opacity: 0 }}
        to={{ opacity: 1 }}
        config={FADE_CONFIG}
        enabled={started}
        delayIn={HERO_DELAY.grid}
      >
        {/* Outer rules */}
        <span className="absolute inset-y-0 left-0 w-px bg-black/35" />
        <span className="absolute inset-y-0 right-0 w-px bg-black/35" />

        {/* Inner rules */}
        {INNER_RULES.map((x) => (
          <span
            key={x}
            className="absolute inset-y-0 w-px bg-black/25"
            style={{ left: x }}
          />
        ))}

        {/* Split rule around the CTA */}
        <span
          className="absolute top-0 h-[6.5rem] w-px bg-black/35"
          style={{ left: SPLIT_RULE_X }}
        />
        <span
          className="absolute top-[10.25rem] bottom-0 w-px bg-black/25"
          style={{ left: SPLIT_RULE_X }}
        />

        {/* Horizontal rule */}
        <span
          className="absolute inset-x-0 h-px bg-black/25"
          style={{ top: HORIZONTAL_RULE_Y }}
        />
      </Spring>

      {MARKERS.map((marker, index) => (
        <PlusMarker key={`${marker.x}-${marker.y}`} {...marker} index={index} />
      ))}
    </div>
  );
};
