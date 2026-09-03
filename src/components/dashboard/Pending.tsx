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
  MintLink,
  NftBadge,
  NftIdentity,
  NftThumb,
  SovereignDeliveryNote,
} from "@/components/dashboard/NftMedia";
import { useQueryClient } from "@tanstack/react-query";
import {
  usePendingSettlements,
  useInvoices,
  useElectionQuote,
  useIsNftEnabled,
  useSettlePortfolio,
  useConfirmPendingSettlement,
  useDismissPendingSettlement,
  useNftMetadata,
  useTransferNft,
  type SettlementLegResult,
} from "@/hooks/useTender";
import type { NftMetadata, PendingSettlementRecord } from "@/types/tender";
import { useTenderSession } from "@/lib/tender-session";
import { useWallet } from "@/lib/wallet/wallet-context";

const truncate = (val: string, len = 10) =>
  val.length > len ? `${val.slice(0, 6)}…${val.slice(-4)}` : val;

const formatAmount = (amt: string | number) => {
  const num = typeof amt === "number" ? amt : parseFloat(String(amt)) || 0;
  if (num === 0) return "0.00";
  if (num >= 1) {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }
  // Fractional amounts < 1 (e.g. 0.005 SOL, 0.0009 SOL)
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
};

/**
 * Collectible requests are flagged two ways by the bot — an explicit
 * `assetType` and the legacy `inputToken: "NFT"`. Accept both.
 */
const isNftSettlement = (s: PendingSettlementRecord) =>
  s.assetType === "nft" || s.inputToken?.toUpperCase() === "NFT";

/**
 * Best available identity for the collectible on a pending row. The bot embeds
 * name and image in `portfolioSummary`; when it doesn't, resolve the mint.
 */
function useSettlementNft(settlement: PendingSettlementRecord) {
  const summary =
    settlement.portfolioSummary?.find((p) => p.isNft) ?? settlement.portfolioSummary?.[0];
  const mint = settlement.tokenMint || summary?.mint || "";
  const embedded = Boolean(summary?.name && summary?.image);

  const query = useNftMetadata(embedded ? null : mint);

  const nft: NftMetadata = {
    mint,
    name: query.data?.nft?.name || summary?.name || "",
    symbol: query.data?.nft?.symbol || (summary?.symbol === "NFT" ? "" : summary?.symbol) || "",
    image: query.data?.nft?.image || summary?.image,
  };

  return { nft, isLoading: query.isLoading, hasMint: Boolean(mint) };
}

type FilterTab = "all" | "x_bot" | "invoices";

