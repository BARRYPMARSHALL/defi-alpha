import type { Express, Request } from "express";
import { z } from "zod";
import { fetchPoolsData } from "../lib/defillama";
import { chat, isLlmConfigured } from "../lib/alphaBrain";
import { storage } from "../storage";
import { asyncHandler } from "../lib/async-handler";

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.number().optional().nullable(),
});

/**
 * Free-tier AI usage gate (per research: usage caps convert better than
 * feature freezes; 5 AI messages/day free is the documented sweet spot).
 *
 * Identity resolution (server-side only — no client-spoofable plan headers):
 *   1. authenticated session user (plan-aware)
 *   2. server-issued anonymous cookie token (httpOnly, cannot be forged)
 *   3. client IP (only used before a token can be issued)
 */
const FREE_DAILY_AI_LIMIT = Number(process.env.FREE_DAILY_AI_LIMIT || 5);

const dailyUsage = new Map<string, { date: string; count: number }>();

const ANON_COOKIE = "da-anon";
// Tokens we have issued to anonymous browsers. In-memory is fine: after a
// restart the cookie is simply invalidated and a fresh token is issued
// (usage resets — an acceptable cost for not forging identity).
const issuedAnonTokens = new Set<string>();

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

/** Issues (or returns) a server-validated anonymous token for this browser. */
function anonTokenFor(req: Request, res: any): string {
  const cookies = parseCookies(req.headers.cookie);
  const existing = cookies[ANON_COOKIE];
  if (existing && issuedAnonTokens.has(existing)) return existing;

  const token = crypto.randomUUID();
  issuedAnonTokens.add(token);
  res.cookie(ANON_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !!process.env.COOKIE_SECURE,
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
  });
  return token;
}

async function usageKey(req: Request, res: any): Promise<string> {
  const userId = req.session?.userId;
  if (userId) {
    const user = await storage.getUser(userId);
    if (user) return `user:${user.id}`;
  }
  // Anonymous: server-issued token (cannot be spoofed) or IP as fallback
  return `anon:${anonTokenFor(req, res)}`;
}

async function isProUser(req: Request): Promise<boolean> {
  // No header bypass: Pro status comes ONLY from the authenticated plan.
  const userId = req.session?.userId;
  if (!userId) return false;
  const user = await storage.getUser(userId);
  return user?.plan === "pro";
}

function getDailyCount(key: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const entry = dailyUsage.get(key);
  if (!entry || entry.date !== today) return 0;
  return entry.count;
}

function bumpUsage(key: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const entry = dailyUsage.get(key);
  if (!entry || entry.date !== today) {
    dailyUsage.set(key, { date: today, count: 1 });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

export function registerChatRoutes(app: Express) {
  app.get(
    "/api/chat/status",
    asyncHandler(async (req, res) => {
      const key = await usageKey(req, res);
      const isPro = await isProUser(req);
      const used = getDailyCount(key);
      res.json({
        configured: isLlmConfigured(),
        mode: isLlmConfigured() ? "llm" : "local",
        usage: { used, limit: FREE_DAILY_AI_LIMIT, isPro },
      });
    }),
  );

  app.get(
    "/api/chat/conversations",
    asyncHandler(async (req, res) => {
      const userId = req.session?.userId;
      if (!userId) {
        // Anonymous chats are never persisted to a visible history
        return res.json({ success: true, conversations: [] });
      }
      const conversations = await storage.listConversations(userId);
      res.json({ success: true, conversations });
    }),
  );

  app.get(
    "/api/chat/conversations/:id/messages",
    asyncHandler(async (req, res) => {
      const userId = req.session?.userId;
      const id = Number(req.params.id);
      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ success: false, error: "Conversation not found" });
      }
      // Ownership check: an owned conversation is readable only by its owner.
      // Null-owned conversations (anonymous chats) are never listed, so
      // reading one by id is harmless.
      if (conversation.userId !== null && conversation.userId !== (userId ?? null)) {
        return res.status(403).json({ success: false, error: "Forbidden" });
      }
      const messages = await storage.listMessages(id);
      res.json({ success: true, conversation, messages });
    }),
  );

  app.post(
    "/api/chat",
    asyncHandler(async (req, res) => {
      await fetchPoolsData();

      const parseResult = chatSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid chat payload",
          details: parseResult.error.errors,
        });
      }

      const { message, conversationId } = parseResult.data;
      const userId = req.session?.userId ?? null;

      // Free-tier gate: enforce the daily AI message cap for non-Pro users.
      // The slot is RESERVED synchronously (check + bump in the same tick) so
      // concurrent requests can't all pass the check before any bump.
      const key = await usageKey(req, res);
      const isPro = await isProUser(req);
      let newCount = -1;
      if (!isPro) {
        const used = getDailyCount(key);
        if (used >= FREE_DAILY_AI_LIMIT) {
          return res.status(429).json({
            success: false,
            error: `You've used your ${FREE_DAILY_AI_LIMIT} free AI messages today. Upgrade to Pro for unlimited Alpha Brain access.`,
            code: "ai_limit_reached",
            usage: { used, limit: FREE_DAILY_AI_LIMIT, isPro: false },
          });
        }
        newCount = bumpUsage(key);
      }

      // Persist the user message (create a conversation on first message)
      let convId = conversationId ?? null;
      if (!convId) {
        const title = message.length > 60 ? `${message.slice(0, 57)}...` : message;
        const conv = await storage.createConversation({ title }, userId);
        convId = conv.id;
      } else {
        const exists = await storage.getConversation(convId);
        if (!exists) {
          return res.status(404).json({ success: false, error: "Conversation not found" });
        }
        // Ownership: a user-owned conversation may only be continued by its
        // owner. Null-owned (anonymous) conversations may be continued by id.
        if (exists.userId !== null && exists.userId !== userId) {
          return res.status(403).json({ success: false, error: "Forbidden" });
        }
      }

      await storage.addMessage({ conversationId: convId, role: "user", content: message });

      const { mode, reply } = await chat(message, convId);

      await storage.addMessage({ conversationId: convId, role: "assistant", content: reply });

      // Slot already reserved above for free users (atomic check+bump)

      res.json({
        success: true,
        conversationId: convId,
        mode,
        reply,
        usage: { used: newCount, limit: FREE_DAILY_AI_LIMIT, isPro },
      });
    }),
  );
}
