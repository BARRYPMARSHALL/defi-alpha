import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { fetchPoolsData, getCachedData } from "../lib/defillama";

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
 */
interface Baseline {
  [poolId: string]: { apy: number; at: string };
}

const baselines = new Map<string, Baseline>();
const BASELINE_TTL_MS = 24 * 60 * 60 * 1000; // re-baseline daily

function loadBaseline(token: string): Baseline {
  return baselines.get(token) || {};
}

function saveBaseline(token: string, baseline: Baseline) {
  baselines.set(token, baseline);
}

interface WatchAlert {
  poolId: string;
  symbol: string;
  project: string;
  chain: string;
  previousApy: number;
  currentApy: number;
  changePct: number;
  direction: "up" | "down";
  message: string;
}

function buildAlerts(
  token: string,
  watchedIds: string[],
  pools: { pool: string; symbol: string; project: string; chain: string; apy: number }[],
): { alerts: WatchAlert[]; baseline: Baseline } {
  const baseline = loadBaseline(token);
  const poolById = new Map(pools.map((p) => [p.pool, p]));
  const alerts: WatchAlert[] = [];
  const now = new Date().toISOString();

  for (const poolId of watchedIds) {
    const pool = poolById.get(poolId);
    if (!pool) continue;

    const prev = baseline[poolId];
    if (!prev || Date.parse(now) - Date.parse(prev.at) > BASELINE_TTL_MS) {
      // First sighting (or stale baseline): just record, don't alert
      baseline[poolId] = { apy: pool.apy, at: now };
      continue;
    }

    const changePct = prev.apy > 0 ? ((pool.apy - prev.apy) / prev.apy) * 100 : 0;
    const absChange = Math.abs(pool.apy - prev.apy);

    const significant =
      absChange >= 10 || changePct <= -25 || changePct >= 50;

    if (significant && pool.apy !== prev.apy) {
      alerts.push({
        poolId,
        symbol: pool.symbol,
        project: pool.project,
        chain: pool.chain,
        previousApy: prev.apy,
        currentApy: pool.apy,
        changePct,
        direction: pool.apy > prev.apy ? "up" : "down",
        message:
          pool.apy > prev.apy
            ? `${pool.symbol} APY rose from ${prev.apy.toFixed(1)}% to ${pool.apy.toFixed(1)}%`
            : `${pool.symbol} APY fell from ${prev.apy.toFixed(1)}% to ${pool.apy.toFixed(1)}%`,
      });
    }

    // Always refresh the baseline so the next poll diffs against today
    baseline[poolId] = { apy: pool.apy, at: now };
  }

  saveBaseline(token, baseline);
  return { alerts, baseline };
}

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
        return res.json({ success: true, alerts: [], baseline: loadBaseline(token) });
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
