import type { Pool, PoolWithScore, PoolsResponse } from "@shared/schema";
import { scorePools, computeChainStats } from "./scoring";

/**
 * Data access layer: fetches + caches DeFiLlama pool and stablecoin data.
 * The cache is process-local; this module exposes small async accessors
 * that routes and the Twitter scheduler share.
 */

let cachedData: {
  pools: PoolWithScore[];
  stats: PoolsResponse["stats"];
  chains: string[];
  chainDistribution: PoolsResponse["chainDistribution"];
  lastUpdated: string;
  rawPools: Pool[];
} | null = null;

let lastFetchTime = 0;
export const CACHE_DURATION = 2 * 60 * 1000;

interface StablecoinChainData {
  chain: string;
  totalCirculating: number;
  totalCirculatingUSD: number;
  tokens: { name: string; circulating: number }[];
}

interface StablecoinsCache {
  data: StablecoinChainData[];
  lastUpdated: string;
}

let cachedStablecoins: StablecoinsCache | null = null;
let lastStablecoinFetchTime = 0;
const STABLECOIN_CACHE_DURATION = 10 * 60 * 1000;

export const LOW_LIQUIDITY_TOKENS = new Set([
  "unknown", "undefined", "test", "mock",
]);

export function getCachedData() {
  return cachedData;
}

export function getCacheAgeMs(): number {
  return cachedData ? Date.now() - lastFetchTime : -1;
}

export function invalidatePoolsCache(): void {
  lastFetchTime = 0;
}

// In-flight dedupe: concurrent first hits (e.g. chat + digest preview in the
// same boot second) share ONE upstream fetch instead of stampeding DeFiLlama.
let inflightFetch: Promise<void> | null = null;

export async function fetchPoolsData(): Promise<void> {
  const now = Date.now();
  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return;
  }

  if (inflightFetch) {
    return inflightFetch;
  }

  inflightFetch = (async () => {
    try {
      console.log("Fetching pools from DeFiLlama...");
      const response = await fetch("https://yields.llama.fi/pools");

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const json = await response.json();
      const rawPools: any[] = json.data || [];

      const poolsWithScore = scorePools(rawPools);
      // Strip scoring enrichment to get the plain Pool list (keeps chain stats accurate)
      const rawPoolsClean: Pool[] = poolsWithScore.map((scored) => {
        const p: Pool = {
          pool: scored.pool,
          chain: scored.chain,
          project: scored.project,
          symbol: scored.symbol,
          tvlUsd: scored.tvlUsd,
          apyBase: scored.apyBase,
          apyReward: scored.apyReward,
          apy: scored.apy,
          rewardTokens: scored.rewardTokens,
          il7d: scored.il7d,
          ilRisk: scored.ilRisk,
          exposure: scored.exposure,
          stablecoin: scored.stablecoin,
          volumeUsd7d: scored.volumeUsd7d,
          apyPct1D: scored.apyPct1D,
          apyPct7D: scored.apyPct7D,
          apyPct30D: scored.apyPct30D,
          poolMeta: scored.poolMeta,
          underlyingTokens: scored.underlyingTokens,
          url: scored.url,
        };
        return p;
      });

      const { chains, chainDistribution, topChain, topChainTvl, avgApy } =
        computeChainStats(rawPoolsClean);

      cachedData = {
        pools: poolsWithScore,
        stats: {
          totalPools: rawPoolsClean.length,
          avgApy,
          topChain,
          topChainTvl,
        },
        chains,
        chainDistribution,
        lastUpdated: new Date().toISOString(),
        rawPools: rawPoolsClean,
      };

      lastFetchTime = Date.now();
      console.log(`Fetched ${rawPoolsClean.length} pools from DeFiLlama`);
    } catch (error) {
      console.error("Failed to fetch pools:", error);
      if (!cachedData) {
        throw error;
      }
    } finally {
      inflightFetch = null;
    }
  })();

  return inflightFetch;
}

export async function getStablecoinsData(): Promise<{
  data: StablecoinChainData[];
  lastUpdated: string;
  stale?: boolean;
}> {
  const now = Date.now();

  if (cachedStablecoins && now - lastStablecoinFetchTime < STABLECOIN_CACHE_DURATION) {
    return cachedStablecoins;
  }

  try {
    console.log("[Stablecoins] Fetching from DeFiLlama...");
    const response = await fetch("https://stablecoins.llama.fi/stablecoinchains");

    if (!response.ok) {
      throw new Error(`DeFiLlama API error: ${response.status}`);
    }

    const rawData = await response.json();

    const chainData: StablecoinChainData[] = rawData
      .map((chain: any) => {
        const totalUsd = typeof chain.totalCirculatingUSD === "number"
          ? chain.totalCirculatingUSD
          : chain.totalCirculatingUSD?.peggedUSD || 0;
        return {
          chain: chain.name || chain.gecko_id || "Unknown",
          totalCirculating: totalUsd,
          totalCirculatingUSD: totalUsd,
          tokens: [],
        };
      })
      .filter((chain: StablecoinChainData) => chain.totalCirculatingUSD > 0)
      .sort((a: StablecoinChainData, b: StablecoinChainData) => b.totalCirculatingUSD - a.totalCirculatingUSD)
      .slice(0, 20);

    cachedStablecoins = {
      data: chainData,
      lastUpdated: new Date().toISOString(),
    };
    lastStablecoinFetchTime = now;

    console.log(`[Stablecoins] Cached ${chainData.length} chains`);

    return cachedStablecoins;
  } catch (error) {
    console.error("[Stablecoins] Fetch failed:", error);
    if (cachedStablecoins) {
      // Return stale cache so the UI never breaks
      return { ...cachedStablecoins, stale: true };
    }
    throw error;
  }
}
