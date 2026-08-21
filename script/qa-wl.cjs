const { spawn } = require("child_process");
const WebSocket = require("ws");
const PORT = 9348;
const URL = process.env.QA_URL || "http://127.0.0.1:5000/";
function chromeBinary(){const c=[process.env.QA_CHROME,"google-chrome","chromium","chromium-browser"].filter(Boolean);return c[0];}
console.error("launching with", chromeBinary());
const chrome = spawn(chromeBinary(),["--headless=new","--disable-gpu","--no-sandbox",`--remote-debugging-port=${PORT}`,"--window-size=1440,900","about:blank"],{stdio:"ignore"});
chrome.on("error", e => console.error("chrome spawn error:", e.message));
chrome.on("exit", c => console.error("chrome exited", c));
async function waitForPage(){for(let i=0;i<30;i++){try{const r=await fetch(`http://127.0.0.1:${PORT}/json`);if(r.ok){const t=await r.json();const p=t.find(x=>x.type==="page");if(p)return p.webSocketDebuggerUrl;}}catch(e){console.error("wait loop err", e.message);}await new Promise(r=>setTimeout(r,300));}throw new Error("no page");}
class CDP{constructor(u){this.ws=new WebSocket(u);this.id=0;this.pending=new Map();}async open(){await new Promise((res,rej)=>{this.ws.on("open",res);this.ws.on("error",rej);});this.ws.on("message",d=>{const m=JSON.parse(d.toString());if(m.id&&this.pending.has(m.id)){const p=this.pending.get(m.id);this.pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}});}send(method,params={}){const id=++this.id;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}async eval(expr){const r=await this.send("Runtime.evaluate",{expression:expr,returnByValue:true,awaitPromise:true});return r.exceptionDetails?{error:r.exceptionDetails.text}:r.result.value;}}
(async()=>{
  const url=await waitForPage();
  console.error("got page", url.slice(0,40));
  const cdp=new CDP(url);await cdp.open();
  console.error("cdp open");
  await cdp.send("Page.enable");await cdp.send("Runtime.enable");
  await cdp.send("Page.navigate",{url:URL});await new Promise(r=>setTimeout(r,10000));
  const stars=await cdp.eval(`(() => { const s=[...document.querySelectorAll('[data-testid^="button-star"]')]; s.slice(0,3).forEach(t=>t.click()); return {clicked:s.slice(0,3).length,total:s.length}; })()`);
  console.log("RAPID:", JSON.stringify(stars));
  await new Promise(r=>setTimeout(r,2500));
  const state=await cdp.eval(`(() => { const ls=JSON.parse(localStorage.getItem('defiAlphaWatchlist')||'[]'); const filled=[...document.querySelectorAll('[data-testid^="button-star"] svg.fill-yellow-400')].length; return {lsCount:ls.length, filled}; })()`);
  console.log("AFTER RAPID:", JSON.stringify(state));
  chrome.kill();process.exit(0);
})().catch(e=>{console.error("ERR",e.message);process.exit(1);});
