/**
 * Extended live-QA sweep: drives every major page + interaction on the real
 * site, capturing console errors, broken elements, and layout issues.
 */
const { spawn } = require("child_process");
const WebSocket = require("ws");

const BASE = process.env.QA_URL || "http://127.0.0.1:5000";
const PORT = 9334;

function launchChrome() {
  return spawn("google-chrome", [
    "--headless=new", "--disable-gpu", "--no-sandbox",
    `--remote-debugging-port=${PORT}`, "--window-size=1440,900", "about:blank",
  ], { stdio: "ignore" });
}

async function waitForPage() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      if (res.ok) {
        const t = await res.json();
        const page = t.find((x) => x.type === "page");
        if (page) return page.webSocketDebuggerUrl;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("no CDP page");
}

class CDP {
  constructor(url) { this.ws = new WebSocket(url); this.id = 0; this.pending = new Map(); this.events = []; }
  async open() {
    await new Promise((res, rej) => { this.ws.on("open", res); this.ws.on("error", rej); });
    this.ws.on("message", (d) => {
      const m = JSON.parse(d.toString());
      if (m.id && this.pending.has(m.id)) {
        const p = this.pending.get(m.id); this.pending.delete(m.id);
        m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
      } else if (m.method) this.events.push(m);
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async nav(url) {
    await this.send("Page.enable");
    await this.send("Runtime.enable");
    await this.send("Log.enable");
    await this.send("Page.navigate", { url });
    await new Promise((r) => setTimeout(r, 7000));
  }
  async eval(expr) {
    const r = await this.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    return r.exceptionDetails ? { error: r.exceptionDetails.text } : r.result.value;
  }
  async checkPage(path, checks) {
    await this.nav(BASE + path);
    await new Promise((r) => setTimeout(r, 2500));
    const out = { path, checks: {} };
    for (const [name, fn] of Object.entries(checks)) {
      out.checks[name] = await this.eval(fn);
    }
    const errs = this.events.filter((e) => e.method === "Runtime.exceptionThrown" || e.method === "Log.entryAdded")
      .map((e) => {
        const d = e.params?.exceptionDetails || e.params?.entry;
        const t = d?.text || d?.message || "";
        return t.slice(0, 150);
      }).filter(Boolean);
    out.consoleErrors = errs;
    this.events = [];
    return out;
  }
  close() { this.ws.close(); }
}

async function main() {
  const chrome = launchChrome();
  const url = await waitForPage();
  const cdp = new CDP(url);
  await cdp.open();
  const report = [];

  // Home
  report.push(await cdp.checkPage("/", {
    hasSearch: `!!document.querySelector('input[placeholder*="Search any pool"]')`,
    hasChips: `document.querySelectorAll('button').length > 5`,
    overflow: `document.documentElement.scrollWidth > document.documentElement.clientWidth`,
    tableRows: `document.querySelectorAll('[data-testid^="row-pool-"]').length`,
    alphaBrain: `!!document.body.innerText.match(/Alpha Brain/)`,
  }));

  // Watchlist
  report.push(await cdp.checkPage("/watchlist", {
    renders: `document.body.innerText.includes('Watchlist')`,
    overflow: `document.documentElement.scrollWidth > document.documentElement.clientWidth`,
  }));

  // More
  report.push(await cdp.checkPage("/more", {
    renders: `document.body.innerText.includes('More')`,
    hasSimulator: `document.body.innerText.includes('Portfolio Simulator')`,
  }));

  // Simulator
  report.push(await cdp.checkPage("/simulator", {
    renders: `document.body.innerText.includes('Portfolio Simulator')`,
    poolPicker: `!!document.querySelector('input[placeholder*="Search token"]')`,
    overflow: `document.documentElement.scrollWidth > document.documentElement.clientWidth`,
  }));

  // Learn
  report.push(await cdp.checkPage("/learn", {
    renders: `document.body.innerText.includes('Yield Farming Masterclass')`,
    emailCapture: `document.body.innerText.includes('weekly yield digest') || document.body.innerText.includes('digest')`,
  }));

  // Welcome/landing
  report.push(await cdp.checkPage("/welcome", {
    renders: `document.body.innerText.includes('safest high yields')`,
    hasCta: `!!document.querySelector('a[href="/"]')`,
  }));

  // Stablecoins
  report.push(await cdp.checkPage("/stablecoins", {
    renders: `document.body.innerText.includes('Stablecoin')`,
  }));

  // Portfolio
  report.push(await cdp.checkPage("/portfolio", {
    renders: `document.body.innerText.includes('Portfolio')`,
  }));

  // Mobile viewport spot-check (home)
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cdp.nav(BASE + "/");
  await new Promise((r) => setTimeout(r, 3000));
  const mobile = await cdp.eval(`({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    bottomNav: !!document.querySelector('nav[aria-label="Primary"]'),
    chipsVisible: document.body.innerText.includes('Stablecoins'),
  })`);
  report.push({ path: "/ (mobile 390px)", checks: mobile, consoleErrors: [] });

  console.log(JSON.stringify(report, null, 2));
  cdp.close();
  chrome.kill();
}

main().catch((e) => { console.error("sweep failed:", e.message); process.exit(1); });
