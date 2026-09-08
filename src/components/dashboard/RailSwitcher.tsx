import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { RAILS, RAIL_IDS, useRailStore, type RailId } from "@/lib/rail";

/**
 * Switches the terminal between the Solana and Robinhood settlement rails.
 *
 * Changing the rail changes which API prefix every hook calls and which wallet
 * stack is live, so it sits next to the wallet button rather than inside a
 * settings page — it is closer to picking a network than to a preference.
 */
export default function RailSwitcher({ className = "" }: { className?: string }) {
  const activeRail = useRailStore((s) => s.activeRail);
  const setRail = useRailStore((s) => s.setRail);
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const active = RAILS[activeRail];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!popoverRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (rail: RailId) => {
    setRail(rail);
    setOpen(false);
  };

  return (
    <div ref={popoverRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Settlement rail: ${active.network}`}
        title={`Settling on ${active.network} · ${active.venueLabel}`}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-hairline px-3.5 font-mono text-[12px] tracking-[0.1em] text-ink/75 uppercase transition-colors duration-150 hover:border-red hover:text-ink"
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            activeRail === "robinhood" ? "bg-success" : "bg-warning"
          }`}
          aria-hidden
        />
        <span className="max-w-[12ch] truncate">{active.label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted2" />
      </button>

      {open && (
        <div
          data-lenis-prevent="true"
          className="menu-surface menu-enter absolute top-full right-0 z-[80] mt-2 w-72 rounded-2xl p-3"
        >
          <span className="block border-b border-hairline px-1 pb-2 font-mono text-[11px] tracking-[0.12em] text-secondary2 uppercase">
            Settlement rail
          </span>

          <div className="mt-2 flex flex-col gap-1">
            {RAIL_IDS.map((id) => {
              const rail = RAILS[id];
              const isActive = id === activeRail;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => choose(id)}
                  className={`flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? "border border-red/30 bg-red/12 text-ink"
                      : "border border-transparent text-secondary2 hover:bg-base hover:text-ink"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block font-mono text-xs font-semibold">{rail.network}</span>
                    <span className="mt-0.5 block font-mono text-[10px] tracking-[0.08em] text-muted2 uppercase">
                      {rail.venueLabel}
                    </span>
                  </span>
                  {isActive && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red" />}
                </button>
              );
            })}
          </div>

          <p className="mt-3 border-t border-hairline/60 pt-2.5 font-body text-[12px] leading-snug text-muted2">
            Switching rails changes the wallet you connect with and the registry your handle
            resolves against. Handles and elections do not carry across.
          </p>
        </div>
      )}
    </div>
  );
}
