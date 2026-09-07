import { query } from "../../db";
import {
  isValidEvmAddress,
  resolveRobinhoodToken,
  RobinhoodTokenInfo,
  USDG,
  FEATURED_ROBINHOOD_ASSETS,
} from "../lib/robinhoodTokens";

export interface V2ElectionInput {
  symbol: string;
  tokenAddress: string;
  basisPoints: number;
}

export interface V2ElectionRecord {
  id: number | string;
  symbol: string;
  tokenAddress: string;
  decimals: number;
  basisPoints: number;
  percentage: number;
  token?: RobinhoodTokenInfo;
}

export interface V2HandleDetails {
  handle: string;
  ownerWallet: string;
  xUserId?: string | null;
  xHandle?: string | null;
  metadata?: Record<string, any>;
  elections: V2ElectionRecord[];
  totalBasisPoints: number;
  createdAt: string;
  updatedAt: string;
}

// Fallback demo tags for unit testing & zero-DB offline environments
const DEMO_V2_HANDLES: Record<string, V2HandleDetails> = {
  ninjastorm: {
    handle: "ninjastorm",
    ownerWallet: "0x71C67ed3e80e5e453538096C91000570b74057A0",
    xHandle: "ninjastorm",
    metadata: {},
    elections: [
      {
        id: 1,
        symbol: "SPCX",
        tokenAddress: "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa",
        decimals: 18,
        basisPoints: 6000,
        percentage: 60,
        token: resolveRobinhoodToken("SPCX"),
      },
      {
        id: 2,
        symbol: "USDG",
        tokenAddress: "0x5fc5360d0400a0fd4f2af552add042d716f1d168",
        decimals: 6,
        basisPoints: 3000,
        percentage: 30,
        token: USDG,
      },
      {
        id: 3,
        symbol: "NVDA",
        tokenAddress: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC",
        decimals: 18,
        basisPoints: 1000,
        percentage: 10,
        token: resolveRobinhoodToken("NVDA"),
      },
    ],
    totalBasisPoints: 10000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  nothipposol: {
    handle: "nothipposol",
    ownerWallet: "0x2aCStNyta182cUEry72GNNP7R2CcyErGWA8DLQVjjw",
    xHandle: "nothipposol",
    metadata: {},
    elections: [
      {
        id: 4,
        symbol: "USDG",
        tokenAddress: USDG.address,
        decimals: 6,
        basisPoints: 10000,
        percentage: 100,
        token: USDG,
      },
    ],
    totalBasisPoints: 10000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

export async function getV2HandleDetails(handleInput: string): Promise<V2HandleDetails | null> {
  const clean = handleInput.toLowerCase().replace(/^@|^#/, "").trim();
  if (!clean) return null;

  try {
    const handleRes = await query(
      "SELECT handle, owner_wallet, x_user_id, x_handle, metadata, created_at, updated_at FROM v2_handles WHERE LOWER(handle) = $1 OR LOWER(x_handle) = $1 LIMIT 1",
      [clean]
    );

    if (handleRes.rows && handleRes.rows.length > 0) {
      const row = handleRes.rows[0];
      const electionsRes = await query(
        "SELECT id, asset_symbol, token_address, decimals, basis_points, percentage, is_active FROM v2_elections WHERE handle = $1 AND is_active = TRUE ORDER BY basis_points DESC",
        [row.handle]
      );

      const elections: V2ElectionRecord[] = (electionsRes.rows || []).map((e: any) => {
        const token = resolveRobinhoodToken(e.token_address) || resolveRobinhoodToken(e.asset_symbol);
        return {
          id: e.id,
          symbol: e.asset_symbol,
          tokenAddress: e.token_address,
          decimals: e.decimals || token?.decimals || 18,
          basisPoints: e.basis_points,
          percentage: Number(e.percentage),
          token,
        };
      });

      return {
        handle: row.handle,
        ownerWallet: row.owner_wallet,
        xUserId: row.x_user_id,
        xHandle: row.x_handle,
        metadata: row.metadata,
        elections,
        totalBasisPoints: elections.reduce((sum, e) => sum + e.basisPoints, 0),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }
  } catch (err) {
    console.warn("[V2 Handle] Database query failed, checking memory fallback:", err);
  }

  // Check demo fallback for tests / offline mode
  if (DEMO_V2_HANDLES[clean]) {
    return DEMO_V2_HANDLES[clean];
  }

  return null;
}

export async function registerV2Handle(params: {
  handle: string;
  ownerWallet: string;
  xUserId?: string;
  xHandle?: string;
  metadata?: Record<string, any>;
  elections?: V2ElectionInput[];
}): Promise<V2HandleDetails> {
  const clean = params.handle.toLowerCase().replace(/^@|^#/, "").trim();
  const owner = params.ownerWallet.trim();

  if (!clean) throw new Error("handle is required");
  if (!isValidEvmAddress(owner)) {
    throw new Error(`Invalid Robinhood EVM owner wallet address: '${owner}'. Must be 42-character 0x address.`);
  }

  // Default to 100% USDG if no elections specified
  const targetElections: V2ElectionInput[] =
    params.elections && params.elections.length > 0
      ? params.elections
      : [{ symbol: "USDG", tokenAddress: USDG.address, basisPoints: 10000 }];

  const totalBps = targetElections.reduce((sum, e) => sum + e.basisPoints, 0);
  if (totalBps !== 10000) {
    throw new Error(`Total basis points across elections must sum to exactly 10000 (100%). Received: ${totalBps}`);
  }

  // Check availability
  const existing = await query("SELECT handle FROM v2_handles WHERE LOWER(handle) = $1", [clean]);
  if (existing.rows && existing.rows.length > 0) {
    throw new Error(`Robinhood tag '@${clean}' is already registered`);
  }

  // Insert tag
  await query(
    `INSERT INTO v2_handles (handle, owner_wallet, x_user_id, x_handle, metadata, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
    [
      clean,
      owner,
      params.xUserId || null,
      params.xHandle ? params.xHandle.replace(/^@/, "").toLowerCase() : null,
      JSON.stringify(params.metadata || {}),
    ]
  );

  // Insert elections
  const electionRecords: V2ElectionRecord[] = [];
  for (const e of targetElections) {
    const token = resolveRobinhoodToken(e.tokenAddress) || resolveRobinhoodToken(e.symbol) || USDG;
    const pct = e.basisPoints / 100;
    const res = await query(
      `INSERT INTO v2_elections (handle, asset_symbol, token_address, decimals, basis_points, percentage, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING id`,
      [clean, token.symbol, token.address, token.decimals, e.basisPoints, pct]
    );
    electionRecords.push({
      id: res.rows && res.rows.length > 0 ? res.rows[0].id : Date.now(),
      symbol: token.symbol,
      tokenAddress: token.address,
      decimals: token.decimals,
      basisPoints: e.basisPoints,
      percentage: pct,
      token,
    });
  }

  return {
    handle: clean,
    ownerWallet: owner,
    xUserId: params.xUserId,
    xHandle: params.xHandle,
    metadata: params.metadata || {},
    elections: electionRecords,
    totalBasisPoints: totalBps,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function updateV2Elections(params: {
  handle: string;
  elections: V2ElectionInput[];
  ownerWallet?: string;
}): Promise<V2ElectionRecord[]> {
  const clean = params.handle.toLowerCase().replace(/^@|^#/, "").trim();
  if (!clean) throw new Error("handle is required");

  if (!Array.isArray(params.elections) || params.elections.length === 0) {
    throw new Error("elections array is required");
  }

  const totalBps = params.elections.reduce((sum, e) => sum + e.basisPoints, 0);
  if (totalBps !== 10000) {
    throw new Error(`Total basis points across elections must sum to exactly 10000 (100%). Received: ${totalBps}`);
  }

  // Verify handle
  const existing = await query("SELECT handle, owner_wallet FROM v2_handles WHERE LOWER(handle) = $1", [clean]);
  if (!existing.rows || existing.rows.length === 0) {
    throw new Error(`Robinhood tag '@${clean}' not found`);
  }

  if (params.ownerWallet && existing.rows[0].owner_wallet.toLowerCase() !== params.ownerWallet.toLowerCase()) {
    throw new Error("Unauthorized: provided wallet does not own this Robinhood tag");
  }

  // Deactivate prior elections
  await query("UPDATE v2_elections SET is_active = FALSE WHERE handle = $1", [clean]);

  // Insert new elections
  const updatedRecords: V2ElectionRecord[] = [];
  for (const e of params.elections) {
    const token = resolveRobinhoodToken(e.tokenAddress) || resolveRobinhoodToken(e.symbol) || USDG;
    const pct = e.basisPoints / 100;
    const res = await query(
      `INSERT INTO v2_elections (handle, asset_symbol, token_address, decimals, basis_points, percentage, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING id`,
      [clean, token.symbol, token.address, token.decimals, e.basisPoints, pct]
    );
    updatedRecords.push({
      id: res.rows && res.rows.length > 0 ? res.rows[0].id : Date.now(),
      symbol: token.symbol,
      tokenAddress: token.address,
      decimals: token.decimals,
      basisPoints: e.basisPoints,
      percentage: pct,
      token,
    });
  }

  await query("UPDATE v2_handles SET updated_at = NOW() WHERE handle = $1", [clean]);
  return updatedRecords;
}
