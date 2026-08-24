import type { Pool, PoolWithScore } from "@shared/schema";

/**
 * Pure scoring/analysis logic extracted from the original monolithic routes.ts.
 * Everything here is side-effect free and unit-testable.
 */

export function calculateIlRisk(pool: any): { risk: Pool["ilRisk"]; ilPctActual: number | null } {
  if (pool.exposure === "single" || pool.ilRisk === "no") {
    return { risk: "none", ilPctActual: null };
  }

  const il7d = pool.il7d;
  const il14d = pool.il14d;
  const hasRealIlData = (il7d !== null && il7d !== undefined) || (il14d !== null && il14d !== undefined);

  if (hasRealIlData) {
    const ilValue = il7d ?? il14d ?? 0;
    const absIl = Math.abs(ilValue);

    let risk: Pool["ilRisk"];
    if (absIl < 0.1) {
      risk = "low";
    } else if (absIl < 0.5) {
      risk = "medium";
    } else {
      risk = "high";
    }

    return { risk, ilPctActual: ilValue };
  }

  if (pool.stablecoin) {
    return { risk: "low", ilPctActual: null };
  }

  const symbol = (pool.symbol || "").toUpperCase();
  const hasStablePair = symbol.includes("USDC") || symbol.includes("USDT") ||
                        symbol.includes("DAI") || symbol.includes("FRAX") ||
                        symbol.includes("BUSD") || symbol.includes("TUSD");

  const hasVolatilePair = symbol.includes("ETH") || symbol.includes("BTC") ||
                          symbol.includes("SOL") || symbol.includes("AVAX");

  if (hasStablePair && !hasVolatilePair) {
    return { risk: "low", ilPctActual: null };
  }

  if (hasVolatilePair && !hasStablePair) {
    return { risk: "high", ilPctActual: null };
  }

  return { risk: "medium", ilPctActual: null };
}

export const IL_PENALTY: Record<Pool["ilRisk"], number> = {
  none: 0,
  low: 0.1,
  medium: 0.25,
  high: 0.5,
};

export function calculateRiskAdjustedScore(pool: Pool): number {
  const apy = pool.apy || 0;
  const tvlFactor = Math.min(pool.tvlUsd / 10000000, 1);
  const ilFactor = 1 - IL_PENALTY[pool.ilRisk];
  return apy * tvlFactor * ilFactor;
}

export function isHotPool(pool: any): boolean {
  const volumeThreshold = 1000000;
  const apyChangeThreshold = 5;
  const highVolume = pool.volumeUsd7d && pool.volumeUsd7d > volumeThreshold;
  const risingApy = pool.apyPct7D && pool.apyPct7D > apyChangeThreshold;
  return highVolume || risingApy;
}

export function isApyDeclining(pool: any): boolean {
  const apyPct7D = pool.apyPct7D;
  if (apyPct7D === null || apyPct7D === undefined) {
    return false;
  }
  return apyPct7D < -20;
}

export function hasLowLiquidityRewards(pool: any): boolean {
  const rewardTokens = pool.rewardTokens;
  if (!rewardTokens || !Array.isArray(rewardTokens) || rewardTokens.length === 0) {
    return false;
  }

  const apyReward = pool.apyReward || 0;
  const apyBase = pool.apyBase || 0;
  const totalApy = pool.apy || 0;

  if (totalApy <= 0) return false;

  const rewardRatio = apyReward / totalApy;

  if (rewardRatio > 0.8) {
    const tvl = pool.tvlUsd || 0;
    if (tvl < 1000000) {
      return true;
    }

    const volume7d = pool.volumeUsd7d || 0;
    if (volume7d < 100000 && rewardRatio > 0.9) {
      return true;
    }
  }

  return false;
}

export const AUTO_COMPOUND_PROJECTS = new Set([
  'beefy',
  'yearn-finance',
  'gamma',
  'arrakis',
  'reaper-farm',
  'autofarm',
  'concentrator',
  'origin-dollar',
  'aura',
  'convex-finance',
  'convex',
  'pendle',
  'sommelier',
  'pickle-finance',
  'harvest-finance',
]);

export const AUTO_COMPOUND_KEYWORDS = ['vault', 'auto', 'compound', 'autocompound'];

export const BEEFY_SUPPORTED_PROTOCOLS = new Set([
  'aerodrome-v1',
  'aerodrome-v2',
  'velodrome-v2',
  'velodrome-v1',
  'uniswap-v3',
  'uniswap-v2',
  'pancakeswap-amm-v3',
  'pancakeswap-amm-v2',
  'sushiswap',
  'curve-dex',
  'curve',
  'balancer-v2',
  'camelot-v3',
  'camelot-v2',
  'trader-joe-dex',
  'quickswap-dex',
  'thena-v1',
  'thena-v2',
  'ramses-v2',
  'lynex',
  'solidly-v2',
  'equalizer',
]);

export const BEEFY_SUPPORTED_CHAINS = new Set([
  'Ethereum',
  'Arbitrum',
  'Optimism',
  'Polygon',
  'Base',
  'BSC',
  'Avalanche',
  'Fantom',
  'Cronos',
  'zkSync Era',
  'Linea',
  'Mantle',
  'Scroll',
  'Mode',
  'Fraxtal',
]);

export interface AutoCompoundInfo {
  autoCompound: boolean;
  autoCompoundProject: string | null;
  isBeefy: boolean;
  beefyAvailable: boolean;
}

