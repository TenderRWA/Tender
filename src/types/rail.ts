/**
 * Rail-neutral view models.
 *
 * V1 (Solana) and V2 (Robinhood Chain) describe the same product with different
 * nouns: a mint vs. a contract address, a signature vs. a transaction hash, a
 * winning provider vs. an execution venue. Components speak only this
 * vocabulary; src/lib/rail-normalize.ts is the single place either wire format
 * is translated into it.
 */
import type { RailId } from "@/lib/rail";

/** A token on whichever rail is active. `address` is a mint or an ERC-20 contract. */
export interface RailToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  isNative?: boolean;
  isBaseCurrency?: boolean;
  underlyingTicker?: string;
  iconUrl?: string;
  /** "native" | "stablecoin" | "equity" on V2; absent on V1. */
  assetType?: string;
}

export interface RailAssets {
  baseCurrencies: RailToken[];
  featured: RailToken[];
  /** The full catalog when one was requested, otherwise the featured set. */
  all: RailToken[];
  /** Size of the catalog the rail reports, not of `all`. */
  total: number;
}

export interface RailElection {
  id?: number;
  symbol: string;
  address: string;
  basisPoints: number;
  percentage: number;
  token?: RailToken;
}

export interface RailHandle {
  handle: string;
  ownerWallet: string;
  /** Bound X username, when the rail returns one. */
  xHandle?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>;
  elections: RailElection[];
  totalBasisPoints: number;
  createdAt: string;
  updatedAt: string;
  rail: RailId;
}

export interface RailHandleAvailability {
  handle: string;
  registered: boolean;
  details: RailHandle | null;
}

export interface RailElectionInput {
  symbol: string;
  /** Mint or contract. Optional — the server function resolves it by symbol. */
  address?: string;
  basisPoints: number;
}

export interface RailQuote {
  fromToken?: RailToken;
  toToken?: RailToken;
  amountIn: string;
  amountInFormatted: string;
  amountOut: string;
  amountOutFormatted: string;
  rate: string;
  priceImpactPct: number;
  /** "jupiter" / "relay" on Solana; "uniswap_v4" on Robinhood. */
  venue: string;
  /**
   * The untouched provider payload. On Solana it goes back to
   * `/settle/build-tx`; on Robinhood it carries the pre-built `steps`.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any;
}

export interface RailQuoteLeg {
  assetSymbol: string;
  assetAddress: string;
  basisPoints: number;
  percentage: number;
  allocatedInAmount: string;
  allocatedInAmountFormatted: string;
  quote: RailQuote;
  /** V2 only: the elected asset had no route, so this leg settles to USDG. */
  isFallback?: boolean;
}

export interface RailElectionQuote {
  recipientHandle?: string | null;
  recipientWallet: string;
  inputToken?: RailToken;
  totalInAmount: string;
  totalInAmountFormatted: string;
  legs: RailQuoteLeg[];
  rail: RailId;
}

/** One leg's outcome. `txId` is a base58 signature or a 0x hash. */
export interface RailSettlementLeg {
  symbol: string;
  txId?: string;
  /** Set when the leg produced no signable transaction and was reported instead. */
  skippedReason?: string;
}

export interface RailSettlementResult {
  legs: RailSettlementLeg[];
  txIds: string[];
  rail: RailId;
}

export interface RailSettlementRecord {
  id: string | number;
  txId: string;
  senderWallet: string;
  recipientHandle: string | null;
  recipientWallet: string;
  inputAddress: string;
  inputAmount: string;
  outputBreakdown: Array<{ symbol: string; amount: string; address?: string }>;
  status: string;
  createdAt: string;
}

export interface RailInvoice {
  id: string;
  recipientHandle: string;
  recipientWallet: string;
  amount: string;
  tokenAddress?: string;
  tokenSymbol: string;
  memo?: string;
  status: "pending" | "paid" | "expired";
  txId?: string;
  payerWallet?: string;
  creatorWallet?: string;
  creatorHandle?: string;
  createdAt: string;
  expiresAt: string;
  paidAt?: string;
  /** Shareable web checkout URL. */
  payUrl: string;
  /** Solana Pay QR URI. V1 only — Robinhood Chain has no equivalent scheme. */
  walletPayUrl?: string;
  rail: RailId;
}

export interface RailInvoiceDetails {
  invoice: RailInvoice;
  elections: Array<{ symbol: string; address: string; basisPoints: number }>;
}

export interface RailPendingItem {
  symbol: string;
  percentage: number;
  allocatedAmount: string;
  name?: string;
  address?: string;
  image?: string;
  isNft?: boolean;
}

export interface RailPendingSettlement {
  id: string;
  sourceRef: string;
  authorXHandle?: string;
  recipientHandle: string;
  recipientWallet: string;
  inputToken: string;
  inputAmount: string;
  /** Mint (V1) or ERC-721 contract (V2) of the asset being sent. */
  tokenAddress?: string;
  /** V2 only: the ERC-721 token id, which V1 has no analogue for. */
  tokenId?: string;
  assetType?: "token" | "nft";
  portfolioSummary?: RailPendingItem[];
  tweetUrl?: string;
  status: "pending" | "completed" | "cancelled" | "dismissed";
  txId?: string;
  signature?: string;
  settledAt?: string;
  createdAt: string;
  rail: RailId;
}

/**
 * A collectible. On Solana an `address` (the mint) identifies it on its own;
 * on Robinhood Chain it takes a contract plus a `tokenId`.
 */
export interface RailNft {
  address: string;
  tokenId?: string;
  name: string;
  symbol: string;
  image?: string;
  description?: string;
  owner?: string;
  rail: RailId;
}

export interface RailNftTransferResult {
  txId: string;
  nft: RailNft;
  recipientWallet: string;
  recipientHandle?: string;
}

export interface RailXAccount {
  walletAddress: string;
  xUserId: string;
  xUsername: string;
  linkedAt: string;
}

/**
 * Wrapper for reads the active rail cannot serve yet. `isDemo` is true when the
 * payload is a placeholder rather than something the rail returned, and every
 * surface that renders one is required to say so on screen.
 */
export interface RailMaybeDemo<T> {
  data: T;
  isDemo: boolean;
  /** Why it is demo data — shown in the badge tooltip. */
  demoReason?: string;
}
