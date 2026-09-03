import { describe, it, expect } from "bun:test";
import request from "supertest";
import { app } from "../src/app";
import { parseFastCommand } from "../src/services/x/commandParser";
import { isValidSolanaAddress, buildNftTransferPlan } from "../src/services/nftService";

describe("TENDER Sovereign NFT Rail", () => {
  const sampleMint = "7sm142JgXr3u5e2HXMfimidVPjZWwZNQr4oTBckQELJr";
  const senderWallet = "8NF7qtX5DQvyhokuBbhD65MXSWgv6q7JFjd4dfb9rZKA";
  const recipientWallet = "FuSZ9qKm5kUPdmsypSyMRXfTiY4dFrWyvWcmh2URwQWt";

  it("parses fast command: send nft <mint> to @tag", () => {
    const intent = parseFastCommand(`@TenderRWABot send nft ${sampleMint} to @ninjastorm`);
    expect(intent).not.toBeNull();
    expect(intent?.action).toBe("send_nft");
    expect(intent?.target).toBe("@ninjastorm");
    expect(intent?.amount).toBe(1);
    expect(intent?.token).toBe("NFT");
    expect(intent?.memo).toBe(sampleMint);
  });

  it("parses fast command: transfer nft <mint> to @tag", () => {
    const intent = parseFastCommand(`transfer nft ${sampleMint} to @nothipposol`);
    expect(intent?.action).toBe("send_nft");
    expect(intent?.target).toBe("@nothipposol");
    expect(intent?.memo).toBe(sampleMint);
  });

  it("parses fast command: send @tag nft <mint>", () => {
    const intent = parseFastCommand(`send @ninjastorm nft ${sampleMint}`);
    expect(intent?.action).toBe("send_nft");
    expect(intent?.target).toBe("@ninjastorm");
    expect(intent?.memo).toBe(sampleMint);
  });

  it("validates Solana addresses correctly", () => {
    expect(isValidSolanaAddress(sampleMint)).toBe(true);
    expect(isValidSolanaAddress(senderWallet)).toBe(true);
    expect(isValidSolanaAddress("not_a_valid_solana_address")).toBe(false);
    expect(isValidSolanaAddress("")).toBe(false);
  });

  it("builds a direct sovereign NFT transfer plan to a registered tag", async () => {
    const plan = await buildNftTransferPlan({
      userWallet: senderWallet,
      recipientTag: "@ninjastorm",
      nftMint: sampleMint,
    });

    expect(plan.recipientWallet).toBe(recipientWallet);
    expect(plan.recipientHandle).toBe("ninjastorm");
    expect(plan.base64Transaction).toBeDefined();
    expect(plan.base64Transaction.length).toBeGreaterThan(100);
    expect(plan.nft.mint).toBe(sampleMint);
  }, 15000);

  it("POST /api/v1/nft/transfer-plan returns signable transaction", async () => {
    const res = await request(app)
      .post("/api/v1/nft/transfer-plan")
      .send({
        userWallet: senderWallet,
        recipientTag: "@ninjastorm",
        nftMint: sampleMint,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.base64Transaction).toBeDefined();
    expect(res.body.recipientWallet).toBe(recipientWallet);
    expect(res.body.nft.mint).toBe(sampleMint);
  }, 15000);

  it("GET /api/v1/nft/:mint returns metadata object", async () => {
    const res = await request(app).get(`/api/v1/nft/${sampleMint}`);
    expect(res.status).toBe(200);
    expect(res.body.nft).toBeDefined();
    expect(res.body.nft.mint).toBe(sampleMint);
  }, 15000);
});
