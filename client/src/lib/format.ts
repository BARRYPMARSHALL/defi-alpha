/**
 * Global number formatting for financial data.
 *
 * One formatter module, enforced everywhere (per Balancer/Coinbase practice):
 * - APY: 1 decimal ("18.4%") — no fake precision
 * - TVL/amounts: compact $ with 2 decimals for millions, fixed rules per scale
 * - Tabular numerals via CSS class so columns never jitter
 */

export function formatApy(apy: number | null | undefined, decimals = 1): string {
  if (apy === null || apy === undefined || Number.isNaN(apy)) return "—";
  if (apy >= 1000) return `${apy.toFixed(0)}%`;
  return `${apy.toFixed(decimals)}%`;
}

export function formatTvl(tvl: number | null | undefined): string {
  if (tvl === null || tvl === undefined || Number.isNaN(tvl)) return "—";
  if (tvl >= 1e9) return `$${(tvl / 1e9).toFixed(2)}B`;
  if (tvl >= 1e6) return `$${(tvl / 1e6).toFixed(2)}M`;
  if (tvl >= 1e3) return `$${(tvl / 1e3).toFixed(1)}K`;
  return `$${tvl.toFixed(0)}`;
}

export function formatCompact(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${n.toFixed(0)}`;
}

export function formatPercentChange(pct: number | null | undefined): string {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined || Number.isNaN(score)) return "—";
  if (score >= 1000) return score.toFixed(0);
  return score.toFixed(1);
}

/** Apply to any element holding a number so digits don't jitter when they change. */
export const TABULAR = "tabular-nums";
