import { Router, Request, Response } from "express";
import {
  getBestDualQuote,
  calculatePortfolioElectionQuotes,
  parseTokenUnits,
  formatTokenUnits,
} from "../services/dualQuoteEngine";
import { buildSettlementTxPlan } from "../services/txBuilder";
import { resolveSolanaToken, findSolanaToken } from "../lib/rwaTokens";
import { query } from "../db";

export const settleRouter = Router();

// POST /api/v1/settle/quote (Single-pair dual provider quote)
settleRouter.post("/quote", async (req: Request, res: Response) => {
  try {
    const {
      fromSymbolOrMint,
      toSymbolOrMint,
      amountIn,
      userWallet,
      recipientWallet,
      slippageBps,
    } = req.body as {
      fromSymbolOrMint: string;
      toSymbolOrMint: string;
      amountIn: number | string;
      userWallet?: string;
      recipientWallet?: string;
      slippageBps?: number;
    };

    if (!fromSymbolOrMint || !toSymbolOrMint || !amountIn) {
      res.status(400).json({
        error: "fromSymbolOrMint, toSymbolOrMint, and a positive amountIn are required",
      });
      return;
    }

    const inToken = resolveSolanaToken(fromSymbolOrMint) || findSolanaToken(fromSymbolOrMint);
    const outToken = resolveSolanaToken(toSymbolOrMint) || findSolanaToken(toSymbolOrMint);

    if (!inToken || !outToken) {
      res.status(400).json({
        error: `Could not resolve token symbols/mints (in: ${fromSymbolOrMint}, out: ${toSymbolOrMint})`,
      });
      return;
    }

    const amountInBase = parseTokenUnits(amountIn, inToken.decimals);

    const dualQuote = await getBestDualQuote({
      inputMint: inToken.mint,
      outputMint: outToken.mint,
      amount: amountInBase,
      userWallet,
      recipientWallet,
      slippageBps,
    });

    res.json(dualQuote);
  } catch (err: any) {
    console.error("Error executing dual quote:", err);
    res.status(500).json({ error: "Dual quote evaluation failed", details: err.message });
  }
});

// POST /api/v1/settle/election-quote (Multi-leg portfolio election quote)
settleRouter.post("/election-quote", async (req: Request, res: Response) => {
  try {
    const {
      recipientHandle,
      fromSymbolOrMint,
      amountIn,
      customElections,
      userWallet,
      slippageBps,
    } = req.body as {
      recipientHandle?: string;
      fromSymbolOrMint: string;
      amountIn: number | string;
      customElections?: Array<{ symbol: string; mint: string; basisPoints: number }>;
      userWallet?: string;
      slippageBps?: number;
    };

    if (!fromSymbolOrMint || !amountIn) {
      res.status(400).json({ error: "fromSymbolOrMint and amountIn are required" });
      return;
    }

    const inToken = resolveSolanaToken(fromSymbolOrMint) || findSolanaToken(fromSymbolOrMint);
    if (!inToken) {
      res.status(400).json({ error: `Could not resolve input token: ${fromSymbolOrMint}` });
      return;
    }

    let targetElections: Array<{ assetSymbol: string; assetMint: string; basisPoints: number }> = [];
    let recipientWallet = userWallet;

    if (recipientHandle) {
      const handleClean = recipientHandle.toLowerCase().replace(/^@/, "").trim();
      const handleRes = await query("SELECT handle, owner_wallet FROM handles WHERE handle = $1", [
        handleClean,
      ]);

      if (handleRes.rows.length === 0) {
        res.status(404).json({ error: `Recipient handle '@${handleClean}' is not registered` });
        return;
      }

      recipientWallet = handleRes.rows[0].owner_wallet;

      const electionsRes = await query(
        "SELECT asset_symbol, asset_mint, basis_points FROM handle_elections WHERE handle = $1 AND is_active = TRUE",
        [handleClean]
      );

      if (electionsRes.rows.length === 0) {
        res.status(400).json({ error: `Handle '@${handleClean}' has no active portfolio elections` });
        return;
      }

      targetElections = electionsRes.rows.map((r) => ({
        assetSymbol: r.asset_symbol,
        assetMint: r.asset_mint,
        basisPoints: r.basis_points,
      }));
    } else if (customElections && customElections.length > 0) {
      targetElections = customElections.map((e) => ({
        assetSymbol: e.symbol,
        assetMint: e.mint,
        basisPoints: e.basisPoints,
      }));
    } else {
      res.status(400).json({ error: "Either recipientHandle or customElections must be provided" });
      return;
    }

    const totalInBase = parseTokenUnits(amountIn, inToken.decimals);

    const portfolioResult = await calculatePortfolioElectionQuotes({
      inputMint: inToken.mint,
      totalAmountIn: totalInBase,
      elections: targetElections,
      userWallet,
      recipientWallet,
      slippageBps,
    });

    res.json({
      recipientHandle: recipientHandle || null,
      recipientWallet,
      portfolioResult,
    });
  } catch (err: any) {
    console.error("Error executing election quote:", err);
    res.status(400).json({ error: err.message || "Portfolio election quote failed" });
  }
});

