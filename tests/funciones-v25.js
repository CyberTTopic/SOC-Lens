const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const results = [];
const check = (n, ok, x = '') => results.push((ok ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : ''));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const vc = new VirtualConsole();
  const stubChart = function(){ this.destroy=()=>{}; this.toBase64Image=()=>'data:image/png;base64,AA=='; this.update=()=>{}; }; stubChart.getChart=()=>null; stubChart.defaults={plugins:{},scales:{},color:'',borderColor:'',font:{}};
  const ctx = new Proxy({}, {get:(t,k)=>(k in t?t[k]:()=>({width:10}))});
  const dom = new JSDOM(html.replace(/<script src="(https:\/\/cdnjs|https:\/\/cdn\.jsdelivr|vendor\/)[^"]+"><\/script>/g,''), { url:'http://localhost/', runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:vc,
    beforeParse(win){ win.XLSX={read:()=>({}),utils:{sheet_to_json:()=>[]},SSF:{}}; win.Chart=stubChart; win.jspdf={jsPDF:function(){return new Proxy({},{get:()=>()=>{}})}}; win.alert=()=>{}; win.confirm=()=>true; win.scrollTo=()=>{}; win.matchMedia=()=>({matches:false,addListener(){},addEventListener(){},removeListener(){},removeEventListener(){}}); win.requestAnimationFrame=cb=>setTimeout(cb,0); win.HTMLCanvasElement.prototype.getContext=()=>ctx; win.HTMLCanvasElement.prototype.toDataURL=()=>'data:image/png;base64,AA=='; win.URL.createObjectURL=()=>'blob:x'; win.URL.revokeObjectURL=()=>{}; win.HTMLAnchorElement.prototype.click=function(){}; } });
  const w = dom.window, d = w.document;
  await wait(300);
  await w.loadDemo(); await wait(300);
  const picos = w.eval('FINDINGS').find((f) => /Picos de actividad/.test(f.title));
  check('picos fuera de horario muestran fecha y hora legibles', !!picos && /\d{4}-\d{2}-\d{2} \d{2}:00 → \d+ eventos/.test(picos.desc), picos ? picos.desc.slice(0, 80) : 'sin hallazgo');
  // Archivo grande: la normalización avisa de su progreso y la pantalla recupera el control
  const base = w.generarDemo(); const rows = []; const start = new Date(2026,9,26).getTime();
  for (let i = 0; i < 100000; i++) { const r = {...base[i % base.length]}; r.Timestamp = new Date(start + i*2000); r.User = 'u'+(i%500); r.SourceIP = '10.'+(i%200)+'.1.'+(i%250); r.Host = 'WS-'+(i%90); rows.push(r); }
  w.generarDemo = () => rows;
  let last = Date.now(), worst = 0; const iv = setInterval(() => { const n = Date.now(); worst = Math.max(worst, n - last); last = n; }, 5);
  const seen = new Set(); const orig = w.setLoading;
  w.setLoading = function (t, m) { seen.add(String(m)); return orig.apply(this, arguments); };
  await w.loadDemo(); await wait(300);
  clearInterval(iv);
  check('la normalización muestra progreso por bloques', [...seen].some((m) => /de .* filas/.test(m)), `${seen.size} mensajes`);
  check('la pantalla no se bloquea más de 1,5 s (límite amplio para evitar falsos fallos)', worst < 1500, `máximo ${Math.round(worst)} ms`);
  check('el análisis de 100.000 filas termina con hallazgos', w.eval('FINDINGS.length') > 0 && w.eval('EVT.length') === 100000);
  console.log(results.join('\n'));
  process.exit(0);
})().catch((e) => { console.log('EXCEPCIÓN: ' + e.message); console.log(results.join('\n')); process.exit(1); });
