import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, ExternalLink, ShieldCheck, ArrowRight, AlertCircle } from "lucide-react";
import ConnectWalletButton from "@/components/wallet/ConnectWalletButton";
import { useWallet } from "@/lib/wallet/wallet-context";
import {
  useInvoice,
  useElectionQuote,
  useSettlePortfolio,
  useConfirmInvoicePayment,
  useAssets,
} from "@/hooks/useTender";

export const Route = createFileRoute("/pay/$invoiceId")({
  component: InvoiceCheckoutPage,
});

function InvoiceCheckoutPage() {
  const { invoiceId } = Route.useParams();
  const { address: wallet } = useWallet();

  const { data, isLoading, error } = useInvoice(invoiceId);
  const invoice = data?.invoice;
  const elections = data?.elections ?? [];

  // Payer asset selection (USDC or SOL)
  const [payToken, setPayToken] = useState<string>("USDC");
  const { data: assetData } = useAssets({ featured: true });

  const inputMint = useMemo(() => {
    if (payToken === "SOL") {
      return "So11111111111111111111111111111111111111112";
    }
    // Default to USDC
    return "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  }, [payToken]);

  // Quote the invoice amount into the recipient's portfolio
  const amountToPay = invoice ? Number(invoice.amount) : 0;
  const quote = useElectionQuote({
    handle: invoice?.recipientHandle ?? "",
    amount: amountToPay,
    inputMint,
    enabled: Boolean(invoice && invoice.status === "pending" && amountToPay > 0),
  });

  const settle = useSettlePortfolio();
  const confirm = useConfirmInvoicePayment();

  const [settledTx, setSettledTx] = useState<string | null>(null);

  const isExpired = invoice?.status === "expired" || (invoice?.expiresAt && new Date(invoice.expiresAt) < new Date());
  const isPaid = invoice?.status === "paid" || Boolean(settledTx);
  const activeSignature = settledTx || invoice?.signature;

  const canPay =
    Boolean(wallet) &&
    !isPaid &&
    !isExpired &&
    !settle.isPending &&
    Boolean(quote.data?.portfolioResult?.legs?.length);

  const handlePay = () => {
    if (!canPay || !quote.data) return;

    settle.mutate(
      {
        quoteResponse: quote.data,
        payerTokenSymbol: payToken,
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

  if (isLoading) {
    return (
      <main className="min-h-[85vh] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-6 h-6 mx-auto border-2 border-hairline border-t-red rounded-full animate-spin" />
          <p className="font-mono text-xs text-muted2 uppercase tracking-[0.12em]">
            Retrieving Invoice On-Chain Data…
          </p>
        </div>
      </main>
    );
  }

  if (error || !invoice) {
    return (
      <main className="min-h-[85vh] flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 max-w-md w-full text-center space-y-4 border border-red/30">
          <AlertCircle className="w-10 h-10 text-red mx-auto" />
          <h1 className="font-display text-xl font-medium text-foreground">Invoice Not Found</h1>
          <p className="font-body text-xs text-muted2 leading-relaxed">
            The requested invoice link does not exist, has expired, or is invalid on the TENDER rail.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[90vh] py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto flex flex-col justify-center">
      {/* Top Banner / Section Marker */}
      <div className="flex items-center justify-between pb-6 border-b border-hairline/80 mb-8">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-semibold text-red">■</span>
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-secondary2">
            INVOICE SETTLEMENT RAIL · {invoice.id}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isPaid ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs bg-success/10 text-success border border-success/30">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              SETTLED
            </span>
          ) : isExpired ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs bg-muted/20 text-muted2 border border-hairline">
              EXPIRED
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs bg-amber-500/10 text-amber-500 border border-amber-500/30">
              <Clock className="w-3 h-3 animate-spin" />
              OPEN INVOICE
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Invoice Details & Recipient Portfolio */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Invoice Spec Card */}
          <div className="glass rounded-2xl p-6 md:p-8 space-y-6">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted2 block">
              PAYEE & SETTLEMENT SPEC
            </span>

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-body text-xs text-muted2">Recipient Handle</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-lg font-semibold text-foreground">
                    @{invoice.recipientHandle}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-base border border-hairline text-[10px] font-mono text-success">
                    <ShieldCheck className="w-3 h-3 text-success" />
                    Verified Rail
                  </span>
                </div>
                <p className="font-mono text-[10px] text-muted2 mt-1 truncate max-w-[240px]">
                  {invoice.recipientWallet}
                </p>
              </div>

              <div className="text-right">
                <p className="font-body text-xs text-muted2">Total Due</p>
                <p className="font-mono text-2xl font-bold text-foreground mt-0.5">
                  {Number(invoice.amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                  })}{" "}
                  <span className="text-red">{invoice.tokenSymbol || "USDC"}</span>
                </p>
              </div>
            </div>

            {invoice.memo && (
              <div className="p-4 rounded-xl glass-soft border border-hairline/80 space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted2">
                  Invoice Memo
                </span>
                <p className="font-body text-sm text-foreground">{invoice.memo}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-hairline/60 font-mono text-xs text-muted2">
              <span>Created: {new Date(invoice.createdAt).toLocaleDateString()}</span>
              <span>Expires: {new Date(invoice.expiresAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Receive-Side Portfolio Allocation Card */}
          <div className="glass glass-interactive rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-secondary2">
                RECIPIENT RECEIVE-SIDE ALLOCATION
              </span>
              <span className="font-mono text-[10px] text-muted2">Atomic DEX Split</span>
            </div>

            <p className="font-body text-xs text-muted2 leading-relaxed">
              When paid, TENDER slices this payment atomically on Solana into @{invoice.recipientHandle}'s elected portfolio:
            </p>

            <div className="space-y-2">
              {elections.map((ele) => (
                <div
                  key={ele.symbol}
                  className="flex items-center justify-between p-3 rounded-xl bg-base/60 border border-hairline"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-red" />
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {ele.symbol}
                    </span>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-foreground font-medium">
                    {Math.round(ele.basisPoints / 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Payer Action Card */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass rounded-2xl p-6 md:p-8 space-y-6 flex flex-col justify-between h-full">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-secondary2">
                  CHECKOUT
                </span>
                <ConnectWalletButton />
              </div>

              {/* Paid Receipt State */}
              {isPaid ? (
                <div className="py-8 text-center space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-success mx-auto animate-bounce" />
                  <div>
                    <h3 className="font-display text-lg font-medium text-foreground">
                      Invoice Settled Successfully
                    </h3>
                    <p className="font-body text-xs text-muted2 mt-1">
                      Payment confirmed on-chain and routed to @{invoice.recipientHandle}.
                    </p>
                  </div>

                  {activeSignature && (
                    <a
                      href={`https://solscan.io/tx/${activeSignature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-mono text-xs text-red hover:underline pt-2"
                    >
                      View on Solscan <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ) : isExpired ? (
                <div className="py-8 text-center space-y-3">
                  <Clock className="w-10 h-10 text-muted2 mx-auto" />
                  <h3 className="font-display text-lg font-medium text-foreground">Invoice Expired</h3>
                  <p className="font-body text-xs text-muted2">
                    This pay-link is past its expiration date. Please request a new invoice.
                  </p>
                </div>
              ) : (
                <>
                  {/* Pay With Token Selector */}
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted2 block">
                      Pay With
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {["USDC", "SOL"].map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => setPayToken(sym)}
                          className={`py-2.5 px-3 rounded-xl font-mono text-xs font-semibold uppercase tracking-wider border transition-all ${
                            payToken === sym
                              ? "bg-red text-white border-red shadow-xs"
                              : "glass-soft text-secondary2 border-hairline hover:text-foreground"
                          }`}
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Route & Price Impact Details */}
                  <div className="p-4 rounded-xl bg-base/80 border border-hairline space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between text-muted2">
                      <span>Rate & Route</span>
                      <span>Jupiter + Relay Dual</span>
                    </div>
                    <div className="flex items-center justify-between text-muted2">
                      <span>Network</span>
                      <span>Solana Mainnet-Beta</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-hairline font-semibold text-foreground">
                      <span>You Pay</span>
                      <span>
                        {quote.isFetching ? (
                          <span className="text-muted2 animate-pulse">Quoting…</span>
                        ) : (
                          `${invoice.amount} ${payToken}`
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Pay Button */}
                  <button
                    type="button"
                    disabled={!canPay}
                    onClick={handlePay}
                    className={`w-full py-4 rounded-xl font-body font-semibold text-sm uppercase tracking-[0.08em] transition-all flex items-center justify-center gap-2 ${
                      canPay
                        ? "bg-red hover:bg-red-hover text-white shadow-md hover:-translate-y-0.5"
                        : "bg-hairline text-muted2 cursor-not-allowed"
                    }`}
                  >
                    {settle.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Signing & Settling…</span>
                      </>
                    ) : !wallet ? (
                      "Connect Wallet to Pay"
                    ) : (
                      <>
                        <span>Settle Invoice</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {settle.isError && (
                    <div className="p-3 rounded-lg bg-red/10 border border-red/30">
                      <p className="font-mono text-xs text-red">
                        {settle.error.message || "Failed to settle transaction"}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <p className="font-mono text-[10px] text-muted2 text-center pt-4">
              Non-custodial atomic settlement via Solana rails
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