// POST /api/v1/settle/build-tx (Builds atomic Solana transaction)
settleRouter.post("/build-tx", async (req: Request, res: Response) => {
  try {
    const { userWallet, recipientWallet, quote } = req.body;

    if (!userWallet || !quote) {
      res.status(400).json({ error: "userWallet and winning quote object are required" });
      return;
    }

    const txPlan = await buildSettlementTxPlan({
      userWallet,
      recipientWallet: recipientWallet || userWallet,
      quote,
    });

    res.json(txPlan);
  } catch (err: any) {
    console.error("Error building transaction:", err);
    res.status(500).json({ error: "Failed to build transaction plan", details: err.message });
  }
});

// POST /api/v1/settle/confirm (Confirm transaction on-chain & record receipt)
settleRouter.post("/confirm", async (req: Request, res: Response) => {
  try {
    const {
      signature,
      senderWallet,
      recipientHandle,
      recipientWallet,
      inputMint,
      inputAmount,
      outputBreakdown,
    } = req.body;

    if (!signature || !senderWallet || !recipientWallet || !inputMint || !inputAmount) {
      res.status(400).json({
        error: "signature, senderWallet, recipientWallet, inputMint, and inputAmount are required",
      });
      return;
    }

    const result = await query(
      `INSERT INTO settlements (signature, sender_wallet, recipient_handle, recipient_wallet, input_mint, input_amount, output_breakdown, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (signature) DO NOTHING
       RETURNING id, created_at`,
      [
        signature,
        senderWallet,
        recipientHandle || null,
        recipientWallet,
        inputMint,
        inputAmount,
        JSON.stringify(outputBreakdown || []),
        "confirmed",
      ]
    );

    res.json({
      success: true,
      signature,
      status: "confirmed",
      recordedId: result.rows[0]?.id || null,
    });
  } catch (err: any) {
    console.error("Error recording settlement confirmation:", err);
    res.status(500).json({ error: "Failed to record settlement", details: err.message });
  }
});

// GET /api/v1/settle/history (Query on-chain settlement receipts)
settleRouter.get("/history", async (req: Request, res: Response) => {
  try {
    const { wallet, handle, limit = "20", offset = "0" } = req.query;

    let queryText = `
      SELECT id, signature, sender_wallet, recipient_handle, recipient_wallet, input_mint, input_amount, output_breakdown, status, created_at
      FROM settlements
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (wallet && typeof wallet === "string" && wallet.trim().length > 0) {
      params.push(wallet.trim());
      conditions.push(`(sender_wallet = $${params.length} OR recipient_wallet = $${params.length})`);
    }

    if (handle && typeof handle === "string" && handle.trim().length > 0) {
      params.push(handle.replace(/^@/, "").toLowerCase().trim());
      conditions.push(`recipient_handle = $${params.length}`);
    }

    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(" OR ")}`;
    }

    const limitNum = Math.min(parseInt(limit as string, 10) || 20, 100);
    const offsetNum = parseInt(offset as string, 10) || 0;
    queryText += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limitNum, offsetNum);

    const result = await query(queryText, params);

    res.json({
      settlements: result.rows.map((row) => ({
        id: row.id,
        signature: row.signature,
        senderWallet: row.sender_wallet,
        recipientHandle: row.recipient_handle,
        recipientWallet: row.recipient_wallet,
        inputMint: row.input_mint,
        inputAmount: row.input_amount,
        outputBreakdown: row.output_breakdown,
        status: row.status,
        createdAt: row.created_at,
      })),
      count: result.rows.length,
    });
  } catch (err: any) {
    console.error("Error fetching settlement history:", err);
    res.status(500).json({ error: "Failed to fetch settlement history", details: err.message });
  }
});
