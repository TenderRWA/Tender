import { fetchJupiterQuote, type JupiterQuoteResponse } from "./jupiterService";
import { fetchRelayQuote, type RelayQuoteResponse } from "./relayService";
import { resolveSolanaToken, type SolanaTokenInfo } from "../lib/rwaTokens";
import { config } from "../config";

export interface DualQuoteParams {
  inputMint: string;
  outputMint: string;
  amount: string; // base atomic units
  userWallet?: string;
  recipientWallet?: string;
  slippageBps?: number;
}

export interface ProviderQuoteSummary {
  provider: "jupiter" | "relay";
  outAmount: string;
  outAmountFormatted: string;
  priceImpactPct: number;
  rate?: string;
  success: boolean;
  error?: string;
}

export interface DualQuoteResult {
  winner: "jupiter" | "relay";
  inputToken?: SolanaTokenInfo;
  outputToken?: SolanaTokenInfo;
  inAmount: string;
  inAmountFormatted: string;
  outAmount: string;
  outAmountFormatted: string;
  priceImpactPct: number;
  rate: string;
  providerComparison: {
    jupiter: ProviderQuoteSummary;
    relay: ProviderQuoteSummary;
    winnerReason: string;
  };
  rawWinnerQuote: {
    provider: "jupiter" | "relay";
    jupiterQuote?: JupiterQuoteResponse;
    relayQuote?: RelayQuoteResponse;
  };
}

export interface PortfolioElectionLeg {
  assetSymbol: string;
  assetMint: string;
  basisPoints: number; // e.g. 6000 for 60%
}

export interface PortfolioQuoteResult {
  totalInAmount: string;
  totalInAmountFormatted: string;
  inputToken?: SolanaTokenInfo;
  legs: Array<{
    assetSymbol: string;
    assetMint: string;
    basisPoints: number;
    allocatedInAmount: string;
    allocatedInAmountFormatted: string;
    quote: DualQuoteResult;
  }>;
}

export function formatTokenUnits(amountBase: string | bigint, decimals: number): string {
  const big = typeof amountBase === "bigint" ? amountBase : BigInt(amountBase);
  const factor = BigInt(10) ** BigInt(decimals);
  const integerPart = big / factor;
  const fractionPart = big % factor;
  const paddedFraction = fractionPart.toString().padStart(decimals, "0").replace(/0+$/, "");
  return paddedFraction ? `${integerPart}.${paddedFraction}` : `${integerPart}`;
}

export function parseTokenUnits(amountFormatted: string | number, decimals: number): string {
  const [intPart, fracPart = ""] = String(amountFormatted).split(".");
  const cleanFrac = fracPart.slice(0, decimals).padEnd(decimals, "0");
  const combined = `${intPart || "0"}${cleanFrac}`;
  return BigInt(combined).toString();
}

export function formatFriendlyQuoteError(tokenSymbol: string, rawError: string): string {
  const errStr = (rawError || "").toLowerCase();

  if (
    errStr.includes("token_not_tradable") ||
    errStr.includes("not tradable") ||
    errStr.includes("no_swap_routes_found") ||
    errStr.includes("no routes found")
  ) {
    return `${tokenSymbol} has no active liquidity on Solana DEX order books. Please choose another token or update this handle's election.`;
  }

  if (errStr.includes("insufficient") || errStr.includes("liquidity")) {
    return `Insufficient market liquidity on Solana DEXes to settle ${tokenSymbol} at this amount.`;
  }

  if (errStr.includes("rate limit") || errStr.includes("429") || errStr.includes("too many requests")) {
    return `DEX order book rate limit reached. Please wait a few seconds and try again.`;
  }

  if (errStr.includes("slippage")) {
    return `Price impact or slippage exceeded for ${tokenSymbol}. Try a smaller amount or adjusting slippage.`;
  }

  const clean = rawError
    .replace(/\{[^{}]*\}/g, "")
    .replace(/HTTP (?:Error )?\d+/gi, "")
    .replace(/Jupiter quote failed \(\d+\):?/gi, "")
    .replace(/Relay quote failed \(\d+\):?/gi, "")
    .trim();

  return clean ? `${tokenSymbol}: ${clean}` : `Unable to find a settlement route for ${tokenSymbol}.`;
}

