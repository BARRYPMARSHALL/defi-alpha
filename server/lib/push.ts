import webpush from "web-push";
import { storage } from "../storage";
import type { PushSubscriptionRow } from "@shared/schema";

/**
 * Web push (browser notifications). Needs VAPID keys in env to be active:
 *   VAPID_PUBLIC_KEY  — served to the browser so it can subscribe
 *   VAPID_PRIVATE_KEY — signs outgoing notifications
 *   VAPID_SUBJECT     — contact (mailto: or https: URL), defaults below
 * Generate a keypair with: npx web-push generate-vapid-keys --json
 *
 * When unconfigured, the /api/push/config endpoint reports disabled and the
 * client simply doesn't offer push — nothing breaks.
 */

// VAPID keys are read lazily so tests can stub env without module resets
// (which would fragment the storage singleton import).
function vapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY || "";
}
function vapidPrivateKey(): string {
  return process.env.VAPID_PRIVATE_KEY || "";
}
function vapidSubject(): string {
  return process.env.VAPID_SUBJECT || "mailto:barry@1st4.mobi";
}

export function isPushConfigured(): boolean {
  return Boolean(vapidPublicKey() && vapidPrivateKey());
}

export function getVapidPublicKey(): string | null {
  return isPushConfigured() ? vapidPublicKey() : null;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Client route to open on notification click (defaults to /watchlist). */
  url?: string;
  /** Notification grouping tag (defaults to "defi-alpha"). */
  tag?: string;
}

function ensureConfigured() {
  if (!isPushConfigured()) {
    throw new Error(
      "Web push is not configured (set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY)",
    );
  }
  webpush.setVapidDetails(vapidSubject(), vapidPublicKey(), vapidPrivateKey());
}

/**
 * Send a notification to the given subscriptions. Subscriptions the push
 * service reports as gone (404/410) are deleted from storage so we stop
 * burning send attempts on dead endpoints. Returns sent/failed counts.
 */
export async function sendPushToSubscriptions(
  subs: PushSubscriptionRow[],
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  ensureConfigured();

  let sent = 0;
  let failed = 0;

  const results = await Promise.all(
    subs.map(async (sub) => {
      try {
        const keys = JSON.parse(sub.keys) as { p256dh: string; auth: string };
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys },
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url || "/watchlist",
            tag: payload.tag || "defi-alpha",
          }),
        );
        return "sent" as const;
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          // Subscription no longer valid — drop it
          await storage.deletePushSubscription(sub.endpoint).catch(() => {});
          return "gone" as const;
        }
        return "error" as const;
      }
    }),
  );

  for (const result of results) {
    if (result === "sent") sent += 1;
    else failed += 1;
  }

  return { sent, failed };
}
