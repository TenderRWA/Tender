/**
 * The one place either wire format becomes a rail-neutral view model.
 *
 * Everything above this file (hooks, components) works in src/types/rail.ts;
 * everything below it (server functions) works in the rail's own vocabulary.
 * Adding a rail means adding a pair of functions here, not a branch upstream.
 */
import type {
  AssetsResponse,
  DualQuoteResponse,
  ElectionQuoteResponse,
  HandleDetailsResponse,
  InvoiceRecord,
  NftMetadata,
  PendingSettlementRecord,
  PortfolioElection,
  SettlementHistoryItem,
  SolanaTokenInfo,
} from "@/types/tender";
import type {
  V2AssetsResponse,
  V2Election,
  V2ElectionQuoteResponse,
  V2HandleResponse,
  V2Invoice,
  V2NftMetadataResponse,
  V2PendingSettlement,
  V2Quote,
  V2QuoteLeg,
  V2Token,
} from "@/types/tender-v2";
import type {
  RailAssets,
  RailElection,
  RailElectionQuote,
  RailHandle,
  RailInvoice,
  RailNft,
  RailPendingSettlement,
  RailQuote,
  RailQuoteLeg,
  RailSettlementRecord,
  RailToken,
} from "@/types/rail";

// ── Tokens ──────────────────────────────────────────────────────────────────

export function tokenFromV1(t: SolanaTokenInfo): RailToken {
  return {
    symbol: t.symbol,
    name: t.name,
    address: t.mint,
    decimals: t.decimals,
    isNative: t.isNative,
    isBaseCurrency: t.isBaseCurrency,
    underlyingTicker: t.underlyingTicker,
    iconUrl: t.iconUrl,
  };
}

export function tokenFromV2(t: V2Token): RailToken {
  return {
    symbol: t.symbol,
    name: t.name,
    address: t.address,
    decimals: t.decimals,
    isNative: t.isNative ?? t.assetType === "native",
    isBaseCurrency: t.isBaseCurrency,
    underlyingTicker: t.underlyingTicker,
    iconUrl: t.iconUrl,
    assetType: t.assetType,
  };
}

