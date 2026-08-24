import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import type { Server } from "http";
import { createApp } from "../index";

// These tests run WITHOUT VAPID keys (the default) — they cover the
// unconfigured capability query, subscribe/unsubscribe persistence, and the
// graceful 501 for sends. The actual send path is unit-tested in
// push-send.test.ts with a mocked web-push.

describe("push routes (unconfigured)", () => {
  let app: Express;
  let server: Server;

  beforeAll(async () => {
    const built = await createApp();
    app = built.app;
    server = built.server;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    vi.restoreAllMocks();
  });

  it("GET /api/push/config reports disabled without VAPID keys", async () => {
    const res = await request(app).get("/api/push/config");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ enabled: false, vapidPublicKey: null });
  });

  it("POST /api/push/subscribe persists a valid subscription", async () => {
    const res = await request(app).post("/api/push/subscribe").send({
      endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint-1",
      keys: { p256dh: "p256dh-bytes", auth: "auth-bytes" },
      token: "da-test-token",
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("re-subscribing the same endpoint upserts (still 200, no error)", async () => {
    const payload = {
      endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint-2",
      keys: { p256dh: "p256dh-bytes", auth: "auth-bytes" },
      token: "da-test-token",
    };
    const first = await request(app).post("/api/push/subscribe").send(payload);
    const second = await request(app).post("/api/push/subscribe").send(payload);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.success).toBe(true);
  });

  it("rejects a malformed subscription payload (400)", async () => {
    const res = await request(app).post("/api/push/subscribe").send({
      endpoint: "not-a-url",
      keys: { p256dh: "" },
      token: "da-test-token",
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects a subscription without a token (400)", async () => {
    const res = await request(app).post("/api/push/subscribe").send({
      endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint-3",
      keys: { p256dh: "p256dh-bytes", auth: "auth-bytes" },
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("DELETE /api/push/subscribe removes a subscription", async () => {
    const endpoint = "https://fcm.googleapis.com/fcm/send/test-endpoint-4";
    await request(app).post("/api/push/subscribe").send({
      endpoint,
      keys: { p256dh: "p256dh-bytes", auth: "auth-bytes" },
      token: "da-test-token",
    });
    const res = await request(app).delete("/api/push/subscribe").send({ endpoint });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /api/push/test returns 501 when push is not configured", async () => {
    const res = await request(app).post("/api/push/test").send({
      endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint-1",
      token: "da-test-token",
    });
    expect(res.status).toBe(501);
    expect(res.body.success).toBe(false);
  });
});
