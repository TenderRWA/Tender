import { Router, Request, Response } from "express";
import {
  createPublicClient,
  http,
  encodeFunctionData,
  parseAbi,
  getAddress,
} from "viem";
import { getV2HandleDetails } from "../services/handleService";
import {
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_DEFAULT_RPC,
  isValidEvmAddress,
} from "../lib/robinhoodTokens";

export const v2NftRouter = Router();

const client = createPublicClient({
  transport: http(process.env.ROBINHOOD_RPC_URL || ROBINHOOD_DEFAULT_RPC),
});

const ERC721_ABI = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
  "function transferFrom(address from, address to, uint256 tokenId)",
]);

// GET /api/v2/nft/resolve-target/:target - Resolve recipient tag or address on Robinhood Chain
v2NftRouter.get("/resolve-target/:target", async (req: Request, res: Response) => {
  try {
    const rawTarget = req.params.target.trim();

    if (isValidEvmAddress(rawTarget)) {
      return res.json({
        resolved: true,
        walletAddress: getAddress(rawTarget),
        handle: null,
        isHandle: false,
        networkId: ROBINHOOD_CHAIN_ID,
      });
    }

    const details = await getV2HandleDetails(rawTarget);
    if (!details) {
      return res.status(404).json({
        resolved: false,
        error: `Robinhood tag '@${rawTarget.replace(/^@|^#/, "")}' is not registered.`,
      });
    }

    return res.json({
      resolved: true,
      walletAddress: details.ownerWallet,
      handle: `@${details.handle}`,
      isHandle: true,
      networkId: ROBINHOOD_CHAIN_ID,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to resolve NFT recipient target", details: err.message });
  }
});

// GET /api/v2/nft/:contractAddress/:tokenId - Fetch onchain ERC-721 metadata on Robinhood Chain
v2NftRouter.get("/:contractAddress/:tokenId", async (req: Request, res: Response) => {
  try {
    const { contractAddress, tokenId } = req.params;

    if (!isValidEvmAddress(contractAddress)) {
      return res.status(400).json({ error: "Invalid NFT contract address" });
    }

    const nftContract = getAddress(contractAddress);
    const parsedId = BigInt(tokenId);

    let name = "NFT";
    let symbol = "NFT";
    let owner: string | null = null;
    let tokenURI: string | null = null;

    try {
      name = await client.readContract({
        address: nftContract,
        abi: ERC721_ABI,
        functionName: "name",
      });
    } catch {}

    try {
      symbol = await client.readContract({
        address: nftContract,
        abi: ERC721_ABI,
        functionName: "symbol",
      });
    } catch {}

    try {
      tokenURI = await client.readContract({
        address: nftContract,
        abi: ERC721_ABI,
        functionName: "tokenURI",
        args: [parsedId],
      });
    } catch {}

    try {
      owner = await client.readContract({
        address: nftContract,
        abi: ERC721_ABI,
        functionName: "ownerOf",
        args: [parsedId],
      });
    } catch {}

    res.json({
      networkId: ROBINHOOD_CHAIN_ID,
      contractAddress: nftContract,
      tokenId: parsedId.toString(),
      name,
      symbol,
      owner,
      tokenURI,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch NFT metadata", details: err.message });
  }
});

// POST /api/v2/nft/transfer-plan - Build safeTransferFrom unsigned EVM transaction
v2NftRouter.post("/transfer-plan", async (req: Request, res: Response) => {
  try {
    const { fromWallet, target, contractAddress, tokenId } = req.body || {};

    if (!fromWallet || !isValidEvmAddress(fromWallet)) {
      return res.status(400).json({ error: "Valid sender fromWallet (0x...) is required." });
    }

    if (!target || typeof target !== "string") {
      return res.status(400).json({ error: "Recipient tag or EVM wallet address is required." });
    }

    if (!contractAddress || !isValidEvmAddress(contractAddress.trim())) {
      return res.status(400).json({ error: "Please provide a valid 42-character NFT contract address (0x...)." });
    }

    if (tokenId === undefined || tokenId === null || tokenId === "") {
      return res.status(400).json({ error: "tokenId is required." });
    }

    let parsedTokenId: bigint;
    try {
      parsedTokenId = BigInt(tokenId);
    } catch {
      return res.status(400).json({ error: "Invalid tokenId format (must be a valid numeric integer)." });
    }

    const sender = getAddress(fromWallet);
    const nftContract = getAddress(contractAddress.trim());

    // 1. Resolve Recipient Wallet
    let recipientWallet: `0x${string}`;
    let recipientHandle: string | null = null;

    if (isValidEvmAddress(target.trim())) {
      recipientWallet = getAddress(target.trim());
    } else {
      const details = await getV2HandleDetails(target);
      if (!details) {
        return res.status(404).json({
          error: `Recipient tag '${target}' is not registered on Robinhood Chain.`,
        });
      }
      recipientWallet = getAddress(details.ownerWallet);
      recipientHandle = `@${details.handle}`;
    }

    if (recipientWallet.toLowerCase() === sender.toLowerCase()) {
      return res.status(400).json({ error: "Sender and recipient addresses cannot be the same." });
    }

    // 2. Query Onchain Metadata / Ownership (non-blocking if RPC offline)
    let tokenName = "NFT";
    let tokenSymbol = "NFT";

    try {
      tokenName = await client.readContract({
        address: nftContract,
        abi: ERC721_ABI,
        functionName: "name",
      });
    } catch {}

    try {
      tokenSymbol = await client.readContract({
        address: nftContract,
        abi: ERC721_ABI,
        functionName: "symbol",
      });
    } catch {}

    // 3. Build Calldata: safeTransferFrom(from, to, tokenId)
    const calldata = encodeFunctionData({
      abi: ERC721_ABI,
      functionName: "safeTransferFrom",
      args: [sender, recipientWallet, parsedTokenId],
    });

    const transaction = {
      to: nftContract,
      data: calldata,
      value: "0",
      chainId: ROBINHOOD_CHAIN_ID,
    };

    return res.json({
      success: true,
      networkId: ROBINHOOD_CHAIN_ID,
      token: {
        contractAddress: nftContract,
        tokenId: parsedTokenId.toString(),
        name: tokenName,
        symbol: tokenSymbol,
      },
      sender: {
        walletAddress: sender,
      },
      recipient: {
        walletAddress: recipientWallet,
        handle: recipientHandle,
      },
      transaction,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to generate NFT transfer plan", details: err.message });
  }
});
