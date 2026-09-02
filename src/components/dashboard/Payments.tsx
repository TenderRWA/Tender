import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

import ModulePage from "@/components/dashboard/ModulePage";
import DashTable, { DashRow, DashCell, StatusPill } from "@/components/dashboard/DashTable";
import { useAssets, useElectionQuote, useSettlePortfolio, useSettlementHistory } from "@/hooks/useTender";
import type { SettlementLegResult } from "@/hooks/useTender";
import { useWallet } from "@/lib/wallet/wallet-context";
import { ExternalLink } from "lucide-react";

const inputCls =
  "w-full glass-soft rounded-xl px-4 py-3 font-body text-sm text-foreground placeholder:text-muted2 focus:outline-none focus:border-red focus:ring-2 focus:ring-red/25 transition-all duration-150";

/** Keeps the live quote from firing on every keystroke. */
function useDebounced<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Formats technical API and DEX error strings into clean, user-friendly language. */
function formatDisplayError(raw: string): string {
  if (!raw) return "";
  const low = raw.toLowerCase();

  if (
    low.includes("not tradable") ||
    low.includes("token_not_tradable") ||
    low.includes("no routes found") ||
    low.includes("no_swap_routes_found")
  ) {
    const symbolMatch = raw.match(/([A-Za-z0-9_]{2,10}x?)\b.*?(?:not tradable|no routes)/i);
    const token = symbolMatch ? symbolMatch[1] : "one of the elected assets";
    return `${token} currently has no active liquidity on Solana DEX order books. Please update the handle's election to liquid assets (e.g. NVDAx, SPYx, USDC).`;
  }

  if (low.includes("rate limit") || low.includes("429") || low.includes("too many requests")) {
    return "Market order book rate limit reached. Please wait a few seconds and try again.";
  }

  if (low.includes("insufficient") || low.includes("liquidity")) {
    return "Insufficient market depth on Solana DEXes to settle this amount.";
  }

  if (low.includes("slippage")) {
    return "Price impact exceeds slippage bounds. Try settling a smaller amount.";
  }

  const clean = raw
    .replace(/\{[^{}]*\}/g, "")
    .replace(/\b(?:400|404|500)\b/g, "")
    .replace(/Jupiter quote failed:?/gi, "")
    .replace(/Relay quote failed:?/gi, "")
    .replace(/Portfolio election quote failed:?/gi, "")
    .trim();

  return clean || "Unable to complete quote routing for this portfolio allocation.";
}

/** Animated red check shown after a payment settles. */
function SettledCheck() {
  const reduce = useReducedMotion();
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className="w-4 h-4 shrink-0"
      initial={reduce ? false : { scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 18 }}
      aria-hidden
    >
      <circle cx="12" cy="12" r="11" className="fill-red" />
      <motion.path
        d="M7 12.5l3.2 3.2L17 9"
        fill="none"
        className="stroke-white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
      />
    </motion.svg>
  );
}

interface SettlementRecord extends SettlementLegResult {
  handle: string;
  at: string;
}

