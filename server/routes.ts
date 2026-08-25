import type { Express } from "express";
import { createServer, type Server } from "http";
import { fetchPoolsData, getCachedData } from "./lib/defillama";
import { storage } from "./storage";
import { isPushConfigured, sendPushToSubscriptions } from "./lib/push";
import { collectWatchlistPushAlerts } from "./lib/watch-push";
import { maybeStartDailySchedule } from "./lib/twitterBot";
import { registerPoolsRoutes } from "./routes/pools";
import { registerRecommendRoutes } from "./routes/recommend";
import { registerStablecoinsRoutes } from "./routes/stablecoins";
import { registerTwitterRoutes } from "./routes/twitter";
import { registerChatRoutes } from "./routes/chat";
import { registerWatchlistRoutes } from "./routes/watchlist";
import { registerHealthRoutes } from "./routes/health";
import { registerAuthRoutes } from "./routes/auth";
import { registerCheckoutRoutes, sweepPendingOrders } from "./routes/checkout";
import { registerLeadsRoutes, registerDigestRoutes, registerEmailRoutes } from "./routes/leads";
import { registerPushRoutes } from "./routes/push";
import { sweepRateLimitBuckets } from "./lib/rate-limit";

/** Weekly digest job: sends every DIGEST_DAY (0=Sunday, default 0) at 09:00 UTC. */
function startWeeklyDigestSchedule() {
  if (!process.env.RESEND_API_KEY) {
    console.log("Weekly digest schedule disabled (set RESEND_API_KEY to enable)");
    return;
  }
  const day = Number(process.env.DIGEST_DAY ?? 0);
  const hour = Number(process.env.DIGEST_HOUR ?? 9);
  console.log(`Weekly digest schedule enabled — ${day === 0 ? "Sunday" : `day ${day}`} ${hour}:00 UTC`);

  const check = async () => {
    const now = new Date();
    if (now.getUTCDay() !== day || now.getUTCHours() !== hour) return;
    try {
      const { sendDigestToAllLeads } = await import("./lib/email");
      const result = await sendDigestToAllLeads();
      console.log(`[Digest] Sent ${result.sent}, failed ${result.failed} (mode ${result.mode})`);
    } catch (error) {
      console.error("[Digest] Scheduled send failed:", error);
    }
  };

  check(); // run once at boot in case we're in the window
  setInterval(check, 60 * 60 * 1000); // check hourly
}

/**
 * Watchlist alert -> push scheduler. Every 5 minutes, diff every token that
 * has push subscriptions against its alert baseline and push any significant
 * APY moves. Only runs when VAPID keys are configured. Railway hobby tier
 * sleeps between requests, so this only fires while the instance is awake —
 * acceptable for an alert channel (the client's in-app poll still works
 * regardless).
 */
function startWatchlistPushSchedule() {
  if (!isPushConfigured()) {
    console.log("Watchlist push schedule disabled (set VAPID keys to enable)");
    return;
  }
  console.log("Watchlist push schedule enabled — checking every 5 minutes");

  const run = async () => {
    try {
      const subs = await storage.listPushSubscriptions();
      if (subs.length === 0) return;
      const cached = getCachedData();
      if (!cached) return;

      const alertsByToken = await collectWatchlistPushAlerts(subs, cached.pools);
      if (alertsByToken.size === 0) return;

      const subsByToken = new Map<string, (typeof subs)[number][]>();
      for (const sub of subs) {
        const arr = subsByToken.get(sub.token) || [];
        arr.push(sub);
        subsByToken.set(sub.token, arr);
      }

      let pushed = 0;
      for (const [token, payloads] of Array.from(alertsByToken)) {
        const tokenSubs = subsByToken.get(token) || [];
        for (const payload of payloads) {
          const { sent } = await sendPushToSubscriptions(tokenSubs, payload);
          pushed += sent;
        }
      }
      if (pushed > 0) console.log(`[Push] Sent ${pushed} watchlist alert notifications`);
    } catch (error) {
      console.error("[Push] Watchlist alert cycle failed:", error);
    }
  };

  run(); // once at boot to establish alert baselines
  setInterval(run, 5 * 60 * 1000);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Warm the pool cache on boot
  fetchPoolsData().catch(console.error);

  // Feature route groups
  registerHealthRoutes(app);
  registerAuthRoutes(app);
  registerCheckoutRoutes(app);
  registerLeadsRoutes(app);
  registerDigestRoutes(app);
  registerEmailRoutes(app);
  registerPoolsRoutes(app);
  registerRecommendRoutes(app);
  registerStablecoinsRoutes(app);
  registerTwitterRoutes(app);
  registerChatRoutes(app);
  registerWatchlistRoutes(app);
  registerPushRoutes(app);

  // Optional scheduled Twitter posting (TWITTER_AUTO_POST=true)
  maybeStartDailySchedule(async () => {
    await fetchPoolsData();
    return getCachedData()?.pools || [];
  });

  // Weekly digest email (RESEND_API_KEY + window)
  startWeeklyDigestSchedule();

  // Watchlist APY alerts -> browser push (VAPID keys + subscriptions)
  startWatchlistPushSchedule();

  // Housekeeping: sweep stale pending CoinGate orders + rate-limit buckets
  sweepPendingOrders().catch((error) => console.error("[Checkout] Initial order sweep failed:", error));
  const housekeeping = setInterval(() => {
    sweepPendingOrders().catch((error) => console.error("[Checkout] Order sweep failed:", error));
    sweepRateLimitBuckets();
  }, 60 * 60 * 1000);
  housekeeping.unref();

  return httpServer;
}
