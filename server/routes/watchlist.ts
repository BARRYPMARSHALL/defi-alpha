import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";

const WATCHLIST_TOKEN_HEADER = "x-watchlist-token";

function getToken(req: any): string | null {
  const header = req.headers?.[WATCHLIST_TOKEN_HEADER.toLowerCase()];
  if (typeof header === "string" && header.length > 0) return header;
  const body = req.body?.token;
  if (typeof body === "string" && body.length > 0) return body;
  return null;
}

const addItemSchema = z.object({
  poolId: z.string().min(1),
  token: z.string().optional(),
});

export function registerWatchlistRoutes(app: Express) {
  app.get("/api/watchlist", async (req, res) => {
    const token = getToken(req);
    if (!token) {
      return res.json({ success: true, watchlist: [], synced: false });
    }
    try {
      const watchlist = await storage.getWatchlist(token);
      res.json({ success: true, watchlist, synced: true });
    } catch (error) {
      console.error("Error reading watchlist:", error);
      res.status(500).json({ success: false, error: "Failed to read watchlist" });
    }
  });

  app.post("/api/watchlist", async (req, res) => {
    const token = getToken(req);
    if (!token) {
      return res.status(400).json({ success: false, error: "Missing watchlist token" });
    }

    const parseResult = addItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid payload",
        details: parseResult.error.errors,
      });
    }

    try {
      await storage.addWatchlistItem({ token, poolId: parseResult.data.poolId });
      const watchlist = await storage.getWatchlist(token);
      res.json({ success: true, watchlist, synced: true });
    } catch (error) {
      console.error("Error adding watchlist item:", error);
      res.status(500).json({ success: false, error: "Failed to add watchlist item" });
    }
  });

  app.delete("/api/watchlist/:poolId", async (req, res) => {
    const token = getToken(req);
    if (!token) {
      return res.status(400).json({ success: false, error: "Missing watchlist token" });
    }

    try {
      const removed = await storage.removeWatchlistItem(token, req.params.poolId);
      const watchlist = await storage.getWatchlist(token);
      res.json({ success: true, removed, watchlist, synced: true });
    } catch (error) {
      console.error("Error removing watchlist item:", error);
      res.status(500).json({ success: false, error: "Failed to remove watchlist item" });
    }
  });
}
