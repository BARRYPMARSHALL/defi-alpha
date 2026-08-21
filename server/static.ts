import express, { type Express, type Request } from "express";
import fs from "fs";
import path from "path";

/**
 * Serves the built client. index.html is rewritten per-request so canonical /
 * Open Graph / Twitter URLs always match the domain the app is actually
 * served from (SITE_URL env, else the request host). Hardcoding a domain here
 * broke social previews whenever the app wasn't served from that exact host
 * (e.g. Railway's *.up.railway.app URL while the tags pointed at a parked
 * domain).
 */
export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  const indexHtmlPath = path.resolve(distPath, "index.html");
  const indexHtml = fs.readFileSync(indexHtmlPath, "utf8");

  const serveIndex = (req: Request, res: express.Response) => {
    const base = baseUrlFor(req);
    res.setHeader("Cache-Control", "no-cache"); // revalidate: picks up new builds + host changes
    res.type("html").send(indexHtml.replaceAll("https://defialpha.com", base));
  };

  // Root MUST be served before express.static, which would otherwise answer
  // "/" with the raw (un-rewritten) index.html.
  app.get("/", serveIndex);

  app.use(express.static(distPath, { etag: true, maxAge: "1h", immutable: false }));

  // fall through to index.html if the file doesn't exist
  app.use("*", serveIndex);
}

function baseUrlFor(req: Request): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, "");
  const host = req.get("host") || "defi-alpha-production.up.railway.app";
  return `https://${host}`;
}
