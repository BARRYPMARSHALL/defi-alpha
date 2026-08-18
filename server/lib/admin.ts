import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Guards owner-only endpoints (twitter post/schedule, digest send, plan
 * management). Requires ADMIN_TOKEN env to be set AND the caller to present
 * it in the `x-admin-token` header. When ADMIN_TOKEN is not configured the
 * endpoints are effectively disabled (404) — safe-by-default so a missing
 * env var never opens a write endpoint.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    return res.status(404).json({ success: false, error: "Not found" });
  }
  const provided = req.headers["x-admin-token"];
  if (typeof provided !== "string" || provided.length === 0 || provided !== token) {
    return res.status(403).json({ success: false, error: "Forbidden" });
  }
  next();
}

export function isAdminRequest(req: Request): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const provided = req.headers["x-admin-token"];
  return typeof provided === "string" && provided.length > 0 && provided === token;
}

export type AdminHandler = RequestHandler;
