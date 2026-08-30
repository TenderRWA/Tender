import { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import ModulePage from "@/components/dashboard/ModulePage";
import DashTable, { DashRow, DashCell, StatusPill, RECEIPT_TONE } from "@/components/dashboard/DashTable";
import { RECEIPTS, PAY_TOKENS, formatUSD } from "@/components/dashboard/data";
import type { ReceiptStatus } from "@/components/dashboard/data";

const ELECTION = [
  { asset: "SPYx", pct: 50 },
  { asset: "GLDx", pct: 30 },
  { asset: "USDC", pct: 20 },
];

const FEE_PCT = 0.004;

type SendState = "idle" | "sending" | "sent";

const FILTERS: { key: ReceiptStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "optimal", label: "Optimal" },
  { key: "stable", label: "Stable" },
  { key: "issue", label: "Issues" },
];

const inputCls =
  "w-full glass-soft rounded-xl px-4 py-3 font-body text-sm text-foreground placeholder:text-muted2 focus:outline-none focus:border-red focus:ring-2 focus:ring-red/25 transition-all duration-150";

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

export default function Payments() {
  const [handle, setHandle] = useState("");
  const [token, setToken] = useState(PAY_TOKENS[0]);
  const [amount, setAmount] = useState("1000");
  const [sendState, setSendState] = useState<SendState>("idle");
  const [filter, setFilter] = useState<ReceiptStatus | "all">("all");

  const parsed = Number(amount);
  const valid = handle.trim().length > 1 && Number.isFinite(parsed) && parsed > 0;

  const quote = useMemo(() => {
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    const fee = parsed * FEE_PCT;
    const net = parsed - fee;
    return {
      fee,
      net,
      legs: ELECTION.map((e) => ({ ...e, amount: (net * e.pct) / 100 })),
    };
  }, [parsed]);

  const send = () => {
    if (!valid || sendState !== "idle") return;
    setSendState("sending");
    window.setTimeout(() => setSendState("sent"), 1400);
    window.setTimeout(() => setSendState("idle"), 4200);
  };

  const rows = filter === "all" ? RECEIPTS : RECEIPTS.filter((r) => r.status === filter);

  return (
    <ModulePage
      index="02"
      label="PAYMENTS"
      title="Pay any handle."
      blurb="Send USDC, SOL or TENDER to a handle. The rail swaps and routes into the receiver's election in a single transaction."
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Composer */}
        <div className="xl:col-span-7 glass glass-interactive rounded-2xl p-5 md:p-6 flex flex-col gap-5 min-w-0 ">
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
            PAY-BY-HANDLE COMPOSER
          </span>
          <label className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">RECIPIENT HANDLE</span>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@mira.sol"
              className={inputCls}
              aria-label="Recipient handle"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">YOU SEND</span>
              {/* Segmented token select */}
              <div className="flex glass-soft rounded-xl overflow-hidden" role="radiogroup" aria-label="Token to send">
                {PAY_TOKENS.map((t) => (
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
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">AMOUNT (USD)</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="1000"
                className={`${inputCls} font-mono`}
                aria-label="Amount in USD"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={send}
              disabled={!valid || sendState === "sending"}
              className="bg-red hover:bg-red-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-body font-semibold text-sm uppercase tracking-[0.08em] px-8 py-3.5 rounded transition-all duration-150 hover:-translate-y-0.5"
            >
              {sendState === "sending" ? "Routing..." : sendState === "sent" ? "Settled" : "Send Payment"}
            </button>
            <AnimatePresence>
              {sendState === "sent" && (
                <motion.p
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.12em] text-foreground"
                >
                  <SettledCheck />
                  RECEIPT RCP-88413 · SETTLED IN 0.9S · ZERO FUNDS STRANDED
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Quote preview */}
        <div className="xl:col-span-5 glass glass-interactive rounded-2xl p-5 md:p-6 flex flex-col gap-5 min-w-0">
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
            QUOTE PREVIEW {handle.trim() ? `· ${handle.trim().toUpperCase()}` : ""}
          </span>
          {quote ? (
            <>
              <div className="flex flex-col">
                {quote.legs.map((l) => (
                  <div
                    key={l.asset}
                    className="flex items-center justify-between gap-3 border-b border-hairline/60 last:border-b-0 py-3.5"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className="w-1.5 h-1.5 bg-red shrink-0" aria-hidden />
                      <span className="font-mono text-sm text-foreground">{l.asset}</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] border border-hairline/60 rounded-full px-2 py-0.5 text-muted2">
                        {l.pct}%
                      </span>
                    </span>
                    <span className="font-mono text-sm tabular-nums text-secondary2">${formatUSD(l.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-hairline/60 pt-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                  PROTOCOL FEE 0.4%
                </span>
                <span className="font-mono text-sm tabular-nums text-red">${formatUSD(quote.fee)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2">
                  RECEIVER GETS
                </span>
                <span className="font-mono text-sm tabular-nums font-medium text-foreground">${formatUSD(quote.net)}</span>
              </div>
              <p className="font-body text-sm text-muted2">
                Receiver's election fills via on-chain quotes. Slippage beyond 50 bps reverts the leg to USDC.
              </p>
            </>
          ) : (
            <p className="font-body text-sm text-muted2">Enter an amount to preview the settlement legs.</p>
          )}
        </div>
      </div>

      {/* Receipts with filter */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`font-mono text-[11px] uppercase tracking-[0.12em] border rounded-full px-4 py-2 transition-colors duration-150 ${
              filter === f.key
                ? "border-red bg-red text-white"
                : "border-hairline/60 text-secondary2 hover:text-foreground hover:border-red"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <DashTable caption={`RECEIPTS · ${rows.length}`} columns={["Receipt", "Handle", "In", "Legs", "Fee", "Status", "Time"]} minWidth="min-w-[760px]">
        {rows.map((r) => (
          <DashRow key={r.id}>
            <DashCell className="font-mono text-xs text-foreground">{r.id}</DashCell>
            <DashCell className="text-foreground">{r.handle}</DashCell>
            <DashCell className="font-mono text-xs">
              {formatUSD(r.inAmount)} {r.inToken}
            </DashCell>
            <DashCell className="font-mono text-xs">
              {r.legs.map((l) => `${l.asset} ${l.pct}%`).join(" + ")}
            </DashCell>
            <DashCell className="font-mono text-xs">${formatUSD(r.fee)}</DashCell>
            <DashCell>
              <StatusPill tone={RECEIPT_TONE[r.status]} label={r.status} />
            </DashCell>
            <DashCell className="font-mono text-xs text-muted2">{r.time}</DashCell>
          </DashRow>
        ))}
      </DashTable>
    </ModulePage>
  );
}
