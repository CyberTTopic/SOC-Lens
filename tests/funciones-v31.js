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
  const blobs = []; 
  const dom = new JSDOM(html.replace(/<script src="(https:\/\/cdnjs|https:\/\/cdn\.jsdelivr|vendor\/)[^"]+"><\/script>/g,''), { url:'http://localhost/', runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:vc,
    beforeParse(win){ win.XLSX={read:()=>({}),utils:{sheet_to_json:()=>[]},SSF:{}}; win.Chart=stubChart; win.jspdf={jsPDF:function(){return new Proxy({},{get:()=>()=>{}})}}; win.alert=()=>{}; win.confirm=()=>true; win.scrollTo=()=>{}; win.matchMedia=()=>({matches:false,addListener(){},addEventListener(){},removeListener(){},removeEventListener(){}}); win.requestAnimationFrame=cb=>setTimeout(cb,0); win.HTMLCanvasElement.prototype.getContext=()=>ctx; win.HTMLCanvasElement.prototype.toDataURL=()=>'data:image/png;base64,AA=='; win.URL.createObjectURL=(b)=>{ blobs.push(b); return 'blob:'+blobs.length; }; win.URL.revokeObjectURL=()=>{}; win.HTMLAnchorElement.prototype.click=function(){}; win.Blob=class { constructor(p){ this.parts=p; } }; } });
  const w = dom.window, d = w.document;
  await wait(300);
  const demoGen = w.generarDemo;
  const login = (t, user, host) => ({ Timestamp: t, User: user, SourceIP: '10.1.1.21', Host: host, EventID: '4624', Action: 'Inicio de sesión', Status: 'Success', Process: '', LogonType: '2' });
  const patr = () => w.eval('FINDINGS').filter((f) => f.cat === 'Patrón de uso inusual');
  const cargar = async (rows) => { w.generarDemo = () => rows; await w.loadDemo(); await wait(250); };
  check('nuevos umbrales con valores por defecto', w.eval('CFG.perfilMinHoras') === 3 && w.eval('CFG.plazoCritico') === 4 && w.eval('CFG.perfilMinHorasHorario') === 12);
  check('los umbrales aparecen en Ajustes', /Horas de historial para la línea base/.test(d.body.innerHTML) && /Plazo para Crítico/.test(d.body.innerHTML));
  // 2 horas de historial: no alerta con el mínimo por defecto (3); sí alerta si el usuario lo baja a 2
  await cargar([login(new Date(2026,9,20,9,10),'lopez','WS-A'), login(new Date(2026,9,20,10,10),'lopez','WS-A')]);
  await cargar([login(new Date(2026,9,21,9,10),'lopez','WS-NUEVO')]);
  check('con el mínimo por defecto (3 h) no hay alerta', patr().filter(f=>/lopez/.test(f.title)).length === 0);
  w.eval("CFG = sanitizeCfg({ ...CFG, perfilMinHoras: 2, perfilMinInicios: 2 })");
  await cargar([login(new Date(2026,9,20,9,10),'lopez2','WS-A'), login(new Date(2026,9,20,10,10),'lopez2','WS-A')]);
  await cargar([login(new Date(2026,9,21,9,10),'lopez2','WS-NUEVO')]);
  check('al bajar el mínimo a 2 horas, la alerta aparece', patr().filter(f=>/lopez2/.test(f.title)).length === 1);
  w.eval("CFG = sanitizeCfg({ ...CFG, perfilMinHoras: 3, perfilMinInicios: 3 })");
  // Plazos configurables
  w.generarDemo = demoGen; await w.loadDemo(); await wait(250);
  const f0 = w.eval('FINDINGS').find((f) => f.sev === 'Crítico') || w.eval('FINDINGS')[0];
  w.eval(`TRI[${JSON.stringify(f0.key)}] = { ...(TRI[${JSON.stringify(f0.key)}]||{}), estado:'Nuevo', detectado: new Date(Date.now() - 2*3600000).toISOString() }`);
  w.eval("CFG = sanitizeCfg({ ...CFG, plazoCritico: 4 })");
  check('hay un hallazgo Crítico para probar los plazos', f0.sev === 'Crítico');
  check('plazo de 4 h: un crítico de 2 h aún está vigente', /Vence en/.test(w.eval(`plazoHtml(FINDINGS.find(f=>f.key===${JSON.stringify(f0.key)}), TRI[${JSON.stringify(f0.key)}])`)));
  w.eval("CFG = sanitizeCfg({ ...CFG, plazoCritico: 1 })");
  check('al bajar el plazo a 1 h, el mismo hallazgo aparece vencido', /Vencido/.test(w.eval(`plazoHtml(FINDINGS.find(f=>f.key===${JSON.stringify(f0.key)}), TRI[${JSON.stringify(f0.key)}])`)));
  w.eval("CFG = sanitizeCfg({ ...CFG, plazoCritico: 4 })");
  // Exportación: contiene configuración y reglas, no datos sensibles
  w.eval("ALLOW = { users: ['cuenta-privada'], ips: ['10.9.9.9'], hosts: [] }");
  w.eval("lsSet('rules', [{ name:'Mi regla', sev:'Alto', minCount:1, groupBy:'user', mode:'y', enabled:true, conds:[{field:'proc',op:'contiene',value:'x'}] }])");
  w.cfgExport();
  const blobArg = blobs[blobs.length-1];
  const txt = blobArg ? blobArg.parts.join('') : '';
  let data = {}; try { data = JSON.parse(txt); } catch (_) {}
  check('la exportación incluye configuración y reglas', data.formato === 'soc-lens-config' && data.cfg && data.cfg.perfilMinHoras === 3 && Array.isArray(data.reglas) && data.reglas[0].name === 'Mi regla');
  check('la exportación no incluye listas de cuentas ni IP privadas', !/cuenta-privada|10\.9\.9\.9/.test(txt));
  // Importación: válida aplica; inválida no cambia nada; valores fuera de rango se limitan
  await w.cfgImport({ text: async () => JSON.stringify({ formato:'soc-lens-config', cfg:{ perfilMinHoras: 7, plazoAlto: 48 }, reglas:[{ name:'Importada', sev:'Medio', conds:[{field:'user',op:'igual',value:'x'}] }] }) });
  await wait(100);
  check('importar aplica los umbrales del archivo', w.eval('CFG.perfilMinHoras') === 7 && w.eval('CFG.plazoAlto') === 48);
  check('importar aplica las reglas del archivo', w.eval('rulesGet().length') === 1 && w.eval('rulesGet()[0].name') === 'Importada');
  await w.cfgImport({ text: async () => 'esto no es json' });
  await w.cfgImport({ text: async () => JSON.stringify({ formato:'otro', cfg:{ perfilMinHoras: 9 } }) });
  check('un archivo inválido no cambia la configuración', w.eval('CFG.perfilMinHoras') === 7);
  await w.cfgImport({ text: async () => JSON.stringify({ formato:'soc-lens-config', cfg:{ perfilMinHoras: 99999 } }) });
  check('los valores fuera de rango se limitan al máximo permitido', w.eval('CFG.perfilMinHoras') === 500, w.eval('CFG.perfilMinHoras'));
  console.log(results.join('\n'));
  process.exit(0);
})().catch((e) => { console.log('EXCEPCIÓN: ' + e.message); console.log(results.join('\n')); process.exit(1); });
