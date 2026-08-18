import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import type { Server } from "http";
import { createApp } from "../index";

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
    // Distinct usage token → independent daily budget (default limit is 5)
    const token = `limit-test-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/api/chat")
        .set("x-usage-token", token)
        .send({ message: `test message ${i}` });
      expect(res.status).toBe(200);
    }
    // 6th message hits the cap
    const blocked = await request(app)
      .post("/api/chat")
      .set("x-usage-token", token)
      .send({ message: "one too many" });
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe("ai_limit_reached");
    expect(blocked.body.usage.used).toBe(5);
    expect(blocked.body.usage.limit).toBe(5);
  });

  it("reports usage in status and bypasses the limit for Pro", async () => {
    const token = `pro-test-${Date.now()}`;
    const status = await request(app)
      .get("/api/chat/status")
      .set("x-usage-token", token);
    expect(status.body.usage).toMatchObject({ used: 0, limit: 5, isPro: false });

    // Pro header skips the gate even beyond the cap
    for (let i = 0; i < 6; i++) {
      const res = await request(app)
        .post("/api/chat")
        .set("x-usage-token", token)
        .set("x-plan", "pro")
        .send({ message: `pro message ${i}` });
      expect(res.status).toBe(200);
    }
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
