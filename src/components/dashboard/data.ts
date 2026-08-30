/* Mock data for the TENDER dashboard. Frontend only: realistic shapes, no backend. */

export type ReceiptStatus = "optimal" | "stable" | "issue";

export interface ReceiptLeg {
  asset: string;
  pct: number;
  amount: number;
}

export interface Receipt {
  id: string;
  handle: string;
  inToken: string;
  inAmount: number;
  legs: ReceiptLeg[];
  fee: number;
  status: ReceiptStatus;
  time: string;
}

export const RECEIPTS: Receipt[] = [
  {
    id: "RCP-88412",
    handle: "@mira.sol",
    inToken: "USDC",
    inAmount: 4200,
    legs: [
      { asset: "SPYx", pct: 50, amount: 2091.6 },
      { asset: "GLDx", pct: 30, amount: 1254.96 },
      { asset: "USDC", pct: 20, amount: 836.64 },
    ],
    fee: 16.8,
    status: "optimal",
    time: "12:42:07",
  },
  {
    id: "RCP-88411",
    handle: "@atlas.cap",
    inToken: "SOL",
    inAmount: 9650,
    legs: [
      { asset: "TSLAx", pct: 40, amount: 3837.3 },
      { asset: "NVDAx", pct: 35, amount: 3357.6 },
      { asset: "USDC", pct: 25, amount: 2412.5 },
    ],
    fee: 42.6,
    status: "optimal",
    time: "12:31:54",
  },
  {
    id: "RCP-88410",
    handle: "@juno",
    inToken: "USDC",
    inAmount: 780,
    legs: [
      { asset: "SPYx", pct: 60, amount: 464.9 },
      { asset: "USDC", pct: 40, amount: 311.9 },
    ],
    fee: 3.2,
    status: "stable",
    time: "12:18:33",
  },
  {
    id: "RCP-88409",
    handle: "@northpool",
    inToken: "TENDER",
    inAmount: 15200,
    legs: [
      { asset: "GLDx", pct: 50, amount: 7571.2 },
      { asset: "SPYx", pct: 50, amount: 7571.2 },
    ],
    fee: 57.6,
    status: "optimal",
    time: "11:57:02",
  },
  {
    id: "RCP-88408",
    handle: "@kaito.sol",
    inToken: "USDC",
    inAmount: 2350,
    legs: [
      { asset: "NVDAx", pct: 70, amount: 1635.4 },
      { asset: "USDC", pct: 30, amount: 701.5 },
    ],
    fee: 13.1,
    status: "issue",
    time: "11:44:19",
  },
  {
    id: "RCP-88407",
    handle: "@delta.lab",
    inToken: "SOL",
    inAmount: 5100,
    legs: [
      { asset: "SPYx", pct: 34, amount: 1725.7 },
      { asset: "TSLAx", pct: 33, amount: 1675.4 },
      { asset: "GLDx", pct: 33, amount: 1675.4 },
    ],
    fee: 23.5,
    status: "stable",
    time: "11:22:48",
  },
  {
    id: "RCP-88406",
    handle: "@mira.sol",
    inToken: "USDC",
    inAmount: 1250,
    legs: [
      { asset: "SPYx", pct: 50, amount: 621.9 },
      { asset: "GLDx", pct: 30, amount: 373.1 },
      { asset: "USDC", pct: 20, amount: 248.8 },
    ],
    fee: 6.2,
    status: "optimal",
    time: "10:58:11",
  },
  {
    id: "RCP-88405",
    handle: "@osaka.pay",
    inToken: "USDC",
    inAmount: 8900,
    legs: [
      { asset: "USDC", pct: 100, amount: 8861.2 },
    ],
    fee: 38.8,
    status: "stable",
    time: "10:31:26",
  },
];

/** Settlement volume, last 30 days, in $K. */
export const VOLUME_30D = [
  182, 204, 191, 233, 248, 219, 265, 281, 254, 296,
  312, 288, 327, 341, 319, 356, 372, 348, 389, 401,
  376, 418, 432, 405, 447, 461, 438, 472, 489, 512,
];

/** Short sparkline series for the overview stat cards. */
export const SPARKS = {
  settled: [182, 204, 191, 233, 265, 281, 312, 327, 356, 389, 418, 447, 472, 512],
  handles: [61, 63, 66, 64, 69, 72, 74, 71, 76, 78, 80, 82, 81, 84],
  elections: [22, 24, 23, 26, 28, 27, 29, 31, 30, 32, 34, 33, 35, 36],
  receipts: [38, 42, 40, 47, 45, 52, 49, 55, 58, 54, 61, 59, 64, 62],
};

export const STATUS_SPLIT = [
  { value: 66, label: "Optimal", note: "full election fill", color: "#3ECF8E" },
  { value: 25, label: "Stable", note: "safe-settled to USDC", color: "#F5A524" },
  { value: 9, label: "Issues", note: "reverted, zero funds stranded", color: "#E8322A" },
];

export interface Invoice {
  id: string;
  amount: number;
  token: string;
  memo: string;
  expiry: string;
  status: "open" | "paid" | "expired";
}

