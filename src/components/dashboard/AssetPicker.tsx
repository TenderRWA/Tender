import { useEffect, useMemo, useRef, useState } from "react";

import { useAssets } from "@/hooks/useTender";
import type { SolanaTokenInfo } from "@/types/tender";

/** Searchable picker over the live TENDER asset registry (base currencies + xStocks). */
export default function AssetPicker({
  value,
  onSelect,
  label,
}: {
  value: string;
  onSelect: (token: SolanaTokenInfo) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useAssets({ q: query.trim(), limit: 12 });

  const options = useMemo(() => {
    if (!data) return [];
    const merged = [
      ...(data.baseCurrencies ?? []),
      ...(query.trim() ? (data.assets ?? []) : (data.featured ?? [])),
    ];
    const seen = new Set<string>();
    return merged.filter((token) => {
      if (!token?.mint || seen.has(token.mint)) return false;
      seen.add(token.mint);
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (
        token.symbol.toLowerCase().includes(q) ||
        token.name.toLowerCase().includes(q) ||
        (token.underlyingTicker ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        aria-expanded={open}
        className="w-full glass-soft rounded-xl px-3 py-2.5 font-mono text-sm text-foreground text-left focus:outline-none focus:border-red focus:ring-2 focus:ring-red/25 transition-all duration-150"
      >
        {value || "Select asset"}
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-[260px] max-w-[80vw] glass rounded-xl p-2 shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 714 assets…"
            className="w-full glass-soft rounded-lg px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted2 focus:outline-none focus:border-red"
            aria-label="Search assets"
          />
          <div className="mt-2 max-h-64 overflow-y-auto">
            {isLoading && (
              <p className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                Loading registry…
              </p>
            )}
            {error && (
              <p className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-red">
                {error.message}
              </p>
            )}
            {!isLoading && !error && options.length === 0 && (
              <p className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                No matches
              </p>
            )}
            {options.map((token) => (
              <button
                key={token.mint}
                type="button"
                onClick={() => {
                  onSelect(token);
                  setOpen(false);
                  setQuery("");
                }}
                className="w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-raised transition-colors duration-100"
              >
                <span className="font-mono text-xs text-foreground">{token.symbol}</span>
                <span className="font-body text-[11px] text-muted2 truncate max-w-[150px]">
                  {token.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
