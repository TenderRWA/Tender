import { describe, expect, it } from "bun:test";
import request from "supertest";
import { app } from "../src/app";

describe("GET /api/v1/assets", () => {
  it("returns base currencies and featured xStocks", async () => {
    const res = await request(app).get("/api/v1/assets?featured=true");
    expect(res.status).toBe(200);
    expect(res.body.baseCurrencies).toBeDefined();
    expect(res.body.featured).toBeDefined();
    expect(res.body.count).toBeGreaterThan(0);
  });

  it("finds specific asset by symbol", async () => {
    const res = await request(app).get("/api/v1/assets/SPYx");
    expect(res.status).toBe(200);
    expect(res.body.symbol).toBe("SPYx");
    expect(res.body.mint).toBe("XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W");
    expect(res.body.decimals).toBe(8);
  });

  it("resolves ticker alias like APPLE -> AAPLx", async () => {
    const res = await request(app).get("/api/v1/assets/APPLE");
    expect(res.status).toBe(200);
    expect(res.body.symbol).toBe("AAPLx");
  });
});
