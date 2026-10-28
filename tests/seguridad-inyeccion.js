const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const P = "<img src=x onerror=\"window.__pwn=(window.__pwn||0)+1\">";
const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errors.push(String(e.message||e)));
const stubChart=function(){this.destroy=()=>{};this.toBase64Image=()=>'data:image/png;base64,AA==';this.update=()=>{};}; stubChart.getChart=()=>null;
const ctx=new Proxy({}, {get:(t,k)=>(k in t?t[k]:()=>({width:10}))});
const dom=new JSDOM(html.replace(/<script src="(https:\/\/cdnjs|vendor\/)[^"]+"><\/script>/g,''),{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
 beforeParse(win){ win.XLSX={read:()=>({}),utils:{sheet_to_json:()=>[]},SSF:{}}; win.Chart=stubChart;
  win.jspdf={jsPDF:function(){return new Proxy({},{get:(t,k)=>k==='internal'?{pageSize:{getWidth:()=>210,getHeight:()=>297}}:k==='splitTextToSize'?(x)=>[String(x)]:k==='getNumberOfPages'?()=>1:(()=>{})})}};
  win.alert=()=>{}; win.confirm=()=>true; win.prompt=()=>null; win.scrollTo=()=>{};
  win.matchMedia=()=>({matches:false,addListener(){},addEventListener(){},removeListener(){},removeEventListener(){}});
  win.requestAnimationFrame=cb=>setTimeout(cb,0); win.HTMLCanvasElement.prototype.getContext=()=>ctx; win.HTMLCanvasElement.prototype.toDataURL=()=>'data:image/png;base64,AA==';
  win.URL.createObjectURL=()=>'blob:x'; win.URL.revokeObjectURL=()=>{}; win.navigator.clipboard={writeText:async()=>{}}; win.HTMLAnchorElement.prototype.click=function(){};
 }});
const w=dom.window,d=w.document; const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  await wait(300);
  const base=w.generarDemo();
  const evil=base.map((r,i)=>{ const x={...r}; if(i%5===0){ x.User=P; x.Host=P; x.Process=P; x.Action=P; x.SourceIP=P; } return x; });
  w.generarDemo=()=>evil;
  d.getElementById('btnDemo').click(); await wait(400);
  for (const t of ['dash','inc','grafo','explo','ent','mitre','ioc','triage','rep','ia','ajustes']){ try{w.showTab(t);}catch(e){} await wait(100); }
  try{ w.showTab('inc'); const f=d.querySelector('[data-inc]'); if(f) f.click(); await wait(150); }catch(e){}
  try{ w.showTab('mitre'); const t=d.querySelector('[data-tac].click'); if(t) t.click(); await wait(100); const n=d.querySelector('#sbMap [data-node]'); if(n) n.dispatchEvent(new w.MouseEvent('click',{bubbles:true})); await wait(100); const ev=d.querySelector('#sbList [data-ev]'); if(ev) ev.dispatchEvent(new w.MouseEvent('click',{bubbles:true})); await wait(100);}catch(e){}
  try{ w.showTab('explo'); const r=d.querySelector('#expBody tr[data-id]'); if(r) r.click(); await wait(150);}catch(e){}
  try{ w.showTab('rep'); await wait(150);}catch(e){}
  console.log('PAYLOAD EJECUTADO VECES:', w.__pwn||0);
  const bodyHtml=d.body.innerHTML; const bad=[...d.querySelectorAll('img[onerror]')]; console.log('elementos <img onerror> reales creados desde los datos:', bad.length); console.log('ejemplo:', bad[0] ? bad[0].outerHTML.slice(0,160) : 'ninguno');
  const hits=[]; const walk=(n)=>{ if(n.nodeType===3 && n.textContent.includes('onerror')) hits.push({type:'text',parent:n.parentElement&&n.parentElement.tagName, sample:n.textContent.slice(0,80)}); if(n.nodeType===1){ for(const a of n.attributes){ if(a.value.includes('onerror')) hits.push({type:'attr',el:n.tagName,name:a.name,sample:a.value.slice(0,80)}); } } for(const c of n.childNodes) walk(c); };
  walk(d.body);
  console.log('lugares donde aparece el payload:', hits.length);
  hits.slice(0,6).forEach(h=>console.log(' ', JSON.stringify(h)));
  process.exit(0);
})();
