const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const vc = new VirtualConsole();
const stubChart = function(){ this.destroy=()=>{}; this.toBase64Image=()=>'data:image/png;base64,AA=='; this.update=()=>{}; }; stubChart.getChart=()=>null; stubChart.defaults={plugins:{},scales:{},color:'',borderColor:'',font:{}};
const ctx = new Proxy({}, {get:(t,k)=>(k in t?t[k]:()=>({width:10}))});
const dom = new JSDOM(html.replace(/<script src="(https:\/\/cdnjs|vendor\/)[^"]+"><\/script>/g,''), { url:'http://localhost/', runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:vc,
  beforeParse(win){ win.XLSX={read:()=>({}),utils:{sheet_to_json:()=>[]},SSF:{}}; win.Chart=stubChart; win.jspdf={jsPDF:function(){return new Proxy({},{get:(t,k)=>k==='internal'?{pageSize:{getWidth:()=>210,getHeight:()=>297}}:k==='splitTextToSize'?(x)=>[String(x)]:k==='getNumberOfPages'?()=>1:(()=>{})})}};
    win.alert=()=>{}; win.confirm=()=>true; win.scrollTo=()=>{}; win.matchMedia=()=>({matches:false,addListener(){},addEventListener(){},removeListener(){},removeEventListener(){}});
    win.requestAnimationFrame=cb=>setTimeout(cb,0); win.HTMLCanvasElement.prototype.getContext=()=>ctx; win.HTMLCanvasElement.prototype.toDataURL=()=>'data:image/png;base64,AA=='; win.URL.createObjectURL=()=>'blob:x'; win.URL.revokeObjectURL=()=>{}; win.HTMLAnchorElement.prototype.click=function(){}; } });
const w=dom.window,d=w.document; const wait=ms=>new Promise(r=>setTimeout(r,ms));
function name(el){
  if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
  if (el.getAttribute('aria-labelledby')) return 'labelledby';
  if (el.id && d.querySelector(`label[for="${el.id}"]`)) return 'label-for';
  if (el.closest('label')) return 'label-wrap';
  if (el.tagName==='BUTTON' && el.textContent.trim()) return el.textContent.trim();
  if (el.title) return el.title;
  return '';
}
(async()=>{
  await wait(300); await w.loadDemo(); await wait(600);
  for (const t of ['dash','inc','grafo','explo','ent','mitre','ioc','triage','rep','ia','ajustes','inicio']) { try{ w.showTab(t); }catch(e){} await wait(120); }
  const issues=[];
  d.querySelectorAll('input,select,textarea').forEach(el=>{ if(el.type==='hidden' || el.hidden || el.closest('[hidden]')) return; if(!name(el)) issues.push('campo sin nombre: '+(el.id||el.name||el.outerHTML.slice(0,80))); });
  d.querySelectorAll('button').forEach(b=>{ if(!b.textContent.trim() && !b.getAttribute('aria-label') && !b.title) issues.push('botón sin nombre: '+(b.id||b.className||b.outerHTML.slice(0,80))); });
  const toasts=d.getElementById('toasts'); if(!toasts) issues.push('no hay contenedor de avisos'); else if(!toasts.getAttribute('aria-live')) issues.push('avisos sin aria-live');
  const modal=d.getElementById('modal'); if(modal){ if(modal.getAttribute('role')!=='dialog') issues.push('modal sin role=dialog'); if(modal.getAttribute('aria-modal')!=='true') issues.push('modal sin aria-modal'); }
  if(!d.querySelector('a.skip, .skip')) issues.push('sin enlace para saltar al contenido');
  if(!d.documentElement.getAttribute('lang')) issues.push('html sin lang');
  const imgs=[...d.querySelectorAll('img')].filter(i=>!i.hasAttribute('alt')); if(imgs.length) issues.push(imgs.length+' imagen(es) sin alt');
  const uniqI=[...new Set(issues)];
  console.log('PROBLEMAS ('+uniqI.length+'):'); uniqI.slice(0,40).forEach(i=>console.log(' - '+i));
  console.log(uniqI.length ? 'ACCESIBILIDAD: FAIL' : 'ACCESIBILIDAD: PASS');
  process.exit(uniqI.length ? 1 : 0);
})();
