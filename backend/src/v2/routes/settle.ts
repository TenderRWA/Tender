import { Router, Request, Response } from "express";
import { query } from "../../db";
import {
  quoteSingleSwap,
  quotePortfolioSettlement,
  PortfolioElectionLeg,
} from "../services/robinhoodSettlement";
import { getV2HandleDetails } from "../services/handleService";
import { resolveRobinhoodToken, USDG, isValidEvmAddress } from "../lib/robinhoodTokens";

export const v2SettleRouter = Router();

// POST /api/v2/settle/quote - Single token-to-token swap quote on Robinhood Chain
v2SettleRouter.post("/quote", async (req: Request, res: Response) => {
  try {
    const { fromSymbolOrAddress, toSymbolOrAddress, amountIn, userWallet, recipientWallet, slippageBps } = req.body;

    if (!fromSymbolOrAddress || !toSymbolOrAddress || !amountIn || Number(amountIn) <= 0) {
      res.status(400).json({ error: "fromSymbolOrAddress, toSymbolOrAddress, and positive amountIn are required" });
      return;
    }

    const fromToken = resolveRobinhoodToken(fromSymbolOrAddress);
    const toToken = resolveRobinhoodToken(toSymbolOrAddress);

    if (!fromToken) {
      res.status(400).json({ error: `Unsupported origin token '${fromSymbolOrAddress}' on Robinhood Chain` });
      return;
    }
    if (!toToken) {
      res.status(400).json({ error: `Unsupported target token '${toSymbolOrAddress}' on Robinhood Chain` });
      return;
    }

    const effectiveUserWallet = isValidEvmAddress(userWallet)
      ? userWallet
      : "0x0000000000000000000000000000000000000000";
    const effectiveRecipientWallet = isValidEvmAddress(recipientWallet)
      ? recipientWallet
      : effectiveUserWallet;

    const quote = await quoteSingleSwap({
      userWallet: effectiveUserWallet,
      recipientWallet: effectiveRecipientWallet,
      fromToken,
      toToken,
      amountIn: Number(amountIn),
      slippageBps: slippageBps ? Number(slippageBps) : 50,
    });

    res.json(quote);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch Robinhood swap quote", details: err.message });
  }
});

// POST /api/v2/settle/election-quote - Multi-leg receive-side portfolio quote on Robinhood Chain
v2SettleRouter.post("/election-quote", async (req: Request, res: Response) => {
  try {
    const { recipientHandle, fromSymbolOrAddress, amountIn, userWallet, slippageBps } = req.body;

    if (!recipientHandle || !amountIn || Number(amountIn) <= 0) {
      res.status(400).json({ error: "recipientHandle and positive amountIn are required" });
      return;
    }

    const handleDetails = await getV2HandleDetails(recipientHandle);
    if (!handleDetails) {
      res.status(404).json({ error: `Robinhood tag '@${recipientHandle.replace(/^@|^#/, "")}' is not registered` });
      return;
    }

    const fromToken = resolveRobinhoodToken(fromSymbolOrAddress || "USDG") || USDG;
    const effectiveUserWallet = isValidEvmAddress(userWallet)
      ? userWallet
      : "0x0000000000000000000000000000000000000000";

    const electionLegs: PortfolioElectionLeg[] = handleDetails.elections.map((e) => ({
      symbol: e.symbol,
      tokenAddress: e.tokenAddress,
      basisPoints: e.basisPoints,
      percentage: e.percentage,
      token: e.token || resolveRobinhoodToken(e.symbol) || USDG,
    }));

    const portfolioQuote = await quotePortfolioSettlement({
      userWallet: effectiveUserWallet,
      recipientWallet: handleDetails.ownerWallet,
      recipientHandle: handleDetails.handle,
      fromToken,
      totalAmountIn: Number(amountIn),
      elections: electionLegs,
      slippageBps: slippageBps ? Number(slippageBps) : 50,
    });

    res.json(portfolioQuote);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to generate portfolio settlement quote", details: err.message });
  }
});

// POST /api/v2/settle/confirm - Record confirmed Robinhood settlement receipt
v2SettleRouter.post("/confirm", async (req: Request, res: Response) => {
  try {
    const {
      txHash,
      senderWallet,
      recipientHandle,
      recipientWallet,
      inputTokenSymbol,
      inputTokenAddress,
      inputAmount,
      outputBreakdown,
      feeCollectedUsd,
    } = req.body;

    if (!senderWallet || !recipientWallet || !inputTokenSymbol || !inputAmount) {
      res.status(400).json({ error: "senderWallet, recipientWallet, inputTokenSymbol, and inputAmount are required" });
      return;
    }

    const cleanHandle = recipientHandle ? recipientHandle.replace(/^@|^#/, "").toLowerCase() : null;
    const resolvedToken = resolveRobinhoodToken(inputTokenSymbol);
    const tokenAddr = inputTokenAddress || resolvedToken?.address || "0x0000000000000000000000000000000000000000";

    const result = await query(
      `INSERT INTO v2_settlements (
         request_id, tx_hash, sender_wallet, recipient_handle, recipient_wallet,
         input_token_symbol, input_token_address, input_amount, output_breakdown,
         status, fee_collected_usd, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed', $10, NOW())
       RETURNING id, created_at`,
      [
        `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        txHash || null,
        senderWallet,
        cleanHandle,
        recipientWallet,
        inputTokenSymbol,
        tokenAddr,
        inputAmount.toString(),
        JSON.stringify(outputBreakdown || []),
        feeCollectedUsd || 0,
      ]
    );

    res.status(201).json({
      success: true,
      settlementId: result.rows[0].id,
      createdAt: result.rows[0].created_at,
      message: "Robinhood settlement recorded successfully",
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to confirm settlement", details: err.message });
  }
});
