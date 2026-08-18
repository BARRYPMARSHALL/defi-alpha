import type { PoolWithScore } from "@shared/schema";
import { getCachedData } from "./defillama";
import { formatPoolForResponse } from "./filters";

/**
 * Weekly yield digest generator.
 *
 * Produces the email body for the "weekly yield digest" subscribers (the
 * course funnel's lead magnet). Content is computed from live data — no LLM,
 * no hallucination: the top pools, what changed, and what to avoid.
 *
 * Sending is wired separately (needs an email provider key); this module is
 * pure generation + formatting, fully testable.
 */

interface DigestSection {
  title: string;
  lines: string[];
}

function pct(change: number | null | undefined): string {
  if (change === null || change === undefined) return "—";
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
}

function tvl(t: number): string {
  if (t >= 1e9) return `$${(t / 1e9).toFixed(1)}B`;
  if (t >= 1e6) return `$${(t / 1e6).toFixed(1)}M`;
  return `$${(t / 1e3).toFixed(0)}K`;
}

export function buildDigest(allPools: PoolWithScore[]): { subject: string; text: string; sections: DigestSection[] } {
  const sections: DigestSection[] = [];

  // 1. Top risk-adjusted opportunities
  const top = [...allPools]
    .filter((p) => p.riskAdjustedScore > 0 && p.apy < 1000 && p.tvlUsd >= 1000000)
    .sort((a, b) => b.riskAdjustedScore - a.riskAdjustedScore)
    .slice(0, 5);

  if (top.length > 0) {
    sections.push({
      title: "🏆 Top 5 risk-adjusted opportunities",
      lines: top.map((p, i) => {
        const ac = p.isBeefy ? " (auto-compounds via Beefy)" : p.autoCompound ? ` (auto-compounds via ${p.autoCompoundProject})` : "";
        return `${i + 1}. ${p.symbol} on ${p.project} (${p.chain})${ac}\n   ${p.apy.toFixed(1)}% APY (base ${(p.apyBase ?? 0).toFixed(1)}%, reward ${(p.apyReward ?? 0).toFixed(1)}%) · TVL ${tvl(p.tvlUsd)} · IL ${p.ilRisk}`;
      }),
    });
  }

  // 2. Biggest movers this week
  const movers = [...allPools]
    .filter((p) => p.apyPct7D !== null && p.apyPct7D !== undefined && p.tvlUsd >= 1000000)
    .sort((a, b) => Math.abs(b.apyPct7D || 0) - Math.abs(a.apyPct7D || 0))
    .slice(0, 3);

  if (movers.length > 0) {
    sections.push({
      title: "📈 Biggest APY moves this week",
      lines: movers.map((p) => {
        const dir = (p.apyPct7D || 0) > 0 ? "up" : "down";
        return `${p.symbol} (${p.chain}) — ${pct(p.apyPct7D)} ${dir} to ${p.apy.toFixed(1)}% APY · ${p.project}`;
      }),
    });
  }

  // 3. What to avoid
  const avoid = [...allPools]
    .filter((p) => p.apyDeclining || p.lowLiquidityRewards)
    .sort((a, b) => (b.apy || 0) - (a.apy || 0))
    .slice(0, 3);

  if (avoid.length > 0) {
    sections.push({
      title: "⚠️ Watch out for these",
      lines: avoid.map((p) => {
        const reasons: string[] = [];
        if (p.apyDeclining) reasons.push("APY declining >20% this week");
        if (p.lowLiquidityRewards) reasons.push("reward tokens may have low liquidity");
        return `${p.symbol} (${p.chain}) — ${reasons.join("; ")}`;
      }),
    });
  }

  // 4. Stablecoin picks (the #1 retail ask)
  const stables = [...allPools]
    .filter((p) => p.stablecoin && p.apy < 500 && p.tvlUsd >= 5000000)
    .sort((a, b) => b.riskAdjustedScore - a.riskAdjustedScore)
    .slice(0, 3);

  if (stables.length > 0) {
    sections.push({
      title: "💵 Stablecoin yields (low IL)",
      lines: stables.map((p) => `${p.symbol} on ${p.project} (${p.chain}) — ${p.apy.toFixed(1)}% APY, ${tvl(p.tvlUsd)} TVL, IL ${p.ilRisk}`),
    });
  }

  const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const topPool = top[0];

  const text = [
    `DeFi Alpha Weekly Digest — ${date}`,
    "",
    ...sections.flatMap((s) => [s.title, ...s.lines, ""]),
    "Explore every pool live: https://defialpha.com",
    "Not financial advice — always verify before depositing.",
  ].join("\n");

  const subject = topPool
    ? `Weekly digest: ${topPool.symbol} leads at ${topPool.apy.toFixed(1)}% APY`
    : `Weekly digest: ${date}`;

  return { subject, text, sections };
}

export function buildDigestFromCache(): { subject: string; text: string; sections: DigestSection[] } {
  const cached = getCachedData();
  return buildDigest(cached?.pools || []);
}
