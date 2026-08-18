import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import type { Server } from "http";
import { createApp } from "../index";

// Owner-only endpoints (plan management, twitter post/schedule, digest send)
// require this token via the x-admin-token header.
process.env.ADMIN_TOKEN = "test-admin-token";

// Mock CoinGate SDK so checkout tests never hit the network.
vi.mock("@coingate/coingate-sdk", () => {
  const createOrder = vi.fn(async (data: any) => ({
    id: 424242,
    status: "new",
    order_id: data.order_id,
    price_amount: String(data.price_amount),
    price_currency: data.price_currency,
    payment_url: `https://pay.coingate.com/424242?token=${data.token}`,
    token: data.token,
  }));
  return {
    Client: class {
      order = { createOrder };
    },
  };
});

// Fixture pool data shaped like DeFiLlama's /pools response
const fixturePools = [
  {
    pool: "0x-pool-a",
    chain: "Ethereum",
    project: "uniswap-v3",
    symbol: "USDC-USDT",
    tvlUsd: 50_000_000,
    apyBase: 11,
    apyReward: 1,
    apy: 12,
    rewardTokens: [],
    il7d: null,
    exposure: "multi",
    stablecoin: true,
    volumeUsd7d: 5_000_000,
    apyPct7D: 2,
  },
  {
    pool: "0x-pool-b",
    chain: "Arbitrum",
    project: "aerodrome-v1",
    symbol: "ETH-USDC",
    tvlUsd: 20_000_000,
    apyBase: 25,
    apyReward: 5,
    apy: 30,
    rewardTokens: ["AERO"],
    il7d: 0.2,
    exposure: "multi",
    stablecoin: false,
    volumeUsd7d: 1_500_000,
    apyPct7D: 8,
  },
  {
    pool: "0x-pool-c",
    chain: "Solana",
    project: "raydium",
    symbol: "SOL-USDC",
    tvlUsd: 8_000_000,
    apyBase: 40,
    apyReward: 60,
    apy: 100,
    rewardTokens: ["RAY"],
    il7d: 0.6,
    exposure: "multi",
    stablecoin: false,
    volumeUsd7d: 200_000,
    apyPct7D: 15,
  },
];

let app: Express;
let server: Server;

beforeAll(async () => {
  // Mock the DeFiLlama network calls so tests are hermetic
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("yields.llama.fi")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: fixturePools }),
        } as any;
      }
      if (url.includes("stablecoins.llama.fi")) {
        return {
          ok: true,
          status: 200,
          json: async () => ([
            { name: "Ethereum", totalCirculatingUSD: 100_000_000_000 },
            { name: "Tron", totalCirculatingUSD: 60_000_000_000 },
          ]),
        } as any;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }),
  );

  const created = await createApp();
  app = created.app;
  server = created.server;
});

afterAll(() => {
  vi.unstubAllGlobals();
  server.close();
});

describe("health + system", () => {
  it("GET /health returns 200", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toContain("DeFi Alpha");
  });
});

describe("pools API", () => {
  it("GET /api/pools returns scored pools", async () => {
    const res = await request(app).get("/api/pools");
    expect(res.status).toBe(200);
    expect(res.body.pools.length).toBe(3);
    expect(res.body.stats.totalPools).toBe(3);
    expect(res.body.pools[0]).toHaveProperty("riskAdjustedScore");
    expect(res.body.pools[0]).toHaveProperty("autoCompound");
  });

  it("GET /api/pools respects minTvl filter", async () => {
    const res = await request(app).get("/api/pools?minTvl=15000000");
    expect(res.status).toBe(200);
    expect(res.body.pools.length).toBe(2); // pools a and b
  });

  it("GET /api/pools rejects invalid sort field", async () => {
    const res = await request(app).get("/api/pools?sortField=bogus");
    expect(res.status).toBe(400);
  });
});

describe("chains API", () => {
  it("GET /api/chains lists chains with counts", async () => {
    const res = await request(app).get("/api/chains");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.aliases).toHaveProperty("ethereum");
  });
});

