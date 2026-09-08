import { describe, expect, it } from "bun:test";
import supertest from "supertest";
import { app } from "../src/app";
import {
  parseFastAiCommand,
  processTenderAiChat,
} from "../src/v2/services/tenderAiService";
import { ROBINHOOD_CHAIN_ID } from "../src/v2/lib/robinhoodTokens";

const request = supertest(app);

describe("TenderAI - Natural Language & Fast Command Engine", () => {
  it("parses payment commands without requiring bot mentions", () => {
    const cmd1 = parseFastAiCommand("pay @ninjastorm 0.002 ETH");
    expect(cmd1).toBeDefined();
    expect(cmd1?.action).toBe("send");
    expect(cmd1?.target).toBe("@ninjastorm");
    expect(cmd1?.amount).toBe(0.002);
    expect(cmd1?.token).toBe("ETH");

    const cmd2 = parseFastAiCommand("send 50 USDG to @nothipposol");
    expect(cmd2).toBeDefined();
    expect(cmd2?.action).toBe("send");
    expect(cmd2?.target).toBe("@nothipposol");
    expect(cmd2?.amount).toBe(50);
    expect(cmd2?.token).toBe("USDG");
  });

  it("parses quote commands for handles", () => {
    const quote = parseFastAiCommand("quote 100 USDG for @ninjastorm");
    expect(quote).toBeDefined();
    expect(quote?.action).toBe("quote");
    expect(quote?.target).toBe("@ninjastorm");
    expect(quote?.amount).toBe(100);
    expect(quote?.token).toBe("USDG");
  });

  it("parses portfolio election inspection commands", () => {
    const mix = parseFastAiCommand("what is the mix for @ninjastorm");
    expect(mix).toBeDefined();
    expect(mix?.action).toBe("election");
    expect(mix?.target).toBe("@ninjastorm");

    const bare = parseFastAiCommand("@nothipposol");
    expect(bare?.action).toBe("election");
    expect(bare?.target).toBe("@nothipposol");
  });

  it("parses NFT transfer commands on Robinhood Chain", () => {
    const nft = parseFastAiCommand(
      "send nft 0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa to @ninjastorm"
    );
    expect(nft).toBeDefined();
    expect(nft?.action).toBe("send_nft");
    expect(nft?.target).toBe("@ninjastorm");
    expect(nft?.memo).toBe("0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa");
  });

  it("identifies asset universe and help queries", () => {
    const assets = parseFastAiCommand("what assets are available");
    expect(assets?.action).toBe("asset_info");

    const help = parseFastAiCommand("what can you do");
    expect(help?.action).toBe("help");
  });
});

describe("TenderAI - Orchestrator & Action Cards", () => {
  it("generates live portfolio quote and action card for payment intent", async () => {
    const res = await processTenderAiChat({
      message: "pay @ninjastorm 0.002 ETH",
      userWallet: "0x3333333333333333333333333333333333333333",
    });

    expect(res.reply).toBeDefined();
    expect(res.intent.action).toBe("send");
    expect(res.intent.isRegistered).toBe(true);
    expect(res.intent.recipientHandle).toBe("ninjastorm");
    expect(res.intent.recipientWallet).toBe("0x1111111111111111111111111111111111111111");

    expect(res.actionCard).toBeDefined();
    expect(res.actionCard?.type).toBe("payment");
    expect(res.actionCard?.legs).toBeDefined();
    expect(res.actionCard?.legs?.length).toBeGreaterThan(0);
    // ninjastorm has SPCX 60%, USDG 30%, NVDA 10%
    const symbols = res.actionCard?.legs?.map((l) => l.symbol);
    expect(symbols).toContain("SPCX");
    expect(symbols).toContain("USDG");
  });

  it("handles portfolio inspection and returns breakdown action card", async () => {
    const res = await processTenderAiChat({
      message: "portfolio for @ninjastorm",
    });

    expect(res.intent.action).toBe("election");
    expect(res.actionCard?.type).toBe("portfolio");
    expect(res.actionCard?.recipientHandle).toBe("ninjastorm");
    expect(res.actionCard?.legs?.length).toBe(3);
  });

  it("gracefully warns if target handle is unregistered", async () => {
    const res = await processTenderAiChat({
      message: "pay @unregistered_ghost_rh 100 USDG",
    });

    expect(res.intent.isRegistered).toBe(false);
    expect(res.reply).toContain("not yet registered");
    expect(res.actionCard?.type).toBe("info");
  });

  it("returns eligible assets action card", async () => {
    const res = await processTenderAiChat({
      message: "what assets are supported on robinhood",
    });

    expect(res.intent.action).toBe("asset_info");
    expect(res.actionCard?.type).toBe("assets");
    expect(res.actionCard?.meta?.chainId).toBe(ROBINHOOD_CHAIN_ID);
  });
});

describe("TenderAI - REST API Endpoints (/api/v2/ai)", () => {
  it("GET /api/v2/ai/context returns Robinhood chain info and featured tokens", async () => {
    const res = await request.get("/api/v2/ai/context");
    expect(res.status).toBe(200);
    expect(res.body.chainId).toBe(4663);
    expect(res.body.chainName).toBe("Robinhood Chain");
    expect(Array.isArray(res.body.featuredAssets)).toBe(true);
    expect(Array.isArray(res.body.samplePrompts)).toBe(true);
  });

  it("POST /api/v2/ai/chat executes conversational request and returns structured action", async () => {
    const res = await request
      .post("/api/v2/ai/chat")
      .send({ message: "pay @ninjastorm 0.002 ETH" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reply).toBeDefined();
    expect(res.body.intent.action).toBe("send");
    expect(res.body.actionCard.type).toBe("payment");
  });

  it("POST /api/v2/ai/chat rejects empty message", async () => {
    const res = await request.post("/api/v2/ai/chat").send({ message: "" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("message is required");
  });

  it("POST /api/v2/ai/parse tests classification without full execution", async () => {
    const res = await request
      .post("/api/v2/ai/parse")
      .send({ message: "quote 50 USDG for @nothipposol" });

    expect(res.status).toBe(200);
    expect(res.body.intent.action).toBe("quote");
    expect(res.body.intent.target).toBe("@nothipposol");
  });
});
