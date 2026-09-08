import { Router, Request, Response } from "express";
import {
  processTenderAiChat,
  parseFastAiCommand,
  parseWithGroq,
} from "../services/tenderAiService";
import {
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_DEFAULT_RPC,
  ROBINHOOD_EXPLORER_URL,
  FEATURED_ROBINHOOD_ASSETS,
} from "../lib/robinhoodTokens";

export const v2AiRouter = Router();

// POST /api/v2/ai/chat - Process conversational prompts and transaction intents on Robinhood Chain
v2AiRouter.post("/chat", async (req: Request, res: Response) => {
  try {
    const { message, history, userWallet } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    const result = await processTenderAiChat({
      message,
      history: Array.isArray(history) ? history : [],
      userWallet,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error("[v2AiRouter] Chat error:", err);
    res.status(500).json({
      error: "Failed to process TenderAI chat request",
      details: err.message,
    });
  }
});

// GET /api/v2/ai/context - Retrieve live Robinhood Chain ecosystem knowledge & prompt suggestions
v2AiRouter.get("/context", (_req: Request, res: Response) => {
  res.json({
    chainId: ROBINHOOD_CHAIN_ID,
    chainName: "Robinhood Chain",
    rpcUrl: ROBINHOOD_DEFAULT_RPC,
    explorerUrl: ROBINHOOD_EXPLORER_URL,
    featuredAssets: FEATURED_ROBINHOOD_ASSETS,
    samplePrompts: [
      "Pay @timbook 0.002 ETH",
      "What is @timbook's mix?",
      "Quote 100 USDG for @helen2swift",
      "What assets are supported on Robinhood Chain?",
      "Send NFT 0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa to @timbook",
    ],
  });
});

// POST /api/v2/ai/parse - Testing endpoint for NLP / command parsing
v2AiRouter.post("/parse", async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    let intent = parseFastAiCommand(message);
    let parserUsed = "regex";

    if (!intent) {
      const groqRes = await parseWithGroq(message);
      intent = groqRes.intent;
      parserUsed = "groq_llm";
    }

    res.json({
      input: message,
      parserUsed,
      intent,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Parse failed", details: err.message });
  }
});