describe("stablecoins API", () => {
  it("GET /api/stablecoins returns chain data", async () => {
    const res = await request(app).get("/api/stablecoins");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
  });
});

describe("recommend API", () => {
  it("GET /api/recommend returns a top pick", async () => {
    const res = await request(app).get("/api/recommend?chains=all");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.topPick).not.toBeNull();
    expect(res.body.alternatives).toBeInstanceOf(Array);
  });

  it("GET /api/recommend filters by chain", async () => {
    const res = await request(app).get("/api/recommend?chains=arbitrum");
    expect(res.status).toBe(200);
    expect(res.body.topPick.chain.toLowerCase()).toBe("arbitrum");
  });
});

describe("chat API (Alpha Brain, local mode)", () => {
  it("GET /api/chat/status reports local mode without a key", async () => {
    delete process.env.OPENAI_API_KEY;
    const res = await request(app).get("/api/chat/status");
    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("local");
  });

  it("POST /api/chat answers in local mode with live data", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ message: "best stablecoin pools?" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.mode).toBe("local");
    expect(res.body.reply).toContain("stablecoin");
    expect(res.body.conversationId).toBeGreaterThan(0);
  });

  it("POST /api/chat persists conversation history", async () => {
    const first = await request(app).post("/api/chat").send({ message: "hi there" });
    const convId = first.body.conversationId;

    const second = await request(app)
      .post("/api/chat")
      .send({ message: "what about Arbitrum?", conversationId: convId });
    expect(second.status).toBe(200);
    expect(second.body.conversationId).toBe(convId);

    const history = await request(app).get(`/api/chat/conversations/${convId}/messages`);
    expect(history.status).toBe(200);
    expect(history.body.messages.length).toBe(4); // 2 user + 2 assistant
  });

  it("enforces the free-tier daily AI message limit", async () => {
    // A cookie-carrying agent = one anonymous browser: the server issues an
    // httpOnly anon token and keys usage to it (client-supplied headers no
    // longer set the identity). Default limit is 5.
    const agent = request.agent(app);
    for (let i = 0; i < 5; i++) {
      const res = await agent.post("/api/chat").send({ message: `test message ${i}` });
      expect(res.status).toBe(200);
    }
    // 6th message hits the cap
    const blocked = await agent.post("/api/chat").send({ message: "one too many" });
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe("ai_limit_reached");
    expect(blocked.body.usage.used).toBe(5);
    expect(blocked.body.usage.limit).toBe(5);
  });

  it("reports usage in status and does NOT honor a spoofed pro header", async () => {
    const agent = request.agent(app);
    const status = await agent.get("/api/chat/status");
    expect(status.body.usage).toMatchObject({ used: 0, limit: 5, isPro: false });

    // The x-plan header is ignored: 5 messages then the cap, even with it set
    for (let i = 0; i < 5; i++) {
      const res = await agent
        .post("/api/chat")
        .set("x-plan", "pro")
        .send({ message: `spoof attempt ${i}` });
      expect(res.status).toBe(200);
    }
    const blocked = await agent
      .post("/api/chat")
      .set("x-plan", "pro")
      .send({ message: "should still be blocked" });
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe("ai_limit_reached");
  });
});

describe("watchlist API", () => {
  it("returns empty watchlist for a fresh token", async () => {
    const res = await request(app)
      .get("/api/watchlist")
      .set("x-watchlist-token", "test-token-1");
    expect(res.status).toBe(200);
    expect(res.body.watchlist).toEqual([]);
  });

  it("adds and removes items", async () => {
    const add = await request(app)
      .post("/api/watchlist")
      .set("x-watchlist-token", "test-token-1")
      .send({ poolId: "0x-pool-a" });
    expect(add.status).toBe(200);
    expect(add.body.watchlist).toContain("0x-pool-a");

    const del = await request(app)
      .delete("/api/watchlist/0x-pool-a")
      .set("x-watchlist-token", "test-token-1");
    expect(del.status).toBe(200);
    expect(del.body.watchlist).not.toContain("0x-pool-a");
  });

  it("computes APY-change alerts for watched pools", async () => {
    const token = `alert-test-${Date.now()}`;
    await request(app)
      .post("/api/watchlist")
      .set("x-watchlist-token", token)
      .send({ poolId: "0x-pool-a" });

    // First poll baselines without alerting
    const first = await request(app)
      .get("/api/watchlist/alerts")
      .set("x-watchlist-token", token);
    expect(first.status).toBe(200);
    expect(first.body.alerts.length).toBe(0);

    // Second poll with the same fixture data: pool a APY is 12 (stable),
    // no change → no alerts; pool b wasn't watched → no alert
    const second = await request(app)
      .get("/api/watchlist/alerts")
      .set("x-watchlist-token", token);
    expect(second.status).toBe(200);
    expect(Array.isArray(second.body.alerts)).toBe(true);
    expect(second.body.baseline["0x-pool-a"]).toBeDefined();
  });
});

