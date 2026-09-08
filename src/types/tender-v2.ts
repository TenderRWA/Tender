/**
 * Wire shapes for the TENDER V2 (Robinhood Chain) API, `/api/v2/...`.
 *
 * These mirror what api.tenderrwa.com actually returns, which differs from the
 * integration spec in two places worth knowing about:
 *   - `GET /assets/:symbolOrAddress` wraps its result: `{ token, networkId }`.
 *   - `POST /settle/election-quote` returns `legs` at the top level, not nested
 *     under a `portfolioResult` object the way the V1 rail does.
 *
 * Nothing outside src/lib/rail-normalize.ts should import from here — the rest
 * of the app works in the rail-neutral models in src/types/rail.ts.
 */

// ── Tokens ──────────────────────────────────────────────────────────────────

export type V2AssetType = "native" | "stablecoin" | "equity";

export interface V2Token {
  symbol: string;
  name: string;
  /** ERC-20 contract; the zero address for native ETH. */
  address: string;
  decimals: number;
  isNative?: boolean;
  isBaseCurrency?: boolean;
  underlyingTicker?: string;
  iconUrl?: string;
  assetType?: V2AssetType;
}

export interface V2Network {
  chainId: number;
  name: string;
  nativeCurrency: string;
  blockExplorer: string;
}

export interface V2AssetsResponse {
  network: V2Network;
  baseCurrencies: V2Token[];
  featuredAssets: V2Token[];
  tokens?: V2Token[];
  count: number;
}

export interface V2AssetResponse {
  token: V2Token;
  networkId: number;
}

// ── Handles & elections ─────────────────────────────────────────────────────

export interface V2Election {
  id?: number;
  symbol: string;
  tokenAddress: string;
  decimals?: number;
  basisPoints: number;
  percentage: number;
  token?: V2Token;
}

export interface V2HandleResponse {
  handle: string;
  /** 42-char EVM address. */
  ownerWallet: string;
  xHandle?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>;
  elections: V2Election[];
  totalBasisPoints?: number;
  createdAt: string;
  updatedAt: string;
}

export interface V2ElectionInput {
  symbol: string;
  /** Optional on the wire — the server function resolves it from the symbol. */
  tokenAddress?: string;
  basisPoints: number;
}

export interface V2RegisterResponse {
  success: boolean;
  handle: string;
  ownerWallet: string;
  elections: Array<{ symbol: string; tokenAddress: string; basisPoints: number }>;
  message?: string;
}

export interface V2UpdateElectionsResponse {
  success: boolean;
  handle: string;
  elections: Array<{ symbol: string; tokenAddress: string; basisPoints: number }>;
  totalBasisPoints: number;
  message?: string;
}

// ── Settlement ──────────────────────────────────────────────────────────────

/** One signable EVM call. `to`/`data`/`value` go straight into wagmi. */
export interface V2TxData {
  to: string;
  data: string;
  value: string;
  chainId: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args?: any[];
}

export interface V2StepItem {
  status: "not_started" | "complete" | "incomplete";
  data: V2TxData;
}

/** `id: "approve"` means an ERC-20 approval; anything else is a plain send. */
export interface V2Step {
  id: string;
  action: string;
  description: string;
  kind: "transaction" | "signature";
  items: V2StepItem[];
}

export interface V2Quote {
  fromToken: V2Token;
  toToken: V2Token;
  amountIn: string;
  amountInFormatted: string;
  amountOut: string;
  amountOutFormatted: string;
  rate: string;
  priceImpactPct: number;
  timeEstimate?: number;
  executionVenue: string;
  steps: V2Step[];
}

export interface V2QuoteLeg {
  assetSymbol: string;
  assetAddress: string;
  basisPoints: number;
  percentage: number;
  allocatedInAmount: string;
  allocatedInAmountFormatted: string;
  quote: V2Quote;
  /** Set when the elected asset had no route and the leg fell back to USDG. */
  isFallbackUsdg?: boolean;
}

export interface V2ElectionQuoteResponse {
  recipientHandle?: string | null;
  recipientWallet: string;
  inputToken?: V2Token;
  totalInAmount: string;
  totalInAmountFormatted: string;
  legs: V2QuoteLeg[];
}

export interface V2ConfirmResponse {
  success: boolean;
  txHash: string;
  status: string;
  recordedId?: string | number | null;
}

// ── Invoices ────────────────────────────────────────────────────────────────

export interface V2Invoice {
  id: string;
  recipientHandle: string;
  recipientWallet: string;
  targetAmount: string;
  targetTokenAddress?: string;
  targetTokenSymbol: string;
  memo?: string;
  status: "pending" | "paid" | "expired";
  txHash?: string;
  payerWallet?: string;
  creatorWallet?: string;
  creatorHandle?: string;
  networkId: number;
  createdAt: string;
  expiresAt: string;
  paidAt?: string;
  payUrl: string;
}

export interface V2InvoiceCreateResponse {
  invoice: V2Invoice;
}

export interface V2InvoiceDetailsResponse {
  invoice: V2Invoice;
  elections: Array<{ symbol: string; tokenAddress: string; basisPoints: number }>;
}

// ── Bot pending queue ───────────────────────────────────────────────────────

export interface V2PendingPortfolioItem {
  symbol: string;
  percentage: number;
  allocatedAmount: string;
  name?: string;
  tokenAddress?: string;
  image?: string;
  isNft?: boolean;
}

export interface V2PendingSettlement {
  id: string;
  sourceRef: string;
  authorXId?: string;
  authorXHandle?: string;
  recipientHandle: string;
  recipientWallet: string;
  inputToken: string;
  inputAmount: string;
  tokenAddress?: string;
  /** ERC-721 token id, when the request is a collectible. */
  tokenId?: string;
  assetType?: "token" | "nft";
  portfolioSummary?: V2PendingPortfolioItem[];
  tweetUrl?: string;
  status: "pending" | "completed" | "cancelled" | "dismissed";
  signature?: string;
  txHash?: string;
  chain?: string;
  networkId?: number;
  settledAt?: string;
  createdAt: string;
}

export interface V2PendingResponse {
  pendingSettlements: V2PendingSettlement[];
  count: number;
}

// ── Sovereign NFT rail (ERC-721) ────────────────────────────────────────────

export interface V2ResolveTargetResponse {
  resolved: boolean;
  walletAddress: string;
  handle?: string;
  isHandle: boolean;
  networkId: number;
}

export interface V2NftMetadataResponse {
  networkId: number;
  contractAddress: string;
  tokenId: string;
  name: string;
  symbol: string;
  owner?: string;
  tokenURI?: string;
  image?: string;
  description?: string;
}

export interface V2NftTransferPlanResponse {
  success: boolean;
  networkId: number;
  token: {
    contractAddress: string;
    tokenId: string;
    name: string;
    symbol: string;
    image?: string;
  };
  sender: { walletAddress: string };
  recipient: { walletAddress: string; handle?: string };
  transaction: V2TxData;
}
