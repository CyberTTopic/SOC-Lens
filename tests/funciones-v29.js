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
  const w = dom.window;
  await wait(300);
  await w.loadDemo(); await wait(300);
  const hoja = w.hojaDirectivosHtml();
  const svgs = (hoja.match(/<svg /g) || []).length;
  check('la hoja incluye dos gráficas en SVG', svgs === 2, 'gráficas: ' + svgs);
  check('la gráfica de criticidad tiene resumen accesible', /aria-label="Hallazgos por criticidad: Crítico \d+, Alto \d+, Medio \d+, Bajo \d+"/.test(hoja));
  check('la gráfica de eventos por día muestra fechas', /Eventos por día \(últimos 30 días\)/.test(hoja) && /aria-label="Eventos por día: \d{2}-\d{2} \d+/.test(hoja));
  const texto = hoja.replace(/<svg[\s\S]*?<\/svg>/g,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  check('la hoja sigue cabiendo en una página (≤ 450 palabras)', texto.split(' ').length <= 450, texto.split(' ').length + ' palabras');
  w.tplSet({ idioma: 'en' });
  const en = w.hojaDirectivosHtml();
  check('la hoja en inglés tiene gráficas en inglés', /Findings by severity/.test(en) && /Events per day \(last 30 days\)/.test(en) && /aria-label="Findings by severity: Critical/.test(en));
  // Sin datos: no debe romperse
  w.tplSet({ idioma: 'es' });
  w.eval('FINDINGS = []; TIMED = []');
  let vacia = '';
  try { vacia = w.hojaDirectivosHtml(); } catch (e) { vacia = 'ERROR ' + e.message; }
  check('sin datos la hoja se genera sin error', !/^ERROR/.test(vacia));
  console.log(results.join('\n'));
  process.exit(0);
})().catch((e) => { console.log('EXCEPCIÓN: ' + e.message); console.log(results.join('\n')); process.exit(1); });
