import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

import ModulePage from "@/components/dashboard/ModulePage";
import DashTable, { DashRow, DashCell, StatusPill } from "@/components/dashboard/DashTable";
import { useAssets, useElectionQuote, useSettlePortfolio } from "@/hooks/useTender";
import type { SettlementLegResult } from "@/hooks/useTender";
import { useWallet } from "@/lib/wallet/wallet-context";

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

  const parsed = Number(amount);
  const ready = Boolean(quote.data) && Number.isFinite(parsed) && parsed > 0 && Boolean(wallet);

  const send = () => {
    if (!ready || !quote.data || settle.isPending) return;
    if (!wallet) return;
    settle.mutate(
      { quote: quote.data, userWallet: wallet, recipientHandle: handle },
      {
        onSuccess: (result) => {
          const at = new Date().toLocaleTimeString("en-US", { hour12: false });
          setLog((prev) => [
            ...result.legs.map((leg) => ({ ...leg, handle: handle.trim(), at })),
            ...prev,
          ]);
        },
      },
    );
  };

  const legs = quote.data?.portfolioResult.legs ?? [];

  return (
    <ModulePage
      index="02"
      label="PAYMENTS"
      title="Pay any handle."
      blurb="Send USDC, SOL or an SPL token to a handle. The rail dual-quotes Jupiter and Relay per leg and routes into the receiver's election."
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Composer */}
        <div className="xl:col-span-7 glass glass-interactive rounded-2xl p-5 md:p-6 flex flex-col gap-5 min-w-0 ">
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
            PAY-BY-HANDLE COMPOSER
          </span>
          <label className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
              RECIPIENT HANDLE
            </span>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@alex"
              className={inputCls}
              aria-label="Recipient handle"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                YOU SEND
              </span>
              {/* Segmented token select, sourced from the live base-currency list */}
              <div
                className="flex glass-soft rounded-xl overflow-hidden"
                role="radiogroup"
                aria-label="Token to send"
              >
                {(payTokens.length ? payTokens : ["USDC", "SOL"]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={token === t}
                    onClick={() => setToken(t)}
                    className={`flex-1 px-3 py-3 font-mono text-xs uppercase tracking-[0.12em] transition-colors duration-150 border-r border-hairline/60 last:border-r-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-red/40 ${
                      token === t
                        ? "bg-red text-white"
                        : "text-secondary2 hover:text-foreground hover:bg-raised"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                AMOUNT ({token})
              </span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="1000"
                className={`${inputCls} font-mono`}
                aria-label={`Amount in ${token}`}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={send}
              disabled={!ready || settle.isPending}
              className="bg-red hover:bg-red-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-body font-semibold text-sm uppercase tracking-[0.08em] px-8 py-3.5 rounded transition-all duration-150 hover:-translate-y-0.5"
            >
              {settle.isPending ? "Routing..." : "Send & Settle"}
            </button>
            {!wallet && (
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-warning">
                CONNECT A WALLET IN THE HEADER TO SIGN
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
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-red">
              {settle.error.message}
            </p>
          )}
        </div>

        {/* Quote preview */}
        <div className="xl:col-span-5 glass glass-interactive rounded-2xl p-5 md:p-6 flex flex-col gap-5 min-w-0">
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
            QUOTE PREVIEW {handle.trim() ? `· ${handle.trim().toUpperCase()}` : ""}
          </span>

          {quote.isFetching && (
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
              DUAL-QUOTING JUPITER + RELAY…
            </p>
          )}

          {quote.error && (
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-red">
              {quote.error.message}
            </p>
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
              <p className="font-body text-sm text-muted2">
                Each leg is built, signed and confirmed separately: a three-asset election means
                three wallet approvals. Slippage beyond tolerance safe-settles that leg to USDC.
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

      <DashTable
        caption={`SESSION RECEIPTS · ${log.length}`}
        columns={["Handle", "Asset", "Signature", "Status", "Time"]}
        minWidth="min-w-[640px]"
      >
        {log.map((entry, index) => (
          <DashRow key={`${entry.signature ?? entry.symbol}-${index}`}>
            <DashCell className="text-foreground">@{entry.handle}</DashCell>
            <DashCell className="font-mono text-sm text-red">{entry.symbol}</DashCell>
            <DashCell className="font-mono text-xs text-muted2">
              {entry.signature
                ? `${entry.signature.slice(0, 6)}…${entry.signature.slice(-6)}`
                : "—"}
            </DashCell>
            <DashCell>
              <StatusPill
                tone={entry.signature ? "success" : "warning"}
                label={entry.signature ? "confirmed" : "skipped"}
              />
            </DashCell>
            <DashCell className="font-mono text-xs text-muted2">{entry.at}</DashCell>
          </DashRow>
        ))}
      </DashTable>

      {log.length === 0 && (
        <p className="font-body text-sm text-muted2">
          Receipts from this session appear here. The API records every confirmed signature; there
          is no receipt-history endpoint to read them back yet.
        </p>
      )}
    </ModulePage>
  );
}
