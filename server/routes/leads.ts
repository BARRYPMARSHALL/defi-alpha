import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { asyncHandler } from "../lib/async-handler";
import { requireAdmin } from "../lib/admin";
import { rateLimit } from "../lib/rate-limit";

/**
 * Email capture for the course funnel.
 * Free course = lead magnet; email list = the funnel to the free tool and Pro.
 * No auth required — anyone can subscribe. Duplicates are silently accepted
 * (idempotent) so double-submits never error. Rate-limited so the list can't
 * be poisoned by a script.
 */

const leadSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  source: z.string().max(60).default("course"),
});

export function registerLeadsRoutes(app: Express) {
  app.post(
    "/api/leads",
    rateLimit({ scope: "leads", windowMs: 60 * 60 * 1000, max: 5 }),
    asyncHandler(async (req, res) => {
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
    }),
  );

  // Public read-only: lead count for the landing page (no PII beyond count)
  app.get(
    "/api/leads/count",
    asyncHandler(async (_req, res) => {
      const leads = await storage.listLeads();
      res.json({ success: true, count: leads.length });
    }),
  );
}

// Digest preview — lets the owner see what subscribers will receive.
// (Sending is wired once an email provider key is configured.)
export function registerDigestRoutes(app: Express) {
  app.get(
    "/api/digest/preview",
    asyncHandler(async (_req, res) => {
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
    }),
  );
}

// Digest sending endpoint — owner-only; dry-runs without RESEND_API_KEY
export function registerEmailRoutes(app: Express) {
  app.get(
    "/api/digest/send",
    requireAdmin,
    asyncHandler(async (_req, res) => {
      try {
        const { sendDigestToAllLeads, isEmailConfigured } = await import("../lib/email");
        const result = await sendDigestToAllLeads();
        res.json({
          success: true,
          ...result,
          configured: isEmailConfigured(),
        });
      } catch (error) {
        console.error("Error sending digest:", error);
        res.status(500).json({ success: false, error: "Failed to send digest" });
      }
    }),
  );
}
