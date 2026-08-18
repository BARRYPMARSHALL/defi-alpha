import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps an async route handler so rejected promises flow to Express's error
 * middleware instead of becoming unhandled rejections. Express 4 does NOT
 * catch async throws — without this, a single Postgres blip can crash the
 * whole process (Node >= 15 exits on unhandled rejection).
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
