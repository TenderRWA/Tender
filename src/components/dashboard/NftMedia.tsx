import { useEffect, useState } from "react";
import { ExternalLink, ImageOff } from "lucide-react";

import { solscanTokenUrl, truncateMint } from "@/hooks/useTender";
import type { NftMetadata } from "@/types/tender";

/**
 * Shared presentation for collectibles.
 *
 * Collectibles are a different asset class from the fungible flow, so they get
 * their own accent: solid ink rather than the red used for elected assets. The
 * palette has no violet, and inventing one for a single badge would cost more
 * than it explains.
 *
 * Every remote image here is untrusted third-party media (Arweave, IPFS,
 * arbitrary issuer hosts), so each one is loaded with a referrer-free request
 * and a real fallback: a broken URI degrades to a monogram, never to a gap.
 */

const SIZES = {
  sm: { box: "h-9 w-9 rounded-lg", text: "text-[11px]", icon: "h-3.5 w-3.5" },
  md: { box: "h-14 w-14 rounded-xl", text: "text-sm", icon: "h-4 w-4" },
  lg: { box: "h-20 w-20 rounded-2xl", text: "text-lg", icon: "h-5 w-5" },
  xl: { box: "aspect-square w-full rounded-xl", text: "text-2xl", icon: "h-6 w-6" },
} as const;

export type NftThumbSize = keyof typeof SIZES;

/** First letters of the collectible's name, for the no-image fallback. */
function monogram(name?: string) {
  const clean = (name ?? "").replace(/[^A-Za-z0-9 ]/g, " ").trim();
  if (!clean) return "";
  const parts = clean.split(/\s+/).filter((p) => !/^\d+$/.test(p));
  const source = parts.length ? parts : clean.split(/\s+/);
  return source
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function NftThumb({
  nft,
  size = "md",
  className = "",
}: {
  nft: Pick<NftMetadata, "name" | "image" | "symbol">;
  size?: NftThumbSize;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const s = SIZES[size];

  // A row can be re-used for a different collectible as the queue refreshes.
  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [nft.image]);

  const label = monogram(nft.name) || nft.symbol?.slice(0, 2).toUpperCase() || "";

  return (
    <span
      className={`relative block shrink-0 overflow-hidden border border-hairline bg-raised ${s.box} ${className}`}
      aria-hidden
    >
      {nft.image && !failed ? (
        <>
          {!loaded && <span className="absolute inset-0 animate-pulse bg-hairline/70" />}
          <img
            src={nft.image}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`h-full w-full object-cover transition-opacity duration-300 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        </>
      ) : (
        <span className="flex h-full w-full items-center justify-center text-muted2">
          {label ? (
            <span className={`font-mono font-semibold tracking-tight text-secondary2 ${s.text}`}>
              {label}
            </span>
          ) : (
            <ImageOff className={s.icon} />
          )}
        </span>
      )}
    </span>
  );
}

/** Apple-grade purple/violet asset-class marker for digital collectibles. */
export function NftBadge({
  label = "1 NFT",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] whitespace-nowrap text-purple-700 dark:text-purple-300 ${className}`}
    >
      <span className="text-[11px] leading-none" aria-hidden>
        🖼️
      </span>
      <span>{label}</span>
    </span>
  );
}

/** Mint address as a Solscan link. Mono, so it reads as an identifier. */
export function MintLink({
  mint,
  className = "",
  head,
  tail,
}: {
  mint: string;
  className?: string;
  head?: number;
  tail?: number;
}) {
  return (
    <a
      href={solscanTokenUrl(mint)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={mint}
      className={`inline-flex items-center gap-1 font-mono text-[10px] text-muted2 transition-colors hover:text-foreground ${className}`}
    >
      <span>{truncateMint(mint, head, tail)}</span>
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

/**
 * Identity block for a collectible: thumbnail, name, and mint link.
 * Used by the pending row, the sign modal and the composer preview so the
 * same asset looks the same everywhere it appears.
 */
export function NftIdentity({
  nft,
  size = "md",
  className = "",
}: {
  nft: Pick<NftMetadata, "mint" | "name" | "image" | "symbol">;
  size?: NftThumbSize;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      <NftThumb nft={nft} size={size} />
      <div className="min-w-0">
        <span className="block truncate font-body text-sm font-semibold text-foreground">
          {nft.name || "Unnamed collectible"}
        </span>
        <div className="mt-0.5 flex items-center gap-2">
          {nft.symbol && (
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted2">
              {nft.symbol}
            </span>
          )}
          <MintLink mint={nft.mint} />
        </div>
      </div>
    </div>
  );
}

/**
 * The rule that makes collectibles different, stated once and reused.
 * Shown wherever a user is about to move one.
 */
export function SovereignDeliveryNote({ handle }: { handle?: string }) {
  const target = handle ? `@${handle.replace(/^@/, "")}` : "the recipient tag";
  return (
    <div className="rounded-xl border border-hairline bg-base/70 px-4 py-3">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-ink">
        Sovereign direct delivery
      </span>
      <p className="font-body text-xs leading-relaxed text-secondary2">
        Transferred 1:1 into {target}&apos;s wallet. No DEX selling, no election slicing — the
        collectible is never routed through an order book.
      </p>
    </div>
  );
}
