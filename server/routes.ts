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
import { registerCheckoutRoutes } from "./routes/checkout";

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

  return httpServer;
}
