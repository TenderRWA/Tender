import { Router, Request, Response } from "express";
import {
  SOL,
  USDC,
  FEATURED_SOLANA_STOCKS,
  ALL_SOLANA_XSTOCKS,
  findSolanaToken,
  resolveSolanaToken,
} from "../lib/rwaTokens";

export const assetsRouter = Router();

// GET /api/v1/assets
assetsRouter.get("/", (req: Request, res: Response) => {
  const query = (req.query.q as string || "").trim().toLowerCase();
  const featuredOnly = req.query.featured === "true";
  const limit = Math.min(parseInt(req.query.limit as string || "100", 10), 1000);
  const offset = parseInt(req.query.offset as string || "0", 10);

  if (featuredOnly) {
    res.json({
      baseCurrencies: [SOL, USDC],
      featured: FEATURED_SOLANA_STOCKS,
      count: FEATURED_SOLANA_STOCKS.length,
    });
    return;
  }

  let filtered = ALL_SOLANA_XSTOCKS;
  if (query) {
    filtered = ALL_SOLANA_XSTOCKS.filter(
      (t) =>
        t.symbol.toLowerCase().includes(query) ||
        t.name.toLowerCase().includes(query) ||
        (t.underlyingTicker && t.underlyingTicker.toLowerCase().includes(query)) ||
        t.mint.toLowerCase() === query
    );
  }

  const paginated = filtered.slice(offset, offset + limit);

  res.json({
    baseCurrencies: [SOL, USDC],
    featured: FEATURED_SOLANA_STOCKS,
    total: filtered.length,
    limit,
    offset,
    assets: paginated,
  });
});

// GET /api/v1/assets/:symbolOrMint
assetsRouter.get("/:symbolOrMint", (req: Request, res: Response) => {
  const param = req.params.symbolOrMint;
  const token = resolveSolanaToken(param) || findSolanaToken(param);

  if (!token) {
    res.status(404).json({ error: `Asset '${param}' not found in Solana RWA catalog` });
    return;
  }

  res.json(token);
});
