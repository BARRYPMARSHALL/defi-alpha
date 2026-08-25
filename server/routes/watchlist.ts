import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { fetchPoolsData, getCachedData } from "../lib/defillama";
import { buildAlerts, readBaseline } from "../lib/watch-alerts";

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

/**
 * APY-change alerts for the watchlist — the retention feature retail users
 * demonstrably want (APY-change notifications are the #1 gap in free tools).
 * The watchlist itself is the opt-in: we diff current APY against a stored
 * baseline and surface significant moves (default: >10% absolute change, or
 * >25% relative drop which signals decaying rewards).
 * Alert math lives in server/lib/watch-alerts.ts (shared with the push
 * scheduler); the /api/watchlist/alerts route serves the in-app cards.
 */

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

  // Watchlist alerts: diff watched pools against the stored baseline.
  // Call this on app load and periodically (client polls every 60s).
  app.get("/api/watchlist/alerts", async (req, res) => {
    const token = getToken(req);
    if (!token) {
      return res.json({ success: true, alerts: [], baseline: {} });
    }
    try {
      const watchlist = await storage.getWatchlist(token);
      if (watchlist.length === 0) {
        return res.json({ success: true, alerts: [], baseline: readBaseline(token) });
      }
      await fetchPoolsData();
      const cached = getCachedData();
      if (!cached) {
        return res.status(503).json({ success: false, error: "Data not available" });
      }
      const { alerts, baseline } = buildAlerts(token, watchlist, cached.pools);
      res.json({ success: true, alerts, baseline });
    } catch (error) {
      console.error("Error computing watchlist alerts:", error);
      res.status(500).json({ success: false, error: "Failed to compute alerts" });
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
      // Per-token cap so a token can't grow unbounded rows (matches the
      // display cap; the client reconciles against this).
      const WATCHLIST_MAX = 200;
      const existing = await storage.getWatchlist(token);
      if (existing.length >= WATCHLIST_MAX) {
        return res.status(400).json({
          success: false,
          error: `Watchlist limit reached (${WATCHLIST_MAX} pools). Remove some to add more.`,
        });
      }
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
