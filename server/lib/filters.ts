import type { PoolWithScore, FilterState, SortState } from "@shared/schema";

/**
 * Pure filter/sort + response-formatting logic extracted from the
 * original monolithic routes.ts. No I/O, fully unit-testable.
 */

export const CHAIN_ALIASES: Record<string, string[]> = {
  bsc: ["binance", "bnb", "bsc"],
  ethereum: ["eth", "ethereum", "mainnet"],
  arbitrum: ["arb", "arbitrum"],
  avalanche: ["avax", "avalanche"],
  optimism: ["op", "optimism"],
  polygon: ["matic", "polygon"],
  base: ["base"],
  solana: ["sol", "solana"],
  fantom: ["ftm", "fantom"],
};

export function normalizeChainName(input: string): string {
  const lower = input.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(CHAIN_ALIASES)) {
    if (aliases.includes(lower)) {
      return canonical;
    }
  }
  return lower;
}

export function chainMatchesFilter(poolChain: string, filterChain: string): boolean {
  const poolLower = poolChain.toLowerCase();
  const filterLower = filterChain.toLowerCase().trim();

  if (poolLower === filterLower) return true;
  if (poolLower.includes(filterLower)) return true;

  const normalizedFilter = normalizeChainName(filterLower);
  if (poolLower === normalizedFilter) return true;
  if (poolLower.includes(normalizedFilter)) return true;

  const aliases = CHAIN_ALIASES[normalizedFilter];
  if (aliases) {
    return aliases.some(alias => poolLower.includes(alias));
  }

  return false;
}

export function poolMatchesUserQuery(pool: PoolWithScore, query: string): boolean {
  if (!query) return true;

  const q = query.toLowerCase();
  const poolText = `${pool.symbol} ${pool.project} ${pool.chain} ${pool.ilRisk}`.toLowerCase();

  if (q.includes("stable") && pool.stablecoin) return true;
  if (q.includes("low il") && (pool.ilRisk === "none" || pool.ilRisk === "low")) return true;
  if (q.includes("auto") && pool.autoCompound) return true;
  if (q.includes("beefy") && (pool.isBeefy || pool.beefyAvailable)) return true;
  if (q.includes("high apy") && pool.apy > 50) return true;

  const words = q.split(/\s+/).filter(w => w.length > 2);
  return words.some(word => poolText.includes(word));
}

export function filterAndSortPools(
  pools: PoolWithScore[],
  filters: FilterState,
  sort: SortState
): PoolWithScore[] {
  let filtered = pools.filter((p) => {
    if (p.tvlUsd < filters.minTvl) return false;

    if (filters.chains.length > 0 && !filters.chains.includes(p.chain)) {
      return false;
    }

    if (filters.projectTypes.length > 0) {
      const isStable = p.stablecoin;
      const isLending = p.project.toLowerCase().includes("lend") ||
                       p.project.toLowerCase().includes("aave") ||
                       p.project.toLowerCase().includes("compound");
      const isLp = p.exposure === "multi";

      const matches = filters.projectTypes.some((type) => {
        switch (type) {
          case "stable": return isStable;
          case "lending": return isLending;
          case "lp": return isLp;
          case "volatile": return !isStable;
          default: return true;
        }
      });

      if (!matches) return false;
    }

    if (p.apy < filters.minApy) return false;

    if (filters.lowIlOnly && p.ilRisk !== "none" && p.ilRisk !== "low") {
      return false;
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const searchable = `${p.project} ${p.symbol} ${p.chain}`.toLowerCase();
      if (!searchable.includes(query)) return false;
    }

    return true;
  });

  filtered.sort((a, b) => {
    let aVal: number;
    let bVal: number;

    switch (sort.field) {
      case "riskAdjustedScore":
        aVal = a.riskAdjustedScore;
        bVal = b.riskAdjustedScore;
        break;
      case "tvlUsd":
        aVal = a.tvlUsd;
        bVal = b.tvlUsd;
        break;
      case "apy":
        aVal = a.apy;
        bVal = b.apy;
        break;
      case "apyPct7D":
        aVal = a.apyPct7D || 0;
        bVal = b.apyPct7D || 0;
        break;
      default:
        aVal = a.riskAdjustedScore;
        bVal = b.riskAdjustedScore;
    }

    return sort.direction === "desc" ? bVal - aVal : aVal - bVal;
  });

  return filtered.slice(0, 200);
}

