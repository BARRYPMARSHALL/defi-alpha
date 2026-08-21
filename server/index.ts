import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { randomBytes } from "crypto";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer, type Server } from "http";
import type { Express } from "express";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

/**
 * Builds the full express app (routes + middleware) WITHOUT listening.
 * Used by the real server boot AND by integration tests (supertest).
 */
export async function createApp(): Promise<{ app: Express; server: Server }> {
  const app = express();
  const httpServer = createServer(app);

  // Railway (and most PaaS) terminate TLS at a reverse proxy. Without this,
  // req.ip is the LB address for every request — which broke anonymous AI
  // usage caps (every anonymous visitor shared one 5-message budget).
  // Trust exactly one hop: the platform's edge proxy.
  app.set("trust proxy", 1);

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));

  // Basic security headers. Deliberately NO CSP: the app loads Google Fonts,
  // gtag, and CoinGate scripts — a restrictive CSP would break them and a
  // permissive one is worse than none.
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });

  // Session middleware — powers auth. Memory store is fine for single-instance
  // Session middleware — powers auth. In-memory store for local dev; when
  // DATABASE_URL is set (production/Railway) sessions persist in Postgres
  // via connect-pg-simple so logins survive restarts and redeploys.
  const sessionStore = process.env.DATABASE_URL
    ? new (await import("connect-pg-simple").then((m) => m.default(session)))({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
      })
    : undefined;

  // Session secret: in production, NEVER fall back to a hardcoded value
  // (it's public in the repo → anyone could forge session cookies). If
  // SESSION_SECRET is missing, generate a random one per boot: sessions
  // won't survive restarts (same as today) but can't be forged.
  const configuredSecret = process.env.SESSION_SECRET;
  const sessionSecret =
    configuredSecret ||
    (process.env.NODE_ENV === "production" ? randomBytes(32).toString("hex") : "dev-only-change-me");
  if (!configuredSecret && process.env.NODE_ENV === "production") {
    console.warn(
      "[SESSION] WARNING: SESSION_SECRET is not set in production. " +
        "Using a random per-boot secret — sessions will not survive restarts. " +
        "Add SESSION_SECRET to Railway env vars.",
    );
  }

  app.use(
    session({
      name: "defi-alpha.sid",
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        // Behind the Railway TLS proxy, always mark the cookie secure in prod
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    }),
  );

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        // Log method/status/duration only — never response bodies (they
        // contain chat messages, watchlists, emails).
        log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
      }
    });

    next();
  });

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    if (res.headersSent) {
      // Response already started — can't send again. Just log and move on.
      console.error("[Error] headers already sent:", err);
      return;
    }

    res.status(status).json({ message });
  });

  return { app, server: httpServer };
}

if (process.env.NODE_ENV !== "test") {
  (async () => {
    const { app, server } = await createApp();

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(server, app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    const port = parseInt(process.env.PORT || "5000", 10);
    server.listen(
      {
        port,
        host: "0.0.0.0",
        reusePort: true,
      },
      () => {
        log(`serving on port ${port}`);
      },
    );
  })();
}
