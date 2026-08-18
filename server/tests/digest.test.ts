import { describe, it, expect } from "vitest";
import { buildDigest } from "../lib/digest";
import type { PoolWithScore } from "@shared/schema";

function makePool(overrides: Partial<PoolWithScore> = {}): PoolWithScore {
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

describe("buildDigest", () => {
  it("produces a subject and text with the top opportunity", () => {
    const pools = [
      makePool({ symbol: "USDC-USDT", apy: 12, riskAdjustedScore: 40, stablecoin: true, tvlUsd: 50_000_000 }),
      makePool({ symbol: "ETH-USDC", apy: 30, riskAdjustedScore: 30 }),
    ];
    const digest = buildDigest(pools);
    expect(digest.subject).toContain("USDC-USDT");
    expect(digest.text).toContain("Top 5");
    expect(digest.text).toContain("USDC-USDT");
    expect(digest.text).toContain("Not financial advice");
  });

  it("includes a stablecoin section when stable pools exist", () => {
    const pools = [
      makePool({ symbol: "USDC-USDT", apy: 12, stablecoin: true, tvlUsd: 50_000_000, ilRisk: "low", riskAdjustedScore: 40 }),
      makePool({ symbol: "DAI-USDC", apy: 8, stablecoin: true, tvlUsd: 30_000_000, ilRisk: "low", riskAdjustedScore: 20 }),
    ];
    const digest = buildDigest(pools);
    expect(digest.text).toContain("Stablecoin yields");
  });

  it("flags declining pools in the avoid section", () => {
    const pools = [
      makePool({ symbol: "RISKY", apy: 500, apyDeclining: true, tvlUsd: 20_000_000 }),
      makePool({ symbol: "SAFE", apy: 10, riskAdjustedScore: 20, tvlUsd: 50_000_000 }),
    ];
    const digest = buildDigest(pools);
    expect(digest.text).toContain("Watch out");
    expect(digest.text).toContain("APY declining");
  });

  it("handles an empty dataset gracefully", () => {
    const digest = buildDigest([]);
    expect(digest.subject).toContain("Weekly digest");
    expect(digest.sections.length).toBe(0);
  });
});