export async function getBestDualQuote(params: DualQuoteParams): Promise<DualQuoteResult> {
  const inToken = resolveSolanaToken(params.inputMint);
  const outToken = resolveSolanaToken(params.outputMint);
  const inDecimals = inToken?.decimals ?? 9;
  const outDecimals = outToken?.decimals ?? 8;

  const inAmountFormatted = formatTokenUnits(params.amount, inDecimals);

  // If same asset, 1:1 direct pass-through (0 conversion fee, no DEX hop)
  if (params.inputMint === params.outputMint) {
    const directSummary: ProviderQuoteSummary = {
      provider: "jupiter",
      outAmount: params.amount,
      outAmountFormatted: inAmountFormatted,
      priceImpactPct: 0,
      rate: "1.0",
      success: true,
    };

    return {
      winner: "jupiter",
      inputToken: inToken,
      outputToken: outToken,
      inAmount: params.amount,
      inAmountFormatted,
      outAmount: params.amount,
      outAmountFormatted: inAmountFormatted,
      priceImpactPct: 0,
      rate: "1.0",
      providerComparison: {
        jupiter: directSummary,
        relay: { ...directSummary, provider: "relay" },
        winnerReason: "Same asset direct settlement (fee-free)",
      },
      rawWinnerQuote: {
        provider: "jupiter",
      },
    };
  }

  // Concurrently query both providers
  const [jupResult, relayResult] = await Promise.allSettled([
    fetchJupiterQuote({
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount: params.amount,
      slippageBps: params.slippageBps ?? 50,
    }),
    fetchRelayQuote({
      user: params.userWallet || "11111111111111111111111111111111",
      recipient: params.recipientWallet,
      originCurrency: params.inputMint,
      destinationCurrency: params.outputMint,
      amount: params.amount,
      slippageToleranceBps: params.slippageBps ?? 50,
      feeRecipient: config.fee.wallet,
      feeBps: config.fee.bps,
    }),
  ]);

  let jupSummary: ProviderQuoteSummary;
  let jupRaw: JupiterQuoteResponse | undefined;

  if (jupResult.status === "fulfilled") {
    jupRaw = jupResult.value;
    const outBig = BigInt(jupRaw.outAmount);
    jupSummary = {
      provider: "jupiter",
      outAmount: jupRaw.outAmount,
      outAmountFormatted: formatTokenUnits(outBig, outDecimals),
      priceImpactPct: parseFloat(jupRaw.priceImpactPct || "0"),
      success: true,
    };
  } else {
    jupSummary = {
      provider: "jupiter",
      outAmount: "0",
      outAmountFormatted: "0",
      priceImpactPct: 0,
      success: false,
      error: jupResult.reason?.message || "Jupiter quote failed",
    };
  }

  let relaySummary: ProviderQuoteSummary;
  let relayRaw: RelayQuoteResponse | undefined;

  if (relayResult.status === "fulfilled") {
    relayRaw = relayResult.value;
    const relayOutAmount = relayRaw.details.currencyOut?.amount || "0";
    const relayOutFormatted = relayRaw.details.currencyOut?.amountFormatted || formatTokenUnits(relayOutAmount, outDecimals);
    relaySummary = {
      provider: "relay",
      outAmount: relayOutAmount,
      outAmountFormatted: relayOutFormatted,
      priceImpactPct: parseFloat(relayRaw.details.totalImpact?.percent || "0"),
      rate: relayRaw.details.rate,
      success: true,
    };
  } else {
    relaySummary = {
      provider: "relay",
      outAmount: "0",
      outAmountFormatted: "0",
      priceImpactPct: 0,
      success: false,
      error: relayResult.reason?.message || "Relay quote failed",
    };
  }

  // If both failed, throw clean friendly error
  if (!jupSummary.success && !relaySummary.success) {
    const symbol = outToken?.symbol || "selected token";
    throw new Error(
      formatFriendlyQuoteError(symbol, `${jupSummary.error} | ${relaySummary.error}`)
    );
  }

  // Determine winner
  let winner: "jupiter" | "relay" = "jupiter";
  let winnerReason = "";

  if (jupSummary.success && relaySummary.success) {
    const jupOut = BigInt(jupSummary.outAmount);
    const relayOut = BigInt(relaySummary.outAmount);

    if (relayOut > jupOut) {
      winner = "relay";
      const diff = relayOut - jupOut;
      winnerReason = `Relay returned higher output (+${formatTokenUnits(diff, outDecimals)} ${outToken?.symbol || "tokens"})`;
    } else {
      winner = "jupiter";
      const diff = jupOut - relayOut;
      winnerReason = `Jupiter returned higher or equal output (+${formatTokenUnits(diff, outDecimals)} ${outToken?.symbol || "tokens"})`;
    }
  } else if (jupSummary.success) {
    winner = "jupiter";
    winnerReason = `Jupiter succeeded (Relay unavailable: ${relaySummary.error})`;
  } else {
    winner = "relay";
    winnerReason = `Relay succeeded (Jupiter unavailable: ${jupSummary.error})`;
  }

  const winningSummary = winner === "jupiter" ? jupSummary : relaySummary;

  return {
    winner,
    inputToken: inToken,
    outputToken: outToken,
    inAmount: params.amount,
    inAmountFormatted,
    outAmount: winningSummary.outAmount,
    outAmountFormatted: winningSummary.outAmountFormatted,
    priceImpactPct: winningSummary.priceImpactPct,
    rate: winningSummary.rate || (Number(winningSummary.outAmountFormatted) / (Number(inAmountFormatted) || 1)).toFixed(6),
    providerComparison: {
      jupiter: jupSummary,
      relay: relaySummary,
      winnerReason,
    },
    rawWinnerQuote: {
      provider: winner,
      jupiterQuote: winner === "jupiter" ? jupRaw : undefined,
      relayQuote: winner === "relay" ? relayRaw : undefined,
    },
  };
}

