import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Owns the loading stage for the hero: every animated leaf holds at its
 * `from` state until the point cloud's first frame is on screen (or the
 * failsafe trips), so the entrance timeline is never spent behind nothing.
 * Unlike the source, no cover is painted — the site navbar must stay visible
 * and interactive the whole time.
 */
interface HeroStageValue {
  started: boolean;
  reportSceneReady: () => void;
}

const HeroStageContext = createContext<HeroStageValue>({
  started: true,
  reportSceneReady: () => {},
});

export const useHeroStage = () => useContext(HeroStageContext);

/** Longest the entrance may be held back waiting on the scene. */
const MAX_WAIT_MS = 2600;

export const HeroStage = ({ children }: { children: ReactNode }) => {
  const [started, setStarted] = useState(false);
  const ready = useRef(false);

  const reportSceneReady = useCallback(() => {
    if (ready.current) return;
    ready.current = true;
    setStarted(true);
  }, []);

  useEffect(() => {
    const failsafe = window.setTimeout(() => setStarted(true), MAX_WAIT_MS);
    return () => clearTimeout(failsafe);
  }, []);

  const value = useMemo(
    () => ({ started, reportSceneReady }),
    [started, reportSceneReady],
  );

  return (
    <HeroStageContext.Provider value={value}>
      {children}
    </HeroStageContext.Provider>
  );
};
