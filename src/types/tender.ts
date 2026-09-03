/**
 * Data models for the TENDER settlement API.
 * Mirrors tender-FRONTEND-INTEGRATION.md §3 plus the invoice/registration shapes
 * the backend actually returns (backend/src/routes/*).
 */

// ── RWA & Token Types ───────────────────────────────────────────────────────

export interface SolanaTokenInfo {
  slug?: string;
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  isNative?: boolean;
  isBaseCurrency?: boolean;
  underlyingTicker?: string;
  iconUrl?: string;
}

export interface AssetsResponse {
  baseCurrencies: SolanaTokenInfo[];
  featured: SolanaTokenInfo[];
  /** Absent when `featured=true` — that branch returns `count` instead. */
  total?: number;
  count?: number;
  limit?: number;
  offset?: number;
  assets?: SolanaTokenInfo[];
}

// ── Handle & Election Types ────────────────────────────────────────────────

export interface PortfolioElection {
  id?: number;
  symbol: string;
  mint: string;
  /** 100 bps = 1.00%. Sum of active elections must equal 10,000. */
  basisPoints: number;
  percentage: number;
  token?: SolanaTokenInfo;
}

export interface HandleDetailsResponse {
  handle: string;
  ownerWallet: string;
  /**
   * Free-form JSON blob returned verbatim by the API. `any` rather than
   * `unknown` because server functions reject `unknown` as non-serializable.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>;
  elections: PortfolioElection[];
  totalBasisPoints: number;
  createdAt: string;
  updatedAt: string;
}

export interface ElectionInput {
  symbol: string;
  /** Optional on the wire — the server function resolves it from the symbol. */
  mint?: string;
  basisPoints: number;
}

export interface HandleAvailability {
  handle: string;
  registered: boolean;
  details: HandleDetailsResponse | null;
}

export interface RegisterHandleResponse {
  success: boolean;
  handle: string;
  ownerWallet: string;
  elections: Array<{ symbol: string; mint: string; basisPoints: number }>;
  message: string;
}

export interface UpdateElectionsResponse {
  success: boolean;
  handle: string;
  elections: Array<{ symbol: string; mint: string; basisPoints: number }>;
  totalBasisPoints: number;
  message: string;
}

export interface OwnerHandlesResponse {
  ownerWallet: string;
  handles: string[];
  count: number;
}

// ── Dual Provider & Settlement Types ───────────────────────────────────────

export type QuoteProvider = "jupiter" | "relay";

export interface ProviderQuoteSummary {
  provider: QuoteProvider;
  outAmount: string;
  outAmountFormatted: string;
  priceImpactPct: number;
  rate?: string;
  success: boolean;
  error?: string;
}

export interface DualQuoteResponse {
  winner: QuoteProvider;
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
    provider: QuoteProvider;
    // Opaque provider payloads, echoed back to /settle/build-tx untouched.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jupiterQuote?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    relayQuote?: any;
  };
}

export interface PortfolioQuoteLeg {
  assetSymbol: string;
  assetMint: string;
  basisPoints: number;
  allocatedInAmount: string;
  allocatedInAmountFormatted: string;
  quote: DualQuoteResponse;
}

export interface ElectionQuoteResponse {
  recipientHandle?: string | null;
  recipientWallet: string;
  portfolioResult: {
    totalInAmount: string;
    totalInAmountFormatted: string;
    inputToken?: SolanaTokenInfo;
    legs: PortfolioQuoteLeg[];
  };
}

export interface BuildTxPlanResponse {
  provider: QuoteProvider;
  base64Transaction?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  relaySteps?: any[];
  details: {
    inAmount: string;
    outAmount: string;
    rate: string;
    priceImpactPct: number;
  };
}

export interface ConfirmSettlementResponse {
  success: boolean;
  signature: string;
  status: string;
  recordedId: string | number | null;
}

export interface SettlementHistoryItem {
  id: string | number;
  signature: string;
  senderWallet: string;
  recipientHandle: string | null;
  recipientWallet: string;
  inputMint: string;
  inputAmount: string;
  outputBreakdown: Array<{ symbol: string; amount: string; mint?: string }>;
  status: string;
  createdAt: string;
}

export interface SettlementHistoryResponse {
  settlements: SettlementHistoryItem[];
  count: number;
}

// ── Invoices ───────────────────────────────────────────────────────────────

export interface InvoiceRecord {
  id: string;
  recipientHandle: string;
  recipientWallet: string;
  amount: string;
  tokenMint: string;
  tokenSymbol: string;
  memo?: string;
  status: "pending" | "paid" | "expired";
  signature?: string;
  payerWallet?: string;
  createdAt: string;
  expiresAt: string;
  paidAt?: string;
  /** Shareable web checkout URL: `https://tenderrwa.com/pay/<id>` */
  payUrl: string;
  /** Mobile QR code URL: `solana:<api>/api/v1/solana-pay/<id>` */
  solanaPayUrl: string;
}

export type InvoiceResponse = InvoiceRecord;

export interface InvoiceDetailsResponse {
  invoice: InvoiceRecord;
  elections: Array<{ symbol: string; mint: string; basisPoints: number }>;
}

export interface InvoiceListResponse {
  invoices: InvoiceRecord[];
  count: number;
}

// ── X (Twitter) Account Binding ───────────────────────────────────────────

export interface XAccount {
  walletAddress: string;
  xUserId: string;
  xUsername: string;
  linkedAt: string;
}

export interface XAccountResponse {
  linked: boolean;
  account: XAccount | null;
}

