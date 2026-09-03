import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Check } from "lucide-react";
import { useAssets } from "@/hooks/useTender";
import type { SolanaTokenInfo } from "@/types/tender";

export interface AssetPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: SolanaTokenInfo) => void;
  currentSymbol?: string;
  initialAssets?: SolanaTokenInfo[];
}

export default function AssetPickerModal({
  isOpen,
  onClose,
  onSelect,
  currentSymbol,
  initialAssets,
}: AssetPickerModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Load all 714+ assets from catalog (not just featured!)
  const { data: assetData, isLoading } = useAssets({ limit: 1000 });

  const allAssets = useMemo<SolanaTokenInfo[]>(() => {
    if (initialAssets && initialAssets.length > 10) return initialAssets;
    if (!assetData) return initialAssets || [];

    const merged = [
      ...(assetData.baseCurrencies || []),
      ...(assetData.assets || assetData.featured || []),
    ];

    const seen = new Set<string>();
    return merged.filter((item) => {
      if (!item?.mint || seen.has(item.mint)) return false;
      seen.add(item.mint);
      return true;
    });
  }, [assetData, initialAssets]);

  const filteredAssets = useMemo(() => {
    if (!searchTerm.trim()) return allAssets;
    const q = searchTerm.toLowerCase().trim();
    return allAssets.filter(
      (a) =>
        a.symbol.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        (a.underlyingTicker && a.underlyingTicker.toLowerCase().includes(q)) ||
        a.mint.toLowerCase() === q
    );
  }, [allAssets, searchTerm]);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      document.body.style.overflow = "hidden";
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", onKey);
      setTimeout(() => inputRef.current?.focus(), 80);

      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", onKey);
      };
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-hairline bg-card2 p-6 shadow-2xl glass flex flex-col max-h-[85vh]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-hairline/80">
              <div>
                <h3 className="font-display text-lg font-medium text-foreground">
                  Select Receive Asset
                </h3>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2 mt-0.5">
                  714+ Solana Tokenized Stocks & Base Currencies
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 font-mono text-xs text-muted2 hover:bg-base hover:text-foreground transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative my-4">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted2" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search by symbol, company, or ticker (e.g. AAPL, NVDA, S&P 500)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-hairline bg-base/80 pl-10 pr-4 py-2.5 font-mono text-xs text-foreground placeholder:text-muted2 outline-none focus:border-red focus:ring-1 focus:ring-red/30 transition-all"
              />
            </div>

            {/* Token List */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain space-y-1 pr-1 min-h-[220px] max-h-[380px]"
              style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}
            >
              {isLoading && allAssets.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-5 h-5 mx-auto border-2 border-hairline border-t-red rounded-full animate-spin" />
                  <p className="font-mono text-xs text-muted2">Loading full 714+ token catalog…</p>
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="py-12 text-center font-mono text-xs text-muted2">
                  No assets match "{searchTerm}"
                </div>
              ) : (
                filteredAssets.map((token) => {
                  const isSelected = token.symbol === currentSymbol;
                  return (
                    <button
                      key={token.mint || token.symbol}
                      type="button"
                      onClick={() => {
                        onSelect(token);
                        onClose();
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 transition-all text-left group ${
                        isSelected
                          ? "bg-red/10 border border-red/30 text-foreground"
                          : "hover:bg-base/70 border border-transparent text-secondary2 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {token.iconUrl ? (
                          <img
                            src={token.iconUrl}
                            alt={token.symbol}
                            className="w-7 h-7 rounded-full object-cover shrink-0 border border-hairline"
                            onError={(e) => {
                              // Fallback if image fails to load
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-base border border-hairline flex items-center justify-center font-mono text-[10px] font-semibold text-foreground shrink-0">
                            {token.symbol.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-foreground">
                              {token.symbol}
                            </span>
                            {token.underlyingTicker && (
                              <span className="font-mono text-[9px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded bg-base border border-hairline text-muted2">
                                {token.underlyingTicker}
                              </span>
                            )}
                            {token.isBaseCurrency && (
                              <span className="font-mono text-[9px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                BASE
                              </span>
                            )}
                          </div>
                          <p className="font-body text-xs text-muted2 truncate max-w-[280px]">
                            {token.name}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="w-4 h-4 text-red shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Modal Footer with total count */}
            <div className="pt-3 mt-2 border-t border-hairline flex items-center justify-between text-[11px] font-mono text-muted2">
              <span>{allAssets.length} total available assets</span>
              <span>Atomic settlement</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
