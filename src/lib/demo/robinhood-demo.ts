/**
 * Placeholder payloads for the five reads the Robinhood rail cannot serve yet.
 *
 * `/api/v2` has no settlement history, handles-by-owner, invoice list, X account
 * binding or wallet NFT scan — all five return 404 today. Rather than delete the
 * screens that depend on them, they render this data with a DEMO badge so the
 * shape of the UI stays reviewable while the backend decides whether to build
 * the routes. See for-nzube.md for the request that went to the backend.
 *
 * Two rules keep this honest:
 *   1. Nothing here is ever returned without `isDemo: true` alongside it, and
 *      every surface that renders one is required to show the badge.
 *   2. Addresses and hashes are syntactically valid but deliberately patterned
 *      (repeating nibbles, `dem0` markers) so no one mistakes one for a real
 *      on-chain record.
 *
 * Delete this file, and the `demo*` branches in src/hooks/useTender.ts, the day
 * the five routes ship.
 */
import { ROBINHOOD_CHAIN_ID } from "@/lib/robinhoodChain";
import type {
  RailInvoice,
  RailNft,
  RailSettlementRecord,
} from "@/types/rail";

/** Verified Robinhood Chain contracts, so demo rows link to real explorer pages. */
const TOKENS = {
  USDG: "0x5fc5360d0400a0fd4f2af552add042d716f1d168",
  SPCX: "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa",
  NVDA: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC",
  TSLA: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d",
  AAPL: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9",
} as const;

const DEMO_WALLET = "0xdem0dem0dem0dem0dem0dem0dem0dem0dem0dem0";
const DEMO_PAYER = "0xdec0dec0dec0dec0dec0dec0dec0dec0dec0dec0";

const hash = (seed: string) => `0x${seed.repeat(64).slice(0, 64)}`;

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const daysAhead = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

export const DEMO_REASON =
  "Robinhood Chain has no endpoint for this yet — the row shape is a placeholder, not an on-chain record.";

/** `GET /api/v2/settle/history` — 404. Backs the Payments receipts table. */
export const demoSettlementHistory = (): RailSettlementRecord[] => [
  {
    id: "demo-1",
    txId: hash("de"),
    senderWallet: DEMO_WALLET,
    recipientHandle: "ninjastorm",
    recipientWallet: "0x1111111111111111111111111111111111111111",
    inputAddress: TOKENS.USDG,
    inputAmount: "250",
    outputBreakdown: [
      { symbol: "SPCX", amount: "0.811", address: TOKENS.SPCX },
      { symbol: "NVDA", amount: "0.134", address: TOKENS.NVDA },
    ],
    status: "confirmed",
    createdAt: daysAgo(1),
  },
  {
    id: "demo-2",
    txId: hash("c0"),
    senderWallet: DEMO_WALLET,
    recipientHandle: "ninjastorm",
    recipientWallet: "0x1111111111111111111111111111111111111111",
    inputAddress: TOKENS.USDG,
    inputAmount: "100",
    outputBreakdown: [{ symbol: "TSLA", amount: "0.294", address: TOKENS.TSLA }],
    status: "confirmed",
    createdAt: daysAgo(3),
  },
];

/** `GET /api/v2/invoices` — 404. Backs the Invoices list and the Pending tab. */
export const demoInvoices = (): RailInvoice[] => [
  {
    id: "demo-inv-01",
    recipientHandle: "ninjastorm",
    recipientWallet: "0x1111111111111111111111111111111111111111",
    amount: "1500",
    tokenAddress: TOKENS.USDG,
    tokenSymbol: "USDG",
    memo: "Retainer — placeholder row",
    status: "pending",
    payerWallet: undefined,
    creatorWallet: DEMO_WALLET,
    creatorHandle: "ninjastorm",
    createdAt: daysAgo(2),
    expiresAt: daysAhead(12),
    payUrl: "/pay/demo-inv-01",
    rail: "robinhood",
  },
  {
    id: "demo-inv-02",
    recipientHandle: "ninjastorm",
    recipientWallet: "0x1111111111111111111111111111111111111111",
    amount: "420",
    tokenAddress: TOKENS.USDG,
    tokenSymbol: "USDG",
    memo: "Design sprint — placeholder row",
    status: "paid",
    txId: hash("a1"),
    payerWallet: DEMO_PAYER,
    creatorWallet: DEMO_WALLET,
    creatorHandle: "ninjastorm",
    createdAt: daysAgo(9),
    expiresAt: daysAhead(5),
    paidAt: daysAgo(8),
    payUrl: "/pay/demo-inv-02",
    rail: "robinhood",
  },
];

/** `GET /api/v2/nft/wallet/:wallet` — 404. Backs the collectible picker grid. */
export const demoWalletNfts = (): RailNft[] => [
  {
    address: TOKENS.SPCX,
    tokenId: "101",
    name: "SpaceX Alpha Tier — placeholder",
    symbol: "SPCX",
    rail: "robinhood",
  },
  {
    address: TOKENS.AAPL,
    tokenId: "7",
    name: "Apple Founders Pass — placeholder",
    symbol: "AAPL",
    rail: "robinhood",
  },
];

export const DEMO_NETWORK_ID = ROBINHOOD_CHAIN_ID;
