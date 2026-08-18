import type { Express } from "express";
import { getStablecoinsData } from "../lib/defillama";

export function registerStablecoinsRoutes(app: Express) {
  app.get("/api/stablecoins", async (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    try {
      const data = await getStablecoinsData();
      res.json({ success: true, ...data });
    } catch (error) {
      console.error("Error in /api/stablecoins:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch stablecoins data",
      });
    }
  });
}
