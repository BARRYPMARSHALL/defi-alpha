import type { Express } from "express";
import { getCachedData, getCacheAgeMs } from "../lib/defillama";

export function registerHealthRoutes(app: Express) {
  app.get("/health", (_req, res) => {
    res.json({
      status: "DeFi Alpha Agent is live",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      data: {
        loaded: !!getCachedData(),
        cacheAgeMs: getCacheAgeMs(),
      },
    });
  });
}
