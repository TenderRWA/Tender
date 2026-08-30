
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

import { subscribeToTicker } from "@/lib/animation/ticker";
import { frameBudgetMs, sceneShouldFreeze } from "./device";
import { subscribePointer } from "./pointer-state";
import { useIntroStore } from "../use-intro-store";

/** After the intro, keep drawing a short while so we freeze on a formed frame. */
const FREEZE_SETTLE_MS = 1400;

/**
 * Drives the (on-demand) render loop from the one app-wide ticker, throttled to
 * the device's frame budget (30fps mobile / 45 tablet / uncapped desktop). It
 * also gates on `document.hidden` (a background tab paints nothing) and, on
 * reduced-motion / energy-saver, stops after the intro settles — WebGL keeps the
 * last frame, so a frozen scene costs zero. The Canvas runs `frameloop="demand"`,
 * so nothing renders unless `invalidate()` is called here.
 */
export const FrameGate = () => {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const budget = frameBudgetMs();
    const freeze = sceneShouldFreeze();
    let frozen = false;
    let settleStart = 0;

    const unsubscribePointer = subscribePointer();
    const unsubscribeTicker = subscribeToTicker(
      () => {
        if (frozen) return;
        if (typeof document !== "undefined" && document.hidden) return;
        invalidate();

        if (freeze && useIntroStore.getState().started) {
          const now = performance.now();
          if (settleStart === 0) settleStart = now;
          else if (now - settleStart > FREEZE_SETTLE_MS) frozen = true;
        }
      },
      () => budget,
    );

    return () => {
      unsubscribeTicker();
      unsubscribePointer();
    };
  }, [invalidate]);

  return null;
};
