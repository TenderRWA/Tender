import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health";

export const app = express();

app.use(cors());
app.use(express.json());

// Root welcome route
app.get("/", (_req, res) => {
  res.status(200).json({
    name: "TENDER API",
    status: "ok",
    version: "0.1.0",
    docs: "/health",
  });
});

// Health check routes
app.use("/health", healthRouter);
app.use("/api/health", healthRouter);
app.use("/api/v1/health", healthRouter);

// Fallback 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});
