import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Twitter,
  FileText,
  X,
} from "lucide-react";

import ModulePage from "@/components/dashboard/ModulePage";
import StatCard from "@/components/dashboard/StatCard";
import DashTable, { DashRow, DashCell, StatusPill } from "@/components/dashboard/DashTable";
import WalletModal from "@/components/wallet/WalletModal";
import {
  usePendingSettlements,
  useInvoices,
  useElectionQuote,
  useSettlePortfolio,
  useConfirmPendingSettlement,
} from "@/hooks/useTender";
import type { PendingSettlementRecord } from "@/types/tender";
import { useTenderSession } from "@/lib/tender-session";
import { useWallet } from "@/lib/wallet/wallet-context";

const truncate = (val: string, len = 10) =>
  val.length > len ? `${val.slice(0, 6)}…${val.slice(-4)}` : val;

type FilterTab = "all" | "x_bot" | "invoices";

export default function Pending() {
  const { handle } = useTenderSession();
  const { address: wallet } = useWallet();

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [selectedSettlement, setSelectedSettlement] = useState<PendingSettlementRecord | null>(null);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  // 1. Fetch pending settlements from X bot
  const { data: botData, isLoading: botLoading } = usePendingSettlements({
    handle: handle || undefined,
    status: "all",
  });
  const botSettlements = botData?.pendingSettlements ?? [];

  // 2. Fetch pending invoices
  const { data: invData, isLoading: invLoading } = useInvoices({
    handle: handle || undefined,
    wallet: wallet || undefined,
  });
  const invoices = (invData?.invoices ?? []).filter((i) => i.status === "pending");

  // Summary stats
  const activePendingBot = botSettlements.filter((s) => s.status === "pending");
  const totalActivePending = activePendingBot.length + invoices.length;

  return (
    <ModulePage
      index="03"
      label="PENDING"
      title="Queue on rails."
      blurb="Review, quote, and settle transactions initiated via 𝕏 (@TenderRWABot) and open payment requests."
    >
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <StatCard
          label="Total Pending"
          value={totalActivePending}
          delta={totalActivePending === 1 ? "1 awaiting signature" : `${totalActivePending} awaiting signature`}
          deltaTone={totalActivePending > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="𝕏 Bot Mentions"
          value={activePendingBot.length}
          delta={`${activePendingBot.length} tweet requests`}
          deltaTone={activePendingBot.length > 0 ? "accent" : "neutral"}
        />
        <StatCard
          label="Invoices Due"
          value={invoices.length}
          delta={`${invoices.length} open pay-links`}
          deltaTone={invoices.length > 0 ? "accent" : "neutral"}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-hairline pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-xl font-mono text-xs font-semibold uppercase tracking-[0.1em] transition-all cursor-pointer ${
            activeTab === "all"
              ? "bg-red text-white shadow-xs"
              : "text-muted2 hover:text-foreground hover:bg-hairline/40"
          }`}
        >
          All Queue ({totalActivePending})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("x_bot")}
          className={`px-4 py-2 rounded-xl font-mono text-xs font-semibold uppercase tracking-[0.1em] transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "x_bot"
              ? "bg-red text-white shadow-xs"
              : "text-muted2 hover:text-foreground hover:bg-hairline/40"
          }`}
        >
          <Twitter className="w-3.5 h-3.5" />
          𝕏 Bot ({activePendingBot.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("invoices")}
          className={`px-4 py-2 rounded-xl font-mono text-xs font-semibold uppercase tracking-[0.1em] transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "invoices"
              ? "bg-red text-white shadow-xs"
              : "text-muted2 hover:text-foreground hover:bg-hairline/40"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Invoices ({invoices.length})
        </button>
      </div>

      {/* Queue Section */}
      <div className="space-y-6">
        {/* 1. X Bot Pending Requests */}
        {(activeTab === "all" || activeTab === "x_bot") && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-secondary2 flex items-center gap-2">
                <Twitter className="w-3.5 h-3.5 text-foreground" />
                𝕏 Bot Initiated Settlements
              </span>
              <span className="font-mono text-[10px] text-muted2">
                {botSettlements.length} total logged
              </span>
            </div>

            {botLoading ? (
              <div className="glass rounded-2xl p-8 text-center space-y-3">
                <div className="w-5 h-5 mx-auto border-2 border-hairline border-t-red rounded-full animate-spin" />
                <p className="font-mono text-xs text-muted2 uppercase tracking-[0.12em]">
                  Querying pending queue…
                </p>
              </div>
            ) : botSettlements.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center space-y-2">
                <p className="font-mono text-xs text-foreground uppercase tracking-[0.12em]">
                  No 𝕏 Bot settlements found
                </p>
                <p className="font-body text-xs text-muted2 max-w-md mx-auto">
                  Tag <span className="font-mono text-red">@TenderRWABot</span> on 𝕏 (e.g.{" "}
                  <code className="px-1.5 py-0.5 rounded bg-base border border-hairline text-foreground">
                    @TenderRWABot pay @handle 50 USDC
                  </code>
                  ) to initiate atomic settlements from your timeline.
                </p>
              </div>
            ) : (
              <DashTable
                headers={["ORIGIN / SOURCE", "AMOUNT", "RECIPIENT", "PORTFOLIO MIX", "STATUS", "ACTION"]}
                count={botSettlements.length}
              >
                {botSettlements.map((s) => (
                  <DashRow key={s.id}>
                    <DashCell>
                      <div className="flex items-center gap-2">
                        {s.tweetUrl ? (
                          <a
                            href={s.tweetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-xs text-foreground hover:text-red transition-colors"
                          >
                            <span>@{s.authorXHandle || "author"}</span>
                            <ExternalLink className="w-3 h-3 text-muted2" />
                          </a>
                        ) : (
                          <span className="font-mono text-xs text-foreground">
                            @{s.authorXHandle || "unknown"}
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-muted2">
                          · {new Date(s.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </DashCell>

                    <DashCell>
                      <span className="font-mono font-semibold text-foreground">
                        {s.inputAmount} <span className="text-red">{s.inputToken}</span>
                      </span>
                    </DashCell>

                    <DashCell>
                      <span className="font-mono text-xs text-foreground font-medium">
                        @{s.recipientHandle}
                      </span>
                    </DashCell>

                    <DashCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {s.portfolioSummary && s.portfolioSummary.length > 0 ? (
                          s.portfolioSummary.map((item, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded bg-base/70 border border-hairline font-mono text-[10px] text-foreground"
                            >
                              {item.percentage}% {item.symbol}
                            </span>
                          ))
                        ) : (
                          <span className="font-mono text-xs text-muted2">—</span>
                        )}
                      </div>
                    </DashCell>

                    <DashCell>
                      <StatusPill
                        status={
                          s.status === "completed"
                            ? "settled"
                            : s.status === "cancelled"
                            ? "expired"
                            : "open"
                        }
                      />
                    </DashCell>

                    <DashCell align="right">
                      {s.status === "completed" ? (
                        s.signature ? (
                          <a
                            href={`https://solscan.io/tx/${s.signature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-xs text-success hover:underline"
                          >
                            <span>Tx: {truncate(s.signature, 8)}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="font-mono text-xs text-muted2">Settled</span>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedSettlement(s)}
                          className="px-3 py-1.5 rounded-lg bg-red hover:bg-red-hover text-white font-mono text-xs uppercase tracking-[0.08em] font-semibold transition-all shadow-xs hover:-translate-y-0.5 cursor-pointer flex items-center gap-1.5 ml-auto"
                        >
                          <span>Review & Sign</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </DashCell>
                  </DashRow>
                ))}
              </DashTable>
            )}
          </div>
        )}

        {/* 2. Invoices Due */}
        {(activeTab === "all" || activeTab === "invoices") && (
          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-secondary2 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-foreground" />
                Pending Invoices Due
              </span>
              <span className="font-mono text-[10px] text-muted2">
                {invoices.length} active
              </span>
            </div>

            {invLoading ? (
              <div className="glass rounded-2xl p-8 text-center space-y-3">
                <div className="w-5 h-5 mx-auto border-2 border-hairline border-t-red rounded-full animate-spin" />
                <p className="font-mono text-xs text-muted2 uppercase tracking-[0.12em]">
                  Loading invoices…
                </p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center space-y-2">
                <p className="font-mono text-xs text-foreground uppercase tracking-[0.12em]">
                  No pending invoices due
                </p>
                <p className="font-body text-xs text-muted2 max-w-md mx-auto">
                  When you or a collaborator generates a payment request, it will appear here for 1-click settlement.
                </p>
              </div>
            ) : (
              <DashTable
                headers={["INVOICE ID", "RECIPIENT", "AMOUNT", "MEMO", "EXPIRES", "ACTION"]}
                count={invoices.length}
              >
                {invoices.map((inv) => (
                  <DashRow key={inv.id}>
                    <DashCell>
                      <span className="font-mono font-semibold text-xs text-foreground">
                        {inv.id}
                      </span>
                    </DashCell>

                    <DashCell>
                      <span className="font-mono text-xs text-foreground">
                        @{inv.recipientHandle}
                      </span>
                    </DashCell>

                    <DashCell>
                      <span className="font-mono font-semibold text-foreground">
                        {inv.amount} <span className="text-red">{inv.tokenSymbol || "USDC"}</span>
                      </span>
                    </DashCell>

                    <DashCell>
                      <span className="font-body text-xs text-muted2 truncate max-w-[150px] block">
                        {inv.memo || "—"}
                      </span>
                    </DashCell>

                    <DashCell>
                      <span className="font-mono text-xs text-muted2">
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </span>
                    </DashCell>

                    <DashCell align="right">
                      <a
                        href={`/pay/${inv.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-red hover:bg-red-hover text-white font-mono text-xs uppercase tracking-[0.08em] font-semibold transition-all shadow-xs hover:-translate-y-0.5 inline-flex items-center gap-1.5 ml-auto cursor-pointer"
                      >
                        <span>Pay Invoice</span>
                        <ArrowRight className="w-3 h-3" />
                      </a>
                    </DashCell>
                  </DashRow>
                ))}
              </DashTable>
            )}
          </div>
        )}
      </div>

      {/* Review & Sign Modal for 𝕏 Bot Requests */}
      <AnimatePresence>
        {selectedSettlement && (
          <SettlementSignModal
            settlement={selectedSettlement}
            onClose={() => setSelectedSettlement(null)}
            onOpenWallet={() => setWalletModalOpen(true)}
          />
        )}
      </AnimatePresence>

      <WalletModal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    </ModulePage>
  );
}

/**
 * Apple-grade Modal for reviewing and signing an 𝕏-initiated settlement.
 */
function SettlementSignModal({
  settlement,
  onClose,
  onOpenWallet,
}: {
  settlement: PendingSettlementRecord;
  onClose: () => void;
  onOpenWallet: () => void;
}) {
  const { address: wallet } = useWallet();
  const settle = useSettlePortfolio();
  const confirm = useConfirmPendingSettlement();

  const [confirmedTx, setConfirmedTx] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Quote the transaction
  const amountNum = parseFloat(settlement.inputAmount) || 0;
  const quote = useElectionQuote({
    recipientHandle: settlement.recipientHandle,
    fromSymbolOrMint: settlement.inputToken || "USDC",
    amountIn: amountNum,
    userWallet: wallet || undefined,
  });

  const hasLegs = Boolean(quote.data?.portfolioResult?.legs?.length);
  const canSettle = Boolean(wallet) && !settle.isPending && hasLegs;

  const handleSign = () => {
    if (!wallet) {
      onOpenWallet();
      return;
    }
    if (!canSettle || !quote.data) return;

    setModalError(null);
    settle.mutate(
      {
        quote: quote.data,
        userWallet: wallet,
        recipientHandle: settlement.recipientHandle,
      },
      {
        onSuccess: (result) => {
          const sig = result.signatures[0] || "confirmed";
          setConfirmedTx(sig);
          confirm.mutate({
            id: settlement.id,
            signature: sig,
            payerWallet: wallet,
          });
        },
        onError: (err) => {
          setModalError(err.message || "Failed to settle transaction");
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="glass rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-hairline shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline pb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-red">■</span>
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-secondary2">
              SIGN SETTLEMENT · {settlement.sourceRef ? `𝕏 ${settlement.sourceRef}` : settlement.id}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-ink/5 text-muted2 hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmedTx ? (
          /* Success Receipt State */
          <div className="py-6 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-success/15 border border-success/30 flex items-center justify-center mx-auto text-success">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-foreground">
                Settlement Completed!
              </h3>
              <p className="font-body text-xs text-muted2 max-w-sm mx-auto">
                Atomic legs settled into @{settlement.recipientHandle}&apos;s elected portfolio directly on Solana.
              </p>
            </div>

            <div className="p-4 rounded-2xl glass-soft border border-hairline/80 space-y-2 text-left">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted2">Transaction Hash</span>
                <a
                  href={`https://solscan.io/tx/${confirmedTx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-success hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>{truncate(confirmedTx, 12)}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted2">Recipient</span>
                <span className="text-foreground">@{settlement.recipientHandle}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted2">Settled Amount</span>
                <span className="text-foreground font-semibold">
                  {settlement.inputAmount} {settlement.inputToken}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 rounded-xl bg-foreground text-background font-body font-semibold text-xs uppercase tracking-[0.1em] hover:bg-foreground/90 transition-all cursor-pointer"
            >
              Close Receipt
            </button>
          </div>
        ) : (
          /* Review & Sign State */
          <div className="space-y-6">
            {/* Payee & Input Spec */}
            <div className="p-4 rounded-2xl glass-soft border border-hairline/80 flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted2 block">
                  Paying Recipient
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-base font-bold text-foreground">
                    @{settlement.recipientHandle}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-base border border-hairline text-[10px] font-mono text-success">
                    <ShieldCheck className="w-3 h-3 text-success" />
                    Verified Rail
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted2 block">
                  Amount
                </span>
                <span className="font-mono text-xl font-bold text-foreground">
                  {settlement.inputAmount} <span className="text-red">{settlement.inputToken}</span>
                </span>
              </div>
            </div>

            {/* Atomic DEX Route Quote */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
                  Portfolio Settlement Breakdown
                </span>
                <span className="font-mono text-[10px] text-muted2">
                  {quote.isFetching ? "Quoting DEX order books…" : "Live Jupiter & Relay Route"}
                </span>
              </div>

              {quote.isLoading ? (
                <div className="p-6 rounded-2xl glass-soft border border-hairline text-center space-y-2">
                  <div className="w-4 h-4 border-2 border-hairline border-t-red rounded-full animate-spin mx-auto" />
                  <p className="font-mono text-xs text-muted2">Calculating optimal swap routes…</p>
                </div>
              ) : quote.isError ? (
                <div className="p-4 rounded-xl bg-red/10 border border-red/30">
                  <p className="font-mono text-xs text-red">
                    Route Quote Error: {quote.error.message}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {quote.data?.portfolioResult?.legs?.map((leg, idx) => {
                    const outAmt = parseFloat(leg.quote.outAmountFormatted || "0");
                    const displayAmt =
                      outAmt < 0.0001
                        ? `~${outAmt.toPrecision(2)}`
                        : outAmt < 1
                        ? `~${outAmt.toFixed(4).replace(/0+$/, "")}`
                        : `~${outAmt.toFixed(2)}`;

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-base/80 border border-hairline"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-red" />
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {leg.assetSymbol}
                          </span>
                          <span className="font-mono text-[10px] text-muted2">
                            ({(leg.basisPoints / 100).toFixed(0)}%)
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold text-foreground">
                          {displayAmt} {leg.assetSymbol}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Error banner if mutation fails */}
            {modalError && (
              <div className="p-3 rounded-xl bg-red/10 border border-red/30 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red shrink-0" />
                <p className="font-mono text-xs text-red">{modalError}</p>
              </div>
            )}

            {/* Action CTA */}
            <button
              type="button"
              disabled={wallet ? !canSettle : false}
              onClick={handleSign}
              className={`w-full py-4 rounded-2xl font-body font-semibold text-sm uppercase tracking-[0.08em] transition-all flex items-center justify-center gap-2 ${
                !wallet || canSettle
                  ? "bg-red hover:bg-red-hover text-white shadow-md hover:-translate-y-0.5 cursor-pointer"
                  : "bg-hairline text-muted2 cursor-not-allowed"
              }`}
            >
              {settle.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Signing & Settling on Solana…</span>
                </>
              ) : !wallet ? (
                "Connect Wallet to Settle"
              ) : quote.isFetching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Quoting Route…</span>
                </>
              ) : (
                <>
                  <span>Sign & Settle {settlement.inputAmount} {settlement.inputToken}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