export const INVOICES: Invoice[] = [
  { id: "INV-2041", amount: 1800, token: "USDC", memo: "Retainer: August", expiry: "2026-09-02", status: "open" },
  { id: "INV-2040", amount: 425, token: "SOL", memo: "Audit sprint 12", expiry: "2026-08-30", status: "open" },
  { id: "INV-2039", amount: 9600, token: "USDC", memo: "Integration milestone 3", expiry: "2026-08-18", status: "paid" },
  { id: "INV-2038", amount: 750, token: "TENDER", memo: "Design package", expiry: "2026-08-11", status: "paid" },
  { id: "INV-2037", amount: 2200, token: "USDC", memo: "Retainer: July", expiry: "2026-08-01", status: "expired" },
  { id: "INV-2036", amount: 310, token: "SOL", memo: "RPC overage", expiry: "2026-07-28", status: "expired" },
];

export interface Vault {
  id: string;
  name: string;
  budget: number;
  token: string;
  cycle: string;
  nextRun: string;
  roster: number;
  /** Share of the current cycle elapsed, 0-100. */
  cyclePct: number;
}

export const VAULTS: Vault[] = [
  { id: "VLT-01", name: "Core Team", budget: 84000, token: "USDC", cycle: "Biweekly", nextRun: "2026-08-30 00:00 UTC", roster: 12, cyclePct: 64 },
  { id: "VLT-02", name: "Contributors", budget: 26500, token: "USDC", cycle: "Weekly", nextRun: "2026-08-29 00:00 UTC", roster: 31, cyclePct: 82 },
  { id: "VLT-03", name: "Grants", budget: 150000, token: "TENDER", cycle: "Monthly", nextRun: "2026-09-01 00:00 UTC", roster: 8, cyclePct: 37 },
];

export interface RosterEntry {
  handle: string;
  role: string;
  salary: number;
  token: string;
  vault: string;
}

export const ROSTER: RosterEntry[] = [
  { handle: "@mira.sol", role: "Protocol Lead", salary: 9200, token: "USDC", vault: "Core Team" },
  { handle: "@kaito.sol", role: "Runtime Eng", salary: 8400, token: "USDC", vault: "Core Team" },
  { handle: "@juno", role: "Design", salary: 6100, token: "USDC", vault: "Core Team" },
  { handle: "@delta.lab", role: "Integrations", salary: 3000, token: "USDC", vault: "Contributors" },
  { handle: "@osaka.pay", role: "DevRel", salary: 2750, token: "USDC", vault: "Contributors" },
  { handle: "@northpool", role: "Grant: Indexer", salary: 18750, token: "TENDER", vault: "Grants" },
  { handle: "@atlas.cap", role: "Grant: Market Making", salary: 18750, token: "TENDER", vault: "Grants" },
];

export interface UniverseAsset {
  mint: string;
  symbol: string;
  name: string;
  depth: number;
  change24h: number;
  status: "eligible" | "suspended";
}

export const UNIVERSE: UniverseAsset[] = [
  { mint: "Xs9d…f2Qa", symbol: "SPYx", name: "xStocks S&P 500", depth: 48200000, change24h: 1.8, status: "eligible" },
  { mint: "Xt4k…m81P", symbol: "TSLAx", name: "xStocks Tesla", depth: 31600000, change24h: -0.6, status: "eligible" },
  { mint: "Xn7v…c3Ld", symbol: "NVDAx", name: "xStocks NVIDIA", depth: 27400000, change24h: 2.4, status: "eligible" },
  { mint: "Xg2b…w9Re", symbol: "GLDx", name: "xStocks Gold", depth: 18900000, change24h: 0.3, status: "eligible" },
  { mint: "EPjF…5vTD", symbol: "USDC", name: "USD Coin", depth: 240000000, change24h: 0.0, status: "eligible" },
  { mint: "Xa5m…q7Hz", symbol: "AAPLx", name: "xStocks Apple", depth: 12400000, change24h: 1.1, status: "suspended" },
  { mint: "Xm8s…t4Vb", symbol: "GOOGLx", name: "xStocks Alphabet", depth: 9800000, change24h: -1.2, status: "suspended" },
];

export interface Buyback {
  id: string;
  amount: number;
  source: string;
  time: string;
  tx: string;
}

export const BUYBACKS: Buyback[] = [
  { id: "BB-1092", amount: 41200, source: "Settlement fees: epoch 148", time: "12:00 UTC", tx: "5xQe…9pLm" },
  { id: "BB-1091", amount: 38950, source: "Settlement fees: epoch 147", time: "00:00 UTC", tx: "3kRt…2wNa" },
  { id: "BB-1090", amount: 40110, source: "Settlement fees: epoch 146", time: "Yesterday 12:00 UTC", tx: "7yVb…6cXs" },
  { id: "BB-1089", amount: 36840, source: "Payroll crank surcharge", time: "Yesterday 04:12 UTC", tx: "9mZa…1dFg" },
  { id: "BB-1088", amount: 42500, source: "Settlement fees: epoch 145", time: "2d ago", tx: "2nHs…8kJh" },
];

export const ELIGIBLE_SYMBOLS = ["SPYx", "USDC", "GLDx", "TSLAx", "NVDAx"];

export const PAY_TOKENS = ["USDC", "SOL", "TENDER"];

export function formatUSD(n: number, decimals = 2): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCompactUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${formatUSD(n, 0)}`;
}
