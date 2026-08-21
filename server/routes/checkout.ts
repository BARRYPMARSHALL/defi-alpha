import type { Express, Request } from "express";
import { z } from "zod";
import { Client } from "@coingate/coingate-sdk";
import { storage } from "../storage";
import { asyncHandler } from "../lib/async-handler";

/**
 * CoinGate checkout — crypto + card payments natively (single integration).
 *
 * Flow:
 *  1. POST /api/checkout  → creates a CoinGate order, returns payment_url
 *  2. User pays on CoinGate (crypto OR card)
 *  3. CoinGate POSTs to /api/checkout/webhook with the order status
 *  4. Webhook verifies the order (token match + status), then flips the
 *     user's plan to "pro"
 *
 * The webhook is public (CoinGate cannot send auth headers), so activation
 * requires a matching order token AND a "paid" status — no plan flips without
 * a confirmed payment. Pending orders are PERSISTED (see pending_orders
 * table) so a redeploy or second instance never loses a payment callback.
 * Crypto "confirming" is deliberately NOT treated as paid: CoinGate will
 * re-callback when the payment finalizes.
 */

const PRO_PRICE_USD = 12;
const PRO_PRICE_ANNUAL_USD = 99;

/** Stale orders (never paid) are swept after this long. */
const PENDING_ORDER_TTL_MS = 24 * 60 * 60 * 1000;

function getClient(): Client | null {
  const apiKey = process.env.COINGATE_API_KEY;
  if (!apiKey) return null;
  const sandbox = process.env.COINGATE_SANDBOX === "true";
  return new Client(apiKey, sandbox);
}

function isConfigured(): boolean {
  return !!process.env.COINGATE_API_KEY;
}

const checkoutSchema = z.object({
  period: z.enum(["monthly", "annual"]).default("monthly"),
});

/** Deletes pending orders that will never be paid. */
export async function sweepPendingOrders(): Promise<number> {
  const orders = await storage.listPendingOrders();
  const cutoff = Date.now() - PENDING_ORDER_TTL_MS;
  let removed = 0;
  for (const order of orders) {
    const createdAt = order.createdAt instanceof Date ? order.createdAt.getTime() : Date.parse(String(order.createdAt));
    if (!isNaN(createdAt) && createdAt < cutoff) {
      await storage.deletePendingOrder(order.orderId);
      removed += 1;
    }
  }
  if (removed > 0) console.log(`[Checkout] Swept ${removed} stale pending order(s)`);
  return removed;
}

export function registerCheckoutRoutes(app: Express) {
  app.get("/api/checkout/status", (_req, res) => {
    res.json({
      configured: isConfigured(),
      provider: "coingate",
      price: { monthly: PRO_PRICE_USD, annual: PRO_PRICE_ANNUAL_USD },
    });
  });

  app.post(
    "/api/checkout",
    asyncHandler(async (req, res) => {
      // Must be logged in so we know whose plan to activate (auth before config)
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Please sign in to upgrade" });
      }

      if (!isConfigured()) {
        return res.status(503).json({
          success: false,
          error: "Payments are not configured yet. Please try again later.",
        });
      }

      const client = getClient()!;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ success: false, error: "Account not found" });
      }
      if (user.plan === "pro") {
        return res.json({ success: true, alreadyPro: true });
      }

      const parseResult = checkoutSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ success: false, error: "Invalid checkout payload" });
      }

      const period = parseResult.data.period;
      const price = period === "annual" ? PRO_PRICE_ANNUAL_USD : PRO_PRICE_USD;
      const orderToken = crypto.randomUUID();
      // Random suffix prevents collision when two checkouts land in the same
      // ms (a collision would silently overwrite the first order's token).
      const orderId = `da-${user.id.slice(0, 8)}-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;

      try {
        const base = process.env.SITE_URL || `http://${req.headers.host}`;
        const order = await client.order.createOrder({
          order_id: orderId,
          price_amount: price,
          price_currency: "USD",
          receive_currency: "USD",
          title: period === "annual" ? "DeFi Alpha Pro — Annual" : "DeFi Alpha Pro — Monthly",
          description: "Unlimited Alpha Brain, real-time data, ad-free.",
          callback_url: `${base}/api/checkout/webhook`,
          cancel_url: `${base}/more`,
          success_url: `${base}/more`,
          token: orderToken,
        });

        await storage.savePendingOrder({
          orderId,
          userId,
          plan: "pro",
          orderToken,
        });

        res.json({
          success: true,
          orderId,
          paymentUrl: order.payment_url,
          price,
          period,
        });
      } catch (error: any) {
        console.error("[Checkout] CoinGate create order failed:", error?.message || error);
        res.status(502).json({
          success: false,
          error: "Failed to create payment. Please try again.",
        });
      }
    }),
  );

  /**
   * CoinGate callback webhook. CoinGate POSTs order data here; we verify:
   *  - the order exists in our pending store (we created it)
   *  - the token matches (prevents forged callbacks)
   *  - the order is genuinely "paid" (verified against the CoinGate API
   *    when possible; "confirming" is NOT enough — crypto can still reverse)
   * Then activate Pro.
   */
  app.post(
    "/api/checkout/webhook",
    asyncHandler(async (req, res) => {
      const body = req.body || {};

      const orderId = String(body.order_id || body.id || "");
      const status = String(body.status || "");
      const token = String(body.token || "");

      const pending = orderId ? await storage.getPendingOrder(orderId) : undefined;
      if (!pending) {
        // Unknown (or swept) order — acknowledge to stop retries
        return res.status(200).json({ success: false, reason: "unknown_order" });
      }
      if (pending.orderToken && token !== pending.orderToken) {
        return res.status(200).json({ success: false, reason: "token_mismatch" });
      }

      // Best-effort server-side verification against CoinGate. When the
      // numeric id is present and the API is reachable, trust ONLY what it
      // says. Otherwise fall back to the (token-verified) webhook payload.
      let effectiveStatus = status;
      const numericId = Number(body.id);
      if (isConfigured() && !isNaN(numericId) && numericId > 0) {
        try {
          const remote = await getClient()!.order.getOrder(numericId);
          if (remote) {
            effectiveStatus = String(remote.status || status);
            console.log(`[Checkout] Verified order ${orderId} via CoinGate API: ${effectiveStatus}`);
          }
        } catch (error: any) {
          console.warn(
            `[Checkout] CoinGate API verification failed for ${orderId}: ${error?.message || error}. Falling back to webhook payload.`,
          );
        }
      }

      // "paid" is the ONLY status that activates Pro. "confirming" (crypto
      // pending) and "expired"/"invalid" never flip the plan.
      if (effectiveStatus === "paid") {
        const user = await storage.setUserPlan(pending.userId, "pro");
        if (user) {
          console.log(`[Checkout] Pro activated for user ${user.id} (order ${orderId})`);
          await storage.deletePendingOrder(orderId);
          return res.status(200).json({ success: true, activated: true });
        }
      }

      res.status(200).json({ success: true, received: effectiveStatus });
    }),
  );
}
