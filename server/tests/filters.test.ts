import { describe, it, expect } from "vitest";
import {
  filterAndSortPools,
  chainMatchesFilter,
  poolMatchesUserQuery,
  formatPoolForResponse,
  normalizeChainName,
  getApyWarning,
  generateZapLink,
} from "../lib/filters";
import type { FilterState, SortState, PoolWithScore } from "@shared/schema";

function makeScoredPool(overrides: Partial<PoolWithScore> = {}): PoolWithScore {
  return {
    pool: "test-pool",
    chain: "Ethereum",
    project: "uniswap-v3",
    symbol: "ETH-USDC",
    tvlUsd: 10_000_000,
    apyBase: 10,
    apyReward: 5,
    apy: 15,
    rewardTokens: null,
    il7d: null,
    ilRisk: "medium",
    exposure: "multi",
    stablecoin: false,
    volumeUsd7d: null,
    apyPct1D: null,
    apyPct7D: null,
    apyPct30D: null,
    poolMeta: null,
    underlyingTokens: null,
    url: null,
    riskAdjustedScore: 10,
    isHot: false,
    apyDeclining: false,
    lowLiquidityRewards: false,
    ilPctActual: null,
    autoCompound: false,
    autoCompoundProject: null,
    isBeefy: false,
    beefyAvailable: false,
    ...overrides,
  };
}

const defaultFilters: FilterState = {
  minTvl: 0,
  chains: [],
  projectTypes: [],
  minApy: 0,
  lowIlOnly: false,
  searchQuery: "",
};

const defaultSort: SortState = { field: "riskAdjustedScore", direction: "desc" };

describe("filterAndSortPools", () => {
  const pools = [
    makeScoredPool({ pool: "a", apy: 50, tvlUsd: 20_000_000, riskAdjustedScore: 50, ilRisk: "none" }),
    makeScoredPool({ pool: "b", apy: 10, tvlUsd: 2_000_000, riskAdjustedScore: 10, ilRisk: "high" }),
    makeScoredPool({ pool: "c", apy: 30, tvlUsd: 8_000_000, riskAdjustedScore: 30, ilRisk: "low", chain: "Arbitrum" }),
  ];

  it("filters by minTvl", () => {
    const result = filterAndSortPools(pools, { ...defaultFilters, minTvl: 5_000_000 }, defaultSort);
    expect(result.map(p => p.pool)).toEqual(["a", "c"]);
  });

  it("filters by minApy", () => {
    const result = filterAndSortPools(pools, { ...defaultFilters, minApy: 25 }, defaultSort);
    expect(result.map(p => p.pool)).toEqual(["a", "c"]);
  });

  it("filters by chain", () => {
    const result = filterAndSortPools(pools, { ...defaultFilters, chains: ["Arbitrum"] }, defaultSort);
    expect(result.map(p => p.pool)).toEqual(["c"]);
  });

  it("filters by lowIlOnly", () => {
    const result = filterAndSortPools(pools, { ...defaultFilters, lowIlOnly: true }, defaultSort);
    expect(result.map(p => p.pool)).toEqual(["a", "c"]);
  });

  it("sorts ascending", () => {
    const result = filterAndSortPools(pools, defaultFilters, { field: "riskAdjustedScore", direction: "asc" });
    expect(result.map(p => p.pool)).toEqual(["b", "c", "a"]);
  });

  it("filters by searchQuery", () => {
    const result = filterAndSortPools(pools, { ...defaultFilters, searchQuery: "arbitrum" }, defaultSort);
    expect(result.map(p => p.pool)).toEqual(["c"]);
  });

  it("matches ALL words in a multi-word searchQuery", () => {
    // "usdc ethereum" must match only pools whose text contains BOTH words
    // (a and b are ETH-USDC on Ethereum; c is on Arbitrum)
    const multi = filterAndSortPools(pools, { ...defaultFilters, searchQuery: "usdc ethereum" }, defaultSort);
    expect(multi.map(p => p.pool).sort()).toEqual(["a", "b"]);

    // A word absent everywhere → no results (AND semantics, not OR)
    const none = filterAndSortPools(pools, { ...defaultFilters, searchQuery: "arbitrum solana" }, defaultSort);
    expect(none).toEqual([]);
  });

  it("caps results at 200", () => {
    const many = Array.from({ length: 250 }, (_, i) => makeScoredPool({ pool: `p${i}`, riskAdjustedScore: i }));
    const result = filterAndSortPools(many, defaultFilters, defaultSort);
    expect(result.length).toBe(200);
  });
});

describe("chainMatchesFilter", () => {
  it("matches exact names", () => {
    expect(chainMatchesFilter("Ethereum", "ethereum")).toBe(true);
  });

  it("matches aliases", () => {
    expect(chainMatchesFilter("BNB Chain", "bsc")).toBe(true);
    expect(chainMatchesFilter("Arbitrum", "arb")).toBe(true);
  });

  it("rejects mismatches", () => {
    expect(chainMatchesFilter("Ethereum", "solana")).toBe(false);
  });
});

describe("normalizeChainName", () => {
  it("normalizes aliases to canonical", () => {
    expect(normalizeChainName("eth")).toBe("ethereum");
    expect(normalizeChainName("BNB")).toBe("bsc");
    expect(normalizeChainName("avax")).toBe("avalanche");
  });

  it("passes through unknown chains", () => {
    expect(normalizeChainName("moonbeam")).toBe("moonbeam");
  });
});

describe("poolMatchesUserQuery", () => {
  const pool = makeScoredPool({ symbol: "USDC-USDT", stablecoin: true, ilRisk: "low" });

  it("matches stable queries", () => {
    expect(poolMatchesUserQuery(pool, "stable")).toBe(true);
  });

  it("matches low IL queries", () => {
    expect(poolMatchesUserQuery(pool, "low il")).toBe(true);
  });

  it("matches word tokens", () => {
    expect(poolMatchesUserQuery(makeScoredPool({ project: "Aave" }), "aave")).toBe(true);
  });

  it("returns true for empty queries", () => {
    expect(poolMatchesUserQuery(pool, "")).toBe(true);
  });
});

describe("formatPoolForResponse", () => {
  it("formats core fields", () => {
    const formatted = formatPoolForResponse(makeScoredPool({ apy: 12.345, tvlUsd: 1_500_000 }));
    expect(formatted.apy).toBe("12.35%");
    expect(formatted.tvl).toBe("$1.50M");
    expect(formatted.pool).toContain("ETH-USDC");
  });

  it("adds CeFi comparison when requested and applicable", () => {
    const formatted = formatPoolForResponse(makeScoredPool({ apy: 15 }), true);
    expect(formatted.cefiComparison).toBeDefined();
    expect(formatted.cefiComparison).toContain("Nexo");
  });

  it("warns on extreme APY", () => {
    const formatted = formatPoolForResponse(makeScoredPool({ apy: 1500 }));
    expect(formatted.apyWarning).toContain("verify");
  });

  it("generates beefy zap links", () => {
    const link = generateZapLink(makeScoredPool({ isBeefy: true, chain: "Arbitrum" }));
    expect(link).toContain("beefy.com");
  });
});

describe("getApyWarning", () => {
  it("flags anomalous APYs", () => {
    expect(getApyWarning(makeScoredPool({ apy: 15000 }))).toContain("Extremely high APY");
  });

  it("flags very high APYs", () => {
    expect(getApyWarning(makeScoredPool({ apy: 1500 }))).toContain("Very high APY");
  });

  it("returns undefined for normal APYs", () => {
    expect(getApyWarning(makeScoredPool({ apy: 20 }))).toBeUndefined();
  });
});
