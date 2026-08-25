/**
 * Watchlist APY-change alert computation — shared by two consumers:
 *  1. routes/watchlist.ts — the client polls /api/watchlist/alerts (in-app cards)
 *  2. lib/watch-push.ts — a server-side scheduler turns alerts into push
 *     notifications for subscribed devices.
 *
 * Baselines are keyed per token, with an optional namespace so the push
 * scheduler and the client poll never advance each other's baselines (which
 * would double-fire or halve the sensitivity of alerts).
 */

interface Baseline {
  [poolId: string]: { apy: number; at: string };
}

const baselines = new Map<string, Baseline>();
const BASELINE_TTL_MS = 24 * 60 * 60 * 1000; // re-baseline daily

function baselineKey(token: string, ns?: string): string {
  return ns ? `${ns}:${token}` : token;
}

function loadBaseline(token: string, ns?: string): Baseline {
  return baselines.get(baselineKey(token, ns)) || {};
}

function saveBaseline(token: string, baseline: Baseline, ns?: string) {
  baselines.set(baselineKey(token, ns), baseline);
}

/** Read the stored baseline without advancing it (empty-watchlist path). */
export function readBaseline(token: string, ns?: string): Baseline {
  return loadBaseline(token, ns);
}

export interface WatchAlert {
  poolId: string;
  symbol: string;
  project: string;
  chain: string;
  previousApy: number;
  currentApy: number;
  changePct: number;
  direction: "up" | "down";
  message: string;
}

/**
 * Diff watched pools against the stored baseline and produce alerts for
 * significant moves (default: >10% absolute change, or >25% relative drop
 * which signals decaying rewards). Always refreshes the baseline so the next
 * poll diffs against today.
 */
export function buildAlerts(
  token: string,
  watchedIds: string[],
  pools: { pool: string; symbol: string; project: string; chain: string; apy: number }[],
  ns?: string,
): { alerts: WatchAlert[]; baseline: Baseline } {
  const baseline = loadBaseline(token, ns);
  const poolById = new Map(pools.map((p) => [p.pool, p]));
  const alerts: WatchAlert[] = [];
  const now = new Date().toISOString();

  for (const poolId of watchedIds) {
    const pool = poolById.get(poolId);
    if (!pool) continue;

    const prev = baseline[poolId];
    if (!prev || Date.parse(now) - Date.parse(prev.at) > BASELINE_TTL_MS) {
      // First sighting (or stale baseline): just record, don't alert
      baseline[poolId] = { apy: pool.apy, at: now };
      continue;
    }

    const changePct = prev.apy > 0 ? ((pool.apy - prev.apy) / prev.apy) * 100 : 0;
    const absChange = Math.abs(pool.apy - prev.apy);

    const significant = absChange >= 10 || changePct <= -25 || changePct >= 50;

    if (significant && pool.apy !== prev.apy) {
      alerts.push({
        poolId,
        symbol: pool.symbol,
        project: pool.project,
        chain: pool.chain,
        previousApy: prev.apy,
        currentApy: pool.apy,
        changePct,
        direction: pool.apy > prev.apy ? "up" : "down",
        message:
          pool.apy > prev.apy
            ? `${pool.symbol} APY rose from ${prev.apy.toFixed(1)}% to ${pool.apy.toFixed(1)}%`
            : `${pool.symbol} APY fell from ${prev.apy.toFixed(1)}% to ${pool.apy.toFixed(1)}%`,
      });
    }

    // Always refresh the baseline so the next poll diffs against today
    baseline[poolId] = { apy: pool.apy, at: now };
  }

  saveBaseline(token, baseline, ns);
  return { alerts, baseline };
}
