import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";

/**
 * Email capture for the course funnel.
 * Free course = lead magnet; email list = the funnel to the free tool and Pro.
 * No auth required — anyone can subscribe. Duplicates are silently accepted
 * (idempotent) so double-submits never error.
 */

const leadSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  source: z.string().max(60).default("course"),
});

export function registerLeadsRoutes(app: Express) {
  app.post("/api/leads", async (req, res) => {
    const parseResult = leadSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.errors[0]?.message || "Invalid email",
      });
    }

    const { email, source } = parseResult.data;
    const result = await storage.addLead(email, source);

    // Duplicate is a success (idempotent) — never reveal list membership
    res.status(201).json({
      success: true,
      subscribed: result !== "duplicate",
      message: "You're on the list! Check your inbox for the next yield digest.",
    });
  });

  // Admin-ish: lead count for the dashboard (no PII beyond count)
  app.get("/api/leads/count", async (_req, res) => {
    const leads = await storage.listLeads();
    res.json({ success: true, count: leads.length });
  });
}

// Digest preview — lets the owner see what subscribers will receive.
// (Sending is wired once an email provider key is configured.)
export function registerDigestRoutes(app: Express) {
  app.get("/api/digest/preview", async (_req, res) => {
    try {
      const { fetchPoolsData } = await import("../lib/defillama");
      const { buildDigestFromCache } = await import("../lib/digest");
      await fetchPoolsData();
      const digest = buildDigestFromCache();
      res.json({ success: true, subject: digest.subject, text: digest.text });
    } catch (error) {
      console.error("Error building digest:", error);
      res.status(500).json({ success: false, error: "Failed to build digest" });
    }
  });
}
