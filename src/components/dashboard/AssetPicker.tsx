import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useAssets } from "@/hooks/useTender";
import type { SolanaTokenInfo } from "@/types/tender";

/* Golden-section geometry. The panel is 336px wide and its full height is
   336 x 1.618 = 544px: a 60px search header over a 460px list viewport. At a
   44px row that is 10.5 rows, so the eleventh stays half-visible and the list
   reads as scrollable without needing a scrollbar to say so. */
const PANEL_W = 336;
const PANEL_H = 544;
const CHROME_H = 84; // search header + padding
const GAP = 8;
const EDGE = 12;

interface Anchor {
  left: number;
  top?: number;
  bottom?: number;
  listMax: number;
  placement: "top" | "bottom";
}

/** One row. Thirds across the width: symbol | name | underlying ticker. */
function Option({
  token,
  selected,
  active,
  onPick,
  registerRef,
}: {
  token: SolanaTokenInfo;
  selected: boolean;
  active: boolean;
  onPick: () => void;
  registerRef: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={registerRef}
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onPick}
      className={`group relative grid h-11 w-full grid-cols-[72px_1fr_auto] items-center gap-3 rounded-lg pr-2.5 pl-3 text-left transition-colors duration-100 ${
        active ? "bg-red/8" : "hover:bg-card2"
      }`}
    >
      {/* Selection rail: the only red in a resting row, so the eye lands once. */}
      <span
        aria-hidden
        className={`absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-full bg-red transition-opacity duration-150 ${
          selected ? "opacity-100" : "opacity-0"
        }`}
      />
      <span
        className={`truncate font-mono text-[13px] tracking-tight ${
          selected ? "font-medium text-red" : "text-ink"
        }`}
      >
        {token.symbol}
      </span>
      <span className="truncate font-body text-[13px] leading-none text-secondary2">
        {token.name}
      </span>
      <span className="font-mono text-[10px] tracking-[0.1em] text-muted2 uppercase tabular-nums">
        {token.underlyingTicker ?? (token.isBaseCurrency || token.isNative ? "BASE" : "")}
      </span>
    </button>
  );
}

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
  const [active, setActive] = useState(0);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const { data, isLoading, error } = useAssets({ q: query.trim(), limit: 24 });

  const trimmed = query.trim();
  const searching = trimmed.length > 0;

  /* Two ordered groups give the list a spine: the settlement currencies first,
     then the equities. A search collapses both into one ranked set. */
  const { base, equities, options } = useMemo(() => {
    const dedupe = (list: SolanaTokenInfo[]) => {
      const seen = new Set<string>();
      return list.filter((t) => {
        if (!t?.mint || seen.has(t.mint)) return false;
        seen.add(t.mint);
        return true;
      });
    };
    const q = trimmed.toLowerCase();
    const matches = (t: SolanaTokenInfo) =>
      !q ||
      t.symbol.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      (t.underlyingTicker ?? "").toLowerCase().includes(q);

    const b = dedupe(data?.baseCurrencies ?? []).filter(matches);
    const e = dedupe(searching ? (data?.assets ?? []) : (data?.featured ?? [])).filter(
      (t) => matches(t) && !b.some((x) => x.mint === t.mint),
    );
    return { base: b, equities: e, options: [...b, ...e] };
  }, [data, trimmed, searching]);

  /* Anchored in viewport space and rendered through a portal. That is the fix
     for the burial: the row is a transformed, backdrop-filtered element, so it
     opens a stacking context the panel could never climb out of with z-index. */
  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - GAP - EDGE;
    const above = r.top - GAP - EDGE;
    const placement: "top" | "bottom" =
      below >= Math.min(PANEL_H, 320) || below >= above ? "bottom" : "top";
    const height = Math.min(PANEL_H, placement === "bottom" ? below : above);
    const left = Math.min(Math.max(EDGE, r.left), window.innerWidth - PANEL_W - EDGE);

    setAnchor({
      left,
      top: placement === "bottom" ? r.bottom + GAP : undefined,
      bottom: placement === "top" ? window.innerHeight - r.top + GAP : undefined,
      listMax: Math.max(132, height - CHROME_H),
      placement,
    });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const reflow = () => place();
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", reflow);
    window.addEventListener("scroll", reflow, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", reflow);
      window.removeEventListener("scroll", reflow, true);
    };
  }, [open, place]);

  useEffect(() => setActive(0), [trimmed, open]);

  useEffect(() => {
    rowRefs.current[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const commit = (token: SolanaTokenInfo) => {
    onSelect(token);
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(Math.max(0, options.length - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const token = options[active];
      if (token) commit(token);
    }
  };

  let cursor = -1;
  const row = (token: SolanaTokenInfo) => {
    cursor += 1;
    const index = cursor;
    return (
      <Option
        key={token.mint}
        token={token}
        selected={token.symbol === value}
        active={index === active}
        onPick={() => commit(token)}
        registerRef={(el) => {
          rowRefs.current[index] = el;
        }}
      />
    );
  };

  const groupLabel = (text: string) => (
    <p className="px-3 pt-3 pb-1.5 font-mono text-[10px] tracking-[0.14em] text-muted2 uppercase first:pt-1">
      {text}
    </p>
  );

  const panel = anchor && (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={label}
      onKeyDown={onKeyDown}
      style={{
        position: "fixed",
        left: anchor.left,
        top: anchor.top,
        bottom: anchor.bottom,
        width: PANEL_W,
        maxWidth: `calc(100vw - ${EDGE * 2}px)`,
      }}
      className="menu-surface menu-enter z-[80] flex flex-col overflow-hidden rounded-2xl"
      data-placement={anchor.placement}
    >
      {/* Search: a 60px band with one job and nothing competing in it. */}
      <div className="flex h-[60px] shrink-0 items-center gap-2.5 border-b border-hairline px-4">
        <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4 shrink-0 text-muted2">
          <circle cx="7" cy="7" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M10.6 10.6 14 14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search symbol, name or ticker"
          aria-label="Search assets"
          className="w-full bg-transparent font-body text-[14px] leading-none text-ink placeholder:text-muted2 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="shrink-0 rounded-full px-2 py-1 font-mono text-[10px] tracking-[0.1em] text-muted2 uppercase transition-colors hover:text-ink"
          >
            Clear
          </button>
        )}
      </div>

      {/* List: scrolls on its own; the page behind it never moves. */}
      <div
        role="listbox"
        aria-label="Assets"
        data-lenis-prevent="true"
        style={{ maxHeight: anchor.listMax }}
        className="menu-scroll min-h-0 flex-1 overflow-y-auto p-1.5"
      >
        {isLoading && (
          <p className="px-3 py-6 text-center font-mono text-[10px] tracking-[0.14em] text-muted2 uppercase">
            Loading registry…
          </p>
        )}
        {error && (
          <p className="px-3 py-6 text-center font-mono text-[10px] tracking-[0.14em] text-red uppercase">
            {error.message}
          </p>
        )}
        {!isLoading && !error && options.length === 0 && (
          <div className="px-3 py-7 text-center">
            <p className="font-body text-[13px] text-secondary2">No asset matches “{trimmed}”.</p>
            <p className="mt-1.5 font-mono text-[10px] tracking-[0.14em] text-muted2 uppercase">
              Try a ticker — NVDA, AAPL, SPY
            </p>
          </div>
        )}

        {!isLoading && !error && searching && options.length > 0 && (
          <>
            {groupLabel(`${options.length} result${options.length === 1 ? "" : "s"}`)}
            {options.map(row)}
          </>
        )}

        {!isLoading && !error && !searching && (
          <>
            {base.length > 0 && groupLabel("Base currencies")}
            {base.map(row)}
            {equities.length > 0 && groupLabel("Tokenized equities")}
            {equities.map(row)}
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`glass-soft flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left font-mono text-sm transition-all duration-150 focus:border-red focus:ring-2 focus:ring-red/25 focus:outline-none ${
          open ? "border-red text-ink" : "text-foreground hover:border-red/40"
        }`}
      >
        <span className="truncate">{value || "Select asset"}</span>
        <svg
          viewBox="0 0 12 12"
          aria-hidden
          className={`h-3 w-3 shrink-0 text-muted2 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        >
          <path
            d="M2.5 4.5 6 8l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && typeof document !== "undefined" && createPortal(panel, document.body)}
    </>
  );
}
