import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { storage } from "../storage";

// Unit tests for the actual notification SEND path (web-push is mocked; the
// env is stubbed BEFORE the module is imported so isPushConfigured() is true).

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

const webpushMock = vi.mocked(await import("web-push")).default;

// The lib reads VAPID env lazily, so a single module instance works with
// per-test env stubs — and keeps the SAME storage singleton as the tests
// (vi.resetModules() here would fragment storage and break deletion checks).
import { sendPushToSubscriptions } from "../lib/push";

beforeEach(async () => {
  vi.stubEnv("VAPID_PUBLIC_KEY", "test-public-key");
  vi.stubEnv("VAPID_PRIVATE_KEY", "test-private-key");
  vi.stubEnv("VAPID_SUBJECT", "mailto:test@example.com");
  vi.clearAllMocks();
  // The storage singleton is shared across tests in this file — start clean
  for (const sub of await storage.listPushSubscriptions()) {
    await storage.deletePushSubscription(sub.endpoint);
  }
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sendPushToSubscriptions", () => {
  it("sends a notification to each valid subscription", async () => {
    webpushMock.sendNotification.mockResolvedValue({ statusCode: 201 } as never);

    
    await storage.savePushSubscription({
      endpoint: "https://push.example/endpoint-a",
      keys: JSON.stringify({ p256dh: "a", auth: "b" }),
      token: "da-token",
    });

    const result = await sendPushToSubscriptions(
      await storage.listPushSubscriptions(),
      { title: "Test", body: "Hello" },
    );

    expect(webpushMock.sendNotification).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ sent: 1, failed: 0 });
  });

  it("drops (deletes) subscriptions the push service reports as gone (410)", async () => {
    webpushMock.sendNotification.mockRejectedValue({ statusCode: 410 });

    
    await storage.savePushSubscription({
      endpoint: "https://push.example/gone-endpoint",
      keys: JSON.stringify({ p256dh: "a", auth: "b" }),
      token: "da-token",
    });

    const result = await sendPushToSubscriptions(
      await storage.listPushSubscriptions(),
      { title: "Test", body: "Hello" },
    );

    expect(result).toEqual({ sent: 0, failed: 1 });
    expect(await storage.listPushSubscriptions()).toHaveLength(0);
  });

  it("counts other delivery errors as failed but keeps the subscription", async () => {
    webpushMock.sendNotification.mockRejectedValue(new Error("network down"));

    
    await storage.savePushSubscription({
      endpoint: "https://push.example/flaky-endpoint",
      keys: JSON.stringify({ p256dh: "a", auth: "b" }),
      token: "da-token",
    });

    const result = await sendPushToSubscriptions(
      await storage.listPushSubscriptions(),
      { title: "Test", body: "Hello" },
    );

    expect(result).toEqual({ sent: 0, failed: 1 });
    expect(await storage.listPushSubscriptions()).toHaveLength(1);
  });

  it("throws when VAPID keys are absent", async () => {
    vi.stubEnv("VAPID_PUBLIC_KEY", "");
    vi.stubEnv("VAPID_PRIVATE_KEY", "");

    
    await expect(
      sendPushToSubscriptions([], { title: "Test", body: "Hello" }),
    ).rejects.toThrow(/not configured/i);
  });
});
