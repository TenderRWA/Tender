import { Router, type Request, type Response } from "express";
import { randomBytes } from "crypto";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { config } from "../config";
import { query } from "../db";
import {
  generatePkcePair,
  buildAuthorizeUrl,
  exchangeCodeForToken,
  getAuthenticatedXUser,
} from "../services/x/oauth";

export const authRouter = Router();

interface PkceSession {
  codeVerifier: string;
  wallet: string;
  returnUrl?: string;
  createdAt: number;
}

// In-memory store for PKCE state with automatic TTL cleanup
const stateStore = new Map<string, PkceSession>();

// Purge sessions older than 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [state, session] of stateStore.entries()) {
    if (now - session.createdAt > 15 * 60 * 1000) {
      stateStore.delete(state);
    }
  }
}, 5 * 60 * 1000);

export function verifySolanaSignature(params: {
  wallet: string;
  signature: string;
  message: string;
}): boolean {
  try {
    const pubkeyBytes = bs58.decode(params.wallet);
    const sigBytes = bs58.decode(params.signature);
    const msgBytes = new TextEncoder().encode(params.message);
    return nacl.sign.detached.verify(msgBytes, sigBytes, pubkeyBytes);
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}

// GET /api/v1/auth/x/login?wallet=<pubkey>&signature=<base58_sig>&message=<signed_text>&return_url=<url>
authRouter.get("/x/login", (req: Request, res: Response) => {
  const wallet = (req.query.wallet as string)?.trim();
  const signature = (req.query.signature as string)?.trim();
  const message = (req.query.message as string)?.trim();
  const returnUrl = (req.query.return_url as string)?.trim();

  if (!wallet) {
    res.status(400).json({ error: "wallet query parameter is required" });
    return;
  }

  // If signature is provided, cryptographically verify wallet ownership
  if (signature && message) {
    const isValid = verifySolanaSignature({ wallet, signature, message });
    if (!isValid) {
      console.warn(`[X Auth] Cryptographic signature check failed for wallet ${wallet}`);
      const fallbackTarget = returnUrl || `${config.frontendUrl}/dashboard`;
      res.redirect(`${fallbackTarget}?x_error=${encodeURIComponent("invalid_wallet_signature")}`);
      return;
    }
    console.log(`[X Auth] ✅ Verified cryptographic wallet ownership for ${wallet}`);
  }

  const { codeVerifier, codeChallenge } = generatePkcePair();
  const state = randomBytes(24).toString("hex");

  stateStore.set(state, {
    codeVerifier,
    wallet,
    returnUrl,
    createdAt: Date.now(),
  });

  const authUrl = buildAuthorizeUrl({
    state,
    codeChallenge,
    scope: "tweet.read users.read offline.access",
  });

  res.redirect(authUrl);
});

// GET /api/v1/auth/x/callback?state=...&code=...
authRouter.get("/x/callback", async (req: Request, res: Response) => {
  const state = req.query.state as string;
  const code = req.query.code as string;
  const error = req.query.error as string;

  const fallbackRedirect = `${config.frontendUrl}/dashboard`;

  if (error) {
    console.error("[X Auth Callback] Error from X:", error);
    res.redirect(`${fallbackRedirect}?x_error=${encodeURIComponent(error)}`);
    return;
  }

  if (!state || !code) {
    res.redirect(`${fallbackRedirect}?x_error=missing_state_or_code`);
    return;
  }

  const session = stateStore.get(state);
  if (!session) {
    console.error("[X Auth Callback] Invalid or expired state:", state);
    res.redirect(`${fallbackRedirect}?x_error=invalid_session_state`);
    return;
  }

  stateStore.delete(state);

  try {
    const tokenRes = await exchangeCodeForToken(code, session.codeVerifier);
    const xUser = await getAuthenticatedXUser(tokenRes.access_token);

    // Upsert into x_accounts table
    await query(
      `INSERT INTO x_accounts (wallet_address, x_user_id, x_username, linked_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (wallet_address) DO UPDATE SET
         x_user_id = EXCLUDED.x_user_id,
         x_username = EXCLUDED.x_username,
         updated_at = NOW()`,
      [session.wallet, xUser.id, xUser.username]
    );

    // Also update any handles registered to this wallet so handles table reflects X username
    try {
      await query(
        `UPDATE handles 
         SET x_username = $1, x_user_id = $2, updated_at = NOW() 
         WHERE owner_wallet = $3`,
        [xUser.username, xUser.id, session.wallet]
      );
    } catch (handleErr) {
      console.warn("Could not update handles table with X identity:", handleErr);
    }

    const redirectTarget = session.returnUrl || fallbackRedirect;
    const separator = redirectTarget.includes("?") ? "&" : "?";
    res.redirect(`${redirectTarget}${separator}x_linked=true&x_user=${encodeURIComponent(xUser.username)}`);
  } catch (err: any) {
    console.error("[X Auth Callback] Token exchange failed:", err);
    res.redirect(`${fallbackRedirect}?x_error=${encodeURIComponent(err.message || "token_exchange_failed")}`);
  }
});

// GET /api/v1/auth/x/account?wallet=<wallet_address>
authRouter.get("/x/account", async (req: Request, res: Response) => {
  try {
    const wallet = (req.query.wallet as string)?.trim();
    if (!wallet) {
      res.status(400).json({ error: "wallet is required" });
      return;
    }

    const result = await query(
      "SELECT wallet_address, x_user_id, x_username, linked_at FROM x_accounts WHERE wallet_address = $1",
      [wallet]
    );

    if (!result.rows || result.rows.length === 0) {
      res.json({
        linked: false,
        account: null,
      });
      return;
    }

    const row = result.rows[0];
    res.json({
      linked: true,
      account: {
        walletAddress: row.wallet_address,
        xUserId: row.x_user_id,
        xUsername: row.x_username,
        linkedAt: row.linked_at,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch linked X account", details: err.message });
  }
});

// POST /api/v1/auth/x/unlink
authRouter.post("/x/unlink", async (req: Request, res: Response) => {
  try {
    const { wallet } = req.body as { wallet?: string };
    if (!wallet) {
      res.status(400).json({ error: "wallet is required" });
      return;
    }

    await query("DELETE FROM x_accounts WHERE wallet_address = $1", [wallet]);
    await query("UPDATE handles SET x_username = NULL, x_user_id = NULL WHERE owner_wallet = $1", [wallet]);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to unlink X account", details: err.message });
  }
});
