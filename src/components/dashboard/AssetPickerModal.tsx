import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Check, Sparkles, Globe } from "lucide-react";
import { getLenis } from "@/lib/lenis";
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
  const [activeTab, setActiveTab] = useState<"featured" | "all">("featured");
  const inputRef = useRef<HTMLInputElement>(null);

  // Load full asset catalog (714+ assets) from API
  const { data: assetData, isLoading } = useAssets({ limit: 1000 });

  // Featured list: Base currencies + Featured xStocks
  const featuredList = useMemo<SolanaTokenInfo[]>(() => {
    if (!assetData) return (initialAssets || []).slice(0, 10);
    const list = [
      ...(assetData.baseCurrencies || []),
      ...(assetData.featured || []),
    ];
    const seen = new Set<string>();
    return list.filter((item) => {
      if (!item?.mint || seen.has(item.mint)) return false;
      seen.add(item.mint);
      return true;
    });
  }, [assetData, initialAssets]);

  // All assets list: Base currencies + All 714+ xStocks
  const allAssets = useMemo<SolanaTokenInfo[]>(() => {
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

  // Filtered based on active tab and search query
  const displayedAssets = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    // If searching, search across the entire 714+ catalog so nothing is missed
    if (q) {
      return allAssets.filter(
        (a) =>
          a.symbol.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          (a.underlyingTicker && a.underlyingTicker.toLowerCase().includes(q)) ||
          a.mint.toLowerCase() === q
      );
    }

    // Otherwise, respect the active tab (default: featured)
    return activeTab === "featured" ? featuredList : allAssets;
  }, [searchTerm, activeTab, featuredList, allAssets]);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setActiveTab("featured"); // Default to featured as requested

      const lenis = getLenis();
      lenis?.stop();
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";

      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", onKey);
      setTimeout(() => inputRef.current?.focus(), 80);

      return () => {
        lenis?.start();
        document.body.style.overflow = "";
        document.body.style.touchAction = "";
        window.removeEventListener("keydown", onKey);
      };
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          data-lenis-prevent="true"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            data-lenis-prevent="true"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
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
                  {allAssets.length > 0
                    ? `${allAssets.length} Solana Tokenized Stocks & Base Currencies`
                    : "714+ Solana Tokenized Stocks & Base Currencies"}
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

            {/* Segmented Toggle: Featured (default) vs All Assets */}
            <div className="flex items-center justify-between gap-3 pt-4 pb-2">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-base/80 border border-hairline/80 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setActiveTab("featured")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === "featured"
                      ? "bg-card2 text-foreground font-semibold shadow-xs border border-hairline"
                      : "text-muted2 hover:text-foreground"
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Featured ({featuredList.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === "all"
                      ? "bg-card2 text-foreground font-semibold shadow-xs border border-hairline"
                      : "text-muted2 hover:text-foreground"
                  }`}
                >
                  <Globe className="w-3 h-3 text-secondary2" />
                  <span>All Assets ({allAssets.length})</span>
                </button>
              </div>

              {searchTerm.trim() && (
                <span className="font-mono text-[10px] text-muted2 uppercase tracking-wider">
                  Global Search
                </span>
              )}
            </div>

            {/* Search Input */}
            <div className="relative my-2">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted2" />
              <input
                ref={inputRef}
                type="text"
                placeholder={
                  activeTab === "featured"
                    ? "Search featured or type to search all 714+ assets..."
                    : "Search all 714+ assets by ticker or company name..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-hairline bg-base/80 pl-10 pr-4 py-2.5 font-mono text-xs text-foreground placeholder:text-muted2 outline-none focus:border-red focus:ring-1 focus:ring-red/30 transition-all"
              />
            </div>

            {/* Token List */}
            <div
              data-lenis-prevent="true"
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              className="flex-1 overflow-y-auto overscroll-contain space-y-1 pr-1 min-h-[220px] max-h-[360px] mt-2"
              style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}
            >
              {isLoading && allAssets.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-5 h-5 mx-auto border-2 border-hairline border-t-red rounded-full animate-spin" />
                  <p className="font-mono text-xs text-muted2">Loading asset registry…</p>
                </div>
              ) : displayedAssets.length === 0 ? (
                <div className="py-12 text-center font-mono text-xs text-muted2">
                  No assets match "{searchTerm}"
                </div>
              ) : (
                displayedAssets.map((token) => {
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

            {/* Modal Footer with total count & status */}
            <div className="pt-3 mt-2 border-t border-hairline flex items-center justify-between text-[11px] font-mono text-muted2">
              <span>
                Showing {displayedAssets.length} of {allAssets.length || 714} assets
              </span>
              <span className="capitalize">{activeTab} Mode</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
