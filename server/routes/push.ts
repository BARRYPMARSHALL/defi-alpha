import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { rateLimit } from "../lib/rate-limit";
import {
  isPushConfigured,
  getVapidPublicKey,
  sendPushToSubscriptions,
} from "../lib/push";

/**
 * Web push endpoints: capability/config query, subscribe, unsubscribe, and a
 * self-test send. Subscriptions are keyed by the browser's endpoint and
 * attached to the anonymous client token (same one the watchlist uses), so a
 * device's notifications follow its watchlist.
 */

const subscribeSchema = z.object({
  endpoint: z.string().url().min(10),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  token: z.string().min(1),
});

export function registerPushRoutes(app: Express) {
  // Capability + public key for the client (no auth needed — the public key
  // is public by design).
  app.get("/api/push/config", (_req, res) => {
    res.json({ enabled: isPushConfigured(), vapidPublicKey: getVapidPublicKey() });
  });

  // Register a browser subscription. Upsert by endpoint so re-subscribes
  // (and key rotations) never accumulate stale rows.
  app.post(
    "/api/push/subscribe",
    rateLimit({ scope: "push-subscribe", windowMs: 60_000, max: 20 }),
    async (req, res) => {
      const parsed = subscribeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Invalid subscription payload" });
      }
      const { endpoint, keys, token } = parsed.data;
      try {
        await storage.savePushSubscription({
          endpoint,
          keys: JSON.stringify(keys),
          token,
        });
        res.json({ success: true });
      } catch (error) {
        console.error("Error saving push subscription:", error);
        res.status(500).json({ success: false, error: "Failed to save subscription" });
      }
    },
  );

  // Remove a subscription (user toggled notifications off).
  app.delete(
    "/api/push/subscribe",
    rateLimit({ scope: "push-unsubscribe", windowMs: 60_000, max: 20 }),
    async (req, res) => {
      const parsed = z.object({ endpoint: z.string().min(1) }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Invalid payload" });
      }
      try {
        await storage.deletePushSubscription(parsed.data.endpoint);
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting push subscription:", error);
        res.status(500).json({ success: false, error: "Failed to remove subscription" });
      }
    },
  );

  // Send a test notification to the requester's OWN subscription (endpoint +
  // token must match a stored row; rate-limited to stop abuse).
  app.post(
    "/api/push/test",
    rateLimit({ scope: "push-test", windowMs: 60_000, max: 5 }),
    async (req, res) => {
      if (!isPushConfigured()) {
        return res.status(501).json({
          success: false,
          error: "Web push is not configured on this server (missing VAPID keys)",
        });
      }
      const parsed = z
        .object({ endpoint: z.string().min(1), token: z.string().min(1) })
        .safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Invalid payload" });
      }
      try {
        const subs = (await storage.listPushSubscriptions()).filter(
          (s) => s.endpoint === parsed.data.endpoint && s.token === parsed.data.token,
        );
        if (subs.length === 0) {
          return res.status(404).json({ success: false, error: "Subscription not found" });
        }
        const { sent, failed } = await sendPushToSubscriptions(subs, {
          title: "DeFi Alpha",
          body: "Push notifications are working — you'll get APY alerts here.",
          url: "/watchlist",
          tag: "defi-alpha-test",
        });
        res.json({ success: sent > 0, sent, failed });
      } catch (error) {
        console.error("Error sending test push:", error);
        res.status(500).json({ success: false, error: "Failed to send test notification" });
      }
    },
  );
}
