import type { Express } from "express";
import { createServer, type Server } from "http";
import { fetchPoolsData, getCachedData } from "./lib/defillama";
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

  // Optional scheduled Twitter posting (TWITTER_AUTO_POST=true)
  maybeStartDailySchedule(async () => {
    await fetchPoolsData();
    return getCachedData()?.pools || [];
  });

  // Weekly digest email (RESEND_API_KEY + window)
  startWeeklyDigestSchedule();

  // Housekeeping: sweep stale pending CoinGate orders + rate-limit buckets
  sweepPendingOrders().catch((error) => console.error("[Checkout] Initial order sweep failed:", error));
  const housekeeping = setInterval(() => {
    sweepPendingOrders().catch((error) => console.error("[Checkout] Order sweep failed:", error));
    sweepRateLimitBuckets();
  }, 60 * 60 * 1000);
  housekeeping.unref();

  return httpServer;
}
