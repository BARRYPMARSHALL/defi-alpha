import type { Express } from "express";
import { z } from "zod";
import { fetchPoolsData } from "../lib/defillama";
import { chat, isLlmConfigured } from "../lib/alphaBrain";
import { storage } from "../storage";

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.number().optional().nullable(),
});

/**
 * Free-tier AI usage gate (per research: usage caps convert better than
 * feature freezes; 5 AI messages/day free is the documented sweet spot).
 * No auth yet → keyed by client IP. Upgrade path: Pro users bypass via
 * a plan header once subscriptions land.
 */
const FREE_DAILY_AI_LIMIT = Number(process.env.FREE_DAILY_AI_LIMIT || 5);

const dailyUsage = new Map<string, { date: string; count: number }>();

function usageKey(req: any): string {
  return (
    req.headers["x-usage-token"] ||
    req.ip ||
    "unknown"
  );
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
  app.get("/api/chat/status", (req, res) => {
    const key = usageKey(req);
    const used = getDailyCount(key);
    res.json({
      configured: isLlmConfigured(),
      mode: isLlmConfigured() ? "llm" : "local",
      usage: { used, limit: FREE_DAILY_AI_LIMIT, isPro: false },
    });
  });

  app.get("/api/chat/conversations", async (_req, res) => {
    try {
      const conversations = await storage.listConversations();
      res.json({ success: true, conversations });
    } catch (error) {
      console.error("Error listing conversations:", error);
      res.status(500).json({ success: false, error: "Failed to list conversations" });
    }
  });

  app.get("/api/chat/conversations/:id/messages", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ success: false, error: "Conversation not found" });
      }
      const messages = await storage.listMessages(id);
      res.json({ success: true, conversation, messages });
    } catch (error) {
      console.error("Error listing messages:", error);
      res.status(500).json({ success: false, error: "Failed to list messages" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
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

      // Free-tier gate: enforce the daily AI message cap for non-Pro users
      const key = usageKey(req);
      const isPro = req.headers["x-plan"] === "pro";
      if (!isPro) {
        const used = getDailyCount(key);
        if (used >= FREE_DAILY_AI_LIMIT) {
          return res.status(429).json({
            success: false,
            error: `You've used your ${FREE_DAILY_AI_LIMIT} free AI messages today. Upgrade to Pro for unlimited Alpha Brain access.`,
            code: "ai_limit_reached",
            usage: { used, limit: FREE_DAILY_AI_LIMIT },
          });
        }
      }

      // Persist the user message (create a conversation on first message)
      let convId = conversationId ?? null;
      if (!convId) {
        const title = message.length > 60 ? `${message.slice(0, 57)}...` : message;
        const conv = await storage.createConversation({ title });
        convId = conv.id;
      } else {
        const exists = await storage.getConversation(convId);
        if (!exists) {
          return res.status(404).json({ success: false, error: "Conversation not found" });
        }
      }

      await storage.addMessage({ conversationId: convId, role: "user", content: message });

      const { mode, reply } = await chat(message, convId);

      await storage.addMessage({ conversationId: convId, role: "assistant", content: reply });

      const newCount = isPro ? -1 : bumpUsage(key);

      res.json({
        success: true,
        conversationId: convId,
        mode,
        reply,
        usage: { used: newCount, limit: FREE_DAILY_AI_LIMIT, isPro },
      });
    } catch (error) {
      console.error("Error in /api/chat:", error);
      res.status(500).json({ success: false, error: "Failed to process chat message" });
    }
  });
}
