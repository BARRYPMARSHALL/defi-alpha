import type { Express } from "express";
import { z } from "zod";
import { fetchPoolsData } from "../lib/defillama";
import { chat, isLlmConfigured } from "../lib/alphaBrain";
import { storage } from "../storage";

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.number().optional().nullable(),
});

export function registerChatRoutes(app: Express) {
  app.get("/api/chat/status", (_req, res) => {
    res.json({
      configured: isLlmConfigured(),
      mode: isLlmConfigured() ? "llm" : "local",
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

      res.json({
        success: true,
        conversationId: convId,
        mode,
        reply,
      });
    } catch (error) {
      console.error("Error in /api/chat:", error);
      res.status(500).json({ success: false, error: "Failed to process chat message" });
    }
  });
}
