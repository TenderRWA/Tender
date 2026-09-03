import { describe, expect, it } from "bun:test";
import request from "supertest";
import { app } from "../src/app";
import { parseFastCommand } from "../src/services/x/commandParser";

describe("TENDER X Bot Suite", () => {
  it("parses fast payment command 'pay @whoknows 50 USDC'", () => {
    const intent = parseFastCommand("@TenderRWABot pay @whoknows 50 USDC");
    expect(intent).not.toBeNull();
    expect(intent?.action).toBe("send");
    expect(intent?.target).toBe("@whoknows");
    expect(intent?.amount).toBe(50);
    expect(intent?.token).toBe("USDC");
  });

  it("parses fast quote command 'quote 100 USDC for @mira'", () => {
    const intent = parseFastCommand("@TenderRWABot quote 100 USDC for @mira");
    expect(intent).not.toBeNull();
    expect(intent?.action).toBe("quote");
    expect(intent?.target).toBe("@mira");
    expect(intent?.amount).toBe(100);
    expect(intent?.token).toBe("USDC");
  });

  it("parses help command", () => {
    const intent = parseFastCommand("@TenderRWABot help");
    expect(intent).not.toBeNull();
    expect(intent?.action).toBe("help");
  });

  it("POST /api/v1/bot/parse-intent returns structured intent", async () => {
    const res = await request(app)
      .post("/api/v1/bot/parse-intent")
      .send({ text: "@TenderRWABot send 25 SOL to @creator" });

    expect(res.status).toBe(200);
    expect(res.body.intent.action).toBe("send");
    expect(res.body.intent.target).toBe("@creator");
    expect(res.body.intent.amount).toBe(25);
    expect(res.body.intent.token).toBe("SOL");
  });

  it("GET /api/v1/bot/status returns bot metadata and health", async () => {
    const res = await request(app).get("/api/v1/bot/status");
    expect(res.status).toBe(200);
    expect(res.body.configuredBotHandle).toBe("TenderRWABot");
    expect(res.body.automatingAccount).toBe("TenderRWA");
    expect(res.body.status).toBe("ok");
  });
});
