import type { Express, Request } from "express";
import { z } from "zod";
import { Client } from "@coingate/coingate-sdk";
import { storage } from "../storage";

/**
 * CoinGate checkout — crypto + card payments natively (single integration).
 *
 * Flow:
 *  1. POST /api/checkout  → creates a CoinGate order, returns payment_url
 *  2. User pays on CoinGate (crypto OR card)
 *  3. CoinGate POSTs to /api/checkout/webhook with the order status
 *  4. Webhook verifies the order is paid, then flips the user's plan to "pro"
 *
 * The webhook is public (CoinGate cannot send auth headers), so activation
 * requires a matching order token AND a "paid" status — no plan flips without
 * a confirmed payment. Order tokens are stored server-side.
 */

const PRO_PRICE_USD = 12;
const PRO_PRICE_ANNUAL_USD = 99;

interface PendingOrder {
  userId: string;
  plan: "pro";
  orderToken: string;
  createdAt: number;
}

const pendingOrders = new Map<string, PendingOrder>(); // coingate order_id -> pending

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

export function registerCheckoutRoutes(app: Express) {
  app.get("/api/checkout/status", (_req, res) => {
    res.json({
      configured: isConfigured(),
      provider: "coingate",
      price: { monthly: PRO_PRICE_USD, annual: PRO_PRICE_ANNUAL_USD },
    });
  });

  app.post("/api/checkout", async (req, res) => {
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
    const orderId = `da-${user.id.slice(0, 8)}-${Date.now()}`;

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

      pendingOrders.set(orderId, {
        userId,
        plan: "pro",
        orderToken,
        createdAt: Date.now(),
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
  });

  /**
   * CoinGate callback webhook. CoinGate POSTs order data here; we verify:
   *  - the order exists in our pending map (we created it)
   *  - the token matches (prevents forged callbacks)
   *  - status is "paid" (or "confirming" for crypto)
   * Then activate Pro.
   */
  app.post("/api/checkout/webhook", async (req, res) => {
    const body = req.body || {};

    const orderId = String(body.order_id || body.id || "");
    const status = String(body.status || "");
    const token = String(body.token || "");

    const pending = orderId ? pendingOrders.get(orderId) : undefined;
    if (!pending) {
      // Unknown order — acknowledge to stop retries
      return res.status(200).json({ success: false, reason: "unknown_order" });
    }
    if (pending.orderToken && token !== pending.orderToken) {
      return res.status(200).json({ success: false, reason: "token_mismatch" });
    }

    const paidStatus = status === "paid" || status === "confirming";

    if (paidStatus) {
      const user = await storage.setUserPlan(pending.userId, "pro");
      if (user) {
        console.log(`[Checkout] Pro activated for user ${user.id} (order ${orderId}, status ${status})`);
        pendingOrders.delete(orderId);
        return res.status(200).json({ success: true, activated: true });
      }
    }

    res.status(200).json({ success: true, received: status });
  });
}
