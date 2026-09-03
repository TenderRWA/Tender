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
    const { handle, status = "pending", limit = "20" } = req.query;

    let queryText = "SELECT * FROM pending_settlements WHERE status = $1";
    const params: any[] = [status];

    if (handle && typeof handle === "string") {
      params.push(handle.replace(/^@/, "").toLowerCase());
      queryText += ` AND recipient_handle = $${params.length}`;
    }

    queryText += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit as string, 10) || 20);

    const result = await query(queryText, params);
    res.json({
      pendingSettlements: result.rows || [],
      count: result.rows?.length || 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch pending settlements", details: err.message });
  }
});
