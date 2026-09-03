import { Router, Request, Response } from "express";
import { query } from "../db";
import { config } from "../config";
import { calculatePortfolioElectionQuotes } from "../services/dualQuoteEngine";
import { buildSettlementTxPlan } from "../services/txBuilder";

export const invoicesRouter = Router();

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
  creatorWallet?: string;
  creatorHandle?: string;
  createdAt: string;
  expiresAt: string;
  paidAt?: string;
  payUrl: string;
  solanaPayUrl: string;
}

function mapInvoiceRow(row: any): InvoiceRecord {
  const frontendUrl = config.frontendUrl || "https://tenderrwa.com";
  const apiBase = process.env.VITE_API_URL || "https://api.tenderrwa.com";

  return {
    id: row.id,
    recipientHandle: row.recipient_handle,
    recipientWallet: row.recipient_wallet,
    creatorWallet: row.creator_wallet || undefined,
    creatorHandle: row.creator_handle || undefined,
    amount: String(row.amount),
    tokenMint: row.token_mint,
    tokenSymbol: row.token_symbol || "USDC",
    memo: row.memo || undefined,
    status: row.status,
    signature: row.signature || undefined,
    payerWallet: row.payer_wallet || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : new Date().toISOString(),
    paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : undefined,
    payUrl: `${frontendUrl}/pay/${row.id}`,
    solanaPayUrl: `solana:${apiBase}/api/v1/solana-pay/${row.id}`,
  };
}

// POST /api/v1/invoices - Create persistent invoice
invoicesRouter.post("/", async (req: Request, res: Response) => {
  try {
    const {
      recipientHandle,
      amount,
      tokenMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // Default USDC
      tokenSymbol = "USDC",
      memo,
      expiryMinutes = 14 * 24 * 60, // Default 14 days
      creatorWallet,
      creatorHandle,
    } = req.body;

    if (!recipientHandle || amount == null || Number(amount) <= 0) {
      res.status(400).json({ error: "recipientHandle and positive amount are required" });
      return;
    }

    const cleanHandle = recipientHandle.toLowerCase().replace(/^@/, "").trim();
    const cleanCreatorHandle = creatorHandle ? String(creatorHandle).toLowerCase().replace(/^@/, "").trim() : null;

    const handleResult = await query(
      "SELECT handle, owner_wallet FROM handles WHERE handle = $1",
      [cleanHandle]
    );

    if (handleResult.rows.length === 0) {
      res.status(404).json({ error: `Handle '@${cleanHandle}' not found on the TENDER rail` });
      return;
    }

    const recipientWallet = handleResult.rows[0].owner_wallet;
    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(Date.now() + Number(expiryMinutes) * 60 * 1000).toISOString();

    const insertResult = await query(
      `INSERT INTO invoices (
        id, recipient_handle, recipient_wallet, amount, token_mint, token_symbol, memo, status, expires_at, creator_wallet, creator_handle
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10)
      RETURNING *`,
      [
        invoiceId,
        cleanHandle,
        recipientWallet,
        Number(amount),
        tokenMint,
        tokenSymbol,
        memo || null,
        expiresAt,
        creatorWallet || null,
        cleanCreatorHandle || null,
      ]
    );

    const invoice = mapInvoiceRow(insertResult.rows[0]);
    console.log(`[Invoices] ✅ Created invoice ${invoice.id} for @${cleanHandle} (${invoice.amount} ${invoice.tokenSymbol})`);
    res.status(201).json(invoice);
  } catch (err: any) {
    console.error("[Invoices] Error creating invoice:", err);
    res.status(500).json({ error: "Failed to create invoice", details: err.message });
  }
});