/** Drops duplicates by address, keeping first-seen order. */
function dedupe(tokens: RailToken[]): RailToken[] {
  const seen = new Set<string>();
  return tokens.filter((t) => {
    const key = t.address || t.symbol;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function assetsFromV1(res: AssetsResponse): RailAssets {
  const baseCurrencies = (res.baseCurrencies ?? []).map(tokenFromV1);
  const featured = (res.featured ?? []).map(tokenFromV1);
  const catalog = (res.assets ?? res.featured ?? []).map(tokenFromV1);
  return {
    baseCurrencies,
    featured,
    all: dedupe([...baseCurrencies, ...catalog]),
    total: res.total ?? res.count ?? catalog.length,
  };
}

export function assetsFromV2(res: V2AssetsResponse): RailAssets {
  const baseCurrencies = (res.baseCurrencies ?? []).map(tokenFromV2);
  const featured = (res.featuredAssets ?? []).map(tokenFromV2);
  const catalog = (res.tokens ?? res.featuredAssets ?? []).map(tokenFromV2);
  return {
    baseCurrencies,
    featured,
    all: dedupe([...baseCurrencies, ...catalog]),
    total: res.count ?? catalog.length,
  };
}

// ── Handles & elections ─────────────────────────────────────────────────────

function electionFromV1(e: PortfolioElection): RailElection {
  return {
    id: e.id,
    symbol: e.symbol,
    address: e.mint,
    basisPoints: e.basisPoints,
    percentage: e.percentage ?? e.basisPoints / 100,
    token: e.token ? tokenFromV1(e.token) : undefined,
  };
}

function electionFromV2(e: V2Election): RailElection {
  return {
    id: e.id,
    symbol: e.symbol,
    address: e.tokenAddress,
    basisPoints: e.basisPoints,
    percentage: e.percentage ?? e.basisPoints / 100,
    token: e.token ? tokenFromV2(e.token) : undefined,
  };
}

/** Sums the legs when the rail omits `totalBasisPoints`, as V2 sometimes does. */
const sumBps = (elections: { basisPoints: number }[]) =>
  elections.reduce((sum, e) => sum + e.basisPoints, 0);

export function handleFromV1(res: HandleDetailsResponse): RailHandle {
  const elections = (res.elections ?? []).map(electionFromV1);
  return {
    handle: res.handle,
    ownerWallet: res.ownerWallet,
    metadata: res.metadata ?? {},
    elections,
    totalBasisPoints: res.totalBasisPoints ?? sumBps(elections),
    createdAt: res.createdAt,
    updatedAt: res.updatedAt,
    rail: "solana",
  };
}

export function handleFromV2(res: V2HandleResponse): RailHandle {
  const elections = (res.elections ?? []).map(electionFromV2);
  return {
    handle: res.handle,
    ownerWallet: res.ownerWallet,
    xHandle: res.xHandle,
    metadata: res.metadata ?? {},
    elections,
    totalBasisPoints: res.totalBasisPoints ?? sumBps(elections),
    createdAt: res.createdAt,
    updatedAt: res.updatedAt,
    rail: "robinhood",
  };
}

// ── Quotes ──────────────────────────────────────────────────────────────────

export function quoteFromV1(q: DualQuoteResponse): RailQuote {
  return {
    fromToken: q.inputToken ? tokenFromV1(q.inputToken) : undefined,
    toToken: q.outputToken ? tokenFromV1(q.outputToken) : undefined,
    amountIn: q.inAmount,
    amountInFormatted: q.inAmountFormatted,
    amountOut: q.outAmount,
    amountOutFormatted: q.outAmountFormatted,
    rate: q.rate,
    priceImpactPct: q.priceImpactPct,
    venue: q.winner,
    raw: q,
  };
}

export function quoteFromV2(q: V2Quote): RailQuote {
  return {
    fromToken: q.fromToken ? tokenFromV2(q.fromToken) : undefined,
    toToken: q.toToken ? tokenFromV2(q.toToken) : undefined,
    amountIn: q.amountIn,
    amountInFormatted: q.amountInFormatted,
    amountOut: q.amountOut,
    amountOutFormatted: q.amountOutFormatted,
    rate: q.rate,
    priceImpactPct: q.priceImpactPct,
    venue: q.executionVenue,
    raw: q,
  };
}

function legFromV2(leg: V2QuoteLeg): RailQuoteLeg {
  return {
    assetSymbol: leg.assetSymbol,
    assetAddress: leg.assetAddress,
    basisPoints: leg.basisPoints,
    percentage: leg.percentage ?? leg.basisPoints / 100,
    allocatedInAmount: leg.allocatedInAmount,
    allocatedInAmountFormatted: leg.allocatedInAmountFormatted,
    quote: quoteFromV2(leg.quote),
    isFallback: leg.isFallbackUsdg,
  };
}

/** V1 nests the legs under `portfolioResult`; V2 returns them at the top level. */
export function electionQuoteFromV1(res: ElectionQuoteResponse): RailElectionQuote {
  const portfolio = res.portfolioResult;
  return {
    recipientHandle: res.recipientHandle,
    recipientWallet: res.recipientWallet,
    inputToken: portfolio.inputToken ? tokenFromV1(portfolio.inputToken) : undefined,
    totalInAmount: portfolio.totalInAmount,
    totalInAmountFormatted: portfolio.totalInAmountFormatted,
    legs: (portfolio.legs ?? []).map((leg) => ({
      assetSymbol: leg.assetSymbol,
      assetAddress: leg.assetMint,
      basisPoints: leg.basisPoints,
      percentage: leg.basisPoints / 100,
      allocatedInAmount: leg.allocatedInAmount,
      allocatedInAmountFormatted: leg.allocatedInAmountFormatted,
      quote: quoteFromV1(leg.quote),
    })),
    rail: "solana",
  };
}

export function electionQuoteFromV2(res: V2ElectionQuoteResponse): RailElectionQuote {
  return {
    recipientHandle: res.recipientHandle,
    recipientWallet: res.recipientWallet,
    inputToken: res.inputToken ? tokenFromV2(res.inputToken) : undefined,
    totalInAmount: res.totalInAmount,
    totalInAmountFormatted: res.totalInAmountFormatted,
    legs: (res.legs ?? []).map(legFromV2),
    rail: "robinhood",
  };
}

// ── Settlement history ──────────────────────────────────────────────────────

export function settlementFromV1(item: SettlementHistoryItem): RailSettlementRecord {
  return {
    id: item.id,
    txId: item.signature,
    senderWallet: item.senderWallet,
    recipientHandle: item.recipientHandle,
    recipientWallet: item.recipientWallet,
    inputAddress: item.inputMint,
    inputAmount: item.inputAmount,
    outputBreakdown: (item.outputBreakdown ?? []).map((o) => ({
      symbol: o.symbol,
      amount: o.amount,
      address: o.mint,
    })),
    status: item.status,
    createdAt: item.createdAt,
  };
}

// ── Invoices ────────────────────────────────────────────────────────────────

export function invoiceFromV1(inv: InvoiceRecord): RailInvoice {
  return {
    id: inv.id,
    recipientHandle: inv.recipientHandle,
    recipientWallet: inv.recipientWallet,
    amount: inv.amount,
    tokenAddress: inv.tokenMint,
    tokenSymbol: inv.tokenSymbol,
    memo: inv.memo,
    status: inv.status,
    txId: inv.signature,
    payerWallet: inv.payerWallet,
    creatorWallet: inv.creatorWallet,
    creatorHandle: inv.creatorHandle,
    createdAt: inv.createdAt,
    expiresAt: inv.expiresAt,
    paidAt: inv.paidAt,
    payUrl: inv.payUrl,
    walletPayUrl: inv.solanaPayUrl,
    rail: "solana",
  };
}

export function invoiceFromV2(inv: V2Invoice): RailInvoice {
  return {
    id: inv.id,
    recipientHandle: inv.recipientHandle,
    recipientWallet: inv.recipientWallet,
    amount: inv.targetAmount,
    tokenAddress: inv.targetTokenAddress,
    tokenSymbol: inv.targetTokenSymbol,
    memo: inv.memo,
    status: inv.status,
    txId: inv.txHash,
    payerWallet: inv.payerWallet,
    creatorWallet: inv.creatorWallet,
    creatorHandle: inv.creatorHandle,
    createdAt: inv.createdAt,
    expiresAt: inv.expiresAt,
    paidAt: inv.paidAt,
    payUrl: inv.payUrl,
    // Robinhood Chain has no Solana Pay analogue, so there is no QR URI to give.
    walletPayUrl: undefined,
    rail: "robinhood",
  };
}

// ── Bot pending queue ───────────────────────────────────────────────────────

export function pendingFromV1(p: PendingSettlementRecord): RailPendingSettlement {
  return {
    id: p.id,
    sourceRef: p.sourceRef,
    authorXHandle: p.authorXHandle,
    recipientHandle: p.recipientHandle,
    recipientWallet: p.recipientWallet,
    inputToken: p.inputToken,
    inputAmount: p.inputAmount,
    tokenAddress: p.tokenMint,
    assetType: p.assetType,
    portfolioSummary: (p.portfolioSummary ?? []).map((i) => ({
      symbol: i.symbol,
      percentage: i.percentage,
      allocatedAmount: i.allocatedAmount,
      name: i.name,
      address: i.mint,
      image: i.image,
      isNft: i.isNft,
    })),
    tweetUrl: p.tweetUrl,
    status: p.status,
    txId: p.signature,
    settledAt: p.settledAt,
    createdAt: p.createdAt,
    rail: "solana",
  };
}

export function pendingFromV2(p: V2PendingSettlement): RailPendingSettlement {
  return {
    id: p.id,
    sourceRef: p.sourceRef,
    authorXHandle: p.authorXHandle,
    recipientHandle: p.recipientHandle,
    recipientWallet: p.recipientWallet,
    inputToken: p.inputToken,
    inputAmount: p.inputAmount,
    tokenAddress: p.tokenAddress,
    tokenId: p.tokenId,
    assetType: p.assetType,
    portfolioSummary: (p.portfolioSummary ?? []).map((i) => ({
      symbol: i.symbol,
      percentage: i.percentage,
      allocatedAmount: i.allocatedAmount,
      name: i.name,
      address: i.tokenAddress,
      image: i.image,
      isNft: i.isNft,
    })),
    tweetUrl: p.tweetUrl,
    status: p.status,
    txId: p.txHash ?? p.signature,
    settledAt: p.settledAt,
    createdAt: p.createdAt,
    rail: "robinhood",
  };
}

// ── Collectibles ────────────────────────────────────────────────────────────

export function nftFromV1(nft: NftMetadata): RailNft {
  return {
    address: nft.mint,
    name: nft.name,
    symbol: nft.symbol,
    image: nft.image,
    description: nft.description,
    rail: "solana",
  };
}

export function nftFromV2(res: V2NftMetadataResponse): RailNft {
  return {
    address: res.contractAddress,
    tokenId: res.tokenId,
    name: res.name,
    symbol: res.symbol,
    image: res.image,
    description: res.description,
    owner: res.owner,
    rail: "robinhood",
  };
}

/**
 * Stable key for a collectible across both rails. A mint is unique on its own;
 * an ERC-721 needs the contract and the token id together.
 */
export const nftKey = (nft: Pick<RailNft, "address" | "tokenId">) =>
  nft.tokenId ? `${nft.address}:${nft.tokenId}` : nft.address;
