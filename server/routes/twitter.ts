import type { Express } from "express";
import { fetchPoolsData, getCachedData } from "../lib/defillama";
import { previewTweet, postDailyTweet, getScheduleStatus, stopDailySchedule, startDailySchedule } from "../lib/twitterBot";
import { asyncHandler } from "../lib/async-handler";
import { requireAdmin } from "../lib/admin";

export function registerTwitterRoutes(app: Express) {
  // Read-only preview: open (no side effects, just builds tweet text)
  app.get(
    "/api/twitter/preview",
    asyncHandler(async (_req, res) => {
      try {
        await fetchPoolsData();

        const cachedData = getCachedData();
        if (!cachedData) {
          return res.status(503).json({
            success: false,
            error: "Data not available",
          });
        }

        const tweetText = previewTweet(cachedData.pools);
        res.json({
          success: true,
          preview: tweetText,
          characterCount: tweetText.length,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error in /api/twitter/preview:", error);
        res.status(500).json({
          success: false,
          error: "Failed to generate preview",
        });
      }
    }),
  );

  // Owner-only: posts a REAL tweet.
  app.post(
    "/api/twitter/post",
    requireAdmin,
    asyncHandler(async (_req, res) => {
      try {
        await fetchPoolsData();

        const cachedData = getCachedData();
        if (!cachedData) {
          return res.status(503).json({
            success: false,
            error: "Data not available",
          });
        }

        const result = await postDailyTweet(cachedData.pools);

        if (result.success) {
          console.log(`[Twitter] Tweet posted successfully: ${result.tweetId}`);
          res.json({
            success: true,
            tweetId: result.tweetId,
            message: "Tweet posted successfully!",
            timestamp: new Date().toISOString(),
          });
        } else {
          res.status(400).json({
            success: false,
            error: result.error,
          });
        }
      } catch (error) {
        console.error("Error in /api/twitter/post:", error);
        res.status(500).json({
          success: false,
          error: "Failed to post tweet",
        });
      }
    }),
  );

  // Twitter auto-posting status — enabled via TWITTER_AUTO_POST=true env
  app.get("/api/twitter/status", (_req, res) => {
    res.json(getScheduleStatus());
  });

  // Owner-only: start/stop the auto-posting schedule.
  app.post(
    "/api/twitter/schedule",
    requireAdmin,
    asyncHandler(async (_req, res) => {
      const enabled = _req.query.enabled !== "false";
      if (!enabled) {
        stopDailySchedule();
        return res.json({ success: true, enabled: false });
      }
      startDailySchedule(async () => {
        await fetchPoolsData();
        return getCachedData()?.pools || [];
      });
      res.json({ success: true, enabled: true });
    }),
  );
}
