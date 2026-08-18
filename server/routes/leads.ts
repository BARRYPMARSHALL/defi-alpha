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
