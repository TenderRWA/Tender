import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
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
  Lock,
} from "lucide-react";
import ConnectWalletButton from "@/components/wallet/ConnectWalletButton";
import WalletModal from "@/components/wallet/WalletModal";
import { StatusPill } from "@/components/dashboard/DashTable";
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

function InvoiceCheckoutPage() {
  const { invoiceId } = Route.useParams();
  const { address: wallet } = useWallet();
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);

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

  const copySignature = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTx(true);
    setTimeout(() => setCopiedTx(false), 2000);
  };

  const copyRecipientWallet = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  if (isLoading) {
    return (
      <main className="min-h-[85vh] pt-32 pb-16 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 mx-auto border-2 border-hairline border-t-red rounded-full animate-spin" />
          <p className="font-mono text-xs text-muted2 uppercase tracking-[0.14em]">
            Reading invoice from rail…
          </p>
        </div>
      </main>
    );
  }

  if (error || !invoice) {
    return (
      <main className="min-h-[85vh] pt-32 pb-16 flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 max-w-md w-full text-center space-y-4 border border-red/30 shadow-xl">
          <AlertCircle className="w-10 h-10 text-red mx-auto" />
          <h1 className="font-display text-xl font-medium text-foreground">Invoice Not Found</h1>
          <p className="font-body text-xs text-muted2 leading-relaxed">
            The requested invoice link does not exist, has expired, or is invalid on the TENDER rail.
          </p>
          <Link
            to="/dashboard/invoices"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background font-body text-xs font-semibold uppercase tracking-[0.1em] hover:bg-foreground/90 transition-all"
          >
            <span>Return to Invoices</span>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[90vh] pt-28 md:pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col justify-start">
      {/* Top Header & Breadcrumb Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-hairline/80 mb-8">
        <Link
          to="/dashboard/invoices"
          className="inline-flex items-center gap-2 font-mono text-xs text-secondary2 hover:text-red transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          <span className="uppercase tracking-[0.12em]">TENDER TERMINAL</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted2">
            ID: <span className="text-foreground">{truncate(invoice.id, 16)}</span>
          </span>
          <StatusPill status={isPaid ? "settled" : isExpired ? "expired" : "open"} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Payee Details & Portfolio Slicing Breakdown */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Main Invoice Card */}
          <div className="glass glass-interactive rounded-2xl p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-hairline/60 pb-3">
              <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
                <span className="w-1.5 h-1.5 bg-red shrink-0" aria-hidden />
                PAYEE & SETTLEMENT SPEC
              </span>
              <span className="font-mono text-[10px] text-muted2">
                Issued {new Date(invoice.createdAt).toISOString().slice(0, 10)}
              </span>
            </div>

            {/* Recipient Profile */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-base border border-hairline flex items-center justify-center font-display text-lg font-bold text-foreground shrink-0 shadow-2xs">
                  {invoice.recipientHandle.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-bold text-foreground">
                      @{invoice.recipientHandle}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-base border border-hairline text-[10px] font-mono text-success shrink-0">
                      <ShieldCheck className="w-3 h-3 text-success" />
                      Verified
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyRecipientWallet(invoice.recipientWallet)}
                    title="Click to copy wallet address"
                    className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted2 hover:text-foreground mt-0.5 transition-colors cursor-pointer"
                  >
                    <span>{truncate(invoice.recipientWallet, 12)}</span>
                    {copiedWallet ? (
                      <Check className="w-3 h-3 text-success" />
                    ) : (
                      <Copy className="w-3 h-3 text-muted2" />
                    )}
                  </button>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2 block">
                  AMOUNT DUE
                </span>
                <div className="font-mono text-2xl sm:text-3xl font-bold text-foreground mt-0.5">
                  {Number(invoice.amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                  })}
                  <span className="text-red ml-1.5 text-base font-semibold">{payToken}</span>
                </div>
              </div>
            </div>

            {/* Memo Box */}
            {invoice.memo && (
              <div className="glass-soft rounded-xl p-4 border border-hairline/80 space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted2 block">
                  MEMO / REFERENCE
                </span>
                <p className="font-body text-sm text-foreground font-medium">{invoice.memo}</p>
              </div>
            )}

            {/* Escrow Status & Due Date */}
            <div className="flex items-center justify-between pt-4 border-t border-hairline/60 font-mono text-xs text-muted2">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-muted2" />
                Zero Escrow Custody
              </span>
              <span>
                Due: <strong className="text-foreground">{new Date(invoice.expiresAt).toISOString().slice(0, 10)}</strong>
              </span>
            </div>
          </div>

          {/* Receive-Side Portfolio Slicing Visualizer */}
          <div className="glass glass-interactive rounded-2xl p-6 md:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-hairline/60 pb-3">
              <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
                <span className="w-1.5 h-1.5 bg-red shrink-0" aria-hidden />
                RECEIVE-SIDE PORTFOLIO SLICING
              </span>
              <span className="font-mono text-[10px] text-muted2">
                Atomic Jupiter + Relay
              </span>
            </div>

            <p className="font-body text-xs text-muted2 leading-relaxed">
              When settled, TENDER automatically converts this payment on-chain into @{invoice.recipientHandle}'s active portfolio allocation:
            </p>

            {/* Legs List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {elections.map((ele) => {
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
                    className="p-3.5 rounded-xl bg-base/70 border border-hairline flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-red shrink-0" />
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
                    <span className="font-mono text-xs font-semibold text-foreground tabular-nums">
                      {Math.round(ele.basisPoints / 100)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Checkout Terminal */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass glass-interactive rounded-2xl p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-hairline/60 pb-3">
              <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-secondary2">
                <span className="w-1.5 h-1.5 bg-red shrink-0" aria-hidden />
                CHECKOUT
              </span>
              <ConnectWalletButton />
            </div>

            {/* Paid Receipt State */}
            {isPaid ? (
              <div className="py-6 text-center space-y-5">
                <div className="w-14 h-14 rounded-full bg-success/10 border border-success/30 flex items-center justify-center mx-auto text-success">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h3 className="font-display text-xl font-bold text-foreground">
                    Settled on Solana
                  </h3>
                  <p className="font-body text-xs text-muted2 max-w-xs mx-auto">
                    Payment executed and atomically delivered into @{invoice.recipientHandle}'s portfolio.
                  </p>
                </div>

                {activeSignature && (
                  <div className="p-4 rounded-xl glass-soft border border-hairline/80 space-y-2 text-left">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-muted2">Tx Signature</span>
                      <button
                        type="button"
                        onClick={() => copySignature(activeSignature)}
                        className="inline-flex items-center gap-1 text-red hover:underline font-semibold cursor-pointer"
                      >
                        {copiedTx ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                        <span>{truncate(activeSignature, 12)}</span>
                      </button>
                    </div>

                    <a
                      href={`https://solscan.io/tx/${activeSignature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full mt-2 py-2 px-3 rounded-lg bg-base border border-hairline font-mono text-xs font-semibold text-foreground hover:text-red transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>View on Solscan</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                <Link
                  to="/dashboard/invoices"
                  className="w-full py-3.5 rounded-xl bg-foreground text-background font-body font-semibold text-xs uppercase tracking-[0.1em] hover:bg-foreground/90 transition-all block text-center cursor-pointer"
                >
                  Return to Invoices
                </Link>
              </div>
            ) : isExpired ? (
              /* Expired State */
              <div className="py-6 text-center space-y-4">
                <Clock className="w-10 h-10 text-muted2 mx-auto" />
                <h3 className="font-display text-lg font-bold text-foreground">
                  Invoice Has Expired
                </h3>
                <p className="font-body text-xs text-muted2 leading-relaxed max-w-xs mx-auto">
                  This payment link has passed its expiration window. Please request a fresh invoice from @{invoice.recipientHandle}.
                </p>
                <Link
                  to="/dashboard/invoices"
                  className="inline-block w-full py-3 rounded-xl bg-base border border-hairline font-body font-semibold text-xs uppercase tracking-[0.1em] text-foreground hover:bg-hairline transition-all cursor-pointer"
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
                    <span className="text-success font-semibold">0.00% (Zero Surcharge)</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-hairline font-bold text-sm text-foreground">
                    <span>Total Due</span>
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
                  className={`w-full py-4 rounded-xl font-body font-semibold text-sm uppercase tracking-[0.08em] transition-all flex items-center justify-center gap-2 ${
                    !wallet || canPay
                      ? "bg-red hover:bg-red-hover active:scale-[0.99] text-white shadow-md cursor-pointer"
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
                  <div className="p-3 rounded-xl bg-red/10 border border-red/30">
                    <p className="font-mono text-xs text-red">
                      Route Quote Error: {quote.error.message}
                    </p>
                  </div>
                )}

                {settle.isError && (
                  <div className="p-3 rounded-xl bg-red/10 border border-red/30">
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
