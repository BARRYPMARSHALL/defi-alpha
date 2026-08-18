/**
 * Live-click QA driver — drives the REAL site via Chrome DevTools Protocol.
 * Launches headless Chrome, connects over CDP, clicks/typing/reads the DOM,
 * and reports console errors + observed behavior. No browser automation lib
 * needed — raw CDP over the ws package.
 */
const { spawn } = require("child_process");
const WebSocket = require("ws");

const URL = process.env.QA_URL || "http://127.0.0.1:5000/";
const PORT = 9333;

function launchChrome() {
  const chrome = spawn("google-chrome", [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    `--remote-debugging-port=${PORT}`,
    "--window-size=1440,900",
    "about:blank",
  ], { stdio: "ignore" });
  return chrome;
}

async function waitForEndpoint() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      if (res.ok) {
        const targets = await res.json();
        // Use the first page target (or create one)
        const page = targets.find((t) => t.type === "page");
        if (page) return page.webSocketDebuggerUrl;
      }
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("Chrome CDP did not start");
}

class CDP {
  constructor(url) { this.ws = new WebSocket(url); this.id = 0; this.pending = new Map(); this.events = []; }
  async open() {
    await new Promise((res, rej) => { this.ws.on("open", res); this.ws.on("error", rej); });
    this.ws.on("message", (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async navigate(url) {
    await this.send("Page.enable");
    await this.send("Runtime.enable");
    await this.send("Page.navigate", { url });
    await new Promise((r) => setTimeout(r, 6000)); // let SPA render + fetch
  }
  async eval(expr) {
    const res = await this.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) return { error: res.exceptionDetails.text };
    return res.result.value;
  }
  async clickText(text) {
    // Find an element whose textContent matches and click it
    return this.eval(`(() => {
      const els = [...document.querySelectorAll('button, a, [role="button"]')];
      const el = els.find(e => e.textContent.trim().startsWith(${JSON.stringify(text)}));
      if (!el) return { ok: false, reason: 'not found: ' + ${JSON.stringify(text)} };
      el.click();
      return { ok: true, text: el.textContent.trim().slice(0, 40) };
    })()`);
  }
  async typeSearch(text) {
    return this.eval(`(() => {
      const input = document.querySelector('input[placeholder*="Search any pool"]');
      if (!input) return { ok: false, reason: 'search input not found' };
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, ${JSON.stringify(text)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true, value: input.value };
    })()`);
  }
  async bodyText() { return this.eval(`document.body.innerText.slice(0, 3000)`); }
  async consoleErrors() {
    const errs = this.events.filter((e) => e.method === "Runtime.exceptionThrown" || e.method === "Log.entryAdded");
    return errs.map((e) => {
      const d = e.params?.exceptionDetails || e.params?.entry;
      return d?.text || d?.message || JSON.stringify(e.params).slice(0, 120);
    });
  }
  close() { this.ws.close(); }
}

async function main() {
  const chrome = launchChrome();
  const wsUrl = await waitForEndpoint();
  const cdp = new CDP(wsUrl);
  await cdp.open();

  const report = { url: URL, steps: [], errors: [] };

  await cdp.navigate(URL);
  await new Promise((r) => setTimeout(r, 3000));

  // 1. Home loads?
  const homeText = await cdp.bodyText();
  report.steps.push({ step: "home-load", hasSearch: homeText.includes("Search any pool"), hasTable: homeText.includes("TVL") });

  // 2. Click "Stablecoins" chip
  const chip = await cdp.clickText("Stablecoins");
  await new Promise((r) => setTimeout(r, 1500));
  const afterChip = await cdp.bodyText();
  report.steps.push({ step: "chip-stablecoins", clicked: chip, resultHasStable: afterChip.toLowerCase().includes("stable") });

  // 3. Click "All" — should clear filters
  const allChip = await cdp.clickText("All");
  await new Promise((r) => setTimeout(r, 1500));
  const afterAll = await cdp.bodyText();
  report.steps.push({ step: "chip-all-reset", clicked: allChip });

  // 4. Type in search
  const typed = await cdp.typeSearch("usdc");
  await new Promise((r) => setTimeout(r, 2000));
  const afterSearch = await cdp.bodyText();
  report.steps.push({ step: "search-typed", typed, resultHasUsdc: afterSearch.toLowerCase().includes("usdc") });

  // 5. Mobile preview button present on desktop?
  const mobileBtn = await cdp.eval(`!!document.querySelector('[data-testid="button-mobile-preview"]')`);
  report.steps.push({ step: "mobile-preview-btn", present: mobileBtn });

  // 6. Horizontal overflow check
  const overflow = await cdp.eval(`document.documentElement.scrollWidth > document.documentElement.clientWidth`);
  report.steps.push({ step: "page-horizontal-overflow", overflow });

  report.errors = await cdp.consoleErrors();

  console.log(JSON.stringify(report, null, 2));
  cdp.close();
  chrome.kill();
}

main().catch((e) => { console.error("QA driver failed:", e.message); process.exit(1); });
