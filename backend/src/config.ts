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
};