export default function Payments() {
  const { address: wallet } = useWallet();
  const { data: assets } = useAssets({ featured: true });
  const payTokens = (assets?.baseCurrencies ?? []).map((t) => t.symbol);

  const [handle, setHandle] = useState("");
  const [token, setToken] = useState("USDC");
  const [amount, setAmount] = useState("1000");
  const [log, setLog] = useState<SettlementRecord[]>([]);

  const debouncedHandle = useDebounced(handle);
  const debouncedAmount = useDebounced(amount);

  const quote = useElectionQuote({
    recipientHandle: debouncedHandle.trim().length > 1 ? debouncedHandle : undefined,
    fromSymbolOrMint: token,
    amountIn: debouncedAmount,
    userWallet: wallet || undefined,
  });

  const settle = useSettlePortfolio();
  const { data: historyData } = useSettlementHistory({ wallet });

  const parsed = Number(amount);
  const ready = Boolean(quote.data) && Number.isFinite(parsed) && parsed > 0 && Boolean(wallet);

  const send = () => {
    if (!ready || !quote.data || settle.isPending) return;
    if (!wallet) return;
    settle.mutate(
      { quote: quote.data, userWallet: wallet, recipientHandle: handle },
      {
        onSuccess: (res) => {
          const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const entries: SettlementRecord[] = res.legs.map((leg) => ({
            ...leg,
            handle: handle.trim().replace(/^@/, ""),
            at: now,
          }));
          setLog((prev) => [...entries, ...prev]);
        },
      },
    );
  };

  const legs = quote.data?.portfolioResult.legs ?? [];

  // Merge session receipts with verified on-chain history from PostgreSQL
  const allReceipts = useMemo(() => {
    const combined: Array<{
      id: string;
      handle: string;
      symbol: string;
      signature?: string;
      status: "confirmed" | "skipped";
      time: string;
    }> = [];

    for (const item of log) {
      combined.push({
        id: `session-${item.signature || Math.random()}`,
        handle: item.handle,
        symbol: item.symbol,
        signature: item.signature,
        status: item.signature ? "confirmed" : "skipped",
        time: item.at,
      });
    }

    if (historyData?.settlements) {
      for (const item of historyData.settlements) {
        if (!combined.some((c) => c.signature && c.signature === item.signature)) {
          const symbol = item.outputBreakdown?.[0]?.symbol || "RWA";
          combined.push({
            id: String(item.id),
            handle: item.recipientHandle || "receiver",
            symbol,
            signature: item.signature,
            status: item.status === "confirmed" ? "confirmed" : "skipped",
            time: new Date(item.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          });
        }
      }
    }

    return combined;
  }, [log, historyData?.settlements]);

  return (
    <ModulePage
      badge="SETTLEMENTS"
      title="Pay any handle."
      description="Send USDC or SOL to any registered handle. The router quotes both Jupiter and Relay in parallel, takes the winning price for each leg, and settles the entire elected mix."
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 my-8">
        {/* Payment input card */}
        <div className="xl:col-span-7 glass rounded-2xl p-6 md:p-8 flex flex-col gap-6">
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
            PAYMENT DETAILS
          </span>

          <label className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
              RECIPIENT HANDLE
            </span>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-muted2">
                @
              </span>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="mira"
                className={`${inputCls} pl-8 font-mono`}
              />
            </div>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                AMOUNT IN
              </span>
              <input
                type="number"
                min="0.000001"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000"
                className={`${inputCls} font-mono`}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                PAYMENT TOKEN
              </span>
              <div className="flex gap-2">
                {(payTokens.length ? payTokens : ["USDC", "SOL"]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setToken(t)}
                    className={`flex-1 rounded-xl py-3 font-mono text-xs uppercase tracking-[0.08em] transition-colors duration-150 ${
                      token === t
                        ? "bg-red text-white"
                        : "glass-soft text-secondary2 hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="button"
              disabled={!ready || settle.isPending}
              onClick={send}
              className={`font-body font-semibold text-sm uppercase tracking-[0.08em] rounded-xl px-8 py-3.5 transition-all duration-150 ${
                ready && !settle.isPending
                  ? "bg-red hover:bg-red-hover text-white hover:-translate-y-0.5"
                  : "bg-hairline text-muted2 cursor-not-allowed"
              }`}
            >
              {settle.isPending ? "SETTLING VIA WALLET…" : "SETTLE PAYMENT"}
            </button>
            {!wallet && (
              <span className="font-body text-xs text-muted2">
                Connect your wallet to sign settlement transactions.
              </span>
            )}
            <AnimatePresence>
              {settle.isSuccess && (
                <motion.p
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.12em] text-foreground"
                >
                  <SettledCheck />
                  {settle.data.signatures.length} LEG(S) SETTLED · RECORDED ON THE RAIL
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          {settle.isError && (
            <div className="rounded-lg bg-red/10 border border-red/30 p-3.5">
              <p className="font-mono text-xs text-red font-medium">
                {formatDisplayError(settle.error.message)}
              </p>
            </div>
          )}
        </div>

        {/* Quote preview */}
        <div className="xl:col-span-5 glass glass-interactive rounded-2xl p-5 md:p-6 flex flex-col gap-5 min-w-0">
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
            QUOTE PREVIEW {handle.trim() ? `· ${handle.trim().toUpperCase()}` : ""}
          </span>

          {quote.isFetching && (
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2 animate-pulse">
              DUAL-QUOTING JUPITER + RELAY…
            </p>
          )}

          {quote.error && (
            <div className="rounded-lg bg-red/10 border border-red/30 p-3.5 text-left">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-red font-semibold block mb-1">
                Routing Notice
              </span>
              <p className="font-body text-xs text-foreground/90 leading-relaxed">
                {formatDisplayError(quote.error.message)}
              </p>
            </div>
          )}

          {quote.data ? (
            <>
              <div className="flex flex-col">
                {legs.map((leg) => (
                  <div
                    key={leg.assetMint}
                    className="flex items-center justify-between gap-3 border-b border-hairline/60 last:border-b-0 py-3.5"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className="w-1.5 h-1.5 bg-red shrink-0" aria-hidden />
                      <span className="font-mono text-sm text-foreground">{leg.assetSymbol}</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] border border-hairline/60 rounded-full px-2 py-0.5 text-muted2">
                        {leg.basisPoints / 100}%
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                        via {leg.quote.winner}
                      </span>
                    </span>
                    <span className="font-mono text-sm tabular-nums text-secondary2">
                      {leg.quote.outAmountFormatted}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-hairline/60 pt-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                  TOTAL IN
                </span>
                <span className="font-mono text-sm tabular-nums text-foreground">
                  {quote.data.portfolioResult.totalInAmountFormatted} {token}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                  RECEIVER WALLET
                </span>
                <span className="font-mono text-xs tabular-nums text-secondary2">
                  {quote.data.recipientWallet.slice(0, 4)}…{quote.data.recipientWallet.slice(-4)}
                </span>
              </div>
              <p className="font-body text-xs text-muted2 leading-relaxed">
                Each leg is signed and settled atomically. Settled tokens land directly into the receiver's personal token accounts with zero escrow custody.
              </p>
            </>
          ) : (
            !quote.isFetching &&
            !quote.error && (
              <p className="font-body text-sm text-muted2">
                Enter a registered handle and an amount to dual-quote the settlement legs.
              </p>
            )
          )}
        </div>
      </div>

      {/* Verified On-Chain Settlement Receipts */}
      <DashTable
        caption={`CONFIRMED RECEIPTS · ${allReceipts.length}`}
        columns={["Handle", "Asset", "Signature", "Status", "Time"]}
        minWidth="min-w-[640px]"
      >
        {allReceipts.map((entry) => (
          <DashRow key={entry.id}>
            <DashCell className="text-foreground">@{entry.handle}</DashCell>
            <DashCell className="font-mono text-sm text-red">{entry.symbol}</DashCell>
            <DashCell className="font-mono text-xs text-muted2">
              {entry.signature ? (
                <a
                  href={`https://solscan.io/tx/${entry.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-red transition-colors"
                >
                  <span>
                    {entry.signature.slice(0, 6)}…{entry.signature.slice(-6)}
                  </span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                "—"
              )}
            </DashCell>
            <DashCell>
              <StatusPill
                tone={entry.signature ? "success" : "warning"}
                label={entry.signature ? "confirmed" : "skipped"}
              />
            </DashCell>
            <DashCell className="font-mono text-xs text-muted2">{entry.time}</DashCell>
          </DashRow>
        ))}
      </DashTable>

      {allReceipts.length === 0 && (
        <div className="py-8 text-center rounded-xl glass border border-hairline/60 p-6 mt-4">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted2">
            No payment receipts recorded yet
          </p>
          <p className="font-body text-xs text-secondary2 mt-1.5">
            When payments are settled through this rail, verifiable Solana transaction receipts will appear here automatically.
          </p>
        </div>
      )}
    </ModulePage>
  );
}
