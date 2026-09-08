import { Router, Request, Response } from "express";
import { query } from "../../db";
import { getV2HandleDetails } from "../services/handleService";
import { resolveRobinhoodToken, USDG, isValidEvmAddress } from "../lib/robinhoodTokens";

export const v2InvoicesRouter = Router();

// POST /api/v2/invoices - Create an invoice on Robinhood Chain
v2InvoicesRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { recipientHandle, recipientWallet, targetAmount, targetTokenSymbol, memo, expiresInHours } = req.body;

    if (!targetAmount || Number(targetAmount) <= 0) {
      res.status(400).json({ error: "Positive targetAmount is required" });
      return;
    }

    let finalHandle = recipientHandle ? recipientHandle.replace(/^@|^#/, "").toLowerCase() : null;
    let finalWallet = recipientWallet;

    if (finalHandle && !finalWallet) {
      const handleDetails = await getV2HandleDetails(finalHandle);
      if (handleDetails) {
        finalWallet = handleDetails.ownerWallet;
      }
    }

    if (!finalWallet || !isValidEvmAddress(finalWallet)) {
      res.status(400).json({ error: "Valid Robinhood EVM recipientWallet (0x...) or registered tag is required" });
      return;
    }

    const tokenSymbol = targetTokenSymbol || "USDG";
    const resolvedToken = resolveRobinhoodToken(tokenSymbol) || USDG;
    const invoiceId = `rh_inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const hours = expiresInHours ? Number(expiresInHours) : 24 * 14; // default 14 days
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();

    const insertRes = await query(
      `INSERT INTO v2_invoices (
         id, recipient_handle, recipient_wallet, target_amount, target_token_symbol,
         target_token_address, memo, status, expires_at, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, NOW())
       RETURNING id, created_at`,
      [
        invoiceId,
        finalHandle,
        finalWallet,
        targetAmount,
        resolvedToken.symbol,
        resolvedToken.address,
        memo || null,
        expiresAt,
      ]
    );

    res.status(201).json({
      success: true,
      invoice: {
        id: invoiceId,
        recipientHandle: finalHandle,
        recipientWallet: finalWallet,
        targetAmount: Number(targetAmount),
        targetTokenSymbol: resolvedToken.symbol,
        targetTokenAddress: resolvedToken.address,
        memo: memo || null,
        status: "pending",
        createdAt: insertRes.rows && insertRes.rows.length > 0 ? insertRes.rows[0].created_at : new Date().toISOString(),
        networkId: 4663,
      },
      payUrl: `/pay/${invoiceId}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create Robinhood invoice", details: err.message });
  }
});

// GET /api/v2/invoices/:id - Retrieve invoice and recipient elections
v2InvoicesRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invRes = await query(
      `SELECT id, recipient_handle, recipient_wallet, target_amount, target_token_symbol,
              target_token_address, memo, status, settlement_id, expires_at, created_at
       FROM v2_invoices WHERE id = $1`,
      [id]
    );

    if (!invRes.rows || invRes.rows.length === 0) {
      res.status(404).json({ error: `Robinhood invoice '${id}' not found` });
      return;
    }

    const row = invRes.rows[0];
    let elections: any[] = [];
    if (row.recipient_handle) {
      const handleDetails = await getV2HandleDetails(row.recipient_handle);
      if (handleDetails) {
        elections = handleDetails.elections;
      }
    }

    res.json({
      id: row.id,
      recipientHandle: row.recipient_handle,
      recipientWallet: row.recipient_wallet,
      targetAmount: Number(row.target_amount),
      targetTokenSymbol: row.target_token_symbol,
      targetTokenAddress: row.target_token_address,
      memo: row.memo,
      status: row.status,
      settlementId: row.settlement_id,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      isExpired: new Date() > new Date(row.expires_at),
      elections,
      networkId: 4663,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch invoice", details: err.message });
  }
});

// POST /api/v2/invoices/:id/confirm - Mark invoice paid with tx hash
v2InvoicesRouter.post("/:id/confirm", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { txHash, senderWallet } = req.body;

    const invRes = await query("SELECT id, status FROM v2_invoices WHERE id = $1", [id]);
    if (!invRes.rows || invRes.rows.length === 0) {
      res.status(404).json({ error: `Robinhood invoice '${id}' not found` });
      return;
    }

    await query(
      "UPDATE v2_invoices SET status = 'paid' WHERE id = $1",
      [id]
    );

    res.json({
      success: true,
      id,
      status: "paid",
      txHash: txHash || null,
      senderWallet: senderWallet || null,
      message: "Invoice marked as paid on Robinhood Chain",
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to confirm invoice", details: err.message });
  }
});

// POST /api/v2/invoices/:id/dismiss - Cancel/dismiss invoice
v2InvoicesRouter.post("/:id/dismiss", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invRes = await query("SELECT id FROM v2_invoices WHERE id = $1", [id]);
    if (!invRes.rows || invRes.rows.length === 0) {
      res.status(404).json({ error: `Robinhood invoice '${id}' not found` });
      return;
    }

    await query("UPDATE v2_invoices SET status = 'dismissed' WHERE id = $1", [id]);

    res.json({
      success: true,
      id,
      status: "dismissed",
      message: "Robinhood invoice dismissed",
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to dismiss invoice", details: err.message });
  }
});
