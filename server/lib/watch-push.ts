import { storage } from "../storage";
import { buildAlerts } from "./watch-alerts";
import type { PushSubscriptionRow } from "@shared/schema";

/**
 * Server-side watchlist alert -> push bridge. The client's AlertBell polls
 * /api/watchlist/alerts for in-app cards; this scheduler independently turns
 * the same alert signal into browser push notifications for subscribed
 * devices.
 *
 * Baselines are namespaced ("push") so the scheduler and the in-app poll
 * never advance each other's baselines (that would double-fire alerts or
 * halve their sensitivity). Alerts are capped per token per cycle to avoid
 * notification spam.
 */

const MAX_ALERTS_PER_TOKEN_PER_CYCLE = 3;
const PUSH_NS = "push";

export interface PushAlertPayload {
  title: string;
  body: string;
  url: string;
}

/** Minimal pool shape buildAlerts needs (PoolWithScore satisfies this). */
type AlertablePool = {
  pool: string;
  symbol: string;
  project: string;
  chain: string;
  apy: number;
};

/**
 * For every token that has push subscriptions: compute watchlist alerts and
 * return them grouped by token (capped). Tokens with no alerts are absent.
 */
export async function collectWatchlistPushAlerts(
  subs: PushSubscriptionRow[],
  pools: AlertablePool[],
): Promise<Map<string, PushAlertPayload[]>> {
  const tokens = new Set(subs.map((s) => s.token));
  const result = new Map<string, PushAlertPayload[]>();

  for (const token of Array.from(tokens)) {
    const watched = await storage.getWatchlist(token);
    if (watched.length === 0) continue;

    const { alerts } = buildAlerts(token, watched, pools, PUSH_NS);
    if (alerts.length === 0) continue;

    result.set(
      token,
      alerts.slice(0, MAX_ALERTS_PER_TOKEN_PER_CYCLE).map((a) => ({
        title: `${a.direction === "up" ? "📈" : "📉"} ${a.symbol} APY moved`,
        body: a.message,
        url: "/watchlist",
      })),
    );
  }

  return result;
}
