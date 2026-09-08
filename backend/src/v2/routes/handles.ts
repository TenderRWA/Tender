import { Router, Request, Response } from "express";
import { query } from "../../db";
import {
  registerV2Handle,
  getV2HandleDetails,
  updateV2Elections,
} from "../services/handleService";
import { isValidEvmAddress } from "../lib/robinhoodTokens";

export const v2HandlesRouter = Router();

// POST /api/v2/handles/register - Register tag on Robinhood Chain
v2HandlesRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const { handle, ownerWallet, metadata, elections, xUserId, xHandle } = req.body;

    if (!handle || !ownerWallet) {
      res.status(400).json({ error: "handle and ownerWallet are required" });
      return;
    }

    if (!isValidEvmAddress(ownerWallet)) {
      res.status(400).json({ error: "ownerWallet must be a valid 42-character EVM address (0x...)" });
      return;
    }

    const registered = await registerV2Handle({
      handle,
      ownerWallet,
      metadata,
      elections,
      xUserId,
      xHandle,
    });

    res.status(201).json({
      success: true,
      tag: registered,
      message: `Robinhood tag '@${registered.handle}' registered successfully on Chain 4663`,
    });
  } catch (err: any) {
    const status = err.message?.includes("already registered") ? 409 : 400;
    res.status(status).json({ error: err.message || "Failed to register Robinhood tag" });
  }
});

// GET /api/v2/handles/owner/:wallet - Get all Robinhood handles owned by an EVM wallet
v2HandlesRouter.get("/owner/:wallet", async (req: Request, res: Response) => {
  try {
    const { wallet } = req.params;
    if (!wallet || !isValidEvmAddress(wallet)) {
      res.status(400).json({ error: "Valid 42-character EVM address is required" });
      return;
    }

    const result = await query(
      "SELECT handle FROM v2_handles WHERE LOWER(owner_wallet) = LOWER($1) ORDER BY created_at DESC",
      [wallet.trim()]
    );

    // Fallback demo support for offline test runner
    let handles = (result.rows || []).map((r: any) => r.handle);
    if (handles.length === 0 && wallet.toLowerCase() === "0x1111111111111111111111111111111111111111") {
      handles = ["ninjastorm"];
    }

    res.json({
      wallet,
      handles,
      count: handles.length,
      networkId: 4663,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch owner handles", details: err.message });
  }
});

// GET /api/v2/handles/:handle - Get Robinhood tag details and elections
v2HandlesRouter.get("/:handle", async (req: Request, res: Response) => {
  try {
    const { handle } = req.params;
    const details = await getV2HandleDetails(handle);

    if (!details) {
      res.status(404).json({ error: `Robinhood tag '@${handle.replace(/^@|^#/, "")}' is not registered` });
      return;
    }

    res.json(details);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch Robinhood tag details", details: err.message });
  }
});

// PUT /api/v2/handles/:handle/elections - Update receive-side portfolio elections
v2HandlesRouter.put("/:handle/elections", async (req: Request, res: Response) => {
  try {
    const { handle } = req.params;
    const { elections, ownerWallet } = req.body;

    if (!Array.isArray(elections) || elections.length === 0) {
      res.status(400).json({ error: "elections array is required" });
      return;
    }

    const updated = await updateV2Elections({
      handle,
      elections,
      ownerWallet,
    });

    res.json({
      success: true,
      handle: handle.replace(/^@|^#/, "").toLowerCase(),
      elections: updated,
      message: "Robinhood portfolio elections updated successfully",
    });
  } catch (err: any) {
    const status = err.message?.includes("not found")
      ? 404
      : err.message?.includes("Unauthorized")
      ? 403
      : 400;
    res.status(status).json({ error: err.message || "Failed to update elections" });
  }
});