export async function calculatePortfolioElectionQuotes(params: {
  inputMint: string;
  totalAmountIn: string;
  elections: PortfolioElectionLeg[];
  userWallet?: string;
  recipientWallet?: string;
  slippageBps?: number;
}): Promise<PortfolioQuoteResult> {
  const inToken = resolveSolanaToken(params.inputMint);
  const inDecimals = inToken?.decimals ?? 9;
  const totalBig = BigInt(params.totalAmountIn);

  // Split input amount across basis points
  const legQuotes = await Promise.all(
    params.elections.map(async (leg) => {
      const legAmountBig = (totalBig * BigInt(leg.basisPoints)) / BigInt(10000);
      const legAmountStr = legAmountBig.toString();
      const legAmountFormatted = formatTokenUnits(legAmountBig, inDecimals);

      try {
        const quote = await getBestDualQuote({
          inputMint: params.inputMint,
          outputMint: leg.assetMint,
          amount: legAmountStr,
          userWallet: params.userWallet,
          recipientWallet: params.recipientWallet,
          slippageBps: params.slippageBps,
        });

        return {
          assetSymbol: leg.assetSymbol,
          assetMint: leg.assetMint,
          basisPoints: leg.basisPoints,
          allocatedInAmount: legAmountStr,
          allocatedInAmountFormatted: legAmountFormatted,
          quote,
        };
      } catch (err: any) {
        throw new Error(formatFriendlyQuoteError(leg.assetSymbol, err.message));
      }
    })
  );

  return {
    totalInAmount: params.totalAmountIn,
    totalInAmountFormatted: formatTokenUnits(totalBig, inDecimals),
    inputToken: inToken,
    legs: legQuotes,
  };
}
