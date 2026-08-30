import { Router, Request, Response } from "express";
import { query } from "../db";

export const invoicesRouter = Router();

// In-memory / DB invoice storage
export interface InvoiceRecord {
  id: string;
  recipientHandle: string;
  recipientWallet: string;
  amount: string;
  tokenMint: string;
  memo?: string;
  status: "pending" | "paid" | "expired";
  createdAt: string;
  expiresAt: string;
}

// POST /api/v1/invoices
invoicesRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { recipientHandle, amount, tokenMint, memo, expiryMinutes = 60 } = req.body;

    if (!recipientHandle || !amount) {
      res.status(400).json({ error: "recipientHandle and amount are required" });
      return;
    }

    const cleanHandle = recipientHandle.toLowerCase().replace(/^@/, "").trim();

    const handleResult = await query("SELECT handle, owner_wallet FROM handles WHERE handle = $1", [
      cleanHandle,
    ]);

    if (handleResult.rows.length === 0) {
      res.status(404).json({ error: `Handle '@${cleanHandle}' not found` });
      return;
    }

    const recipientWallet = handleResult.rows[0].owner_wallet;
    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

    const payUrl = `solana:${process.env.VITE_API_URL || "https://api.tenderrwa.com"}/api/v1/solana-pay/${invoiceId}`;

    res.status(201).json({
      invoiceId,
      recipientHandle: cleanHandle,
      recipientWallet,
      amount,
      tokenMint: tokenMint || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // Default USDC
      memo: memo || `TENDER Settlement to @${cleanHandle}`,
      status: "pending",
      expiresAt,
      payUrl,
    });
  } catch (err: any) {
    console.error("Error creating invoice:", err);
    res.status(500).json({ error: "Failed to create invoice", details: err.message });
  }
});

// GET /api/v1/solana-pay/:id (Solana Pay GET Spec)
invoicesRouter.get("/solana-pay/:id", (req: Request, res: Response) => {
  res.json({
    label: "TENDER Settlement Rail",
    icon: "https://tenderrwa.com/logo.png",
  });
});

// POST /api/v1/solana-pay/:id (Solana Pay POST Spec)
invoicesRouter.post("/solana-pay/:id", async (req: Request, res: Response) => {
  try {
    const { account } = req.body; // Payer's public key from wallet
    if (!account) {
      res.status(400).json({ error: "account (payer public key) is required in request body" });
      return;
    }

    res.json({
      message: "TENDER Atomic Receive-Side RWA Settlement",
    });
  } catch (err: any) {
    console.error("Solana Pay request failed:", err);
    res.status(500).json({ error: "Failed to process Solana Pay transaction request" });
  }
});
