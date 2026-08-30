import { describe, expect, it } from "bun:test";
import request from "supertest";
import { app } from "../src/app";

describe("Handles & Election API", () => {
  it("rejects handle registration with invalid basis points sum (!= 10000)", async () => {
    const res = await request(app)
      .post("/api/v1/handles/register")
      .send({
        handle: "testalex",
        ownerWallet: "2aCStNyta182cUEry72GNNP7R2CcyErGWA8DLQVjjw3D",
        elections: [
          { symbol: "SPYx", mint: "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W", basisPoints: 5000 },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Total basis points must equal 10000");
  });

  it("returns 404 for unknown handle", async () => {
    const res = await request(app).get("/api/v1/handles/non_existent_handle_xyz_123");
    expect(res.status).toBe(404);
  });
});
