import { Router, Request, Response } from "express";
import {
  buildNftTransferPlan,
  resolveNftMetadata,
  getWalletNfts,
  isValidSolanaAddress,
} from "../services/nftService";

export const nftRouter = Router();

// POST /api/v1/nft/transfer-plan - Build signable direct NFT transfer transaction
nftRouter.post("/transfer-plan", async (req: Request, res: Response) => {
  try {
    const { userWallet, recipientTag, recipientWallet, nftMint } = req.body;

    if (!userWallet) {
      res.status(400).json({ error: "userWallet is required" });
      return;
    }

    if (!recipientTag && !recipientWallet) {
      res.status(400).json({ error: "Either recipientTag or recipientWallet must be provided" });
      return;
    }

    if (!nftMint) {
      res.status(400).json({ error: "nftMint is required" });
      return;
    }

    const plan = await buildNftTransferPlan({
      userWallet,
      recipientTag,
      recipientWallet,
      nftMint,
    });

    res.json({
      success: true,
      base64Transaction: plan.base64Transaction,
      recipientWallet: plan.recipientWallet,
      recipientHandle: plan.recipientHandle,
      nft: plan.nft,
      message: `Direct NFT transfer to @${plan.recipientHandle || "recipient"} prepared`,
    });
  } catch (err: any) {
    console.error("[NFT Transfer Plan] Error:", err);
    res.status(500).json({ error: err.message || "Failed to build NFT transfer transaction" });
  }
});

// GET /api/v1/nft/:mint - Get NFT metadata by mint address
nftRouter.get("/:mint", async (req: Request, res: Response) => {
  try {
    const { mint } = req.params;
    if (!isValidSolanaAddress(mint)) {
      res.status(400).json({ error: "Invalid Solana mint address" });
      return;
    }

    const nft = await resolveNftMetadata(mint);
    res.json({ nft });
  } catch (err: any) {
    console.error("[NFT Metadata] Error:", err);
    res.status(500).json({ error: "Failed to resolve NFT metadata" });
  }
});

// GET /api/v1/nft/wallet/:wallet - Discover NFTs held by a wallet
nftRouter.get("/wallet/:wallet", async (req: Request, res: Response) => {
  try {
    const { wallet } = req.params;
    if (!isValidSolanaAddress(wallet)) {
      res.status(400).json({ error: "Invalid Solana wallet address" });
      return;
    }

    const nfts = await getWalletNfts(wallet);
    res.json({ nfts, count: nfts.length });
  } catch (err: any) {
    console.error("[NFT Wallet Scan] Error:", err);
    res.status(500).json({ error: "Failed to scan wallet NFTs" });
  }
});
