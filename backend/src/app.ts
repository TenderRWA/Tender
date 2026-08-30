import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { healthRouter } from "./routes/health";
import { assetsRouter } from "./routes/assets";
import { handlesRouter } from "./routes/handles";
import { settleRouter } from "./routes/settle";
import { invoicesRouter } from "./routes/invoices";

export const app = express();

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = performance.now();
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl || req.url;

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

// API v1 routes
app.use("/api/v1/assets", assetsRouter);
app.use("/api/v1/handles", handlesRouter);
app.use("/api/v1/settle", settleRouter);
app.use("/api/v1/invoices", invoicesRouter);
app.use("/api/v1/solana-pay", invoicesRouter);

// Fallback 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});
