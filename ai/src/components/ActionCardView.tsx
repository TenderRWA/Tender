import React, { useState } from "react";
import { ActionCardData } from "../lib/api";
import { formatAddress } from "../lib/utils";
import { useSendTransaction } from "wagmi";
import { parseEther } from "viem";
import {
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Layers,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

interface ActionCardViewProps {
  card: ActionCardData;
  userWallet?: string;
}

export default function ActionCardView({ card, userWallet }: ActionCardViewProps) {
  const { sendTransactionAsync } = useSendTransaction();
  const [isSigning, setIsSigning] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mainAppUrl = import.meta.env.VITE_MAIN_APP_URL || "https://tenderrwa.com";

  // Handle direct on-chain execution from the chat!
  const handleExecutePayment = async () => {
    if (!card.recipientWallet) return;
    setIsSigning(true);
    setErrorMsg(null);

    try {
      const hexChainId = "0x1237"; // 4663 in hex

      // Extract executable Uniswap V4 steps from quote legs or card meta
      const quoteLegs = card.meta?.quote?.legs || [];
      const executableSteps: Array<{
        to: string;
        data?: string;
        value?: string;
        symbol?: string;
      }> = [];

      for (const leg of quoteLegs) {
        const steps = leg.quote?.steps || [];
        for (const s of steps) {
          for (const it of s.items || []) {
            if (it.data && (it.data.data || it.data.value)) {
              executableSteps.push({
                to: it.data.to,
                data: it.data.data,
                value: it.data.value,
                symbol: leg.assetSymbol,
              });
            }
          }
        }
      }

      let lastHash = "";

      if (executableSteps.length > 0) {
        // 1. Ensure user is on Robinhood Chain
        if (typeof window !== "undefined" && (window as any).ethereum) {
          const ethereum = (window as any).ethereum;
          try {
            await ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: hexChainId }],
            });
          } catch (switchErr: any) {
            if (switchErr?.code === 4902 || switchErr?.message?.includes("Unrecognized chain")) {
              await ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: hexChainId,
                    chainName: "Robinhood Chain",
                    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
                    rpcUrls: ["https://rpc.mainnet.chain.robinhood.com"],
                    blockExplorerUrls: ["https://robinhoodchain.blockscout.com"],
                  },
                ],
              });
            }
          }
        }

        // 2. Execute each Uniswap V4 transaction sequentially
        for (let i = 0; i < executableSteps.length; i++) {
          const step = executableSteps[i];
          if (i > 0) await new Promise((r) => setTimeout(r, 600));

          let stepSubmitted = false;

          // Try Wagmi first
          try {
            const hash = await sendTransactionAsync({
              to: step.to as `0x${string}`,
              data: (step.data as `0x${string}`) || undefined,
              value: step.value ? BigInt(step.value) : 0n,
              chainId: 4663,
            });
            if (hash) {
              lastHash = hash;
              stepSubmitted = true;
            }
          } catch (wagmiErr: any) {
            console.warn("[ActionCard] Wagmi send error, attempting EIP-1193 fallback:", wagmiErr);
          }

          // Direct EIP-1193 fallback
          if (!stepSubmitted && typeof window !== "undefined" && (window as any).ethereum) {
            const ethereum = (window as any).ethereum;
            const accounts = await ethereum.request({ method: "eth_accounts" });
            const fromAddr = userWallet || accounts?.[0];

            const txParams: Record<string, any> = {
              from: fromAddr,
              to: step.to,
            };
            if (step.data) txParams.data = step.data;
            if (step.value) txParams.value = `0x${BigInt(step.value).toString(16)}`;

            const hash = await ethereum.request({
              method: "eth_sendTransaction",
              params: [txParams],
            });

            if (hash) {
              lastHash = hash;
              stepSubmitted = true;
            }
          }

          if (!stepSubmitted) {
            throw new Error(`Failed to submit Uniswap V4 transaction for ${step.symbol || "swap"}.`);
          }
        }
      } else if (card.token === "ETH" && card.amount) {
        // Fallback for direct transfers if no routing steps
        const valueWei = parseEther(card.amount.toString());
        let txSubmitted = false;

        try {
          const hash = await sendTransactionAsync({
            to: card.recipientWallet as `0x${string}`,
            value: valueWei,
            chainId: 4663,
          });
          if (hash) {
            lastHash = hash;
            txSubmitted = true;
          }
        } catch (wagmiErr: any) {
          console.warn("[ActionCard] Wagmi send error, attempting EIP-1193 fallback:", wagmiErr);
        }

        if (!txSubmitted && typeof window !== "undefined" && (window as any).ethereum) {
          const ethereum = (window as any).ethereum;
          const accounts = await ethereum.request({ method: "eth_accounts" });
          const fromAddr = userWallet || accounts?.[0];

          const hash = await ethereum.request({
            method: "eth_sendTransaction",
            params: [
              {
                from: fromAddr,
                to: card.recipientWallet,
                value: `0x${valueWei.toString(16)}`,
              },
            ],
          });

          if (hash) {
            lastHash = hash;
            txSubmitted = true;
          }
        }

        if (!txSubmitted) {
          throw new Error("Unable to trigger transaction signing. Please unlock your wallet and try again.");
        }
      } else {
        const targetUrl = `${mainAppUrl}/dashboard/payments?handle=${encodeURIComponent(
          card.recipientHandle || "",
        )}&amount=${card.amount}&token=${card.token}`;
        window.open(targetUrl, "_blank");
        return;
      }

      if (lastHash) {
        setTxHash(lastHash);
        // Record confirmed settlement in backend
        try {
          const rawApi = (import.meta.env.VITE_API_URL || "").trim();
          const apiBase = (rawApi.startsWith("http") ? rawApi : "https://api.tenderrwa.com").replace(/\/+$/, "");
          await fetch(`${apiBase}/api/v2/settle/confirm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              txHash: lastHash,
              senderWallet: userWallet || "0x0000000000000000000000000000000000000000",
              recipientHandle: card.recipientHandle,
              recipientWallet: card.recipientWallet,
              inputTokenSymbol: card.token || "ETH",
              inputAmount: card.amount,
              outputBreakdown: card.legs?.map((l) => ({ symbol: l.symbol, amount: l.allocatedAmount })),
            }),
          }).catch(() => null);
        } catch {}
      }
    } catch (err: any) {
      console.error("[ActionCard] Transaction execution failed:", err);
      setErrorMsg(err?.shortMessage || err?.message || "Failed to execute transaction in wallet.");
    } finally {
      setIsSigning(false);
    }
  };

  // 1. Payment Action Card
  if (card.type === "payment" || card.type === "quote") {
    const isPayment = card.type === "payment";
    const terminalPaymentUrl = `${mainAppUrl}/dashboard/payments?handle=${encodeURIComponent(
      card.recipientHandle || "",
    )}&amount=${card.amount}&token=${card.token}`;

    return (
      <div className="mt-3 rounded-2xl border border-hairline/90 bg-base p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-hairline/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-red">
                {isPayment ? "Settlement Order" : "Settlement Quote"}
              </span>
            </div>
            <h4 className="font-display font-bold text-base text-ink mt-0.5">
              {card.amount} {card.token} → @{card.recipientHandle}
            </h4>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono text-muted2 block">Receiver Wallet</span>
            <span className="font-mono text-xs font-semibold text-secondary2">
              {formatAddress(card.recipientWallet)}
            </span>
          </div>
        </div>

        {/* Portfolio Election Legs */}
        {card.legs && card.legs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-muted2">
              <span>Automatic Portfolio Split</span>
              <span>100% Total</span>
            </div>

            {/* Split Bar */}
            <div className="h-2 w-full rounded-full overflow-hidden flex bg-card2 border border-hairline">
              {card.legs.map((leg, idx) => {
                const colors = ["bg-red", "bg-ink", "bg-emerald-500", "bg-blue-500", "bg-amber-500"];
                const color = colors[idx % colors.length];
                return (
                  <div
                    key={leg.symbol}
                    style={{ width: `${leg.percentage}%` }}
                    className={`${color} h-full transition-all`}
                    title={`${leg.percentage}% ${leg.symbol}`}
                  />
                );
              })}
            </div>

            {/* Leg Details List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
              {card.legs.map((leg) => (
                <div
                  key={leg.symbol}
                  className="rounded-xl border border-hairline/80 bg-card2/50 p-2 text-xs font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink">{leg.symbol}</span>
                    <span className="text-secondary2 font-medium">{leg.percentage}%</span>
                  </div>
                  <div className="text-[11px] text-muted2 mt-0.5 truncate">
                    ~{Number(leg.allocatedAmount).toFixed(4)} {leg.symbol}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success or Error States */}
        {txHash && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-mono text-emerald-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Payment executed on-chain!</span>
            </div>
            <a
              href={`https://robinhoodchain.blockscout.com/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-bold underline"
            >
              Explorer <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-xl bg-red/10 border border-red/20 p-3 text-xs font-mono text-red flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {isPayment && !txHash && (
            <button
              onClick={handleExecutePayment}
              disabled={isSigning}
              className="inline-flex items-center gap-2 rounded-xl bg-red px-4 py-2 font-mono text-xs font-semibold text-white hover:bg-red-hover disabled:opacity-50 transition-colors shadow-xs"
            >
              {isSigning ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in Wallet...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Sign & Settle Now</span>
                </>
              )}
            </button>
          )}

          <a
            href={terminalPaymentUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-base px-3.5 py-2 font-mono text-xs font-medium text-secondary2 hover:text-ink transition-colors shadow-2xs"
          >
            <span>Open in Terminal Payments</span>
            <ExternalLink className="w-3 h-3 text-muted2" />
          </a>
        </div>
      </div>
    );
  }

  // 2. Portfolio View Card
  if (card.type === "portfolio") {
    return (
      <div className="mt-3 rounded-2xl border border-hairline/90 bg-base p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-hairline/60 pb-2.5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-red" />
            <span className="font-display font-bold text-sm text-ink">{card.title}</span>
          </div>
          <span className="font-mono text-xs text-secondary2">
            Owner: {formatAddress(card.recipientWallet)}
          </span>
        </div>

        <div className="space-y-2">
          {card.legs?.map((leg) => (
            <div
              key={leg.symbol}
              className="flex items-center justify-between rounded-xl bg-card2/60 border border-hairline/60 px-3 py-2 font-mono text-xs"
            >
              <span className="font-bold text-ink">{leg.symbol}</span>
              <div className="flex items-center gap-2">
                <span className="text-secondary2">{leg.percentage}%</span>
                {leg.tokenAddress && (
                  <span className="text-[10px] text-muted2">
                    ({formatAddress(leg.tokenAddress)})
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. NFT Action Card
  if (card.type === "nft") {
    return (
      <div className="mt-3 rounded-2xl border border-hairline/90 bg-base p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-red font-mono text-xs font-bold uppercase tracking-wider">
          <ImageIcon className="w-4 h-4" />
          <span>Sovereign Direct NFT Delivery</span>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-mono text-muted2">Target Recipient</div>
          <div className="font-display font-bold text-base text-ink">@{card.recipientHandle}</div>
          <div className="font-mono text-xs text-secondary2">
            Wallet: {formatAddress(card.recipientWallet)}
          </div>
        </div>
        <div className="rounded-xl bg-card2/70 p-2.5 font-mono text-xs border border-hairline">
          <span className="text-muted2 block text-[10px]">ERC-721 Contract Address</span>
          <span className="font-semibold text-ink break-all">{card.memo}</span>
        </div>
      </div>
    );
  }

  // 4. Asset Universe Card
  if (card.type === "assets" && card.meta?.assets) {
    const assets = card.meta.assets as Array<any>;
    return (
      <div className="mt-3 rounded-2xl border border-hairline/90 bg-base p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-hairline/60 pb-2.5">
          <span className="font-display font-bold text-sm text-ink">
            {card.title.replace(/·?\s*Robinhood Chain\s*(\(4663\))?/gi, "").trim()}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {assets.map((a) => (
            <div
              key={a.symbol}
              className="rounded-xl border border-hairline bg-card2/50 p-2 font-mono text-xs"
            >
              <div className="font-bold text-ink">{a.symbol}</div>
              <div className="text-[10px] text-muted2 truncate">{a.name}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