export const CEFI_KEYWORDS = ["cefi", "nexo", "celsius", "blockfi", "centralized", "exchange"];
export const CEFI_BENCHMARK_APY = 8;
export const APY_ANOMALY_THRESHOLD = 10000;

export function formatTvl(tvl: number): string {
  if (tvl >= 1e9) return `$${(tvl / 1e9).toFixed(2)}B`;
  if (tvl >= 1e6) return `$${(tvl / 1e6).toFixed(2)}M`;
  if (tvl >= 1e3) return `$${(tvl / 1e3).toFixed(0)}K`;
  return `$${tvl.toFixed(0)}`;
}

export function getRiskDescription(pool: PoolWithScore): string {
  const ilDescriptions: Record<string, string> = {
    none: "No impermanent loss risk (single-sided or lending)",
    low: "Low IL risk (stablecoin pairs)",
    medium: "Moderate IL risk (correlated assets)",
    high: "Higher IL risk (volatile pair)",
  };

  let description = ilDescriptions[pool.ilRisk] || "Unknown IL risk";

  if (pool.stablecoin) {
    description += " - Stablecoin pool";
  }

  if (pool.tvlUsd > 50000000) {
    description += " - High TVL adds security";
  } else if (pool.tvlUsd < 1000000) {
    description += " - Lower TVL, check liquidity";
  }

  return description;
}

export function generateProTip(pool: PoolWithScore, includeCefiComparison: boolean = false): string {
  const tips: string[] = [];

  if (includeCefiComparison && pool.apy > CEFI_BENCHMARK_APY && pool.apy < APY_ANOMALY_THRESHOLD) {
    const beatsCeFi = pool.apy - CEFI_BENCHMARK_APY;
    tips.push(`Beats Nexo's ${CEFI_BENCHMARK_APY}% by ${beatsCeFi.toFixed(1)}% while keeping full on-chain control`);
  } else if (pool.apy > 10 && pool.apy < APY_ANOMALY_THRESHOLD) {
    const beatsCeFi = pool.apy - 10;
    tips.push(`Beats centralized 10% rates by ${beatsCeFi.toFixed(1)}% while keeping full on-chain control`);
  }

  if (pool.isBeefy) {
    tips.push("Auto-compounds via Beefy - set it and forget it");
  } else if (pool.autoCompound) {
    tips.push(`Auto-compounds via ${pool.autoCompoundProject} - no manual harvesting needed`);
  } else if (pool.beefyAvailable) {
    tips.push("Beefy vault available for auto-compounding");
  }

  if (pool.stablecoin && pool.ilRisk === "low") {
    tips.push("Stablecoin pool with minimal IL - great for capital preservation");
  }

  if (pool.apyPct7D && pool.apyPct7D > 10) {
    tips.push(`APY trending up ${pool.apyPct7D.toFixed(1)}% this week`);
  }

  if (pool.isHot) {
    tips.push("Hot pool - high volume and rising APY");
  }

  return tips.length > 0 ? tips[0] : "Solid risk-adjusted opportunity based on TVL and APY";
}

export function generateCefiComparison(pool: PoolWithScore): string | undefined {
  if (pool.apy >= APY_ANOMALY_THRESHOLD) {
    return undefined;
  }
  if (pool.apy > CEFI_BENCHMARK_APY) {
    const diff = pool.apy - CEFI_BENCHMARK_APY;
    return `This beats Nexo's ${CEFI_BENCHMARK_APY}% by ${diff.toFixed(1)}%`;
  }
  return undefined;
}

