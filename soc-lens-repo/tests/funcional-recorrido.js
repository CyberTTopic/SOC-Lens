const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const errors = []; const log=[];
const vc = new VirtualConsole();
vc.on('error', e => errors.push('console.error: ' + (e && e.message || e)));
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e && (e.message || e.stack) || e)));
const stubChart = function(){ this.destroy=()=>{}; this.toBase64Image=()=>'data:image/png;base64,AA=='; this.update=()=>{}; };
stubChart.getChart = () => null;
stubChart.defaults = {color:'',borderColor:'',font:{}, plugins:{}};
const dom = new JSDOM(html.replace(/<script src="(https:\/\/cdnjs|vendor\/)[^"]+"><\/script>/g,''), {
  url:'http://localhost/', runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:vc,
  beforeParse(win){
    win.XLSX={read:()=>({SheetNames:['S'],Sheets:{S:{}}}),utils:{sheet_to_json:()=>[]},SSF:{}};
    win.Chart=stubChart;
    const ctx=new Proxy({}, {get:(t,k)=>(k in t?t[k]:(typeof k==='string'&&k.startsWith('measure')?()=>({width:10}):()=>{}))});
    win.jspdf={jsPDF:function(){return new Proxy({}, {get:(t,k)=> k==='internal'? {pageSize:{getWidth:()=>210,getHeight:()=>297}} : k==='splitTextToSize'? (t)=>[String(t)] : k==='getNumberOfPages'? ()=>1 : (typeof k==='string' ? (()=>{}) : undefined)});}};
    win.alert=m=>errors.push('alert: '+m); win.confirm=()=>true; win.prompt=()=>null; win.scrollTo=()=>{};
    win.matchMedia=()=>({matches:false,addListener(){},addEventListener(){},removeListener(){},removeEventListener(){}});
    win.requestAnimationFrame=cb=>setTimeout(cb,0);
    win.HTMLCanvasElement.prototype.getContext=()=>ctx;
    win.HTMLCanvasElement.prototype.toDataURL=()=>'data:image/png;base64,AA==';
    win.URL.createObjectURL=()=>'blob:x'; win.URL.revokeObjectURL=()=>{};
    win.navigator.clipboard={writeText:async()=>{}};
    win.HTMLAnchorElement.prototype.click=function(){ log.push('download:'+this.download); };
  }
});
const w=dom.window, d=w.document;
const step=(name,fn)=>{ try{ fn(); log.push('OK '+name);}catch(e){ errors.push(name+': '+e.message+' @ '+(e.stack||'').split('\n')[1]); } };
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  await wait(300);
  step('demo', ()=>d.getElementById('btnDemo').click());
  await wait(400);
  for (const tab of ['dash','inc','grafo','explo','ent','mitre','ioc','triage','rep','ia','ajustes','inicio']){
    step('tab '+tab, ()=>w.showTab(tab));
    await wait(120);
  }
  step('renderReport', ()=>w.renderReport && w.renderReport());
  step('reportMarkdown', ()=>{ const r=w.reportMarkdown && w.reportMarkdown(); });
  step('mitre tactic click', ()=>{ const t=d.querySelector('[data-tac].click'); if(t) t.click(); });
  await wait(100);
  step('sandbox node click', ()=>{ const n=d.querySelector('#sbMap [data-node]'); if(n) n.dispatchEvent(new w.MouseEvent('click',{bubbles:true})); else log.push('sin nodos en sbMap'); });
  await wait(100);
  step('sandbox event click', ()=>{ const e=d.querySelector('#sbList [data-ev]'); if(e) e.dispatchEvent(new w.MouseEvent('click',{bubbles:true})); else log.push('sin eventos en sbList'); });
  await wait(100);
  step('sandbox edge click', ()=>{ const e=d.querySelector('#sbMap [data-edge]'); if(e) e.dispatchEvent(new w.MouseEvent('click',{bubbles:true})); else log.push('sin aristas'); });
  await wait(100);
  step('explorer row click', ()=>{ w.showTab('explo'); const r=d.querySelector('#expBody tr[data-id]'); if(r) r.click(); else log.push('sin filas explorador'); });
  await wait(100);
  step('openIncident', ()=>w.openIncident && w.openIncident('INC-01'));
  step('exportPdf', ()=>w.exportPdf && w.exportPdf());
  step('csv via download', ()=>{ const b=d.getElementById('csvHall')||d.querySelector('[id*=csv]'); if(b) b.click(); });
  await wait(200);
  console.log('PASOS:\n - '+log.join('\n - '));
  console.log('ERRORES ('+errors.length+'):'); [...new Set(errors)].slice(0,30).forEach(e=>console.log(' - '+e.slice(0,400)));
  process.exit(0);
})();
