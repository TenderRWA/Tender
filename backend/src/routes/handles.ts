import { Router, Request, Response } from "express";
import { query } from "../db";
import { resolveSolanaToken } from "../lib/rwaTokens";

export const handlesRouter = Router();

// GET /api/v1/handles/owner/:wallet
handlesRouter.get("/owner/:wallet", async (req: Request, res: Response) => {
  try {
    const wallet = req.params.wallet.trim();
    const result = await query(
      "SELECT handle, owner_wallet, metadata, created_at, updated_at FROM handles WHERE owner_wallet = $1 ORDER BY created_at DESC",
      [wallet]
    );
    res.json({
      ownerWallet: wallet,
      handles: result.rows.map((r) => r.handle),
      count: result.rows.length,
    });
  } catch (err: any) {
    console.error("Error fetching handles by owner:", err);
    res.status(500).json({ error: "Failed to fetch handles by owner", details: err.message });
  }
});

// GET /api/v1/handles/:handle
handlesRouter.get("/:handle", async (req: Request, res: Response) => {
  try {
    const handle = req.params.handle.toLowerCase().trim();

    const handleResult = await query(
      "SELECT handle, owner_wallet, metadata, created_at, updated_at FROM handles WHERE handle = $1",
      [handle]
    );

    if (handleResult.rows.length === 0) {
      res.status(404).json({ error: `Handle '@${handle}' is not registered` });
      return;
    }

    const handleRecord = handleResult.rows[0];

    const electionsResult = await query(
      "SELECT id, asset_symbol, asset_mint, basis_points, is_active FROM handle_elections WHERE handle = $1 AND is_active = TRUE ORDER BY basis_points DESC",
      [handle]
    );

    const elections = electionsResult.rows.map((row) => {
      const tokenInfo = resolveSolanaToken(row.asset_mint);
      return {
        id: row.id,
        symbol: row.asset_symbol,
        mint: row.asset_mint,
        basisPoints: row.basis_points,
        percentage: row.basis_points / 100,
        token: tokenInfo,
      };
    });

    res.json({
      handle: handleRecord.handle,
      ownerWallet: handleRecord.owner_wallet,
      metadata: handleRecord.metadata,
      elections,
      totalBasisPoints: elections.reduce((acc, e) => acc + e.basisPoints, 0),
      createdAt: handleRecord.created_at,
      updatedAt: handleRecord.updated_at,
    });
  } catch (err: any) {
    console.error("Error fetching handle:", err);
    res.status(500).json({ error: "Failed to fetch handle details", details: err.message });
  }
});

// POST /api/v1/handles/register
handlesRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const { handle, ownerWallet, metadata, elections } = req.body as {
      handle: string;
      ownerWallet: string;
      metadata?: Record<string, any>;
      elections?: Array<{ symbol: string; mint: string; basisPoints: number }>;
    };

    if (!handle || !ownerWallet) {
      res.status(400).json({ error: "handle and ownerWallet are required" });
      return;
    }

    const normalizedHandle = handle.toLowerCase().replace(/^@/, "").trim();

    // Default to 100% USDC if no election provided
    const targetElections = elections && elections.length > 0
      ? elections
      : [{ symbol: "USDC", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", basisPoints: 10000 }];

    const totalBps = targetElections.reduce((sum, e) => sum + e.basisPoints, 0);
    if (totalBps !== 10000) {
      res.status(400).json({ error: `Total basis points must equal 10000 (100%). Received: ${totalBps}` });
      return;
    }

    // Check availability
    const existing = await query("SELECT handle FROM handles WHERE handle = $1", [normalizedHandle]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: `Handle '@${normalizedHandle}' is already registered` });
      return;
    }

    // Insert handle
    await query(
      "INSERT INTO handles (handle, owner_wallet, metadata) VALUES ($1, $2, $3)",
      [normalizedHandle, ownerWallet, JSON.stringify(metadata || {})]
    );

    // Insert elections
    for (const ele of targetElections) {
      await query(
        "INSERT INTO handle_elections (handle, asset_symbol, asset_mint, basis_points) VALUES ($1, $2, $3, $4)",
        [normalizedHandle, ele.symbol, ele.mint, ele.basisPoints]
      );
    }

    res.status(201).json({
      success: true,
      handle: normalizedHandle,
      ownerWallet,
      elections: targetElections,
      message: `Handle '@${normalizedHandle}' registered successfully`,
    });
  } catch (err: any) {
    console.error("Error registering handle:", err);
    res.status(500).json({ error: "Failed to register handle", details: err.message });
  }
});

// PUT /api/v1/handles/:handle/elections
handlesRouter.put("/:handle/elections", async (req: Request, res: Response) => {
  try {
    const handle = req.params.handle.toLowerCase().replace(/^@/, "").trim();
    const { elections, ownerWallet } = req.body as {
      elections: Array<{ symbol: string; mint: string; basisPoints: number }>;
      ownerWallet?: string;
    };

    if (!Array.isArray(elections) || elections.length === 0) {
      res.status(400).json({ error: "elections array is required" });
      return;
    }

    const totalBps = elections.reduce((sum, e) => sum + e.basisPoints, 0);
    if (totalBps !== 10000) {
      res.status(400).json({
        error: `Total basis points across active elections must sum to exactly 10000 (100%). Received: ${totalBps}`,
      });
      return;
    }

    // Verify handle existence
    const handleResult = await query("SELECT handle, owner_wallet FROM handles WHERE handle = $1", [handle]);
    if (handleResult.rows.length === 0) {
      res.status(404).json({ error: `Handle '@${handle}' not found` });
      return;
    }

    if (ownerWallet && handleResult.rows[0].owner_wallet !== ownerWallet) {
      res.status(403).json({ error: "Unauthorized: wallet address does not own this handle" });
      return;
    }

    // Deactivate previous elections
    await query("UPDATE handle_elections SET is_active = FALSE WHERE handle = $1", [handle]);

    // Insert new elections
    for (const ele of elections) {
      await query(
        "INSERT INTO handle_elections (handle, asset_symbol, asset_mint, basis_points, is_active) VALUES ($1, $2, $3, $4, TRUE)",
        [handle, ele.symbol, ele.mint, ele.basisPoints]
      );
    }

    await query("UPDATE handles SET updated_at = NOW() WHERE handle = $1", [handle]);

    res.json({
      success: true,
      handle,
      elections,
      totalBasisPoints: totalBps,
      message: "Handle elections updated successfully",
    });
  } catch (err: any) {
    console.error("Error updating elections:", err);
    res.status(500).json({ error: "Failed to update elections", details: err.message });
  }
});
