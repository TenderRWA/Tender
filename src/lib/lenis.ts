import Lenis from "lenis";

let lenis: Lenis | null = null;

export function initLenis(): Lenis {
  if (lenis) return lenis;
  lenis = new Lenis({ lerp: 0.1 });
  return lenis;
}

export function getLenis(): Lenis | null {
  return lenis;
}

/**
 * Scroll to an element/hash using Lenis with the fixed-header offset.
 * Retries briefly so cross-page links (e.g. /pricing#staker) still land once
 * the destination route has mounted its content.
 */
export function scrollToHash(hash: string, immediate = false, attempt = 0) {
  const target = hash.startsWith("#") ? hash : `#${hash}`;
  let el: Element | null = null;
  try {
    el = document.querySelector(target);
  } catch {
    return;
  }
  if (!el) {
    if (attempt < 20) {
      window.setTimeout(() => scrollToHash(hash, immediate, attempt + 1), 100);
    }
    return;
  }
  const el2 = el as HTMLElement;
  if (lenis) {
    lenis.scrollTo(el2, { offset: -80, duration: immediate ? 0 : 1.2 });
  } else {
    el2.scrollIntoView();
  }

  // The page can still be growing (images, WebGL, reveal animations), which
  // clamps the scroll short. Re-check and correct for a short window.
  if (attempt < 12) {
    window.setTimeout(
      () => {
        const top = el2.getBoundingClientRect().top;
        if (Math.abs(top - 80) > 8) scrollToHash(hash, true, attempt + 1);
      },
      immediate ? 220 : 1400
    );
  }
}


export function destroyLenis() {
  lenis?.destroy();
  lenis = null;
}
