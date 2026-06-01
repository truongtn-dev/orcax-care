import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health.routes.js";
import { apiRouter } from "./routes/index.js";

export function createApp() {
  const app = express();
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
      credentials: true,
    })
  );
  app.use(express.json());

  app.use("/health", healthRouter);
  app.use("/api", apiRouter);

  app.use((req, res) => {
    res.status(404).json({ ok: false, message: "Not found" });
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ ok: false, message: "Internal server error" });
  });

  return app;
}
