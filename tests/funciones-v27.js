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
  const patr = () => w.eval('FINDINGS').filter((f) => f.cat === 'Patrón de uso inusual');
  const cargar = async (rows) => { w.generarDemo = () => rows; await w.loadDemo(); await wait(250); };
  // A) Archivo corto: 3 horas de historial y luego un equipo nuevo en un archivo de una hora
  await cargar([login(new Date(2026,9,27,9,10),'mlopez','WS-RH-02'), login(new Date(2026,9,27,10,10),'mlopez','WS-RH-02'), login(new Date(2026,9,27,11,10),'mlopez','WS-RH-02')]);
  await cargar([login(new Date(2026,9,28,14,5),'mlopez','SRV-NUEVO')]);
  check('archivo corto: 3 horas de historial bastan para detectar equipo nuevo', patr().length === 1 && patr()[0].sev === 'Medio', patr().map(f=>f.title+' ['+f.sev+']').join(' | '));
  // B) Solo 2 horas de historial: no alerta
  await cargar([login(new Date(2026,9,20,9,10),'lopez2','WS-A'), login(new Date(2026,9,20,10,10),'lopez2','WS-A')]);
  await cargar([login(new Date(2026,9,21,9,10),'lopez2','WS-NUEVO')]);
  check('2 horas de historial no generan alerta', patr().filter(f=>/lopez2/.test(f.title)).length === 0);
  // C) Hora inusual con historial corto no alerta (exige 12 horas)
  await cargar([login(new Date(2026,9,20,9,10),'corto','WS-A'), login(new Date(2026,9,20,10,10),'corto','WS-A'), login(new Date(2026,9,20,11,10),'corto','WS-A')]);
  await cargar([login(new Date(2026,9,21,3,10),'corto','WS-A')]);
  check('hora inusual con historial corto no alerta', patr().filter(f=>/corto/.test(f.title)).length === 0);
  // D) Historial amplio + equipo nuevo a hora inusual: Alto
  const amplio=[]; for (let d=20; d<=26; d++) for (const h of [9,10,11,12,13,14]) amplio.push(login(new Date(2026,9,d,h,15),'amplio','WS-RH-02'));
  await cargar(amplio);
  await cargar([login(new Date(2026,9,27,3,10),'amplio','SRV-NUEVO')]);
  check('historial amplio + equipo nuevo a hora inusual: Alto', patr().filter(f=>/amplio/.test(f.title)).length === 1 && patr().find(f=>/amplio/.test(f.title)).sev === 'Alto');
  // E) Repetir el mismo archivo no duplica
  await cargar([login(new Date(2026,9,27,3,10),'amplio','SRV-NUEVO')]);
  check('repetir el mismo archivo no duplica el hallazgo', patr().filter(f=>/amplio/.test(f.title)).length === 1);
  console.log(results.join('\n'));
  process.exit(0);
})().catch((e) => { console.log('EXCEPCIÓN: ' + e.message); console.log(results.join('\n')); process.exit(1); });
