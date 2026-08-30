
import { create } from "zustand";

/**
 * Coordinates the intro.
 *
 * `sceneReady` — flipped by the scene's Prewarm once every shader program is
 * compiled, every texture uploaded, AND a few full frames have actually been
 * rendered through the composer. The preloader holds its counter at 99% until
 * this is true, so the reveal can never uncover an unrendered (black) canvas.
 *
 * `started` — flipped by the preloader once its black cover has filled the
 * screen; the scene + every hero element keys its enter animation off it.
 */
interface IntroStore {
  started: boolean;
  sceneReady: boolean;
  start: () => void;
  setSceneReady: () => void;
}

export const useIntroStore = create<IntroStore>((set) => ({
  started: false,
  sceneReady: false,
  start: () => set({ started: true }),
  setSceneReady: () => set({ sceneReady: true }),
}));
