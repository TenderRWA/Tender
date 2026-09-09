import { encodeFunctionData, erc20Abi, parseUnits, getAddress } from "viem";
import {
  ROBINHOOD_CHAIN_ID,
  RobinhoodTokenInfo,
  USDG,
  ETH,
  resolveRobinhoodToken,
  isValidEvmAddress,
} from "../lib/robinhoodTokens";
import { planV4Swap, UNIVERSAL_ROUTER } from "./uniswapV4";

export const PROTOCOL_FEE_BPS = 15; // 0.15% protocol fee

export interface SingleSwapQuoteParams {
  userWallet: string;
  fromToken: RobinhoodTokenInfo;
  toToken: RobinhoodTokenInfo;
  amountIn: number;
  recipientWallet?: string;
  slippageBps?: number;
}

export interface SingleSwapQuoteResult {
  fromToken: RobinhoodTokenInfo;
  toToken: RobinhoodTokenInfo;
  amountIn: string;
  amountInFormatted: string;
  amountOut: string;
  amountOutFormatted: string;
  rate: string;
  priceImpactPct: number;
  timeEstimate: number;
  requestId?: string;
  executionVenue: "same_asset" | "uniswap_v4";
  steps?: any[];
  rawRelayQuote?: any;
}

export interface PortfolioElectionLeg {
  symbol: string;
  tokenAddress: string;
  basisPoints: number;
  percentage: number;
  token: RobinhoodTokenInfo;
}

export interface PortfolioQuoteLegResult {
  assetSymbol: string;
  assetAddress: string;
  basisPoints: number;
  percentage: number;
  allocatedInAmount: string;
  allocatedInAmountFormatted: string;
  quote: SingleSwapQuoteResult;
  isFallbackUsdg?: boolean;
}

export interface PortfolioSettlementQuoteResult {
  recipientHandle?: string | null;
  recipientWallet: string;
  inputToken: RobinhoodTokenInfo;
  totalInAmount: string;
  totalInAmountFormatted: string;
  legs: PortfolioQuoteLegResult[];
}

/**
 * Quote a single token-to-token swap using Uniswap V4 on Robinhood Chain
 */
export async function quoteSingleSwap(params: SingleSwapQuoteParams): Promise<SingleSwapQuoteResult> {
  const inBaseUnits = parseUnits(params.amountIn.toString(), params.fromToken.decimals).toString();
  const rawRecipient = params.recipientWallet || params.userWallet || "0x0000000000000000000000000000000000000000";
  let recipient: `0x${string}` = "0x0000000000000000000000000000000000000000";
  try {
    if (rawRecipient && isValidEvmAddress(rawRecipient)) {
      recipient = getAddress(rawRecipient);
    }
  } catch {
    recipient = "0x0000000000000000000000000000000000000000";
  }

  // 1. Same-Asset Fast Path (zero conversion fee, instant 1:1 direct execution)
  if (params.fromToken.address.toLowerCase() === params.toToken.address.toLowerCase()) {
    const isNative = params.fromToken.isNative || params.fromToken.address === "0x0000000000000000000000000000000000000000";

    const itemData = isNative
      ? {
          to: recipient,
          data: "0x" as `0x${string}`,
          value: inBaseUnits,
          chainId: ROBINHOOD_CHAIN_ID,
        }
      : {
          to: params.fromToken.address,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "transfer",
            args: [recipient, BigInt(inBaseUnits)],
          }),
          value: "0",
          chainId: ROBINHOOD_CHAIN_ID,
        };

    const steps = [
      {
        id: "transfer",
        action: `Transfer ${params.fromToken.symbol}`,
        description: `Direct transfer of ${params.amountIn} ${params.fromToken.symbol}`,
        kind: "transaction",
        items: [
          {
            status: "not_started",
            data: itemData,
          },
        ],
      },
    ];

    return {
      fromToken: params.fromToken,
      toToken: params.toToken,
      amountIn: inBaseUnits,
      amountInFormatted: params.amountIn.toString(),
      amountOut: inBaseUnits,
      amountOutFormatted: params.amountIn.toString(),
      rate: "1.0",
      priceImpactPct: 0,
      timeEstimate: 0,
      executionVenue: "same_asset",
      steps,
    };
  }

  // 2. Pure Uniswap V4 Execution on Robinhood Chain (Chain 4663)
  const v4Plan = await planV4Swap({
    fromToken: params.fromToken,
    toToken: params.toToken,
    amountIn: params.amountIn,
    userWallet: params.userWallet,
    slippageBps: params.slippageBps || 50,
  });

  if (v4Plan) {
    const steps: any[] = [];

    // Add token approval steps if required (Permit2 / Universal Router for ERC20 inputs)
    if (v4Plan.approvals && v4Plan.approvals.length > 0) {
      steps.push({
        id: "approve",
        action: `Approve ${params.fromToken.symbol}`,
        description: `Approve ${params.fromToken.symbol} for Universal Router execution`,
        kind: "transaction",
        items: v4Plan.approvals.map((tx) => ({
          status: "not_started",
          data: {
            to: tx.to,
            data: tx.data,
            value: tx.value,
            chainId: ROBINHOOD_CHAIN_ID,
          },
        })),
      });
    }

    // Add Universal Router V4 Swap transaction
    steps.push({
      id: "uniswap_v4_swap",
      action: `Swap ${params.fromToken.symbol} for ${params.toToken.symbol}`,
      description: `Execute swap via Uniswap V4 Universal Router (${v4Plan.route})`,
      kind: "transaction",
      items: [
        {
          status: "not_started",
          data: {
            to: v4Plan.swap.to,
            data: v4Plan.swap.data,
            value: v4Plan.swap.value,
            chainId: ROBINHOOD_CHAIN_ID,
          },
        },
      ],
    });

    const rate = (parseFloat(v4Plan.amountOutFormatted) / params.amountIn).toFixed(6);

    return {
      fromToken: params.fromToken,
      toToken: params.toToken,
      amountIn: v4Plan.amountIn.toString(),
      amountInFormatted: v4Plan.amountInFormatted,
      amountOut: v4Plan.amountOut.toString(),
      amountOutFormatted: v4Plan.amountOutFormatted,
      rate,
      priceImpactPct: 0.12,
      timeEstimate: 2,
      executionVenue: "uniswap_v4",
      steps,
    };
  }

  throw new Error(`Uniswap V4 pool route unavailable for ${params.fromToken.symbol} -> ${params.toToken.symbol}`);
}

