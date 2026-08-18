import type { PoolWithScore } from "@shared/schema";
import {
  chainMatchesFilter,
  poolMatchesUserQuery,
  formatPoolForResponse,
  CEFI_KEYWORDS,
  CEFI_BENCHMARK_APY,
  APY_ANOMALY_THRESHOLD,
  type RecommendedPool,
} from "./filters";

export interface RecommendQuery {
  chains: string;
  minApy: number;
  riskTolerance: "low" | "medium" | "high";
  userQuery: string;
}

export interface RecommendResponse {
  success: boolean;
  query: string;
  riskProfile: string;
  riskExpanded?: boolean;
  topPick: RecommendedPool | null;
  alternatives: RecommendedPool[];
  fallbackPicks?: RecommendedPool[];
  summary: string;
  suggestions?: string[];
  timestamp: string;
}

/**
 * Pure recommendation engine. Given the full scored pool list and a query,
 * returns the structured RecommendResponse used by /api/recommend and /webhook.
 * No I/O — fully unit-testable with fixture pools.
 */
export function buildRecommendation(
  allPools: PoolWithScore[],
  query: RecommendQuery,
): RecommendResponse {
  let { chains, minApy, riskTolerance, userQuery } = query;

  const queryLower = userQuery.toLowerCase();
  const wantsCefiComparison = CEFI_KEYWORDS.some(kw => queryLower.includes(kw));

  let filteredPools = [...allPools];
  let riskExpanded = false;

  if (chains !== "all") {
    const chainList = chains.split(",").map(c => c.trim());
    filteredPools = filteredPools.filter(p =>
      chainList.some(c => chainMatchesFilter(p.chain, c))
    );
  }

  filteredPools = filteredPools.filter(p => p.apy >= minApy);

  const applySmartFilter = (pools: PoolWithScore[], risk: string): PoolWithScore[] => {
    return pools.filter(pool => {
      const isLowRisk = pool.ilRisk === "none" || pool.ilRisk === "low";
      const isMediumRisk = pool.ilRisk === "medium";

      let maxApy: number;
      if (risk === "low") {
        maxApy = isLowRisk ? 50 : 0;
      } else if (risk === "medium") {
        maxApy = isLowRisk ? 50 : (isMediumRisk ? 150 : 0);
      } else {
        maxApy = Infinity;
      }

      const minTvl = risk === "low" ? 5000000 : 1000000;

      const apyBase = pool.apyBase || 0;
      const isNotPurelyBoosted = apyBase >= 0.5 * pool.apy || pool.apy < 10;

      const symbolUpper = pool.symbol.toUpperCase();
      const isNotTest = !symbolUpper.includes("TEST") && !symbolUpper.includes("MOCK");

      return (
        pool.tvlUsd >= minTvl &&
        pool.apy <= maxApy &&
        isNotTest &&
        isNotPurelyBoosted
      );
    });
  };

  let riskFilteredPools = applySmartFilter(filteredPools, riskTolerance);

  if (riskFilteredPools.length === 0 && riskTolerance === "low") {
    riskFilteredPools = applySmartFilter(filteredPools, "medium");
    if (riskFilteredPools.length > 0) {
      riskExpanded = true;
      riskTolerance = "medium";
    }
  }

  if (riskFilteredPools.length === 0 && riskTolerance !== "high") {
    riskFilteredPools = applySmartFilter(filteredPools, "high");
    if (riskFilteredPools.length > 0) {
      riskExpanded = true;
      riskTolerance = "high";
    }
  }

  filteredPools = riskFilteredPools;

  if (userQuery) {
    filteredPools = filteredPools.filter(p => poolMatchesUserQuery(p, userQuery));
  }

  filteredPools = filteredPools.filter(p => p.apy < APY_ANOMALY_THRESHOLD);

  filteredPools.sort((a, b) => b.riskAdjustedScore - a.riskAdjustedScore);

  const topPools = filteredPools.slice(0, 3);

  let fallbackPicks: RecommendedPool[] | undefined;
  const suggestions: string[] = [];

  if (topPools.length === 0) {
    const allPoolsSorted = [...allPools]
      .filter(p => p.apy < APY_ANOMALY_THRESHOLD)
      .sort((a, b) => b.riskAdjustedScore - a.riskAdjustedScore)
      .slice(0, 3);

    if (allPoolsSorted.length > 0) {
      fallbackPicks = allPoolsSorted.map(p => formatPoolForResponse(p, wantsCefiComparison));
    }

    if (chains !== "all") {
      suggestions.push("Try chains=all for more options");
    }
    if (minApy > 5) {
      suggestions.push(`Lower minApy threshold (currently ${minApy}%)`);
    }
    if (riskTolerance !== "high") {
      suggestions.push("Try riskTolerance=high to include more volatile pools");
    }
  }

  const querySummary = userQuery
    ? userQuery
    : `Top pools with ${minApy}%+ APY, ${riskTolerance} risk${chains !== "all" ? ` on ${chains}` : ""}`;

  let summary = "";
  if (topPools.length === 0) {
    summary = `No pools found matching your exact criteria.`;
    if (fallbackPicks && fallbackPicks.length > 0) {
      summary += ` Showing top ${fallbackPicks.length} overall picks instead.`;
    }
  } else {
    if (riskExpanded) {
      summary = `No low-risk pools found, expanded to medium risk. `;
    }
    if (topPools.length === 1) {
      summary += `Found 1 opportunity matching your criteria.`;
    } else {
      const topApy = topPools[0].apy < 1000 ? `${topPools[0].apy.toFixed(2)}%` : `${topPools[0].apy.toFixed(0)}%`;
      summary += `Found ${topPools.length} top opportunities. The top pick offers ${topApy} APY with ${topPools[0].ilRisk} IL risk.`;
    }
    if (wantsCefiComparison && topPools[0].apy > CEFI_BENCHMARK_APY) {
      summary += ` All picks beat typical CeFi rates of ${CEFI_BENCHMARK_APY}%.`;
    }
  }

  const response: RecommendResponse = {
    success: true,
    query: querySummary,
    riskProfile: riskTolerance,
    ...(riskExpanded && { riskExpanded: true }),
    topPick: topPools[0] ? formatPoolForResponse(topPools[0], wantsCefiComparison) : null,
    alternatives: topPools.slice(1).map(p => formatPoolForResponse(p, wantsCefiComparison)),
    ...(fallbackPicks && fallbackPicks.length > 0 && { fallbackPicks }),
    summary,
    ...(suggestions.length > 0 && { suggestions }),
    timestamp: new Date().toISOString(),
  };

  return response;
}

