const { spawn } = require("child_process");
const WebSocket = require("ws");
const PORT = 9335;

/** Pick a Chrome binary: QA_CHROME env → google-chrome → chromium. */
function chromeBinary() {
  const candidates = [process.env.QA_CHROME, "google-chrome", "chromium", "chromium-browser"].filter(Boolean);
  return candidates[0];
}

function launchChrome() {
  return spawn(chromeBinary(), ["--headless=new","--disable-gpu","--no-sandbox",`--remote-debugging-port=${PORT}`,"--window-size=1440,900","about:blank"], { stdio: "ignore" });
}
async function waitForPage() {
  for (let i=0;i<60;i++){ try{ const r=await fetch(`http://127.0.0.1:${PORT}/json`); if(r.ok){const t=await r.json(); const p=t.find(x=>x.type==="page"); if(p) return p.webSocketDebuggerUrl;}}catch{} await new Promise(r=>setTimeout(r,200)); }
  throw new Error("no page");
}
class CDP {
  constructor(u){this.ws=new WebSocket(u);this.id=0;this.pending=new Map();this.events=[];}
  async open(){ await new Promise((res,rej)=>{this.ws.on("open",res);this.ws.on("error",rej);}); this.ws.on("message",d=>{const m=JSON.parse(d.toString()); if(m.id&&this.pending.has(m.id)){const p=this.pending.get(m.id);this.pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}else if(m.method)this.events.push(m);}); }
  send(method,params={}){const id=++this.id;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}
  async eval(expr){const r=await this.send("Runtime.evaluate",{expression:expr,returnByValue:true,awaitPromise:true});return r.exceptionDetails?{error:r.exceptionDetails.text}:r.result.value;}
}
async function main(){
  const chrome=launchChrome(); const url=await waitForPage(); const cdp=new CDP(url); await cdp.open();
  await cdp.send("Page.enable"); await cdp.send("Runtime.enable");
  await cdp.send("Page.navigate",{url:process.env.QA_URL||"http://127.0.0.1:5000/"});
  await new Promise(r=>setTimeout(r,8000));
  const m = await cdp.eval(`(() => {
    const table = document.querySelector('table');
    const wrapper = table ? table.closest('div.overflow-hidden, div.overflow-x-auto') : null;
    const container = wrapper ? wrapper.parentElement : null;
    const main = document.querySelector('main');
    const headers = table ? [...table.querySelectorAll('th')].map(th => ({ text: th.innerText.trim(), w: th.getBoundingClientRect().width })) : [];
    return {
      tableWidth: table ? Math.round(table.getBoundingClientRect().width) : null,
      wrapperWidth: wrapper ? Math.round(wrapper.getBoundingClientRect().width) : null,
      containerWidth: container ? Math.round(container.getBoundingClientRect().width) : null,
      mainWidth: main ? Math.round(main.getBoundingClientRect().width) : null,
      viewport: window.innerWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      wrapperClass: wrapper ? wrapper.className : null,
      headers,
      totalHeaderWidth: headers.reduce((s,h)=>s+h.w,0),
    };
  })()`);
  console.log(JSON.stringify(m,null,2));
  cdp.ws.close(); chrome.kill();
}
main().catch(e=>{console.error("fail:",e.message);process.exit(1);});