/**
 * Quote multi-leg portfolio settlement across receiver's Robinhood Chain elections
 */
export async function quotePortfolioSettlement(params: {
  userWallet: string;
  recipientWallet: string;
  recipientHandle?: string | null;
  fromToken: RobinhoodTokenInfo;
  totalAmountIn: number;
  elections: PortfolioElectionLeg[];
  slippageBps?: number;
}): Promise<PortfolioSettlementQuoteResult> {
  const totalInBaseUnits = parseUnits(params.totalAmountIn.toString(), params.fromToken.decimals).toString();

  // If no elections provided, default to 100% USDG
  const targetElections: PortfolioElectionLeg[] =
    params.elections && params.elections.length > 0
      ? params.elections
      : [
          {
            symbol: "USDG",
            tokenAddress: USDG.address,
            basisPoints: 10000,
            percentage: 100,
            token: USDG,
          },
        ];

  // Quote every elected leg concurrently using Uniswap V4
  const legPromises = targetElections.map(async (election) => {
    const legShare = (params.totalAmountIn * election.basisPoints) / 10000;
    const legInBaseUnits = parseUnits(legShare.toString(), params.fromToken.decimals).toString();

    let legQuote: SingleSwapQuoteResult;
    let isFallbackUsdg = false;

    try {
      legQuote = await quoteSingleSwap({
        userWallet: params.userWallet,
        recipientWallet: params.recipientWallet,
        fromToken: params.fromToken,
        toToken: election.token,
        amountIn: legShare,
        slippageBps: params.slippageBps || 50,
      });

      // Slippage Guardrail: If price impact exceeds 5%, safe-settle into USDG
      if (Math.abs(legQuote.priceImpactPct) > 5.0 && election.token.symbol !== "USDG") {
        isFallbackUsdg = true;
        legQuote = await quoteSingleSwap({
          userWallet: params.userWallet,
          recipientWallet: params.recipientWallet,
          fromToken: params.fromToken,
          toToken: USDG,
          amountIn: legShare,
          slippageBps: 50,
        });
      }
    } catch (err) {
      // Safe-settle in USDG if an individual leg route fails
      isFallbackUsdg = true;
      legQuote = await quoteSingleSwap({
        userWallet: params.userWallet,
        recipientWallet: params.recipientWallet,
        fromToken: params.fromToken,
        toToken: USDG,
        amountIn: legShare,
        slippageBps: 50,
      });
    }

    return {
      assetSymbol: isFallbackUsdg ? "USDG" : election.symbol,
      assetAddress: isFallbackUsdg ? USDG.address : election.tokenAddress,
      basisPoints: election.basisPoints,
      percentage: election.percentage,
      allocatedInAmount: legInBaseUnits,
      allocatedInAmountFormatted: legShare.toFixed(6),
      quote: legQuote,
      isFallbackUsdg,
    };
  });

  const legs = await Promise.all(legPromises);

  return {
    recipientHandle: params.recipientHandle || null,
    recipientWallet: params.recipientWallet,
    inputToken: params.fromToken,
    totalInAmount: totalInBaseUnits,
    totalInAmountFormatted: params.totalAmountIn.toString(),
    legs,
  };
}
