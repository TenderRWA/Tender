import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health";

export const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/health", healthRouter);

// Fallback 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});
