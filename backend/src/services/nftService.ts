import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { config } from "../config";
import { buildDirectTransferTx } from "./txBuilder";
import { query } from "../db";

const connection = new Connection(config.solanaRpcUrl, "confirmed");

const METAPLEX_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export interface NftMetadata {
  mint: string;
  name: string;
  symbol: string;
  uri?: string;
  image?: string;
  description?: string;
  isToken2022?: boolean;
}

/**
 * Validates whether a string is a valid Solana base58 public key.
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    const clean = (address || "").trim();
    if (clean.length < 32 || clean.length > 44) return false;
    new PublicKey(clean);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves on-chain Metaplex metadata for an NFT mint.
 * Falls back to generic metadata if non-Metaplex or on fetch failure.
 */
export async function resolveNftMetadata(mintAddress: string): Promise<NftMetadata> {
  const cleanMint = mintAddress.trim();
  const fallback: NftMetadata = {
    mint: cleanMint,
    name: `NFT (${cleanMint.slice(0, 4)}…${cleanMint.slice(-4)})`,
    symbol: "NFT",
  };

  if (!isValidSolanaAddress(cleanMint)) {
    return fallback;
  }

  try {
    const mintPubkey = new PublicKey(cleanMint);
    const [metadataPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), METAPLEX_PROGRAM_ID.toBuffer(), mintPubkey.toBuffer()],
      METAPLEX_PROGRAM_ID
    );

    const accountInfo = await connection.getAccountInfo(metadataPda);
    if (!accountInfo || !accountInfo.data || accountInfo.data.length < 69) {
      return fallback;
    }

    const data = accountInfo.data;
    const nameLen = data.readUInt32LE(65);
    const name = data.slice(69, 69 + Math.min(nameLen, 32)).toString("utf8").replace(/\0/g, "").trim();

    const symbolStart = 69 + nameLen;
    let symbol = "NFT";
    let uri = "";

    if (data.length > symbolStart + 4) {
      const symbolLen = data.readUInt32LE(symbolStart);
      symbol = data.slice(symbolStart + 4, symbolStart + 4 + Math.min(symbolLen, 10)).toString("utf8").replace(/\0/g, "").trim();

      const uriStart = symbolStart + 4 + symbolLen;
      if (data.length > uriStart + 4) {
        const uriLen = data.readUInt32LE(uriStart);
        uri = data.slice(uriStart + 4, uriStart + 4 + Math.min(uriLen, 200)).toString("utf8").replace(/\0/g, "").trim();
      }
    }

    let image: string | undefined;
    if (uri && (uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("ipfs://"))) {
      try {
        const httpUrl = uri.startsWith("ipfs://")
          ? uri.replace("ipfs://", "https://ipfs.io/ipfs/")
          : uri;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(httpUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const json: any = await res.json();
          if (json?.image) {
            image = json.image.startsWith("ipfs://")
              ? json.image.replace("ipfs://", "https://ipfs.io/ipfs/")
              : json.image;
          }
        }
      } catch {
        // Soft-fail on off-chain image retrieval
      }
    }

    return {
      mint: cleanMint,
      name: name || fallback.name,
      symbol: symbol || "NFT",
      uri: uri || undefined,
      image,
    };
  } catch (err) {
    console.warn(`[NftService] Could not resolve metadata for ${cleanMint}:`, err);
    return fallback;
  }
}

/**
 * Builds a direct sovereign NFT transfer transaction to a recipient tag or wallet.
 * Bypasses all portfolio election slicing.
 */
export async function buildNftTransferPlan(params: {
  userWallet: string;
  recipientTag?: string;
  recipientWallet?: string;
  nftMint: string;
}): Promise<{
  base64Transaction: string;
  recipientWallet: string;
  recipientHandle?: string;
  nft: NftMetadata;
}> {
  const { userWallet, recipientTag, nftMint } = params;
  let targetWallet = params.recipientWallet?.trim();
  let cleanHandle = recipientTag ? recipientTag.replace(/^@/, "").toLowerCase().trim() : undefined;

  if (!targetWallet && cleanHandle) {
    const handleRes = await query(
      "SELECT handle, owner_wallet FROM handles WHERE LOWER(handle) = $1 LIMIT 1",
      [cleanHandle]
    );

    if (handleRes.rows && handleRes.rows.length > 0) {
      targetWallet = handleRes.rows[0].owner_wallet;
      cleanHandle = handleRes.rows[0].handle;
    } else {
      const xRes = await query(
        "SELECT wallet_address, x_username FROM x_accounts WHERE LOWER(x_username) = $1 LIMIT 1",
        [cleanHandle]
      );
      if (xRes.rows && xRes.rows.length > 0) {
        targetWallet = xRes.rows[0].wallet_address;
      }
    }

    if (!targetWallet && cleanHandle) {
      const FALLBACK_TAGS: Record<string, string> = {
        ninjastorm: "FuSZ9qKm5kUPdmsypSyMRXfTiY4dFrWyvWcmh2URwQWt",
        nothipposol: "2aCStNyta182cUEry72GNNP7R2CcyErGWA8DLQVjjw3D",
      };
      if (FALLBACK_TAGS[cleanHandle]) {
        targetWallet = FALLBACK_TAGS[cleanHandle];
      }
    }
  }

  if (!targetWallet) {
    throw new Error(`Recipient tag '@${cleanHandle || "unknown"}' not found or has no registered wallet address`);
  }

  if (!isValidSolanaAddress(userWallet)) {
    throw new Error(`Invalid sender wallet address: ${userWallet}`);
  }

  if (!isValidSolanaAddress(targetWallet)) {
    throw new Error(`Invalid recipient wallet address: ${targetWallet}`);
  }

  if (!isValidSolanaAddress(nftMint)) {
    throw new Error(`Invalid NFT mint address: ${nftMint}`);
  }

  const nft = await resolveNftMetadata(nftMint);

  const { base64Transaction } = await buildDirectTransferTx({
    userWallet,
    recipientWallet: targetWallet,
    tokenMint: nftMint,
    amount: "1",
    decimals: 0,
  });

  return {
    base64Transaction,
    recipientWallet: targetWallet,
    recipientHandle: cleanHandle,
    nft,
  };
}

/**
 * Scans a wallet address for NFTs (tokens with supply 1, decimals 0).
 */
export async function getWalletNfts(walletAddress: string): Promise<NftMetadata[]> {
  if (!isValidSolanaAddress(walletAddress)) return [];

  const pubkey = new PublicKey(walletAddress);
  const nfts: NftMetadata[] = [];

  try {
    const splAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: TOKEN_PROGRAM_ID,
    });

    const candidates = splAccounts.value.filter((a) => {
      const info = a.account.data.parsed.info;
      return info.tokenAmount.decimals === 0 && info.tokenAmount.amount === "1";
    });

    for (const c of candidates.slice(0, 20)) {
      const mint = c.account.data.parsed.info.mint;
      const meta = await resolveNftMetadata(mint);
      nfts.push(meta);
    }
  } catch (err) {
    console.error(`[NftService] Error fetching NFTs for ${walletAddress}:`, err);
  }

  return nfts;
}
