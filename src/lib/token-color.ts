/**
 * Dynamic token color extraction & canonical brand color registry.
 * Provides a hybrid resolution:
 * 1. Canonical Brand Hex map for popular equities & base currencies.
 * 2. Canvas dominant color extractor for any CDN image.
 * 3. Deterministic HSL symbol hash fallback.
 */

const CANONICAL_BRAND_COLORS: Record<string, string> = {
  SPYX: "#E8322A",
  USDC: "#2775CA",
  GLDX: "#D4AF37",
  ZJGLDX: "#D4AF37",
  NVDAX: "#76B900",
  TSLAX: "#E82127",
  AAPLX: "#8E8E93",
  QQQX: "#005FB8",
  MSFTX: "#00A4EF",
  AMZNX: "#FF9900",
  GOOGLX: "#4285F4",
  METAX: "#0668E1",
  COINX: "#0052FF",
  PLTRX: "#4A5568",
  AMDX: "#ED1C24",
  NFLXX: "#E50914",
  SOL: "#9945FF",
  WSOL: "#9945FF",
  INTCX: "#0071C5",
  DISX: "#113CCF",
  PYPLX: "#003087",
  SPOTX: "#1DB954",
  SHOPX: "#96BF48",
  ABNBX: "#FF5A5F",
  VISAX: "#1A1F71",
  MAX: "#EB001B",
  JPMX: "#0A2540",
};

const COLOR_CACHE = new Map<string, string>();

/** Deterministic vibrant HSL color from token symbol hash */
export function hashColorFromSymbol(symbol: string): string {
  const upper = (symbol || "").toUpperCase();
  if (CANONICAL_BRAND_COLORS[upper]) {
    return CANONICAL_BRAND_COLORS[upper];
  }

  let hash = 0;
  for (let i = 0; i < upper.length; i++) {
    hash = (hash << 5) - hash + upper.charCodeAt(i);
    hash |= 0;
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 68%, 46%)`;
}

/** Converts RGB to Hex string */
function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** Extracts the dominant vibrant color from an image URL via HTML5 Canvas */
export async function extractDominantColorFromImage(
  imageUrl: string,
  symbolFallback: string
): Promise<string> {
  const upper = (symbolFallback || "").toUpperCase();
  if (CANONICAL_BRAND_COLORS[upper]) {
    return CANONICAL_BRAND_COLORS[upper];
  }

  if (COLOR_CACHE.has(imageUrl)) {
    return COLOR_CACHE.get(imageUrl)!;
  }

  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(hashColorFromSymbol(symbolFallback));
      return;
    }

    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          const fallback = hashColorFromSymbol(symbolFallback);
          COLOR_CACHE.set(imageUrl, fallback);
          resolve(fallback);
          return;
        }

        const size = 16;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imgData = ctx.getImageData(0, 0, size, size).data;
        let rTotal = 0;
        let gTotal = 0;
        let bTotal = 0;
        let count = 0;

        let bestVibrantHex = "";
        let maxSaturation = 0;

        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          // Ignore transparent or nearly transparent pixels
          if (a < 128) continue;

          // Ignore pure white, black, or flat grayscale backgrounds
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          const lightness = (max + min) / 2;

          if (lightness > 240 || lightness < 15) continue; // too light or dark

          const saturation = max === 0 ? 0 : delta / max;

          if (saturation > maxSaturation && delta > 20) {
            maxSaturation = saturation;
            bestVibrantHex = rgbToHex(r, g, b);
          }

          rTotal += r;
          gTotal += g;
          bTotal += b;
          count++;
        }

        let resultHex: string;
        if (bestVibrantHex) {
          resultHex = bestVibrantHex;
        } else if (count > 0) {
          resultHex = rgbToHex(
            Math.round(rTotal / count),
            Math.round(gTotal / count),
            Math.round(bTotal / count)
          );
        } else {
          resultHex = hashColorFromSymbol(symbolFallback);
        }

        COLOR_CACHE.set(imageUrl, resultHex);
        resolve(resultHex);
      } catch (e) {
        const fallback = hashColorFromSymbol(symbolFallback);
        COLOR_CACHE.set(imageUrl, fallback);
        resolve(fallback);
      }
    };

    img.onerror = () => {
      const fallback = hashColorFromSymbol(symbolFallback);
      COLOR_CACHE.set(imageUrl, fallback);
      resolve(fallback);
    };

    img.src = imageUrl;
  });
}

/** Synchronous initial color getter (canonical map or hash fallback) */
export function getInitialTokenColor(symbol: string): string {
  const upper = (symbol || "").toUpperCase();
  return CANONICAL_BRAND_COLORS[upper] || hashColorFromSymbol(symbol);
}
