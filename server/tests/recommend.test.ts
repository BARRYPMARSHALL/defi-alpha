import { describe, it, expect } from "vitest";
import { buildRecommendation, buildWebhookRecommendation } from "../lib/recommend";
import type { PoolWithScore } from "@shared/schema";

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

const pools: PoolWithScore[] = [
  makeScoredPool({
    pool: "a",
    symbol: "USDC-USDT",
    project: "curve-dex",
    chain: "Ethereum",
    stablecoin: true,
    ilRisk: "low",
    apy: 12,
    apyBase: 11,
    apyReward: 1,
    tvlUsd: 50_000_000,
    riskAdjustedScore: 40,
  }),
  makeScoredPool({
    pool: "b",
    symbol: "ETH-USDC",
    project: "uniswap-v3",
    chain: "Arbitrum",
    ilRisk: "medium",
    apy: 30,
    apyBase: 25,
    apyReward: 5,
    tvlUsd: 20_000_000,
    riskAdjustedScore: 30,
    autoCompound: true,
    autoCompoundProject: "Gamma",
  }),
  makeScoredPool({
    pool: "c",
    symbol: "ETH-WBTC",
    project: "uniswap-v3",
    chain: "Ethereum",
    ilRisk: "high",
    apy: 200,
    apyBase: 20,
    apyReward: 180,
    tvlUsd: 15_000_000,
    riskAdjustedScore: 25,
  }),
  makeScoredPool({
    pool: "d",
    symbol: "SOL-USDC",
    project: "raydium",
    chain: "Solana",
    ilRisk: "high",
    apy: 1500,
    apyBase: 1000,
    apyReward: 500,
    tvlUsd: 8_000_000,
    riskAdjustedScore: 5,
  }),
  makeScoredPool({
    pool: "e",
    symbol: "TEST-TOKEN",
    project: "mock-project",
    chain: "Moonbeam",
    ilRisk: "high",
    apy: 500,
    apyBase: 0,
    apyReward: 500,
    tvlUsd: 1_000_000,
    riskAdjustedScore: 5,
  }),
];

describe("buildRecommendation", () => {
  it("returns the top risk-adjusted pick for a broad query", () => {
    const result = buildRecommendation(pools, {
      chains: "all",
      minApy: 0,
      riskTolerance: "medium",
      userQuery: "",
    });
    expect(result.success).toBe(true);
    expect(result.topPick).not.toBeNull();
    expect(result.topPick!.pool).toContain("USDC-USDT");
    expect(result.alternatives.length).toBeGreaterThan(0);
    expect(result.summary).toContain("opportunities");
  });

  it("filters by chain", () => {
    const result = buildRecommendation(pools, {
      chains: "arbitrum",
      minApy: 0,
      riskTolerance: "medium",
      userQuery: "",
    });
    expect(result.topPick!.chain.toLowerCase()).toBe("arbitrum");
  });

  it("respects risk tolerance", () => {
    const result = buildRecommendation(pools, {
      chains: "all",
      minApy: 0,
      riskTolerance: "low",
      userQuery: "",
    });
    // only the low-IL stable pool passes the low-risk smart filter
    expect(result.topPick!.pool).toContain("USDC-USDT");
  });

  it("expands risk when nothing matches", () => {
    const result = buildRecommendation(pools, {
      chains: "all",
      minApy: 0,
      riskTolerance: "low",
      userQuery: "",
    });
    // stable pool is low risk so no expansion needed; use a chain with only high-risk pools
    const expanded = buildRecommendation(pools, {
      chains: "solana",
      minApy: 0,
      riskTolerance: "low",
      userQuery: "",
    });
    expect(expanded.riskExpanded).toBe(true);
  });

  it("produces fallback picks and suggestions when nothing matches", () => {
    const result = buildRecommendation(pools, {
      chains: "moonbeam",
      minApy: 0,
      riskTolerance: "medium",
      userQuery: "",
    });
    expect(result.fallbackPicks).toBeDefined();
    expect(result.fallbackPicks!.length).toBeGreaterThan(0);
    expect(result.suggestions!.length).toBeGreaterThan(0);
    expect(result.summary).toContain("No pools found");
  });

  it("honors user query keywords", () => {
    const result = buildRecommendation(pools, {
      chains: "all",
      minApy: 0,
      riskTolerance: "medium",
      userQuery: "auto compound",
    });
    // pool b is the auto-compounding one
    expect(result.topPick!.project).toBe("uniswap-v3");
  });

  it("flags extremely high APYs as anomalous", () => {
    const result = buildRecommendation(pools, {
      chains: "solana",
      minApy: 0,
      riskTolerance: "high",
      userQuery: "",
    });
    // pool d has 1500% APY which is below the 10000 anomaly threshold so it can appear, with a warning
    expect(result.topPick).not.toBeNull();
    expect(result.topPick!.apyWarning).toContain("Very high APY");
  });

  it("excludes test/mock pools from recommendations", () => {
    const result = buildRecommendation(pools, {
      chains: "moonbeam",
      minApy: 0,
      riskTolerance: "high",
      userQuery: "",
    });
    // pool e is TEST-TOKEN on Moonbeam — filtered out by smart filter,
    // so we get fallback picks instead of a bogus 500% test pool
    expect(result.topPick).toBeNull();
    expect(result.fallbackPicks).toBeDefined();
  });
});

describe("buildWebhookRecommendation", () => {
  it("returns simplified top-3 shape", () => {
    const result = buildWebhookRecommendation(pools, {
      chains: "all",
      minApy: 0,
      riskTolerance: "medium",
      userQuery: "",
    });
    expect(result.success).toBe(true);
    expect(result.topPick).not.toBeNull();
    expect(result.alternatives.length).toBeGreaterThanOrEqual(0);
    expect(result).not.toHaveProperty("suggestions");
  });
});
