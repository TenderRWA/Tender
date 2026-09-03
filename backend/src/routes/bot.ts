import { Router, type Request, type Response } from "express";
import { config } from "../config";
import { parseFastCommand } from "../services/x/commandParser";
import { parseBotIntentWithGroq } from "../services/x/groqIntentParser";
import { routeBotIntent } from "../services/x/xBotRoutingService";
import { pollMentionsOnce } from "../services/x/poller";
import { getCursor } from "../services/x/botCursor";
import { getBotUser } from "../services/x/botClient";
import { query } from "../db";

export const botRouter = Router();

// POST /api/v1/bot/parse-intent — NLP & command parsing test
botRouter.post("/parse-intent", async (req: Request, res: Response) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text) {
      res.status(400).json({ error: "text is required" });
      return;
    }

    let intent = parseFastCommand(text);
    let parserUsed = "regex";

    if (!intent || intent.action === "unrecognized") {
      intent = await parseBotIntentWithGroq(text);
      parserUsed = "groq_llm";
    }

    res.json({
      input: text,
      parserUsed,
      intent,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to parse intent", details: err.message });
  }
});

// POST /api/v1/bot/route-intent — Route an intent into a simulated reply and portfolio breakdown
botRouter.post("/route-intent", async (req: Request, res: Response) => {
  try {
    const { text, target, amount, token } = req.body as {
      text?: string;
      target?: string;
      amount?: number;
      token?: string;
    };

    let intent = text ? parseFastCommand(text) : null;
    if (text && (!intent || intent.action === "unrecognized")) {
      intent = await parseBotIntentWithGroq(text);
    }

    if (!intent) {
      intent = {
        action: "send",
        target: target || null,
        amount: amount || null,
        token: token || "USDC",
        memo: null,
        confidence: 1.0,
      };
    }

    const result = await routeBotIntent({ intent });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to route intent", details: err.message });
  }
});

// POST /api/v1/bot/poll-now — Manually trigger a poll cycle
botRouter.post("/poll-now", async (_req: Request, res: Response) => {
  try {
    const result = await pollMentionsOnce();
    res.json({
      success: true,
      result,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Poll cycle failed", details: err.message });
  }
});

// GET /api/v1/bot/status — Check health, bot handle, and latest cursor
botRouter.get("/status", async (_req: Request, res: Response) => {
  try {
    const cursor = await getCursor("mentions");
    let botUser: { id: string; username: string } | null = null;
    let authError: string | null = null;

    if (config.x.botAccessTokenSeed || config.x.botRefreshTokenSeed) {
      try {
        botUser = await getBotUser();
      } catch (err: any) {
        authError = err.message;
      }
    }

    res.json({
      status: "ok",
      botEnabled: config.x.botEnabled,
      configuredBotHandle: config.x.botHandle,
      automatingAccount: config.x.mainHandle,
      pollIntervalMs: config.x.mentionsPollIntervalMs,
      hasGroqApiKey: Boolean(config.groq.apiKey),
      hasXCredentials: Boolean(config.x.botAccessTokenSeed || config.x.botRefreshTokenSeed),
      authenticatedBotUser: botUser,
      authError,
      lastProcessedMentionId: cursor,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get bot status", details: err.message });
  }
});

// GET /api/v1/bot/pending — List pending settlements initiated via bot/X
botRouter.get("/pending", async (req: Request, res: Response) => {
  try {
    const { handle, status, limit = "50" } = req.query;

    let queryText = "SELECT * FROM pending_settlements WHERE 1=1";
    const params: any[] = [];

    if (status && status !== "all") {
      params.push(status);
      queryText += ` AND status = $${params.length}`;
    } else if (status !== "all") {
      queryText += ` AND status != 'dismissed'`;
    }

    if (handle && typeof handle === "string") {
      const cleanH = handle.replace(/^@/, "").toLowerCase().trim();
      params.push(cleanH);
      queryText += ` AND (LOWER(recipient_handle) = $${params.length} OR LOWER(author_x_handle) = $${params.length})`;
    }

    queryText += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit as string, 10) || 50);

    const result = await query(queryText, params);
    const pendingSettlements = (result.rows || []).map((row: any) => ({
      id: String(row.id),
      sourceRef: row.source_ref,
      authorXId: row.author_x_id,
      authorXHandle: row.author_x_handle,
      recipientHandle: row.recipient_handle,
      recipientWallet: row.recipient_wallet,
      inputToken: row.input_token || "USDC",
      inputAmount: String(row.input_amount),
      tokenMint: row.token_mint || undefined,
      assetType: row.asset_type || "token",
      portfolioSummary: row.portfolio_summary,
      tweetUrl: row.tweet_url,
      status: row.status,
      signature: row.signature,
      settledAt: row.settled_at ? new Date(row.settled_at).toISOString() : undefined,
      createdAt: new Date(row.created_at).toISOString(),
    }));

    res.json({
      pendingSettlements,
      count: pendingSettlements.length,
    });
  } catch (err: any) {
    console.error("[Bot Pending] Error:", err);
    res.status(500).json({ error: "Failed to fetch pending settlements", details: err.message });
  }
});

// POST /api/v1/bot/pending/:id/confirm - Mark pending settlement as confirmed on-chain
botRouter.post("/pending/:id/confirm", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { signature } = req.body;

    if (!signature) {
      res.status(400).json({ error: "signature is required" });
      return;
    }

    const result = await query(
      `UPDATE pending_settlements
       SET status = 'completed', signature = $1, settled_at = NOW(), updated_at = NOW()
       WHERE id::text = $2::text OR source_ref = $2::text
       RETURNING *`,
      [signature, id]
    );

    if (!result.rows || result.rows.length === 0) {
      res.status(404).json({ error: "Pending settlement not found" });
      return;
    }

    res.json({ success: true, settlement: result.rows[0] });
  } catch (err: any) {
    console.error("[Bot Pending Confirm] Error:", err);
    res.status(500).json({ error: "Failed to confirm pending settlement", details: err.message });
  }
});

// POST /api/v1/bot/pending/:id/dismiss - Mark pending settlement as dismissed to unclutter view
botRouter.post("/pending/:id/dismiss", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE pending_settlements
       SET status = 'dismissed', updated_at = NOW()
       WHERE id::text = $1::text OR source_ref = $1::text
       RETURNING *`,
      [id]
    );

    if (!result.rows || result.rows.length === 0) {
      res.status(404).json({ error: "Pending settlement not found" });
      return;
    }

    res.json({ success: true, settlement: result.rows[0], message: "Pending settlement dismissed" });
  } catch (err: any) {
    console.error("[Bot Pending Dismiss] Error:", err);
    res.status(500).json({ error: "Failed to dismiss pending settlement", details: err.message });
  }
});
