import type { Express } from "express";
import { z } from "zod";
import type { FilterState, SortState, PoolsResponse } from "@shared/schema";
import {
  fetchPoolsData,
  getCachedData,
  invalidatePoolsCache,
} from "../lib/defillama";
import { filterAndSortPools, countMatchingPools, CHAIN_ALIASES } from "../lib/filters";

const sortStateSchema = z.object({
  field: z.enum(["riskAdjustedScore", "tvlUsd", "apy", "apyPct7D"]),
  direction: z.enum(["asc", "desc"]),
});

const queryParamsSchema = z.object({
  minTvl: z.string().optional().transform((val) => {
    const num = Number(val);
    return isNaN(num) ? 5000000 : Math.max(0, num);
  }),
  minApy: z.string().optional().transform((val) => {
    const num = Number(val);
    return isNaN(num) ? 0 : Math.max(0, num);
  }),
  lowIlOnly: z.string().optional().transform((val) => val === "true"),
  searchQuery: z.string().optional().default(""),
  sortField: z.enum(["riskAdjustedScore", "tvlUsd", "apy", "apyPct7D"]).optional().default("riskAdjustedScore"),
  sortDirection: z.enum(["asc", "desc"]).optional().default("desc"),
  chains: z.union([z.string(), z.array(z.string())]).optional().transform((val) => {
    if (!val) return [];
    return Array.isArray(val) ? val : [val];
  }),
  projectTypes: z.union([z.string(), z.array(z.string())]).optional().transform((val) => {
    if (!val) return [];
    const arr = Array.isArray(val) ? val : [val];
    return arr.filter((t): t is FilterState["projectTypes"][number] =>
      ["lp", "lending", "stable", "volatile"].includes(t)
    );
  }),
  // Exact pool lookup by id (comma-separated) — used by the watchlist page so
  // starred pools render regardless of TVL/sort. Overrides all other filters.
  ids: z.string().optional().transform((val) => {
    if (!val) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of val.split(",")) {
      const id = s.trim();
      if (id && !seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
      if (out.length >= 200) break; // cap: watchlist realistically stays under this
    }
    return out;
  }),
});

export function registerPoolsRoutes(app: Express) {
  app.get("/api/pools", async (req, res) => {
    try {
      await fetchPoolsData();

      const cachedData = getCachedData();
      if (!cachedData) {
        return res.status(503).json({ error: "Data not available" });
      }

      const parseResult = queryParamsSchema.safeParse(req.query);

      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid query parameters",
          details: parseResult.error.errors,
        });
      }

      const params = parseResult.data;

      // Exact-by-id lookup (watchlist): return the requested pools in the
      // requested order, ignoring TVL/sort filters entirely.
      if (params.ids.length > 0) {
        const byId = new Map(cachedData.pools.map((p) => [p.pool, p]));
        const pools = params.ids
          .map((id) => byId.get(id))
          .filter((p): p is NonNullable<typeof p> => Boolean(p));
        const response: PoolsResponse = {
          pools,
          total: pools.length,
          stats: cachedData.stats,
          chains: cachedData.chains,
          chainDistribution: cachedData.chainDistribution,
          lastUpdated: cachedData.lastUpdated,
        };
        return res.json(response);
      }

      const filters: FilterState = {
        minTvl: params.minTvl,
        chains: params.chains,
        projectTypes: params.projectTypes,
        minApy: params.minApy,
        lowIlOnly: params.lowIlOnly,
        searchQuery: params.searchQuery,
      };

      const sort: SortState = {
        field: params.sortField,
        direction: params.sortDirection,
      };

      const filteredPools = filterAndSortPools(cachedData.pools, filters, sort);

      const response: PoolsResponse = {
        pools: filteredPools,
        total: countMatchingPools(cachedData.pools, filters),
        stats: cachedData.stats,
        chains: cachedData.chains,
        chainDistribution: cachedData.chainDistribution,
        lastUpdated: cachedData.lastUpdated,
      };

      res.json(response);
    } catch (error) {
      console.error("Error fetching pools:", error);
      res.status(500).json({ error: "Failed to fetch pools" });
    }
  });

  app.post("/api/refresh", async (_req, res) => {
    try {
      invalidatePoolsCache();
      await fetchPoolsData();
      res.json({ success: true, lastUpdated: getCachedData()?.lastUpdated });
    } catch (error) {
      console.error("Error refreshing data:", error);
      res.status(500).json({ error: "Failed to refresh data" });
    }
  });

  app.get("/api/chains", async (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    try {
      await fetchPoolsData();

      const cachedData = getCachedData();
      if (!cachedData) {
        return res.status(503).json({
          success: false,
          error: "Data not available",
        });
      }

      const chainCounts: Record<string, number> = {};
      for (const pool of cachedData.pools) {
        chainCounts[pool.chain] = (chainCounts[pool.chain] || 0) + 1;
      }

      const chains = Object.entries(chainCounts)
        .map(([name, count]) => ({ name, poolCount: count }))
        .sort((a, b) => b.poolCount - a.poolCount);

      res.json({
        success: true,
        total: chains.length,
        chains,
        aliases: CHAIN_ALIASES,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in /api/chains:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch chains",
      });
    }
  });
}
