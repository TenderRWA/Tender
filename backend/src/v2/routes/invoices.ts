import { Router, Request, Response } from "express";
import { query } from "../../db";
import { getV2HandleDetails } from "../services/handleService";
import { resolveRobinhoodToken, USDG, isValidEvmAddress } from "../lib/robinhoodTokens";

export const v2InvoicesRouter = Router();

// POST /api/v2/invoices - Create an invoice on Robinhood Chain
v2InvoicesRouter.post("/", async (req: Request, res: Response) => {
  try {
    const {
      recipientHandle,
      recipientWallet,
      targetAmount,
      targetTokenSymbol,
      targetTokenAddress,
      memo,
      expiresInHours,
      expiryMinutes,
      creatorWallet,
      creatorHandle,
    } = req.body;

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
    
    // Calculate expiry
    let durationMs = 14 * 24 * 3600 * 1000; // default 14 days
    if (expiryMinutes && Number(expiryMinutes) > 0) {
      durationMs = Number(expiryMinutes) * 60 * 1000;
    } else if (expiresInHours && Number(expiresInHours) > 0) {
      durationMs = Number(expiresInHours) * 3600 * 1000;
    }
    const expiresAt = new Date(Date.now() + durationMs).toISOString();

    const cleanCreatorHandle = creatorHandle ? creatorHandle.replace(/^@|^#/, "").toLowerCase() : null;

    const insertRes = await query(
      `INSERT INTO v2_invoices (
         id, recipient_handle, recipient_wallet, target_amount, target_token_symbol,
         target_token_address, memo, status, expires_at, created_at,
         creator_wallet, creator_handle
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, NOW(), $9, $10)
       RETURNING id, created_at`,
      [
        invoiceId,
        finalHandle,
        finalWallet,
        targetAmount,
        resolvedToken.symbol,
        targetTokenAddress || resolvedToken.address,
        memo || null,
        expiresAt,
        creatorWallet || null,
        cleanCreatorHandle || null,
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
        targetTokenAddress: targetTokenAddress || resolvedToken.address,
        memo: memo || null,
        status: "pending",
        creatorWallet: creatorWallet || undefined,
        creatorHandle: cleanCreatorHandle || undefined,
        createdAt: insertRes.rows && insertRes.rows.length > 0 ? insertRes.rows[0].created_at : new Date().toISOString(),
        expiresAt,
        networkId: 4663,
      },
      payUrl: `/pay/${invoiceId}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create Robinhood invoice", details: err.message });
  }
});

// GET /api/v2/invoices - List invoices on Robinhood Chain with filters
v2InvoicesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { handle, recipientWallet, creatorWallet, status, limit = "20", offset = "0" } = req.query;

    let queryText = `
      SELECT id, recipient_handle, recipient_wallet, target_amount, target_token_symbol,
             target_token_address, memo, status, settlement_id, expires_at, created_at,
             creator_wallet, creator_handle, payer_wallet, tx_hash, paid_at
      FROM v2_invoices
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (handle) {
      const cleanH = (handle as string).replace(/^@|^#/, "").trim().toLowerCase();
      params.push(cleanH);
      conditions.push(`(LOWER(recipient_handle) = LOWER($${params.length}) OR LOWER(creator_handle) = LOWER($${params.length}))`);
    }

    if (recipientWallet) {
      params.push((recipientWallet as string).trim());
      conditions.push(`LOWER(recipient_wallet) = LOWER($${params.length})`);
    }

    if (creatorWallet) {
      params.push((creatorWallet as string).trim());
      conditions.push(`LOWER(creator_wallet) = LOWER($${params.length})`);
    }

    if (status) {
      params.push((status as string).trim());
      conditions.push(`status = $${params.length}`);
    }

    if (conditions.length > 0) {
      queryText += " WHERE " + conditions.join(" AND ");
    }

    queryText += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Math.min(Number(limit) || 20, 100));
    params.push(Number(offset) || 0);

    const result = await query(queryText, params);

    const invoices = (result.rows || []).map((row: any) => ({
      id: row.id,
      recipientHandle: row.recipient_handle,
      recipientWallet: row.recipient_wallet,
      targetAmount: Number(row.target_amount),
      targetTokenSymbol: row.target_token_symbol,
      targetTokenAddress: row.target_token_address,
      memo: row.memo,
      status: row.status,
      settlementId: row.settlement_id,
      creatorWallet: row.creator_wallet || undefined,
      creatorHandle: row.creator_handle || undefined,
      payerWallet: row.payer_wallet || undefined,
      txHash: row.tx_hash || undefined,
      paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : undefined,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : new Date().toISOString(),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      payUrl: `/pay/${row.id}`,
      networkId: 4663,
    }));

    res.json({
      invoices,
      total: invoices.length,
      networkId: 4663,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch Robinhood invoices", details: err.message });
  }
});

// GET /api/v2/invoices/:id - Retrieve invoice and recipient elections
v2InvoicesRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invRes = await query(
      `SELECT id, recipient_handle, recipient_wallet, target_amount, target_token_symbol,
              target_token_address, memo, status, settlement_id, expires_at, created_at,
              creator_wallet, creator_handle, payer_wallet, tx_hash, paid_at
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
      creatorWallet: row.creator_wallet || undefined,
      creatorHandle: row.creator_handle || undefined,
      payerWallet: row.payer_wallet || undefined,
      txHash: row.tx_hash || undefined,
      paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : undefined,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      isExpired: new Date() > new Date(row.expires_at),
      payUrl: `/pay/${row.id}`,
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
    const { txHash, senderWallet, payerWallet } = req.body;
    const effectivePayer = payerWallet || senderWallet;

    const invRes = await query("SELECT id, status FROM v2_invoices WHERE id = $1", [id]);
    if (!invRes.rows || invRes.rows.length === 0) {
      res.status(404).json({ error: `Robinhood invoice '${id}' not found` });
      return;
    }

    await query(
      `UPDATE v2_invoices 
       SET status = 'paid', tx_hash = $1, payer_wallet = $2, paid_at = NOW() 
       WHERE id = $3`,
      [txHash || null, effectivePayer || null, id]
    );

    res.json({
      success: true,
      id,
      status: "paid",
      txHash: txHash || null,
      payerWallet: effectivePayer || null,
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
