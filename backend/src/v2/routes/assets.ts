import { Router, Request, Response } from "express";
import {
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_EXPLORER_URL,
  getAllRobinhoodTokens,
  FEATURED_ROBINHOOD_ASSETS,
  resolveRobinhoodToken,
  USDG,
  ETH,
} from "../lib/robinhoodTokens";

export const v2AssetsRouter = Router();

// GET /api/v2/assets - List supported tokens on Robinhood Chain (Chain 4663)
v2AssetsRouter.get("/", (req: Request, res: Response) => {
  const { featured, q } = req.query;

  let tokens = getAllRobinhoodTokens();

  if (featured === "true") {
    tokens = [ETH, USDG, ...FEATURED_ROBINHOOD_ASSETS];
  }

  if (q && typeof q === "string") {
    const queryStr = q.toLowerCase();
    tokens = tokens.filter(
      (t) =>
        t.symbol.toLowerCase().includes(queryStr) ||
        t.name.toLowerCase().includes(queryStr) ||
        t.address.toLowerCase() === queryStr
    );
  }

  res.json({
    network: {
      chainId: ROBINHOOD_CHAIN_ID,
      name: "Robinhood Chain",
      nativeCurrency: "ETH",
      blockExplorer: ROBINHOOD_EXPLORER_URL,
    },
    baseCurrencies: [ETH, USDG],
    featuredAssets: FEATURED_ROBINHOOD_ASSETS,
    tokens,
    count: tokens.length,
  });
});

// GET /api/v2/assets/:symbolOrAddress - Resolve single token on Robinhood Chain
v2AssetsRouter.get("/:symbolOrAddress", (req: Request, res: Response) => {
  const { symbolOrAddress } = req.params;
  const token = resolveRobinhoodToken(symbolOrAddress);

  if (!token) {
    res.status(404).json({ error: `Asset '${symbolOrAddress}' not found on Robinhood Chain (4663)` });
    return;
  }

  res.json({ token, networkId: ROBINHOOD_CHAIN_ID });
});
