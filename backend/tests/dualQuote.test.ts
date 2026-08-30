import { describe, expect, it } from "bun:test";
import request from "supertest";
import { app } from "../src/app";

describe("POST /api/v1/settle/quote", () => {
  it("returns immediate direct quote for same-asset payment (USDC -> USDC)", async () => {
    const res = await request(app)
      .post("/api/v1/settle/quote")
      .send({
        fromSymbolOrMint: "USDC",
        toSymbolOrMint: "USDC",
        amountIn: 100,
      });

    expect(res.status).toBe(200);
    expect(res.body.winner).toBe("jupiter");
    expect(res.body.inAmountFormatted).toBe("100");
    expect(res.body.outAmountFormatted).toBe("100");
    expect(res.body.priceImpactPct).toBe(0);
    expect(res.body.providerComparison.winnerReason).toContain("Same asset direct settlement");
  });

  it("fails gracefully with missing parameters", async () => {
    const res = await request(app).post("/api/v1/settle/quote").send({});
    expect(res.status).toBe(400);
  });
});