/** Simplified webhook variant (POST /webhook): top 3, no fallback logic. */
export function buildWebhookRecommendation(
  allPools: PoolWithScore[],
  query: RecommendQuery,
) {
  let filteredPools = [...allPools];

  if (query.chains !== "all") {
    const chainList = query.chains.split(",").map(c => c.trim());
    filteredPools = filteredPools.filter(p =>
      chainList.some(c => chainMatchesFilter(p.chain, c))
    );
  }

  filteredPools = filteredPools.filter(p => p.apy >= query.minApy);
  filteredPools = filteredPools.filter(p => p.apy < APY_ANOMALY_THRESHOLD);

  if (query.riskTolerance === "low") {
    filteredPools = filteredPools.filter(p =>
      (p.ilRisk === "none" || p.ilRisk === "low") && p.tvlUsd >= 5000000
    );
  } else if (query.riskTolerance === "medium") {
    filteredPools = filteredPools.filter(p =>
      p.ilRisk !== "high" && p.tvlUsd >= 1000000
    );
  }

  if (query.userQuery) {
    filteredPools = filteredPools.filter(p => poolMatchesUserQuery(p, query.userQuery));
  }

  filteredPools.sort((a, b) => b.riskAdjustedScore - a.riskAdjustedScore);
  const topPools = filteredPools.slice(0, 3);

  return {
    success: true,
    query: query.userQuery || `${query.riskTolerance} risk pools`,
    riskProfile: query.riskTolerance,
    topPick: topPools[0] ? formatPoolForResponse(topPools[0]) : null,
    alternatives: topPools.slice(1).map(p => formatPoolForResponse(p)),
    timestamp: new Date().toISOString(),
  };
}