export default function Pending() {
  const { handle } = useTenderSession();
  const { address: wallet } = useWallet();
  const dismiss = useDismissPendingSettlement();

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [selectedSettlement, setSelectedSettlement] = useState<PendingSettlementRecord | null>(null);
  const [settlementToDismiss, setSettlementToDismiss] = useState<PendingSettlementRecord | null>(null);
  const [dismissSuccessModal, setDismissSuccessModal] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  const isNftEnabled = useIsNftEnabled();

  // 1. Fetch pending settlements from X bot
  const { data: botData, isLoading: botLoading } = usePendingSettlements({
    handle: handle || undefined,
    status: "all",
  });
  const botSettlements = (botData?.pendingSettlements ?? []).filter(
    (s) => s.status !== "dismissed" && (isNftEnabled || !isNftSettlement(s)),
  );

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
          deltaTone={totalActivePending > 0 ? "warning" : "success"}
        />
        <StatCard
          label="𝕏 Bot Mentions"
          value={activePendingBot.length}
          delta={`${activePendingBot.length} tweet requests`}
          deltaTone={activePendingBot.length > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Invoices Due"
          value={invoices.length}
          delta={`${invoices.length} open pay-links`}
          deltaTone={invoices.length > 0 ? "warning" : "success"}
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
                caption="𝕏 Bot Requests"
                columns={["ORIGIN / SOURCE", "AMOUNT", "RECIPIENT", "PORTFOLIO MIX", "STATUS", "ACTION"]}
              >
                {botSettlements.map((s) => (
                  <BotSettlementRow
                    key={s.id}
                    settlement={s}
                    onDismiss={() => setSettlementToDismiss(s)}
                    onReview={() => setSelectedSettlement(s)}
                  />
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
                caption="Pending Invoices"
                columns={["INVOICE ID", "RECIPIENT", "AMOUNT", "MEMO", "STATUS", "EXPIRES", "ACTION"]}
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
                        {formatAmount(inv.amount)} <span className="text-red">{inv.tokenSymbol || "USDC"}</span>
                      </span>
                    </DashCell>

                    <DashCell>
                      <span className="font-body text-xs text-muted2 truncate max-w-[150px] block">
                        {inv.memo || "—"}
                      </span>
                    </DashCell>

                    <DashCell>
                      <StatusPill status={inv.status} />
                    </DashCell>

                    <DashCell>
                      <span className="font-mono text-xs text-muted2">
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </span>
                    </DashCell>

                    <DashCell className="text-right">
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

      {/* Dismiss Confirmation Modal */}
      <AnimatePresence>
        {settlementToDismiss && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="glass rounded-3xl p-6 sm:p-8 max-w-md w-full border border-hairline shadow-2xl relative space-y-5"
            >
              <div className="flex items-center justify-between border-b border-hairline pb-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-red">■</span>
                  <span className="font-mono text-xs uppercase tracking-[0.14em] text-secondary2">
                    DISMISS SETTLEMENT
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSettlementToDismiss(null)}
                  className="p-1.5 rounded-full hover:bg-ink/5 text-muted2 hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="font-body text-sm text-foreground">
                  Remove this pending transaction from your active queue?
                </p>
                <div className="p-3.5 rounded-2xl glass-soft border border-hairline/80 space-y-2 text-left">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted2">Recipient</span>
                    <span className="text-foreground font-semibold">@{settlementToDismiss.recipientHandle}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted2">Amount</span>
                    <span className="text-foreground font-semibold">
                      {formatAmount(settlementToDismiss.inputAmount)} {settlementToDismiss.inputToken}
                    </span>
                  </div>
                  {settlementToDismiss.authorXHandle && (
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-muted2">Source</span>
                      <span className="text-foreground">@{settlementToDismiss.authorXHandle}</span>
                    </div>
                  )}
                </div>
                <p className="font-body text-xs text-muted2">
                  Dismissing removes this request from your queue to keep your dashboard clean. No on-chain funds will be moved.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSettlementToDismiss(null)}
                  className="w-1/2 py-3 rounded-xl border border-hairline hover:bg-base text-foreground font-mono text-xs uppercase tracking-[0.1em] font-medium transition-all cursor-pointer"
                >
                  Keep Request
                </button>
                <button
                  type="button"
                  disabled={dismiss.isPending}
                  onClick={() => {
                    const id = settlementToDismiss.id;
                    dismiss.mutate(
                      { id },
                      {
                        onSuccess: () => {
                          setSettlementToDismiss(null);
                          setDismissSuccessModal(true);
                        },
                      }
                    );
                  }}
                  className="w-1/2 py-3 rounded-xl bg-red hover:bg-red-hover text-white font-mono text-xs uppercase tracking-[0.1em] font-semibold transition-all shadow-xs hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
                >
                  {dismiss.isPending ? "Dismissing…" : "Dismiss"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dismiss Success Modal */}
      <AnimatePresence>
        {dismissSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="glass rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-hairline shadow-2xl text-center space-y-5"
            >
              <div className="w-14 h-14 rounded-full bg-success/15 border border-success/30 flex items-center justify-center mx-auto text-success">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-display text-lg font-bold text-foreground">
                  Settlement Dismissed
                </h3>
                <p className="font-body text-xs text-muted2">
                  The request has been removed from your active queue.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDismissSuccessModal(false)}
                className="w-full py-3 rounded-xl bg-foreground text-background font-mono text-xs uppercase tracking-[0.1em] font-semibold hover:bg-foreground/90 transition-all cursor-pointer"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <WalletModal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    </ModulePage>
  );
}

/**
 * One 𝕏-initiated request. Collectibles and fungible payments share the row
 * shape but not the middle two columns: an NFT has no amount to format and no
 * mix to slice, so it shows what is actually being delivered instead.
 */
function BotSettlementRow({
  settlement: s,
  onDismiss,
  onReview,
}: {
  settlement: PendingSettlementRecord;
  onDismiss: () => void;
  onReview: () => void;
}) {
  const isNft = isNftSettlement(s);
  const { nft } = useSettlementNft(s);

  return (
    <DashRow>
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
        {isNft ? (
          <div className="flex items-center gap-2.5">
            <NftThumb nft={nft} size="sm" />
            <div className="min-w-0">
              <NftBadge />
              {nft.mint && <MintLink mint={nft.mint} className="mt-1 block" />}
            </div>
          </div>
        ) : (
          <span className="font-mono font-semibold text-foreground">
            {formatAmount(s.inputAmount)} <span className="text-red">{s.inputToken}</span>
          </span>
        )}
      </DashCell>

      <DashCell>
        <span className="font-mono text-xs text-foreground font-medium">@{s.recipientHandle}</span>
      </DashCell>

      <DashCell>
        {isNft ? (
          <div className="max-w-[220px]">
            <span className="block truncate font-body text-xs font-medium text-foreground">
              {nft.name || "Collectible"}
            </span>
            <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.1em] text-muted2">
              Direct Sovereign Delivery (100%)
            </span>
          </div>
        ) : (
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
        )}
      </DashCell>

      <DashCell>
        <StatusPill status={s.status} />
      </DashCell>

      <DashCell className="text-right">
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
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onDismiss}
              className="px-2.5 py-1.5 rounded-lg border border-hairline hover:bg-base text-muted2 hover:text-foreground font-mono text-xs uppercase tracking-[0.08em] font-medium transition-all cursor-pointer"
              title="Dismiss to unclutter view"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={onReview}
              className="px-3 py-1.5 rounded-lg bg-red hover:bg-red-hover text-white font-mono text-xs uppercase tracking-[0.08em] font-semibold transition-all shadow-xs hover:-translate-y-0.5 cursor-pointer flex items-center gap-1.5"
            >
              <span>{isNft ? "Review & Transfer" : "Review & Sign"}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </DashCell>
    </DashRow>
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
  const queryClient = useQueryClient();
  const { address: wallet } = useWallet();
  const settle = useSettlePortfolio();
  const transferNft = useTransferNft();
  const confirm = useConfirmPendingSettlement();

  const isNft = isNftSettlement(settlement);
  const { nft, hasMint } = useSettlementNft(settlement);

  const [confirmedTx, setConfirmedTx] = useState<string | null>(null);
  const [completedLegs, setCompletedLegs] = useState<SettlementLegResult[] | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Quote the transaction. A collectible is delivered 1:1 and never routed
  // through a DEX, so the quote engine is left out of the flow entirely -
  // passing no handle keeps the query disabled rather than merely ignored.
  const amountNum = parseFloat(settlement.inputAmount) || 0;
  const quote = useElectionQuote({
    recipientHandle: isNft ? undefined : settlement.recipientHandle,
    fromSymbolOrMint: settlement.inputToken || "USDC",
    amountIn: isNft ? 0 : amountNum,
    userWallet: wallet || undefined,
  });

  const hasLegs = Boolean(quote.data?.portfolioResult?.legs?.length);
  const isWorking = settle.isPending || transferNft.isPending;
  const canSettle = isNft
    ? Boolean(wallet) && !isWorking && hasMint
    : Boolean(wallet) && !isWorking && hasLegs;

  /** Records the settlement against the queue row and shows the receipt. */
  const onSettled = (signature: string, legs: SettlementLegResult[] | null) => {
    setConfirmedTx(signature);
    setCompletedLegs(legs);
    confirm.mutate({ id: settlement.id, signature, payerWallet: wallet || undefined });
    queryClient.invalidateQueries({ queryKey: ["tender", "pending-settlements"] });
  };

  const handleSign = () => {
    if (!wallet) {
      onOpenWallet();
      return;
    }
    if (!canSettle) return;
    setModalError(null);

    if (isNft) {
      transferNft.mutate(
        {
          userWallet: wallet,
          nftMint: nft.mint,
          recipientTag: settlement.recipientHandle,
          recipientWallet: settlement.recipientWallet || undefined,
        },
        {
          onSuccess: (result) => onSettled(result.signature, null),
          onError: (err) => setModalError(err.message || "Failed to transfer collectible"),
        },
      );
      return;
    }

    if (!quote.data) return;
    settle.mutate(
      {
        quote: quote.data,
        userWallet: wallet,
        recipientHandle: settlement.recipientHandle,
      },
      {
        onSuccess: (result) => onSettled(result.signatures[0] || "confirmed", result.legs),
        onError: (err) => setModalError(err.message || "Failed to settle transaction"),
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
              {isNft ? "TRANSFER COLLECTIBLE" : "SIGN SETTLEMENT"} ·{" "}
              {settlement.sourceRef ? `𝕏 ${settlement.sourceRef}` : settlement.id}
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
                {isNft ? "Collectible Delivered!" : "Settlement Completed!"}
              </h3>
              <p className="font-body text-xs text-muted2 max-w-sm mx-auto">
                {isNft ? (
                  <>
                    Transferred 1:1 into @{settlement.recipientHandle}&apos;s wallet on Solana. No
                    DEX selling, no election slicing.
                  </>
                ) : (
                  <>
                    Atomic legs settled into @{settlement.recipientHandle}&apos;s elected portfolio
                    directly on Solana.
                  </>
                )}
              </p>
            </div>

            <div className="p-4 rounded-2xl glass-soft border border-hairline/80 space-y-3 text-left">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted2">Recipient</span>
                <span className="text-foreground font-semibold">@{settlement.recipientHandle}</span>
              </div>
              {isNft ? (
                <div className="flex items-center justify-between gap-4 text-xs font-mono">
                  <span className="shrink-0 text-muted2">Delivered</span>
                  <span className="min-w-0 truncate text-foreground font-semibold">
                    {nft.name || "Collectible"}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted2">Settled Amount</span>
                  <span className="text-foreground font-semibold">
                    {formatAmount(settlement.inputAmount)} {settlement.inputToken}
                  </span>
                </div>
              )}

              {completedLegs && completedLegs.length > 0 ? (
                <div className="pt-2 border-t border-hairline/60 space-y-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted2 block">
                    Executed Portfolio Legs
                  </span>
                  {completedLegs.map((leg, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs font-mono">
                      <span className="text-foreground font-medium">{leg.symbol}</span>
                      {leg.signature ? (
                        <a
                          href={`https://solscan.io/tx/${leg.signature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-success hover:underline flex items-center gap-1 font-semibold"
                        >
                          <span>{truncate(leg.signature, 10)}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-muted2 text-[11px]">{leg.skippedReason || "Skipped"}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-hairline/60">
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
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["tender", "pending-settlements"] });
                onClose();
              }}
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
                  {isNft ? "Sending" : "Amount"}
                </span>
                {isNft ? (
                  <span className="mt-1 inline-flex">
                    <NftBadge />
                  </span>
                ) : (
                  <span className="font-mono text-xl font-bold text-foreground">
                    {formatAmount(settlement.inputAmount)}{" "}
                    <span className="text-red">{settlement.inputToken}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Delivery plan. A collectible has no route to quote - it states
                what lands and where, and nothing else. */}
            {isNft ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
                    Delivery
                  </span>
                  <span className="font-mono text-[10px] text-muted2">No DEX route required</span>
                </div>

                <div className="rounded-2xl border border-hairline bg-base/80 p-4">
                  <NftIdentity nft={nft} size="lg" />
                </div>

                {!hasMint && (
                  <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3">
                    <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
                    <p className="font-mono text-xs text-warning">
                      This request carries no mint address, so the transfer cannot be built.
                    </p>
                  </div>
                )}

                <SovereignDeliveryNote handle={settlement.recipientHandle} />
              </div>
            ) : (
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
            )}

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
              {isWorking ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>{isNft ? "Transferring on Solana…" : "Signing & Settling on Solana…"}</span>
                </>
              ) : !wallet ? (
                isNft ? (
                  "Connect Wallet to Transfer"
                ) : (
                  "Connect Wallet to Settle"
                )
              ) : !isNft && quote.isFetching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Quoting Route…</span>
                </>
              ) : (
                <>
                  <span>
                    {isNft
                      ? `Sign & Transfer NFT to @${settlement.recipientHandle}`
                      : `Sign & Settle ${formatAmount(settlement.inputAmount)} ${settlement.inputToken}`}
                  </span>
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
