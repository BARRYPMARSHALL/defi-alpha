import { describe, it, expect, beforeEach } from "vitest";
import { storage } from "../storage";
import { collectWatchlistPushAlerts } from "../lib/watch-push";
import { buildAlerts } from "../lib/watch-alerts";

// Scheduler unit tests: watchlist APY moves -> push payloads, with
// namespaced baselines so the push channel never races the in-app poll.

function makePool(pool: string, symbol: string, apy: number) {
  return { pool, symbol, project: "test-project", chain: "Ethereum", apy };
}

const POOL_A = "pool-a";
const POOL_B = "pool-b";

async function seed(token: string, poolIds: string[]) {
  for (const poolId of poolIds) {
    await storage.addWatchlistItem({ token, poolId });
  }
  await storage.savePushSubscription({
    endpoint: `https://push.example/${token}`,
    keys: JSON.stringify({ p256dh: "a", auth: "b" }),
    token,
  });
}

async function clearAll() {
  for (const sub of await storage.listPushSubscriptions()) {
    await storage.deletePushSubscription(sub.endpoint);
  }
  for (const token of ["t1", "t2"]) {
    for (const poolId of await storage.getWatchlist(token)) {
      await storage.removeWatchlistItem(token, poolId);
    }
  }
}

beforeEach(clearAll);

describe("collectWatchlistPushAlerts", () => {
  it("pushes a watchlist APY move after the baseline is established", async () => {
    await seed("t1", [POOL_A]);
    const pools = [makePool(POOL_A, "USDC-USDT", 10)];

    // First cycle: no alert, just baseline
    expect((await collectWatchlistPushAlerts(await storage.listPushSubscriptions(), pools)).size).toBe(0);

    // APY jumps 10 -> 25 (+150%): significant
    const moved = [makePool(POOL_A, "USDC-USDT", 25)];
    const alerts = await collectWatchlistPushAlerts(await storage.listPushSubscriptions(), moved);
    const payloads = alerts.get("t1") || [];
    expect(payloads).toHaveLength(1);
    expect(payloads[0].title).toContain("USDC-USDT APY moved");
    expect(payloads[0].body).toContain("rose");
    expect(payloads[0].url).toBe("/watchlist");
  });

  it("does not re-alert for the same APY on the next cycle (baseline advanced)", async () => {
    await seed("t1", [POOL_A]);
    await collectWatchlistPushAlerts(await storage.listPushSubscriptions(), [makePool(POOL_A, "USDC-USDT", 10)]);
    await collectWatchlistPushAlerts(await storage.listPushSubscriptions(), [makePool(POOL_A, "USDC-USDT", 25)]);

    // Same APY again: no new alert
    const alerts = await collectWatchlistPushAlerts(await storage.listPushSubscriptions(), [makePool(POOL_A, "USDC-USDT", 25)]);
    expect(alerts.size).toBe(0);
  });

  it("caps at 3 alerts per token per cycle", async () => {
    const four = ["p1", "p2", "p3", "p4"];
    await seed("t1", four);
    const pools = four.map((p, i) => makePool(p, `TKN${i}`, 10));
    await collectWatchlistPushAlerts(await storage.listPushSubscriptions(), pools);
    const moved = four.map((p, i) => makePool(p, `TKN${i}`, 40)); // +300% each
    const alerts = await collectWatchlistPushAlerts(await storage.listPushSubscriptions(), moved);
    expect((alerts.get("t1") || []).length).toBe(3);
  });

  it("skips tokens with subscriptions but no watchlist", async () => {
    await storage.savePushSubscription({
      endpoint: "https://push.example/t2",
      keys: JSON.stringify({ p256dh: "a", auth: "b" }),
      token: "t2",
    });
    const alerts = await collectWatchlistPushAlerts(
      await storage.listPushSubscriptions(),
      [makePool(POOL_A, "USDC-USDT", 10)],
    );
    expect(alerts.size).toBe(0);
  });

  it("namespaced baselines keep push and in-app polls independent", async () => {
    await seed("t1", [POOL_A]);

    // In-app poll (no namespace) sees the move first and records its own baseline
    await buildAlerts("t1", [POOL_A], [makePool(POOL_A, "USDC-USDT", 10)]);
    await buildAlerts("t1", [POOL_A], [makePool(POOL_A, "USDC-USDT", 25)]);

    // Push channel (ns "push") is on a fresh baseline: first sighting, no alert
    const firstPush = await collectWatchlistPushAlerts(
      await storage.listPushSubscriptions(),
      [makePool(POOL_A, "USDC-USDT", 25)],
    );
    expect(firstPush.size).toBe(0);

    // Next move alerts push…
    const secondPush = await collectWatchlistPushAlerts(
      await storage.listPushSubscriptions(),
      [makePool(POOL_A, "USDC-USDT", 60)],
    );
    expect((secondPush.get("t1") || []).length).toBe(1);

    // …and the in-app poll ALSO still alerts on the same move (its baseline
    // was not advanced by the push channel — proves isolation)
    const inApp = buildAlerts("t1", [POOL_A], [makePool(POOL_A, "USDC-USDT", 60)]);
    expect((await inApp).alerts.length).toBe(1);
  });
});
