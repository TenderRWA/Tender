import { query } from "../../db";
import { config } from "../../config";
import { refreshAccessToken } from "./oauth";

interface StoredBotToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

const REFRESH_MARGIN_MS = 5 * 60 * 1000; // refresh 5 minutes before actual expiry

let memoryToken: StoredBotToken | null = null;

async function getStoredToken(): Promise<StoredBotToken | null> {
  try {
    const res = await query(
      "SELECT access_token, refresh_token, expires_at FROM x_bot_tokens WHERE id = 'default'"
    );
    if (res.rows && res.rows.length > 0) {
      const row = res.rows[0];
      return {
        accessToken: row.access_token,
        refreshToken: row.refresh_token,
        expiresAt: new Date(row.expires_at),
      };
    }
  } catch (err) {
    console.warn("Could not read token from DB, checking in-memory cache", err);
  }
  return memoryToken;
}

async function saveToken(accessToken: string, refreshToken: string, expiresAt: Date): Promise<void> {
  memoryToken = { accessToken, refreshToken, expiresAt };
  try {
    await query(
      `INSERT INTO x_bot_tokens (id, access_token, refresh_token, expires_at, updated_at)
       VALUES ('default', $1, $2, $3, NOW())
       ON CONFLICT (id) DO UPDATE SET
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         expires_at = EXCLUDED.expires_at,
         updated_at = NOW()`,
      [accessToken, refreshToken, expiresAt]
    );
  } catch (err) {
    console.warn("Could not persist token to DB, preserved in memory", err);
  }
}

// X's refresh tokens rotate (single-use). We use inFlightRefresh mutex so concurrent
// calls don't fire duplicate refreshAccessToken calls and revoke the chain.
let inFlightRefresh: Promise<string> | null = null;

async function refreshAndSave(stored: StoredBotToken): Promise<string> {
  const refreshed = await refreshAccessToken(stored.refreshToken);
  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
  const newRefreshToken = refreshed.refresh_token ?? stored.refreshToken;
  await saveToken(refreshed.access_token, newRefreshToken, expiresAt);
  return refreshed.access_token;
}

export async function getValidBotAccessToken(): Promise<string> {
  const fromDb = await getStoredToken();
  const stored = fromDb ?? {
    accessToken: config.x.botAccessTokenSeed,
    refreshToken: config.x.botRefreshTokenSeed,
    // When seeding from fresh credentials in .env, assume valid for 90 mins rather than 0
    // so we don't prematurely burn the single-use refresh token on the first second of boot
    expiresAt: new Date(Date.now() + 90 * 60 * 1000),
  };

  // If token is still fresh and valid, return it directly
  if (Date.now() <= stored.expiresAt.getTime() - REFRESH_MARGIN_MS && stored.accessToken) {
    return stored.accessToken;
  }

  // If no refresh token available, fall back to seed access token
  if (!stored.refreshToken) {
    return stored.accessToken;
  }

  if (!inFlightRefresh) {
    inFlightRefresh = refreshAndSave(stored).finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}
