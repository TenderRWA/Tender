import { animated, useSpring, useSprings } from "@react-spring/web";
import { useEffect, useState } from "react";

import { useNavigate } from "@/lib/router-compat";

import {
  CHEVRON_STAGGER,
  FADE_CONFIG,
  FADE_LIFT,
  HERO_DELAY,
  HOVER_CONFIG,
} from "./hero-motion";
import { useHeroStage } from "./hero-stage";
import { Spring } from "./spring";

/** Local x of each chevron in the button's own 0→204 coordinate space. */
const CHEVRON_OFFSETS = [0, 9, 18, 27, 36];
const CHEVRON_TRAVEL = 4;

const CHEVRON_PATH =
  "M138 34.1444L138.614 34.5L144 26.9725L138.614 19.5L138 19.8556L138 26.1513L138.818 26.9725L138 27.7937L138 34.1444Z";

/**
 * Primary call to action — hairline gradient frame, label and five chevrons,
 * all on the same red ramp. On hover a fill wipes in from the left and the
 * chevrons run a looping cascade. Below 768 it leaves the absolute frame and
 * joins the hero's flow column.
 */
export const HeroCta = ({ label, href }: { label: string; href: string }) => {
  const [hovered, setHovered] = useState(false);
  const { started } = useHeroStage();
  const navigate = useNavigate();

  const fill = useSpring({ scaleX: hovered ? 1 : 0, config: HOVER_CONFIG });

  const [chevrons, chevronApi] = useSprings(CHEVRON_OFFSETS.length, () => ({
    x: 0,
    config: HOVER_CONFIG,
  }));

  useEffect(() => {
    if (!hovered) {
      chevronApi.stop(true);
      chevronApi.start({ to: { x: 0 }, config: HOVER_CONFIG });
      return;
    }

    chevronApi.start((index) => ({
      from: { x: 0 },
      to: { x: CHEVRON_TRAVEL },
      delay: index * CHEVRON_STAGGER,
      loop: { reverse: true },
      config: HOVER_CONFIG,
    }));
  }, [hovered, chevronApi]);

  return (
    <Spring
      tag="div"
      className="absolute top-[6.5rem] right-[2.5rem]
                 max-md:static max-md:order-2 max-md:mt-6"
      from={{ opacity: 0, transform: `translateY(-${FADE_LIFT})` }}
      to={{ opacity: 1, transform: "translateY(0rem)" }}
      config={FADE_CONFIG}
      enabled={started}
      delayIn={HERO_DELAY.cta}
    >
      <button
        type="button"
        onClick={() => navigate(href)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="gradient-frame relative isolate flex h-[3.375rem] w-[12.75rem]
                   cursor-pointer items-center overflow-hidden max-md:h-[48px]
                   max-md:w-full focus-visible:outline-2
                   focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <animated.span
          aria-hidden
          className="absolute inset-0 origin-left bg-[image:var(--gradient-accent)] opacity-[0.14]"
          style={{ transform: fill.scaleX.to((value) => `scaleX(${value})`) }}
        />

        <span
          className="relative z-10 bg-[image:var(--gradient-accent)] bg-clip-text pl-[1.5rem]
                     font-hero text-[1rem] leading-[1.4] font-medium tracking-[0.015em]
                     text-transparent uppercase"
          style={{
            backgroundSize: "12.75rem 100%",
            backgroundPosition: "-1.5rem 0",
          }}
        >
          {label}
        </span>

        <svg
          aria-hidden
          viewBox="138 19.5 42 15"
          className="absolute left-[8.625rem] z-10 h-[0.9375rem] w-[2.625rem]"
        >
          <defs>
            <linearGradient
              id="hero-cta-chevrons"
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="27"
              x2="204"
              y2="27"
            >
              <stop stopColor="var(--accent-start)" />
              <stop offset="0.45" stopColor="var(--accent-middle)" />
              <stop offset="1" stopColor="var(--accent-end)" />
            </linearGradient>
          </defs>
          {chevrons.map((spring, index) => (
            <animated.path
              key={CHEVRON_OFFSETS[index]}
              d={CHEVRON_PATH}
              fill="url(#hero-cta-chevrons)"
              transform={spring.x.to(
                (value) => `translate(${CHEVRON_OFFSETS[index] + value} 0)`,
              )}
            />
          ))}
        </svg>
      </button>
    </Spring>
  );
};