export function getApyWarning(pool: PoolWithScore): string | undefined {
  if (pool.apy >= APY_ANOMALY_THRESHOLD) {
    return `Extremely high APY (${pool.apy.toFixed(0)}%) - verify before investing, may be temporary or anomalous`;
  }
  if (pool.apy >= 1000) {
    return "Very high APY - verify sustainability and check for reward token liquidity";
  }
  return undefined;
}

export function getBoostedTemporaryFlag(pool: PoolWithScore): string | undefined {
  const apyBase = pool.apyBase || 0;
  const apyReward = pool.apyReward || 0;
  const totalApy = pool.apy;

  if (totalApy < 5) return undefined;

  const rewardRatio = totalApy > 0 ? apyReward / totalApy : 0;

  if (rewardRatio > 0.8) {
    return "Mostly reward-based APY - may be temporary incentives";
  }

  if (rewardRatio > 0.5 && totalApy > 50) {
    return "High reward component - verify token sustainability";
  }

  if (pool.apyPct7D && pool.apyPct7D < -30) {
    return "APY declining rapidly - recent incentive reduction likely";
  }

  if (pool.apyPct7D && pool.apyPct7D > 100) {
    return "APY spiked recently - may be temporary boost";
  }

  return undefined;
}

export function generateZapLink(pool: PoolWithScore): string {
  const chain = pool.chain.toLowerCase();
  const project = pool.project.toLowerCase();

  if (pool.isBeefy || pool.beefyAvailable) {
    return `https://app.beefy.com/${chain}?search=${encodeURIComponent(pool.symbol)}`;
  }

  if (project.includes("aerodrome")) {
    return `https://aerodrome.finance/liquidity?token0=${pool.symbol.split("-")[0]}&token1=${pool.symbol.split("-")[1] || ""}`;
  }

  if (project.includes("velodrome")) {
    return `https://velodrome.finance/liquidity`;
  }

  if (project.includes("uniswap")) {
    return `https://app.uniswap.org/#/pools`;
  }

  if (project.includes("curve")) {
    return `https://curve.fi/#/${chain}/pools`;
  }

  return `https://defillama.com/yields?project=${encodeURIComponent(pool.project)}`;
}

export interface RecommendedPool {
  pool: string;
  apy: string;
  apyBase: string;
  apyReward: string;
  risk: string;
  tvl: string;
  chain: string;
  project: string;
  autoCompound: string;
  proTip: string;
  zapLink: string;
  apyWarning?: string;
  cefiComparison?: string;
  boostedTemporary?: string;
}

export function formatPoolForResponse(pool: PoolWithScore, includeCefiComparison: boolean = false): RecommendedPool {
  const apyBase = pool.apyBase || 0;
  const apyReward = pool.apyReward || 0;

  let autoCompoundText = "No";
  if (pool.isBeefy) {
    autoCompoundText = "Yes via Beefy (auto-compound active)";
  } else if (pool.autoCompound && pool.autoCompoundProject) {
    autoCompoundText = `Yes via ${pool.autoCompoundProject}`;
  } else if (pool.beefyAvailable) {
    autoCompoundText = "Beefy vault available";
  }

  const result: RecommendedPool = {
    pool: `${pool.symbol} on ${pool.project} (${pool.chain})`,
    apy: `${pool.apy.toFixed(2)}%`,
    apyBase: `${apyBase.toFixed(2)}%`,
    apyReward: `${apyReward.toFixed(2)}%`,
    risk: getRiskDescription(pool),
    tvl: formatTvl(pool.tvlUsd),
    chain: pool.chain,
    project: pool.project,
    autoCompound: autoCompoundText,
    proTip: generateProTip(pool, includeCefiComparison),
    zapLink: generateZapLink(pool),
  };

  const apyWarning = getApyWarning(pool);
  if (apyWarning) {
    result.apyWarning = apyWarning;
  }

  if (includeCefiComparison) {
    const cefiComp = generateCefiComparison(pool);
    if (cefiComp) {
      result.cefiComparison = cefiComp;
    }
  }

  const boostedFlag = getBoostedTemporaryFlag(pool);
  if (boostedFlag) {
    result.boostedTemporary = boostedFlag;
  }

  return result;
}
