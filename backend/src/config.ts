import dotenv from "dotenv";

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3001", 10),
  databaseUrl: process.env.DATABASE_URL || "",
  solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  
  jupiter: {
    apiKey: process.env.JUPITER_API_KEY || "",
    apiUrl: process.env.JUPITER_API_URL || "https://api.jup.ag/swap/v6",
    priceApiUrl: process.env.JUPITER_PRICE_API_URL || "https://api.jup.ag/price/v2",
  },

  relay: {
    apiKey: process.env.RELAY_LINK_API_KEY || "",
    apiUrl: process.env.RELAY_API_URL || "https://api.relay.link",
    solanaChainId: 792703809,
  },

  fee: {
    wallet: process.env.TENDER_FEE_WALLET || "2aCStNyta182cUEry72GNNP7R2CcyErGWA8DLQVjjw3D",
    bps: parseInt(process.env.TENDER_FEE_BPS || "15", 10),
  },

  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
    model: process.env.GROQ_MODEL || "qwen/qwen3.8-27b",
  },

  x: {
    clientId: process.env.X_CLIENT_ID || "",
    clientSecret: process.env.X_CLIENT_SECRET || "",
    oauthRedirectUri: process.env.X_OAUTH_REDIRECT_URI || "https://api.tenderrwa.com/api/v1/auth/x/callback",
    botAccessTokenSeed: process.env.X_ACCESS_TOKEN || "",
    botRefreshTokenSeed: process.env.X_REFRESH_TOKEN || "",
    mentionsPollIntervalMs: parseInt(process.env.X_BOT_MENTIONS_POLL_INTERVAL_MS || "30000", 10),
    botEnabled: (process.env.X_BOT_ENABLED ?? "true") !== "false",
    botHandle: "TenderRWABot",
    mainHandle: "TenderRWA",
  },
};