describe("twitter API", () => {
  it("GET /api/twitter/preview generates a tweet", async () => {
    const res = await request(app).get("/api/twitter/preview");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.preview.length).toBeGreaterThan(0);
    expect(res.body.characterCount).toBeLessThanOrEqual(280);
  });

  it("GET /api/twitter/status reports state", async () => {
    const res = await request(app).get("/api/twitter/status");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("enabled");
    expect(res.body).toHaveProperty("credentialsConfigured");
  });
});

describe("auth API", () => {
  it("registers a user and returns a session", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "testuser1", password: "supersecret123" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.username).toBe("testuser1");
    expect(res.body.user.plan).toBe("free");
    expect(res.body.user.password).toBeUndefined(); // hash never exposed
  });

  it("rejects duplicate usernames", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ username: "dupuser", password: "supersecret123" });
    const dup = await request(app)
      .post("/api/auth/register")
      .send({ username: "dupuser", password: "otherpass123" });
    expect(dup.status).toBe(409);
  });

  it("logs in with correct credentials and rejects wrong ones", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ username: "loginuser", password: "supersecret123" });

    const bad = await request(app)
      .post("/api/auth/login")
      .send({ username: "loginuser", password: "wrongpass" });
    expect(bad.status).toBe(401);

    const agent = request.agent(app); // cookie jar for session
    const good = await agent
      .post("/api/auth/login")
      .send({ username: "loginuser", password: "supersecret123" });
    expect(good.status).toBe(200);
    expect(good.body.user.username).toBe("loginuser");

    // /me reflects the session
    const me = await agent.get("/api/auth/me");
    expect(me.body.authenticated).toBe(true);
    expect(me.body.user.username).toBe("loginuser");

    // logout clears it
    await agent.post("/api/auth/logout");
    const meAfter = await agent.get("/api/auth/me");
    expect(meAfter.body.authenticated).toBe(false);
  });

  it("rejects weak passwords and bad usernames", async () => {
    const weak = await request(app)
      .post("/api/auth/register")
      .send({ username: "okuser", password: "short" });
    expect(weak.status).toBe(400);

    const badChars = await request(app)
      .post("/api/auth/register")
      .send({ username: "bad user!", password: "supersecret123" });
    expect(badChars.status).toBe(400);
  });

  it("Pro users bypass the free AI message cap via their plan", async () => {
    // Register + set plan to pro through the OWNER-ONLY plan endpoint
    const agent = request.agent(app);
    const reg = await agent.post("/api/auth/register").send({ username: "prouser", password: "supersecret123" });
    const plan = await agent
      .post("/api/auth/plan")
      .set("x-admin-token", "test-admin-token")
      .send({ userId: reg.body.user.id, plan: "pro" });
    expect(plan.status).toBe(200);
    expect(plan.body.user.plan).toBe("pro");

    // Send more than the free limit (5) — all should pass
    for (let i = 0; i < 6; i++) {
      const res = await agent
        .post("/api/chat")
        .send({ message: `pro chat ${i}` });
      expect(res.status).toBe(200);
      expect(res.body.usage.isPro).toBe(true);
    }
  });

  it("rejects plan changes without the admin token", async () => {
    const agent = request.agent(app);
    const reg = await agent.post("/api/auth/register").send({ username: "planhacker", password: "supersecret123" });

    // No admin token → forbidden (no self-upgrade to Pro)
    const noToken = await agent
      .post("/api/auth/plan")
      .send({ userId: reg.body.user.id, plan: "pro" });
    expect(noToken.status).toBe(403);

    // Wrong token → also forbidden
    const wrongToken = await agent
      .post("/api/auth/plan")
      .set("x-admin-token", "wrong-token")
      .send({ userId: reg.body.user.id, plan: "pro" });
    expect(wrongToken.status).toBe(403);

    // Still free
    const me = await agent.get("/api/auth/me");
    expect(me.body.user.plan).toBe("free");
  });

  it("authenticated free users still hit the AI cap", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send({ username: "freeuser", password: "supersecret123" });

    for (let i = 0; i < 5; i++) {
      const res = await agent.post("/api/chat").send({ message: `free chat ${i}` });
      expect(res.status).toBe(200);
    }
    const blocked = await agent.post("/api/chat").send({ message: "over the limit" });
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe("ai_limit_reached");
  });
});

