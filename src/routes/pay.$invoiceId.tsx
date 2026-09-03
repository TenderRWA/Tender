import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  ArrowLeft,
  Copy,
  Check,
  Zap,
  Lock,
} from "lucide-react";
import ConnectWalletButton from "@/components/wallet/ConnectWalletButton";
import WalletModal from "@/components/wallet/WalletModal";
import { useWallet } from "@/lib/wallet/wallet-context";
import {
  useInvoice,
  useElectionQuote,
  useSettlePortfolio,
  useConfirmInvoicePayment,
} from "@/hooks/useTender";

export const Route = createFileRoute("/pay/$invoiceId")({
  component: InvoiceCheckoutPage,
});

const truncate = (val: string, len = 12) =>
  val.length > len ? `${val.slice(0, 6)}…${val.slice(-4)}` : val;

const SEGMENT_COLORS = [
  "bg-red",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-cyan-500",
];

function InvoiceCheckoutPage() {
  const { invoiceId } = Route.useParams();
  const { address: wallet } = useWallet();
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);

  const { data, isLoading, error } = useInvoice(invoiceId);
  const invoice = data?.invoice;
  const elections = data?.elections ?? [];

  // Payment token is strictly locked to the invoice's denomination (USDC or SOL)
  const payToken = invoice?.tokenSymbol?.toUpperCase() === "SOL" ? "SOL" : "USDC";

  // Quote the invoice amount into the recipient's portfolio
  const amountToPay = invoice ? Number(invoice.amount) : 0;
  const quote = useElectionQuote({
    recipientHandle: invoice?.recipientHandle ?? "",
    fromSymbolOrMint: payToken,
    amountIn: amountToPay,
    userWallet: wallet || undefined,
  });

  const settle = useSettlePortfolio();
  const confirm = useConfirmInvoicePayment();

  const [settledTx, setSettledTx] = useState<string | null>(null);

  const isExpired =
    invoice?.status === "expired" ||
    Boolean(invoice?.expiresAt && new Date(invoice.expiresAt) < new Date());
  const isPaid = invoice?.status === "paid" || Boolean(settledTx);
  const activeSignature = settledTx || invoice?.signature;

  const hasLegs = Boolean(quote.data?.portfolioResult?.legs?.length);
  const canPay = Boolean(wallet) && !isPaid && !isExpired && !settle.isPending && hasLegs;

  const handlePay = () => {
    if (!wallet) {
      setWalletModalOpen(true);
      return;
    }
    if (!canPay || !quote.data) return;

    settle.mutate(
      {
        quote: quote.data,
        userWallet: wallet,
        recipientHandle: invoice?.recipientHandle,
      },
      {
        onSuccess: (result) => {
          const sig = result.signatures[0] || "confirmed";
          setSettledTx(sig);
          confirm.mutate({
            id: invoiceId,
            signature: sig,
            payerWallet: wallet ?? undefined,
          });
        },
      }
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTx(true);
    setTimeout(() => setCopiedTx(false), 2000);
  };

  if (isLoading) {
    return (
      <main className="min-h-[85vh] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 mx-auto border-2 border-hairline border-t-red rounded-full animate-spin" />
          <p className="font-mono text-xs text-muted2 uppercase tracking-[0.14em]">
            Verifying Invoice On-Chain Rail…
          </p>
        </div>
      </main>
    );
  }

  if (error || !invoice) {
    return (
      <main className="min-h-[85vh] flex items-center justify-center p-6">
        <div className="glass rounded-3xl p-8 max-w-md w-full text-center space-y-4 border border-red/30 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-red mx-auto" />
          <h1 className="font-display text-2xl font-semibold text-foreground">Invoice Not Found</h1>
          <p className="font-body text-xs text-muted2 leading-relaxed">
            The requested invoice link does not exist, has expired, or is invalid on the TENDER rail.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background font-body text-xs font-semibold uppercase tracking-[0.1em] hover:bg-foreground/90 transition-all"
          >
            <span>Return to Terminal</span>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-10 md:py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col justify-center">
      {/* Top Breadcrumb & Status Navigation */}
      <div className="flex items-center justify-between pb-6 border-b border-hairline/80 mb-8 sm:mb-10">
        <Link
          to="/dashboard/invoices"
          className="inline-flex items-center gap-2 font-mono text-xs text-muted2 hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>TENDER TERMINAL</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted2 hidden sm:inline">
            ID: {truncate(invoice.id, 16)}
          </span>
          {isPaid ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full font-mono text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              SETTLED
            </span>
          ) : isExpired ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full font-mono text-xs font-semibold bg-muted/20 text-muted2 border border-hairline">
              EXPIRED
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full font-mono text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              PENDING SETTLEMENT
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Recipient Spec & Portfolio Visualizer */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Main Invoice Card */}
          <div className="glass rounded-3xl p-6 sm:p-8 space-y-6 border border-hairline/90 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-secondary2 font-semibold">
                PAYEE SPECIFICATION
              </span>
              <span className="font-mono text-[10px] text-muted2">
                Created {new Date(invoice.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Recipient Profile Card */}
            <div className="flex items-start justify-between gap-4 pt-2">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red/20 to-red/5 border border-red/30 flex items-center justify-center font-display text-lg font-bold text-red shadow-xs">
                  {invoice.recipientHandle.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-xl font-bold text-foreground">
                      @{invoice.recipientHandle}
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-muted2 mt-0.5 truncate max-w-[200px] sm:max-w-[260px]">
                    {invoice.recipientWallet}
                  </p>
                </div>
              </div>

              {/* Total Due Pill */}
              <div className="text-right">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted2 block">
                  AMOUNT DUE
                </span>
                <div className="font-mono text-3xl sm:text-4xl font-black text-foreground tracking-tight mt-0.5">
                  {Number(invoice.amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                  })}
                  <span className="text-red ml-1.5 text-xl font-bold">{payToken}</span>
                </div>
              </div>
            </div>

            {/* Memo Note */}
            {invoice.memo && (
              <div className="p-4 rounded-2xl glass-soft border border-hairline/80 space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted2 font-medium">
                  MEMO / REFERENCE
                </span>
                <p className="font-body text-sm text-foreground font-medium">{invoice.memo}</p>
              </div>
            )}

            {/* Due Date & Escrow-Free Notice */}
            <div className="flex items-center justify-between pt-4 border-t border-hairline/80 font-mono text-xs text-muted2">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-muted2" />
                Zero Escrow Custody
              </span>
              <span>
                Due by:{" "}
                <strong className="text-foreground">
                  {new Date(invoice.expiresAt).toLocaleDateString()}
                </strong>
              </span>
            </div>
          </div>

          {/* Receive-Side Portfolio Allocation Visualizer */}
          <div className="glass rounded-3xl p-6 sm:p-8 space-y-5 border border-hairline/90 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-secondary2 font-semibold block">
                  RECEIVE-SIDE PORTFOLIO SLICING
                </span>
                <p className="font-body text-xs text-muted2 mt-0.5">
                  Atomic split into @{invoice.recipientHandle}'s elected tokenized US stocks & cash
                </p>
              </div>
              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-red font-semibold px-2 py-0.5 rounded-full bg-red/10 border border-red/20">
                <Zap className="w-3 h-3" />
                Live DEX Slicing
              </span>
            </div>

            {/* Visual Multi-Segment Progress Bar */}
            {elections.length > 0 && (
              <div className="space-y-2">
                <div className="h-3 w-full rounded-full bg-base border border-hairline overflow-hidden flex shadow-inner">
                  {elections.map((ele, idx) => {
                    const widthPct = (ele.basisPoints / 100).toFixed(1);
                    const colorClass = SEGMENT_COLORS[idx % SEGMENT_COLORS.length];
                    return (
                      <div
                        key={ele.symbol}
                        style={{ width: `${widthPct}%` }}
                        className={`${colorClass} h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full hover:opacity-90`}
                        title={`${ele.symbol}: ${widthPct}%`}
                      />
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-muted2">
                  <span>Atomic DEX Slicing</span>
                  <span>100% Fully Allocated</span>
                </div>
              </div>
            )}

            {/* Individual Legs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {elections.map((ele, idx) => {
                const colorClass = SEGMENT_COLORS[idx % SEGMENT_COLORS.length];
                const matchingLeg = quote.data?.portfolioResult?.legs?.find(
                  (l) => l.assetSymbol === ele.symbol
                );
                const outAmt = matchingLeg
                  ? parseFloat(matchingLeg.quote.outAmountFormatted || "0")
                  : 0;
                const displayEst =
                  outAmt > 0
                    ? outAmt < 0.0001
                      ? `~${outAmt.toPrecision(2)}`
                      : outAmt < 1
                      ? `~${outAmt.toFixed(4).replace(/0+$/, "")}`
                      : `~${outAmt.toFixed(2)}`
                    : null;

                return (
                  <div
                    key={ele.symbol}
                    className="p-3.5 rounded-2xl bg-base/80 border border-hairline flex items-center justify-between hover:border-hairline/80 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
                      <div>
                        <span className="font-mono text-xs font-bold text-foreground block">
                          {ele.symbol}
                        </span>
                        {displayEst && (
                          <span className="font-mono text-[10px] text-muted2 block">
                            Est: {displayEst}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-mono text-xs font-extrabold text-foreground tabular-nums">
                      {Math.round(ele.basisPoints / 100)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Apple-Style Checkout Terminal */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass rounded-3xl p-6 sm:p-8 space-y-6 border border-hairline/90 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-hairline/80 pb-4">
              <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-secondary2">
                CHECKOUT TERMINAL
              </span>
              <ConnectWalletButton />
            </div>

            {/* Paid Receipt State */}
            {isPaid ? (
              <div className="py-8 text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-500 shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-display text-2xl font-bold text-foreground">
                    Settled on Solana
                  </h3>
                  <p className="font-body text-xs text-muted2 max-w-xs mx-auto">
                    Payment executed and atomically routed into @{invoice.recipientHandle}'s portfolio.
                  </p>
                </div>

                {activeSignature && (
                  <div className="p-4 rounded-2xl glass-soft border border-hairline/80 space-y-2 text-left">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-muted2">Transaction Signature</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(activeSignature)}
                        className="inline-flex items-center gap-1 text-red hover:underline font-semibold cursor-pointer"
                      >
                        {copiedTx ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{truncate(activeSignature, 12)}</span>
                      </button>
                    </div>

                    <a
                      href={`https://solscan.io/tx/${activeSignature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full mt-2 py-2.5 px-3 rounded-xl bg-base border border-hairline font-mono text-xs font-semibold text-foreground hover:text-red transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>View on Solscan</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                <Link
                  to="/dashboard/invoices"
                  className="w-full py-3.5 rounded-2xl bg-foreground text-background font-body font-semibold text-xs uppercase tracking-[0.1em] hover:bg-foreground/90 transition-all block text-center cursor-pointer shadow-md"
                >
                  Return to Invoices
                </Link>
              </div>
            ) : isExpired ? (
              /* Expired State */
              <div className="py-8 text-center space-y-4">
                <Clock className="w-12 h-12 text-muted2 mx-auto" />
                <h3 className="font-display text-xl font-bold text-foreground">
                  Invoice Has Expired
                </h3>
                <p className="font-body text-xs text-muted2 leading-relaxed max-w-xs mx-auto">
                  This payment link has passed its expiration timestamp. Please request a fresh invoice from @{invoice.recipientHandle}.
                </p>
                <Link
                  to="/dashboard"
                  className="inline-block w-full py-3.5 rounded-2xl bg-base border border-hairline font-body font-semibold text-xs uppercase tracking-[0.1em] text-foreground hover:bg-hairline transition-all cursor-pointer"
                >
                  Return to Dashboard
                </Link>
              </div>
            ) : (
              /* Open Settlement Action */
              <>
                {/* Line Item Breakdown */}
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-muted2">
                    <span>Invoice Rail</span>
                    <span className="text-foreground font-semibold">TENDER Sovereign</span>
                  </div>
                  <div className="flex items-center justify-between text-muted2">
                    <span>Routing Protocol</span>
                    <span className="text-foreground font-semibold">Jupiter + Relay Dual Route</span>
                  </div>
                  <div className="flex items-center justify-between text-muted2">
                    <span>Network</span>
                    <span className="text-foreground font-semibold">Solana Mainnet-Beta</span>
                  </div>
                  <div className="flex items-center justify-between text-muted2">
                    <span>Payer Fee</span>
                    <span className="text-emerald-500 font-semibold">0.00% (Zero Surcharge)</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-hairline font-bold text-base text-foreground">
                    <span>Total To Pay</span>
                    <span className="text-red">
                      {invoice.amount} {payToken}
                    </span>
                  </div>
                </div>

                {/* Primary Settle CTA Button */}
                <button
                  type="button"
                  disabled={wallet ? !canPay : false}
                  onClick={handlePay}
                  className={`w-full py-4.5 rounded-2xl font-body font-bold text-sm uppercase tracking-[0.08em] transition-all flex items-center justify-center gap-2.5 ${
                    !wallet || canPay
                      ? "bg-red hover:bg-red-hover active:scale-[0.99] text-white shadow-xl shadow-red/25 cursor-pointer"
                      : "bg-hairline text-muted2 cursor-not-allowed"
                  }`}
                >
                  {settle.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Signing in Wallet…</span>
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
                      <span>Settle {invoice.amount} {payToken}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {quote.isError && (
                  <div className="p-3.5 rounded-2xl bg-red/10 border border-red/30">
                    <p className="font-mono text-xs text-red">
                      Route Quote Error: {quote.error.message}
                    </p>
                  </div>
                )}

                {settle.isError && (
                  <div className="p-3.5 rounded-2xl bg-red/10 border border-red/30">
                    <p className="font-mono text-xs text-red">
                      {settle.error.message || "Failed to settle transaction"}
                    </p>
                  </div>
                )}
              </>
            )}

            <p className="font-mono text-[10px] text-muted2 text-center pt-2">
              Atomic DEX delivery · Settle directly into personal wallet accounts
            </p>
          </div>
        </div>
      </div>

      <WalletModal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    </main>
  );
}