export function detectAutoCompound(pool: any): AutoCompoundInfo {
  const project = (pool.project || '').toLowerCase();
  const chain = pool.chain || '';

  if (project === 'beefy') {
    return {
      autoCompound: true,
      autoCompoundProject: 'Beefy',
      isBeefy: true,
      beefyAvailable: true,
    };
  }

  if (AUTO_COMPOUND_PROJECTS.has(project)) {
    const displayName = pool.project.split('-').map((w: string) =>
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');

    const beefyAvailable = BEEFY_SUPPORTED_PROTOCOLS.has(project) && BEEFY_SUPPORTED_CHAINS.has(chain);

    return {
      autoCompound: true,
      autoCompoundProject: displayName,
      isBeefy: false,
      beefyAvailable,
    };
  }

  const poolMeta = (pool.poolMeta || '').toLowerCase();
  const symbol = (pool.symbol || '').toLowerCase();

  for (const keyword of AUTO_COMPOUND_KEYWORDS) {
    if (poolMeta.includes(keyword) || symbol.includes(keyword)) {
      const beefyAvailable = BEEFY_SUPPORTED_PROTOCOLS.has(project) && BEEFY_SUPPORTED_CHAINS.has(chain);
      return {
        autoCompound: true,
        autoCompoundProject: pool.project,
        isBeefy: false,
        beefyAvailable,
      };
    }
  }

  const beefyAvailable = BEEFY_SUPPORTED_PROTOCOLS.has(project) && BEEFY_SUPPORTED_CHAINS.has(chain);

  return {
    autoCompound: false,
    autoCompoundProject: null,
    isBeefy: false,
    beefyAvailable,
  };
}

export interface TransformedPoolData {
  pool: Pool;
  ilPctActual: number | null;
  apyDeclining: boolean;
  lowLiquidityRewards: boolean;
}

export function transformPool(raw: any): TransformedPoolData {
  const ilResult = calculateIlRisk(raw);

  const pool: Pool = {
    pool: raw.pool,
    chain: raw.chain,
    project: raw.project,
    symbol: raw.symbol,
    tvlUsd: raw.tvlUsd || 0,
    apyBase: raw.apyBase,
    apyReward: raw.apyReward,
    apy: raw.apy || 0,
    rewardTokens: raw.rewardTokens,
    il7d: raw.il7d,
    ilRisk: ilResult.risk,
    exposure: raw.exposure === "single" ? "single" : "multi",
    stablecoin: raw.stablecoin || false,
    volumeUsd7d: raw.volumeUsd7d,
    apyPct1D: raw.apyPct1D,
    apyPct7D: raw.apyPct7D,
    apyPct30D: raw.apyPct30D,
    poolMeta: raw.poolMeta,
    underlyingTokens: raw.underlyingTokens,
    url: raw.url,
  };

  return {
    pool,
    ilPctActual: ilResult.ilPctActual,
    apyDeclining: isApyDeclining(raw),
    lowLiquidityRewards: hasLowLiquidityRewards(raw),
  };
}

export function scorePools(rawPools: any[]): PoolWithScore[] {
  // Index raw pools by id once — the old code did a linear find per pool
  // (O(n²) ≈ 100M+ comparisons every 2-min fetch on ~16k pools).
  const rawById = new Map(rawPools.map((p: any) => [p.pool, p]));

  return rawPools
    .filter((p: any) => p.tvlUsd > 0 && p.apy !== null && p.apy >= 0)
    .map(transformPool)
    .map((data) => {
      const rawPool = rawById.get(data.pool.pool) || data.pool;
      const autoCompoundInfo = detectAutoCompound(rawPool);
      const baseScore = calculateRiskAdjustedScore(data.pool);
      const beefyBoost = autoCompoundInfo.isBeefy ? 1.15 : 1.0;
      const autoCompoundBoost = autoCompoundInfo.autoCompound ? 1.1 : 1.0;

      return {
        ...data.pool,
        riskAdjustedScore: baseScore * autoCompoundBoost * beefyBoost,
        isHot: isHotPool(rawPool),
        apyDeclining: data.apyDeclining,
        lowLiquidityRewards: data.lowLiquidityRewards,
        ilPctActual: data.ilPctActual,
        autoCompound: autoCompoundInfo.autoCompound,
        autoCompoundProject: autoCompoundInfo.autoCompoundProject,
        isBeefy: autoCompoundInfo.isBeefy,
        beefyAvailable: autoCompoundInfo.beefyAvailable,
      };
    });
}

export function computeChainStats(pools: Pool[]) {
  const chainTvl: Record<string, { tvl: number; count: number }> = {};
  pools.forEach((p) => {
    if (!chainTvl[p.chain]) {
      chainTvl[p.chain] = { tvl: 0, count: 0 };
    }
    chainTvl[p.chain].tvl += p.tvlUsd;
    chainTvl[p.chain].count += 1;
  });

  const sortedChains = Object.entries(chainTvl)
    .sort((a, b) => b[1].tvl - a[1].tvl);

  const chains = sortedChains.map(([chain]) => chain);
  const chainDistribution = sortedChains.map(([chain, data]) => ({
    chain,
    tvl: data.tvl,
    count: data.count,
  }));

  const topChain = chains[0] || "Ethereum";
  const topChainTvl = chainTvl[topChain]?.tvl || 0;

  const totalApy = pools.reduce((sum, p) => sum + p.apy, 0);
  const avgApy = pools.length > 0 ? totalApy / pools.length : 0;

  return { chains, chainDistribution, topChain, topChainTvl, avgApy };
}
