import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Minimal in-memory rate limiter (no external deps, single-instance).
 * Guards brute-forceable endpoints (login/register) and email-list
 * poisoning. Not a replacement for a Redis-backed limiter at scale —
 * acceptable for this deployment (single Railway instance).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function keyFor(req: Request, scope: string): string {
  return `${scope}:${req.ip || req.socket?.remoteAddress || "unknown"}`;
}

export function rateLimit(opts: {
  scope: string;
  windowMs: number;
  max: number;
}): RequestHandler {
  const { scope, windowMs, max } = opts;
  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyFor(req, scope);
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({
        success: false,
        error: "Too many attempts — please try again shortly.",
      });
    }
    return next();
  };
}

/** Opportunistic cleanup so the map never grows unbounded. */
export function sweepRateLimitBuckets() {
  const now = Date.now();
  buckets.forEach((bucket, key) => {
    if (now >= bucket.resetAt) buckets.delete(key);
  });
}
