/**
 * Generates client/public/og-image.png (1200x630) with LIVE app data via
 * headless Chrome. Run: node script/gen-og.cjs [apiBase]
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = 9345;
const API = process.env.QA_URL || "http://127.0.0.1:5000";
const OUT = path.resolve(__dirname, "../client/public/og-image.png");

function chromeBinary(){const c=[process.env.QA_CHROME,"google-chrome","chromium","chromium-browser"].filter(Boolean);return c[0];}
function launch(){return spawn(chromeBinary(),["--headless=new","--disable-gpu","--no-sandbox",`--remote-debugging-port=${PORT}`,"--window-size=1200,630","about:blank"],{stdio:"ignore"});}
async function waitForPage(){for(let i=0;i<60;i++){try{const r=await fetch(`http://127.0.0.1:${PORT}/json`);if(r.ok){const t=await r.json();const p=t.find(x=>x.type==="page");if(p)return p.webSocketDebuggerUrl;}}catch{}await new Promise(r=>setTimeout(r,200));}throw new Error("no page");}
class CDP{constructor(u){this.ws=new WebSocket(u);this.id=0;this.pending=new Map();}async open(){await new Promise((res,rej)=>{this.ws.on("open",res);this.ws.on("error",rej);});this.ws.on("message",d=>{const m=JSON.parse(d.toString());if(m.id&&this.pending.has(m.id)){const p=this.pending.get(m.id);this.pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}});}send(method,params={}){const id=++this.id;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}}

(async()=>{
  // 1. Live data
  const res = await fetch(`${API}/api/pools?minTvl=0`);
  const data = await res.json();
  const pools = data.pools || [];
  const sorted = [...pools].filter((p) => (p.tvlUsd || 0) >= 5_000_000).sort((a,b)=>b.riskAdjustedScore-a.riskAdjustedScore);
  const top3 = sorted.slice(0,3);
  const totalPools = (data.stats && data.stats.totalPools) || pools.length;
  const chains = (data.chains && data.chains.length) || "100+";
  const fmt = n => n>=1e6 ? `$${(n/1e6).toFixed(1)}M` : n>=1e3 ? `$${(n/1e3).toFixed(0)}K` : `$${Math.round(n)}`;
  const apy = n => (n>=1000?n.toFixed(0):n.toFixed(1))+"%";

  const rows = top3.map((p,i)=>`
    <div style="display:flex;align-items:center;gap:14px;padding:10px 18px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);margin-bottom:10px;">
      <div style="width:26px;height:26px;border-radius:50%;background:${i===0?"#f59e0b":"rgba(16,185,129,0.2)"};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:${i===0?"#111":"#34d399"};flex-shrink:0;">${i+1}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:20px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.symbol||"—"}</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.55);">${p.project||""} · ${p.chain||""} · TVL ${fmt(p.tvlUsd)}</div>
      </div>
      <div style="font-size:24px;font-weight:700;color:#34d399;flex-shrink:0;">${apy(p.apy)}</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.45);width:64px;text-align:right;flex-shrink:0;">${p.stablecoin?"stable":"risk-adj."}</div>
    </div>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box;font-family:'Inter',-apple-system,'Segoe UI',Roboto,sans-serif;}
    body{width:1200px;height:630px;background:radial-gradient(1200px 630px at 85% -10%,rgba(16,185,129,0.28),transparent 55%),radial-gradient(900px 500px at -10% 110%,rgba(245,158,11,0.16),transparent 55%),#0a0f0d;overflow:hidden;}
    .wrap{padding:52px 64px;height:100%;display:flex;flex-direction:column;}
    .brand{display:flex;align-items:center;gap:12px;margin-bottom:8px;}
    .logo{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;color:#fff;}
    .name{font-size:24px;font-weight:700;color:#fff;letter-spacing:-0.02em;}
    .tag{font-size:14px;color:rgba(255,255,255,0.6);}
    h1{font-size:44px;font-weight:800;color:#fff;letter-spacing:-0.03em;line-height:1.1;margin:14px 0 6px;}
    .sub{font-size:18px;color:rgba(255,255,255,0.65);margin-bottom:22px;}
    .stats{display:flex;gap:34px;margin-bottom:26px;}
    .stat .v{font-size:30px;font-weight:800;color:#34d399;}
    .stat .l{font-size:12.5px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.06em;margin-top:2px;}
    .foot{margin-top:auto;display:flex;justify-content:space-between;align-items:center;font-size:13px;color:rgba(255,255,255,0.4);}
  </style></head><body><div class="wrap">
    <div class="brand"><div class="logo">Δ</div><div><div class="name">DeFi Alpha</div><div class="tag">risk-adjusted yield, ranked live</div></div></div>
    <h1>Find the safest high APYs<br/>across ${chains} chains</h1>
    <div class="sub">Live risk-adjusted scores · impermanent-loss aware · AI guidance · APY alerts</div>
    <div class="stats">
      <div class="stat"><div class="v">${totalPools.toLocaleString()}</div><div class="l">Pools tracked</div></div>
      <div class="stat"><div class="v">${chains}</div><div class="l">Chains</div></div>
      <div class="stat"><div class="v">${apy(sorted[0]?sorted[0].apy:0)}</div><div class="l">Top APY right now</div></div>
    </div>
    ${rows}
    <div class="foot"><span>defi-alpha-production.up.railway.app</span><span>free tool · Pro from $12/mo</span></div>
  </div></body></html>`;

  // 2. Render + screenshot
  const chrome=launch();const url=await waitForPage();const cdp=new CDP(url);await cdp.open();
  await cdp.send("Page.enable");await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride",{width:1200,height:630,deviceScaleFactor:2,mobile:false});
  await cdp.send("Page.navigate",{url:"data:text/html;charset=utf-8,"+encodeURIComponent(html)});
  await new Promise(r=>setTimeout(r,2500));
  const shot = await cdp.send("Page.captureScreenshot",{format:"png"});
  fs.writeFileSync(OUT, Buffer.from(shot.data,"base64"));
  console.log("WROTE", OUT, fs.statSync(OUT).size, "bytes,", "top:", top3.map(p=>p.symbol+" "+apy(p.apy)).join(" | "));
  chrome.kill();process.exit(0);
})().catch(e=>{console.error("ERR",e.message);process.exit(1);});
