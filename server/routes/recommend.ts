import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { fetchPoolsData, getCachedData } from "../lib/defillama";
import { buildRecommendation, buildWebhookRecommendation } from "../lib/recommend";

const recommendQuerySchema = z.object({
  chains: z.string().optional().default("all"),
  minApy: z.string().optional().transform((val) => {
    const num = Number(val);
    return isNaN(num) ? 0 : Math.max(0, num);
  }),
  riskTolerance: z.enum(["low", "medium", "high"]).optional().default("medium"),
  userQuery: z.string().optional().default(""),
});

/**
 * Optional API-key gate for the agent endpoints. When API_KEY is configured
 * the caller MUST present it via x-api-key (401 otherwise). When it is not
 * configured the endpoints stay open (local dev / self-hosted default).
 * Previously the key was logged but never verified — a real auth hole.
 */
function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.API_KEY;
  if (!expected) return next(); // key not configured → open (dev mode)
  const provided = req.headers["x-api-key"];
  if (typeof provided !== "string" || provided.length === 0 || provided !== expected) {
    return res.status(401).json({ success: false, error: "Missing or invalid API key" });
  }
  next();
}

export function registerRecommendRoutes(app: Express) {
  app.get(
    "/api/recommend",
    requireApiKey,
    async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

      try {
        await fetchPoolsData();

        const cachedData = getCachedData();
        if (!cachedData) {
          return res.status(503).json({
            success: false,
            error: "Data not available. Please try again in a moment.",
          });
        }

        const parseResult = recommendQuerySchema.safeParse(req.query);

        if (!parseResult.success) {
          return res.status(400).json({
            success: false,
            error: "Invalid query parameters",
            details: parseResult.error.errors,
          });
        }

        const params = parseResult.data;
        const response = buildRecommendation(cachedData.pools, {
          chains: params.chains,
          minApy: params.minApy,
          riskTolerance: params.riskTolerance,
          userQuery: params.userQuery,
        });

        res.json(response);
      } catch (error) {
        console.error("Error in /api/recommend:", error);
        res.status(500).json({
          success: false,
          error: "Failed to fetch recommendations",
        });
      }
    },
  );

  app.options("/api/recommend", (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
    res.sendStatus(200);
  });

  app.post(
    "/webhook",
    requireApiKey,
    async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

      try {
        await fetchPoolsData();

        const cachedData = getCachedData();
        if (!cachedData) {
          return res.status(503).json({
            success: false,
            error: "Data not available. Please try again in a moment.",
          });
        }

        const { chains = "all", minApy = 0, riskTolerance = "medium", userQuery = "" } = req.body || {};

        const parseResult = recommendQuerySchema.safeParse({
          chains: String(chains),
          minApy: String(minApy),
          riskTolerance,
          userQuery,
        });

        if (!parseResult.success) {
          return res.status(400).json({
            success: false,
            error: "Invalid parameters",
            details: parseResult.error.errors,
          });
        }

        const params = parseResult.data;
        const response = buildWebhookRecommendation(cachedData.pools, {
          chains: params.chains,
          minApy: params.minApy,
          riskTolerance: params.riskTolerance,
          userQuery: params.userQuery,
        });

        console.log(`[Webhook] Request processed: ${response.alternatives.length + (response.topPick ? 1 : 0)} pools returned`);
        res.json(response);
      } catch (error) {
        console.error("Error in /webhook:", error);
        res.status(500).json({
          success: false,
          error: "Agent temporarily unavailable",
        });
      }
    },
  );

  app.options("/webhook", (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
    res.sendStatus(200);
  });
}
