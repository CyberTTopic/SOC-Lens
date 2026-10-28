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
    beforeParse(win){ win.XLSX={read:()=>({}),utils:{sheet_to_json:()=>[]},SSF:{}}; win.Chart=stubChart; win.jspdf={jsPDF:function(){return new Proxy({},{get:()=>()=>{}})}}; win.alert=()=>{}; win.confirm=()=>true; win.scrollTo=()=>{}; win.matchMedia=()=>({matches:false,addListener(){},addEventListener(){},removeListener(){},removeEventListener(){}}); win.requestAnimationFrame=cb=>setTimeout(cb,0); win.HTMLCanvasElement.prototype.getContext=()=>ctx; win.HTMLCanvasElement.prototype.toDataURL=()=>'data:image/png;base64,AA=='; win.URL.createObjectURL=()=>'blob:x'; win.URL.revokeObjectURL=()=>{}; win.HTMLAnchorElement.prototype.click=function(){}; win.prompt=()=>'motivo de prueba'; } });
  const w = dom.window, d = w.document;
  await wait(300);
  await w.loadDemo(); await wait(300);
  const F = w.eval('FINDINGS');
  check('cada hallazgo recibe su hora de detección', F.length > 0 && F.every((f) => w.eval('TRI')[f.key] && w.eval('TRI')[f.key].detectado));
  // Un hallazgo Crítico con 5 horas abiertas (plazo 4 h) debe figurar vencido
  const crit = F.find((f) => f.sev === 'Crítico') || F[0];
  const medio = F.find((f) => f.sev === 'Medio' && f.key !== crit.key) || F[1];
  w.eval(`TRI[${JSON.stringify(crit.key)}] = { ...TRI[${JSON.stringify(crit.key)}], detectado: new Date(Date.now() - 5*3600000).toISOString(), estado:'Nuevo' }`);
  w.eval(`TRI[${JSON.stringify(medio.key)}] = { ...TRI[${JSON.stringify(medio.key)}], detectado: new Date(Date.now() - 86400000).toISOString(), estado:'Nuevo' }`);
  w.showTab('triage'); await wait(200);
  const celda = (k) => d.querySelector(`select[data-tkey="${CSS.escape ? k : k}"]`);
  const fila = (k) => d.querySelector(`select[data-tkey="${k}"]`).closest('tr');
  check('crítico vencido aparece como vencido', /Vencido/.test(fila(crit.key).textContent), fila(crit.key).textContent.replace(/\s+/g,' ').slice(0,120));
  check('medio con 1 día abierto aparece con plazo vigente', /Vence en/.test(fila(medio.key).textContent));
  // Cerrar con motivo: aparece "Cerrado en" y se guarda la hora de cierre
  const sel = d.querySelector(`select[data-tkey="${crit.key}"]`);
  sel.value = 'Cerrado'; sel.dispatchEvent(new w.Event('change', { bubbles: true })); await wait(120);
  check('al cerrar se registra la hora de cierre', !!w.eval('TRI')[crit.key].cerrado);
  check('cerrado muestra el tiempo de cierre', /Cerrado en/.test(fila(crit.key).textContent));
  // Reabrir: se borra la hora de cierre
  sel.value = 'Nuevo'; sel.dispatchEvent(new w.Event('change', { bubbles: true })); await wait(120);
  check('reabrir borra la hora de cierre', !w.eval('TRI')[crit.key].cerrado);
  // Responsable: se registra y se marca la asignación; vaciarlo la quita
  const resp = d.querySelector(`input[data-resp="${medio.key}"]`);
  resp.value = 'Ana Pérez'; resp.dispatchEvent(new w.Event('change', { bubbles: true })); await wait(120);
  check('responsable queda registrado con fecha de asignación', w.eval('TRI')[medio.key].responsable === 'Ana Pérez' && !!w.eval('TRI')[medio.key].asignado);
  const resp2 = d.querySelector(`input[data-resp="${medio.key}"]`);
  resp2.value = ''; resp2.dispatchEvent(new w.Event('change', { bubbles: true })); await wait(120);
  check('vaciar el responsable quita la fecha de asignación', !w.eval('TRI')[medio.key].asignado);
  // Informe con tiempos de respuesta
  const doc = w.buildWordHtml();
  check('el informe incluye la tabla de tiempos de respuesta', /Tiempos de respuesta/.test(doc) && /Tiempo promedio de cierre/.test(doc));
  w.tplSet({ idioma: 'en' });
  check('el informe en inglés también incluye tiempos de respuesta', /Response times/.test(w.buildWordHtml()) && /Average time to close/.test(w.buildWordHtml()));
  console.log(results.join('\n'));
  process.exit(0);
})().catch((e) => { console.log('EXCEPCIÓN: ' + e.message); console.log(results.join('\n')); process.exit(1); });
