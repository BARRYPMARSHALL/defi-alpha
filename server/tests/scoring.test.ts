import { describe, it, expect } from "vitest";
import {
  calculateIlRisk,
  calculateRiskAdjustedScore,
  isHotPool,
  isApyDeclining,
  hasLowLiquidityRewards,
  detectAutoCompound,
  scorePools,
  computeChainStats,
} from "../lib/scoring";
import type { Pool } from "@shared/schema";

function makePool(overrides: Partial<Pool> = {}): Pool {
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
    ...overrides,
  };
}

describe("calculateIlRisk", () => {
  it("returns none for single-sided exposure", () => {
    const result = calculateIlRisk({ ...makePool(), exposure: "single" });
    expect(result.risk).toBe("none");
    expect(result.ilPctActual).toBeNull();
  });

  it("uses real IL data when present", () => {
    expect(calculateIlRisk({ ...makePool(), il7d: 0.05 }).risk).toBe("low");
    expect(calculateIlRisk({ ...makePool(), il7d: 0.3 }).risk).toBe("medium");
    expect(calculateIlRisk({ ...makePool(), il7d: 0.9 }).risk).toBe("high");
  });

  it("returns low for stablecoin pools without IL data", () => {
    expect(calculateIlRisk({ ...makePool(), stablecoin: true }).risk).toBe("low");
  });

  it("flags volatile pairs without stable counterpart as high", () => {
    const volatile = calculateIlRisk({ ...makePool(), symbol: "ETH-ARB" });
    expect(volatile.risk).toBe("high");
  });
});

describe("calculateRiskAdjustedScore", () => {
  it("scales with TVL up to the 10M cap", () => {
    const small = makePool({ tvlUsd: 5_000_000 });
    const capped = makePool({ tvlUsd: 50_000_000 });
    expect(calculateRiskAdjustedScore(small)).toBeLessThan(calculateRiskAdjustedScore(capped));
    // capped TVL => factor exactly 1
    const full = makePool({ tvlUsd: 50_000_000, ilRisk: "none" });
    expect(calculateRiskAdjustedScore(full)).toBeCloseTo(full.apy, 5);
  });

  it("penalizes higher IL risk", () => {
    const none = calculateRiskAdjustedScore(makePool({ ilRisk: "none" }));
    const high = calculateRiskAdjustedScore(makePool({ ilRisk: "high" }));
    expect(high).toBeLessThan(none);
  });
});

describe("pool signals", () => {
  it("detects hot pools by volume", () => {
    expect(isHotPool({ volumeUsd7d: 2_000_000, apyPct7D: 1 })).toBe(true);
  });

  it("detects hot pools by rising APY", () => {
    expect(isHotPool({ volumeUsd7d: null, apyPct7D: 10 })).toBe(true);
    expect(isHotPool({ volumeUsd7d: null, apyPct7D: 1 })).toBe(false);
  });

  it("detects declining APY", () => {
    expect(isApyDeclining({ apyPct7D: -25 })).toBe(true);
    expect(isApyDeclining({ apyPct7D: -5 })).toBe(false);
    expect(isApyDeclining({ apyPct7D: null })).toBe(false);
  });

  it("flags low-liquidity reward-heavy pools", () => {
    const risky = {
      rewardTokens: ["TOKEN"],
      apyReward: 90,
      apyBase: 0,
      apy: 100,
      tvlUsd: 500_000,
      volumeUsd7d: 10_000,
    };
    expect(hasLowLiquidityRewards(risky)).toBe(true);

    const safe = {
      rewardTokens: ["TOKEN"],
      apyReward: 5,
      apyBase: 10,
      apy: 15,
      tvlUsd: 50_000_000,
      volumeUsd7d: 5_000_000,
    };
    expect(hasLowLiquidityRewards(safe)).toBe(false);
  });
});

describe("detectAutoCompound", () => {
  it("recognizes beefy", () => {
    const info = detectAutoCompound({ project: "beefy", chain: "Ethereum" });
    expect(info.isBeefy).toBe(true);
    expect(info.autoCompound).toBe(true);
    expect(info.beefyAvailable).toBe(true);
  });

  it("recognizes auto-compounding projects with beefy availability", () => {
    const info = detectAutoCompound({ project: "yearn-finance", chain: "Ethereum" });
    expect(info.autoCompound).toBe(true);
    expect(info.autoCompoundProject).toContain("Yearn");
  });

  it("returns false for plain projects", () => {
    const info = detectAutoCompound({ project: "uniswap-v3", chain: "Ethereum", poolMeta: "", symbol: "" });
    expect(info.autoCompound).toBe(false);
  });
});

describe("scorePools + computeChainStats", () => {
  it("filters invalid pools and scores the rest", () => {
    const raw = [
      { ...makePool(), pool: "a", tvlUsd: 100, apy: 5 },
      { ...makePool(), pool: "b", tvlUsd: 0, apy: 99 }, // filtered: zero TVL
      { ...makePool(), pool: "c", tvlUsd: 1_000_000, apy: null }, // filtered: null APY
    ];
    const scored = scorePools(raw);
    expect(scored.length).toBe(1);
    expect(scored[0].riskAdjustedScore).toBeGreaterThan(0);
  });

  it("computes chain stats correctly", () => {
    const pools = [
      makePool({ chain: "Arbitrum", tvlUsd: 30_000_000, apy: 20 }),
      makePool({ chain: "Ethereum", tvlUsd: 10_000_000, apy: 10 }),
      makePool({ chain: "Arbitrum", tvlUsd: 5_000_000, apy: 5 }),
    ];
    const stats = computeChainStats(pools);
    expect(stats.chains[0]).toBe("Arbitrum");
    expect(stats.topChain).toBe("Arbitrum");
    expect(stats.avgApy).toBeCloseTo((20 + 10 + 5) / 3, 5);
    expect(stats.chainDistribution.find(c => c.chain === "Arbitrum")?.count).toBe(2);
  });
});
