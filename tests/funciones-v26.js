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
  const login = (t, user, host) => ({ Timestamp: t, User: user, SourceIP: '10.1.1.21', Host: host, EventID: '4624', Action: 'Inicio de sesión', Status: 'Success', Process: '', LogonType: '2' });
  // Historial: 7 días normales de 6 inicios cada uno, siempre en WS-RH-02
  const hist = [];
  for (let d = 20; d <= 26; d++) for (const h of [9, 10, 11, 12, 13, 14]) hist.push(login(new Date(2026, 9, d, h, 15), 'mlopez', 'WS-RH-02'));
  w.generarDemo = () => hist;
  await w.loadDemo(); await wait(300);
  check('historial normal: no hay alertas de uso inusual', w.eval('FINDINGS').filter((f) => f.cat === 'Patrón de uso inusual').length === 0);
  // Archivo nuevo: un inicio en equipo nuevo a las 3 de la mañana, y uno normal
  const nuevo = [login(new Date(2026, 9, 27, 3, 10), 'mlopez', 'SRV-NUEVO'), login(new Date(2026, 9, 27, 10, 5), 'mlopez', 'WS-RH-02')];
  w.generarDemo = () => nuevo;
  await w.loadDemo(); await wait(300);
  const hallazgos = w.eval('FINDINGS').filter((f) => f.cat === 'Patrón de uso inusual');
  check('detecta equipo nuevo y hora inusual', hallazgos.length === 1 && hallazgos[0].sev === 'Alto', hallazgos.map((f) => f.title + ' [' + f.sev + ']').join(' | '));
  check('la descripción nombra el equipo nuevo', hallazgos.length === 1 && /SRV-NUEVO/.test(hallazgos[0].desc));
  // Analizar el mismo archivo otra vez: mismo resultado (sin duplicar)
  await w.loadDemo(); await wait(300);
  check('analizar de nuevo el mismo archivo no duplica el hallazgo', w.eval('FINDINGS').filter((f) => f.cat === 'Patrón de uso inusual').length === 1);
  // Un usuario con poco historial no genera alertas
  const poco = [login(new Date(2026, 9, 27, 3, 10), 'nuevo_usuario', 'SRV-NUEVO')];
  w.generarDemo = () => poco;
  await w.loadDemo(); await wait(300);
  check('usuario sin historial suficiente no genera alerta', w.eval('FINDINGS').filter((f) => f.cat === 'Patrón de uso inusual').length === 0);
  console.log(results.join('\n'));
  process.exit(0);
})().catch((e) => { console.log('EXCEPCIÓN: ' + e.message); console.log(results.join('\n')); process.exit(1); });
