import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { healthRouter } from "./routes/health";
import { assetsRouter } from "./routes/assets";
import { handlesRouter } from "./routes/handles";
import { settleRouter } from "./routes/settle";
import { invoicesRouter } from "./routes/invoices";
import { botRouter } from "./routes/bot";
import { authRouter } from "./routes/auth";
import { nftRouter } from "./routes/nft";
import { v2AssetsRouter } from "./v2/routes/assets";
import { v2HandlesRouter } from "./v2/routes/handles";
import { v2SettleRouter } from "./v2/routes/settle";
import { v2InvoicesRouter } from "./v2/routes/invoices";
import { v2NftRouter } from "./v2/routes/nft";

export const app = express();

app.use(cors());
app.use(express.json());

// Detailed Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = performance.now();
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";

  // Log incoming request immediately
  const queryStr = Object.keys(req.query).length > 0 ? ` ?${new URLSearchParams(req.query as any).toString()}` : "";
  console.log(`[${timestamp}] 📥 ${method} ${req.path}${queryStr} [from: ${ip}]`);
  
  if (method === "POST" && req.body && Object.keys(req.body).length > 0) {
    const sanitized = { ...req.body };
    if (sanitized.privateKey) sanitized.privateKey = "******";
    if (sanitized.secret) sanitized.secret = "******";
    console.log(`  └─ payload:`, JSON.stringify(sanitized));
  }

  res.on("finish", () => {
    const duration = (performance.now() - start).toFixed(2);
    const status = res.statusCode;
    const statusEmoji = status >= 500 ? "❌" : status >= 400 ? "⚠️" : "✅";
    console.log(
      `[${timestamp}] ${statusEmoji} ${method} ${url} -> ${status} (${duration}ms)`
    );
  });

  next();
});

// Root welcome route
app.get("/", (_req, res) => {
  res.status(200).json({
    name: "TENDER API",
    status: "ok",
    version: "0.1.0",
    description: "Receive-side RWA Settlement Rail on Solana",
    endpoints: {
      health: "/health",
      assets: "/api/v1/assets",
      handles: "/api/v1/handles/:handle",
      settleQuote: "POST /api/v1/settle/quote",
      electionQuote: "POST /api/v1/settle/election-quote",
      buildTx: "POST /api/v1/settle/build-tx",
      invoices: "/api/v1/invoices",
    },
  });
});

// Health routes
app.use("/health", healthRouter);
app.use("/api/health", healthRouter);
app.use("/api/v1/health", healthRouter);

// API v1 routes (Solana Rail)
app.use("/api/v1/assets", assetsRouter);
app.use("/api/v1/handles", handlesRouter);
app.use("/api/v1/settle", settleRouter);
app.use("/api/v1/invoices", invoicesRouter);
app.use("/api/v1/solana-pay", invoicesRouter);
app.use("/api/v1/bot", botRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/nft", nftRouter);

// API v2 routes (Robinhood Chain Rail - Chain ID 4663)
app.use("/api/v2/assets", v2AssetsRouter);
app.use("/api/v2/handles", v2HandlesRouter);
app.use("/api/v2/settle", v2SettleRouter);
app.use("/api/v2/invoices", v2InvoicesRouter);
app.use("/api/v2/nft", v2NftRouter);
app.use("/api/v2/bot", botRouter);

// Fallback 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});
