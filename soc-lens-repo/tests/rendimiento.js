const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const N = parseInt(process.argv[3]||'50000', 10);
const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errors.push(String(e.message||e))); vc.on('error',e=>errors.push('console:'+e));
const stubChart=function(){this.destroy=()=>{};this.toBase64Image=()=>'data:image/png;base64,AA==';this.update=()=>{};}; stubChart.getChart=()=>null;
const ctx=new Proxy({}, {get:(t,k)=>(k in t?t[k]:()=>({width:10}))});
const dom=new JSDOM(html.replace(/<script src="(https:\/\/cdnjs|vendor\/)[^"]+"><\/script>/g,''),{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
 beforeParse(win){ win.XLSX={read:()=>({}),utils:{sheet_to_json:()=>[]},SSF:{}}; win.Chart=stubChart;
  win.jspdf={jsPDF:function(){return new Proxy({},{get:(t,k)=>k==='internal'?{pageSize:{getWidth:()=>210,getHeight:()=>297}}:k==='splitTextToSize'?(x)=>[String(x)]:k==='getNumberOfPages'?()=>1:(()=>{})})}};
  win.alert=m=>errors.push('alert:'+m); win.confirm=()=>true; win.prompt=()=>null; win.scrollTo=()=>{};
  win.matchMedia=()=>({matches:false,addListener(){},addEventListener(){},removeListener(){},removeEventListener(){}});
  win.requestAnimationFrame=cb=>setTimeout(cb,0); win.HTMLCanvasElement.prototype.getContext=()=>ctx; win.HTMLCanvasElement.prototype.toDataURL=()=>'data:image/png;base64,AA==';
  win.URL.createObjectURL=()=>'blob:x'; win.URL.revokeObjectURL=()=>{}; win.navigator.clipboard={writeText:async()=>{}}; win.HTMLAnchorElement.prototype.click=function(){};
 }});
const w=dom.window,d=w.document; const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  await wait(300);
  const base=w.generarDemo();
  const big=[]; const t0=Date.now();
  // Una ráfaga masiva desde una sola IP externa + tráfico normal
  const start=new Date(2026,9,26,1,0,0).getTime();
  for(let i=0;i<N;i++){
    const r={...base[i%base.length]};
    if(i%3!==0){ r.Timestamp=new Date(start+i*1000); r.User='jperez'; r.SourceIP='198.51.100.23'; r.Host='SRV-DC-0'+(i%7); r.EventID='4625'; r.Action='Fallo de inicio de sesión'; r.Status='Failure'; r.Process=''; r.LogonType='3'; }
    else { r.Timestamp=new Date(start+i*1000); r.User='u'+(i%400); r.SourceIP='10.10.'+(i%200)+'.'+(i%250); r.Host='WS-'+(i%90); }
    big.push(r);
  }
  w.generarDemo=()=>big;
  const tStart=Date.now();
  try{ await w.loadDemo(); }catch(e){ errors.push('loadDemo:'+e.message+' '+((e.stack||'').split('\n').slice(0,3).join(' | '))); }
  await wait(400);
  console.log('filas:',N,'| tiempo analizar (ms):', Date.now()-tStart, '| hallazgos en pantalla:', d.querySelectorAll('#incList .card, #incList .inc, [data-inc]').length);
  console.log('ORIGEN:', (d.getElementById('srcLabel')||{}).textContent, '| KPIs:', [...d.querySelectorAll('.kpi')].map(k=>k.textContent.replace(/\s+/g,' ').trim()).join(' || ').slice(0,400)); console.log('INCIDENTES:', w.INCIDENTS ? w.INCIDENTS.length : 'n/a', '| HALLAZGOS:', w.FINDINGS ? w.FINDINGS.length : 'n/a'); console.log('ERRORES:', [...new Set(errors)].slice(0,5));
  process.exit(0);
})();
