import { animated, useSpring } from "@react-spring/web";
import {
  forwardRef,
  useRef,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";

/**
 * Minimal declarative spring — the subset of the source project's `Spring`
 * the hero actually uses: fade/lift on mount, gated by `enabled`, with
 * reduced-motion flipping straight to the end state.
 */
export interface SpringProps {
  tag?: string;
  children?: ReactNode;
  enabled?: boolean;
  from?: Record<string, unknown>;
  to?: Record<string, unknown>;
  config?: Record<string, unknown>;
  delayIn?: number;
  className?: string;
  style?: CSSProperties;
}

export const Spring = forwardRef<HTMLElement, SpringProps>(
  (
    {
      tag = "div",
      children,
      from = {},
      to = {},
      config = {},
      delayIn = 0,
      enabled = true,
      className,
      style,
    },
    ref,
  ) => {
    const reduced = useRef(
      typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    );

    const springs = useSpring({
      from,
      to: enabled ? to : from,
      config,
      delay: enabled ? delayIn : 0,
      immediate: reduced.current,
    });

    const Tag = (animated as unknown as Record<string, unknown>)[
      tag
    ] as ComponentType<{
      ref?: Ref<HTMLElement>;
      className?: string;
      style?: CSSProperties;
      children?: ReactNode;
    }>;

    return (
      <Tag ref={ref} className={className} style={{ ...style, ...springs }}>
        {children}
      </Tag>
    );
  },
);
Spring.displayName = "Spring";
