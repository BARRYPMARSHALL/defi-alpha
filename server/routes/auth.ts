import type { Express, Request } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { hashPassword, verifyPassword, publicUser } from "../lib/auth";

const registerSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers and underscores"),
  password: z.string().min(8).max(128, "Password too long"),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

function publicSessionUser(req: Request) {
  if (!req.session.userId) return null;
  // storage lookup is async; callers await via helper below
  return req.session.userId;
}

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (req, res) => {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid registration",
        details: parseResult.error.errors,
      });
    }

    const { username, password } = parseResult.data;

    const existing = await storage.getUserByUsername(username);
    if (existing) {
      return res.status(409).json({ success: false, error: "Username already taken" });
    }

    const user = await storage.createUser({
      username,
      password: hashPassword(password),
    });

    req.session.userId = user.id;
    res.json({ success: true, user: publicUser(user) });
  });

  app.post("/api/auth/login", async (req, res) => {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: "Invalid login payload" });
    }

    const { username, password } = parseResult.data;
    const user = await storage.getUserByUsername(username);
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ success: false, error: "Invalid username or password" });
    }

    req.session.userId = user.id;
    res.json({ success: true, user: publicUser(user) });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ success: false, error: "Failed to log out" });
      }
      res.clearCookie("defi-alpha.sid");
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    const userId = publicSessionUser(req);
    if (!userId) {
      return res.json({ success: true, authenticated: false, user: null });
    }
    const user = await storage.getUser(userId);
    if (!user) {
      req.session.userId = undefined;
      return res.json({ success: true, authenticated: false, user: null });
    }
    res.json({ success: true, authenticated: true, user: publicUser(user) });
  });

  /** Admin/dev-only: flip a user's plan (checkout wiring comes later). */
  app.post("/api/auth/plan", async (req, res) => {
    const userId = publicSessionUser(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }
    const parseResult = z.object({ plan: z.enum(["free", "pro"]) }).safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: "Invalid plan" });
    }
    const user = await storage.setUserPlan(userId, parseResult.data.plan);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    res.json({ success: true, user: publicUser(user) });
  });
}