// GET /api/v1/invoices - List invoices for handle or wallet
invoicesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const handle = (req.query.handle as string)?.toLowerCase().replace(/^@/, "").trim();
    const wallet = (req.query.wallet as string)?.trim();
    const status = (req.query.status as string)?.trim();

    let sql = `SELECT * FROM invoices WHERE 1=1`;
    const params: any[] = [];

    const orConditions: string[] = [];
    if (handle) {
      params.push(handle);
      orConditions.push(`recipient_handle = $${params.length}`);
      orConditions.push(`creator_handle = $${params.length}`);
    }

    if (wallet) {
      params.push(wallet);
      orConditions.push(`recipient_wallet = $${params.length}`);
      orConditions.push(`creator_wallet = $${params.length}`);
      orConditions.push(`payer_wallet = $${params.length}`);
    }

    if (orConditions.length > 0) {
      sql += ` AND (${orConditions.join(" OR ")})`;
    }

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC LIMIT 100`;

    const result = await query(sql, params);
    const invoices = result.rows.map(mapInvoiceRow);

    res.json({ invoices, count: invoices.length });
  } catch (err: any) {
    console.error("[Invoices] Error listing invoices:", err);
    res.status(500).json({ error: "Failed to list invoices", details: err.message });
  }
});

// GET /api/v1/invoices/:id - Fetch invoice details with recipient's live portfolio
invoicesRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const invoiceId = req.params.id;

    const result = await query(`SELECT * FROM invoices WHERE id = $1`, [invoiceId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: `Invoice '${invoiceId}' not found` });
      return;
    }

    const row = result.rows[0];

    // Check auto-expiration
    if (row.status === "pending" && new Date(row.expires_at) < new Date()) {
      await query(`UPDATE invoices SET status = 'expired' WHERE id = $1`, [invoiceId]);
      row.status = "expired";
    }

    const invoice = mapInvoiceRow(row);

    // Fetch recipient's active portfolio allocation elections
    const electionsResult = await query(
      `SELECT asset_symbol as symbol, asset_mint as mint, basis_points as "basisPoints"
       FROM handle_elections
       WHERE handle = $1 AND is_active = true
       ORDER BY basis_points DESC`,
      [row.recipient_handle]
    );

    res.json({
      invoice,
      elections: electionsResult.rows,
    });
  } catch (err: any) {
    console.error(`[Invoices] Error fetching invoice ${req.params.id}:`, err);
    res.status(500).json({ error: "Failed to fetch invoice", details: err.message });
  }
});

// POST /api/v1/invoices/:id/confirm - Mark invoice as paid with transaction signature
invoicesRouter.post("/:id/confirm", async (req: Request, res: Response) => {
  try {
    const invoiceId = req.params.id;
    const { signature, payerWallet } = req.body;

    if (!signature) {
      res.status(400).json({ error: "signature is required" });
      return;
    }

    const result = await query(
      `UPDATE invoices
       SET status = 'paid', signature = $1, payer_wallet = $2, paid_at = NOW()
       WHERE id = $3 AND status = 'pending'
       RETURNING *`,
      [signature, payerWallet || null, invoiceId]
    );

    if (result.rows.length === 0) {
      // Check if already paid
      const check = await query(`SELECT * FROM invoices WHERE id = $1`, [invoiceId]);
      if (check.rows.length > 0 && check.rows[0].status === "paid") {
        res.json({ message: "Invoice already confirmed", invoice: mapInvoiceRow(check.rows[0]) });
        return;
      }
      res.status(400).json({ error: "Invoice is expired, invalid, or already settled" });
      return;
    }

    const updated = mapInvoiceRow(result.rows[0]);
    console.log(`[Invoices] 💳 Confirmed payment for invoice ${invoiceId} via tx ${signature}`);
    res.json({ message: "Invoice payment confirmed successfully", invoice: updated });
  } catch (err: any) {
    console.error(`[Invoices] Error confirming invoice ${req.params.id}:`, err);
    res.status(500).json({ error: "Failed to confirm invoice payment", details: err.message });
  }
});

// GET /api/v1/solana-pay/:id (Solana Pay GET Spec)
invoicesRouter.get("/solana-pay/:id", async (req: Request, res: Response) => {
  try {
    const invoiceId = req.params.id;
    const result = await query(`SELECT recipient_handle, amount, token_symbol FROM invoices WHERE id = $1`, [
      invoiceId,
    ]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }

    const { recipient_handle, amount, token_symbol } = result.rows[0];

    res.json({
      label: `TENDER Pay: @${recipient_handle}`,
      icon: "https://tenderrwa.com/logo.png",
      message: `Pay ${amount} ${token_symbol || "USDC"} to @${recipient_handle} (Atomic RWA Portfolio)`,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to read Solana Pay specification" });
  }
});

// POST /api/v1/solana-pay/:id (Solana Pay Transaction Spec)
invoicesRouter.post("/solana-pay/:id", async (req: Request, res: Response) => {
  try {
    const invoiceId = req.params.id;
    const { account } = req.body; // Payer's public key from wallet

    if (!account) {
      res.status(400).json({ error: "account (payer public key) is required in request body" });
      return;
    }

    const result = await query(`SELECT * FROM invoices WHERE id = $1`, [invoiceId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }

    const invoice = result.rows[0];

    if (invoice.status !== "pending") {
      res.status(400).json({ error: `Invoice is ${invoice.status}` });
      return;
    }

    // Fetch recipient's active portfolio elections
    const electionsResult = await query(
      `SELECT asset_symbol as "assetSymbol", asset_mint as "assetMint", basis_points as "basisPoints"
       FROM handle_elections
       WHERE handle = $1 AND is_active = true`,
      [invoice.recipient_handle]
    );

    const elections = electionsResult.rows;

    if (elections.length === 0) {
      res.status(400).json({ error: "Recipient has no active portfolio elections set" });
      return;
    }

    // Calculate portfolio multi-leg quotes using the invoice amount in USDC
    const atomicAmount = Math.round(Number(invoice.amount) * 1_000_000); // USDC 6 decimals

    const portfolioResult = await calculatePortfolioElectionQuotes({
      inputMint: invoice.token_mint,
      totalAmountIn: String(atomicAmount),
      elections,
      recipientWallet: invoice.recipient_wallet,
    });

    if (portfolioResult.legs.length === 0) {
      res.status(400).json({ error: "Unable to calculate settlement route for invoice" });
      return;
    }

    // Build the primary transaction for the first settlement leg (or direct transfer)
    const leg = portfolioResult.legs[0];
    const plan = await buildSettlementTxPlan({
      userWallet: account,
      recipientWallet: invoice.recipient_wallet,
      quote: leg.quote,
    });

    if (!plan.base64Transaction) {
      res.status(500).json({ error: "Unable to assemble Solana Pay transaction" });
      return;
    }

    res.json({
      transaction: plan.base64Transaction,
      message: `TENDER Settlement to @${invoice.recipient_handle}: ${invoice.amount} ${invoice.token_symbol || "USDC"}`,
    });
  } catch (err: any) {
    console.error("[Solana Pay] Transaction build failed:", err);
    res.status(500).json({ error: "Failed to assemble Solana Pay transaction", details: err.message });
  }
});