describe("checkout API (CoinGate)", () => {
  it("requires authentication to create a checkout", async () => {
    const res = await request(app)
      .post("/api/checkout")
      .send({ period: "monthly" });
    expect(res.status).toBe(401);
  });

  it("creates a CoinGate order and returns a payment URL for a logged-in user", async () => {
    process.env.COINGATE_API_KEY = "test-key";
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send({ username: "cguser", password: "supersecret123" });

    const res = await agent
      .post("/api/checkout")
      .send({ period: "monthly" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.paymentUrl).toContain("pay.coingate.com");
    expect(res.body.price).toBe(12);
  });

  it("activates Pro via the payment webhook when status is paid and token matches", async () => {
    process.env.COINGATE_API_KEY = "test-key";
    const agent = request.agent(app);
    const reg = await agent.post("/api/auth/register").send({ username: "cgpro", password: "supersecret123" });
    const userId = reg.body.user.id;

    const order = await agent.post("/api/checkout").send({ period: "annual" });
    const orderId = order.body.orderId;

    // Simulate CoinGate callback with a valid token — we need the same token
    // the SDK used; the mock returns data.token which we set server-side as a
    // UUID, so we extract it from the payment URL.
    const token = decodeURIComponent(new URL(order.body.paymentUrl).searchParams.get("token") || "");

    const webhook = await request(app)
      .post("/api/checkout/webhook")
      .send({ order_id: orderId, status: "paid", token });
    expect(webhook.status).toBe(200);
    expect(webhook.body.activated).toBe(true);

    // The user is now Pro
    const me = await agent.get("/api/auth/me");
    expect(me.body.user.plan).toBe("pro");
    expect(userId).toBeTruthy();
  });

  it("rejects webhooks with a mismatched token", async () => {
    const res = await request(app)
      .post("/api/checkout/webhook")
      .send({ order_id: "da-nonexistent-123", status: "paid", token: "wrong" });
    expect(res.status).toBe(200); // acknowledged, not activated
    expect(res.body.success).toBe(false);
  });
});

describe("leads API (course funnel)", () => {
  it("captures an email lead", async () => {
    const res = await request(app)
      .post("/api/leads")
      .send({ email: "learner@example.com", source: "course" });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.subscribed).toBe(true);
  });

  it("rejects invalid emails", async () => {
    const res = await request(app)
      .post("/api/leads")
      .send({ email: "not-an-email", source: "course" });
    expect(res.status).toBe(400);
  });

  it("is idempotent for duplicate emails", async () => {
    await request(app).post("/api/leads").send({ email: "dup@example.com" });
    const dup = await request(app).post("/api/leads").send({ email: "dup@example.com" });
    expect(dup.status).toBe(201);
    expect(dup.body.subscribed).toBe(false); // already on the list
  });

  it("reports a lead count", async () => {
    const res = await request(app).get("/api/leads/count");
    expect(res.status).toBe(200);
    expect(typeof res.body.count).toBe("number");
    expect(res.body.count).toBeGreaterThanOrEqual(1);
  });
});
