const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const errors = []; const results = [];
const vc = new VirtualConsole(); vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.message || e))); vc.on('error', e => errors.push('console.error: ' + e));
const stubChart = function(){ this.destroy=()=>{}; this.toBase64Image=()=>'data:image/png;base64,AA=='; this.update=()=>{}; }; stubChart.getChart=()=>null; stubChart.defaults={plugins:{},scales:{},color:'',borderColor:'',font:{}};
const ctx = new Proxy({}, {get:(t,k)=>(k in t?t[k]:()=>({width:10}))});
const dom = new JSDOM(html.replace(/<script src="(https:\/\/cdnjs|vendor\/)[^"]+"><\/script>/g,''), { url:'http://localhost/', runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:vc,
  beforeParse(win){
    win.XLSX={read:()=>({}),utils:{sheet_to_json:()=>[]},SSF:{}}; win.Chart=stubChart;
    win.jspdf={jsPDF:function(){return new Proxy({},{get:(t,k)=>k==='internal'?{pageSize:{getWidth:()=>210,getHeight:()=>297}}:k==='splitTextToSize'?(x)=>[String(x)]:k==='getNumberOfPages'?()=>1:(()=>{})})}};
    win.alert=()=>{}; win.confirm=()=>true; win.scrollTo=()=>{};
    win.matchMedia=()=>({matches:false,addListener(){},addEventListener(){},removeListener(){},removeEventListener(){}});
    win.requestAnimationFrame=cb=>setTimeout(cb,0); win.HTMLCanvasElement.prototype.getContext=()=>ctx; win.HTMLCanvasElement.prototype.toDataURL=()=>'data:image/png;base64,AA==';
    win.URL.createObjectURL=()=>'blob:x'; win.URL.revokeObjectURL=()=>{}; win.HTMLAnchorElement.prototype.click=function(){};
  }});
const w=dom.window,d=w.document; const wait=ms=>new Promise(r=>setTimeout(r,ms));
const check=(n,ok,x='')=>results.push((ok?'PASS ':'FAIL ')+n+(x?' — '+x:''));
const base = (rows) => { w.generarDemo = () => rows; };
(async()=>{
  await wait(300);
  // 1) Detecciones de auditoría
  const rows=[...w.generarDemo()];
  rows.push({Timestamp:new Date(2026,9,26,10,0),User:'CORP\\svc_backup',SourceIP:'10.1.1.5',Host:'SRV-FILE-02',EventID:'4624',Action:'Inicio de sesión',Status:'Success',Process:'',LogonType:'2'});
  rows.push({Timestamp:new Date(2026,9,26,11,0),User:'admin',SourceIP:'10.1.1.6',Host:'DC-01',EventID:'1102',Action:'El registro de auditoría fue borrado',Status:'Success',Process:'',LogonType:''});
  rows.push({Timestamp:new Date(2026,9,26,23,30),User:'helpdesk',SourceIP:'10.1.1.7',Host:'DC-01',EventID:'4724',Action:'Restablecimiento de contraseña',Status:'Success',Process:'',LogonType:''});
  base(rows); await w.loadDemo(); await wait(800);
  const cats=w.eval('[...new Set(FINDINGS.map(f=>f.cat))]');
  check('detecta borrado de auditoría (1102)', cats.includes('Borrado de auditoría'));
  check('detecta cuenta de servicio interactiva', cats.includes('Cuenta de servicio interactiva'));
  check('detecta cambio de contraseña fuera de horario', cats.includes('Cambio de contraseña fuera de horario'));
  // 2) Motivo obligatorio al cerrar (individual)
  w.showTab('triage'); await wait(250);
  const sel=d.querySelector('select[data-tkey]');
  const key=sel && sel.dataset.tkey;
  const prevState=(w.eval('TRI')[key]||{}).estado||'Nuevo';
  w.prompt=()=>'';
  if (sel){ sel.value='Cerrado'; sel.dispatchEvent(new w.Event('change',{bubbles:true})); }
  await wait(120);
  check('cierre sin motivo se rechaza', sel && sel.value===prevState && (w.eval('TRI')[key]||{}).estado!=='Cerrado', 'valor: '+(sel&&sel.value));
  w.prompt=()=>'Verificado con el usuario';
  if (sel){ sel.value='Cerrado'; sel.dispatchEvent(new w.Event('change',{bubbles:true})); }
  await wait(120);
  const t=w.eval('TRI')[key]||{};
  check('cierre con motivo queda guardado', t.estado==='Cerrado' && t.motivo==='Verificado con el usuario');
  // 3) Motivo en acción masiva
  const boxes=[...d.querySelectorAll('[data-check]')].slice(0,2);
  boxes.forEach(b=>{ b.checked=true; b.dispatchEvent(new w.Event('change',{bubbles:true})); });
  d.getElementById('triBulk').value='Falso positivo';
  w.prompt=()=>''; d.getElementById('triApply').click(); await wait(100);
  const k2=boxes[0]&&boxes[0].dataset.check;
  check('acción masiva sin motivo no cambia nada', k2 && (w.eval('TRI')[k2]||{}).estado!=='Falso positivo');
  w.prompt=()=>'Ruido conocido'; d.getElementById('triApply').click(); await wait(100);
  check('acción masiva con motivo aplica el cierre', k2 && (w.eval('TRI')[k2]||{}).estado==='Falso positivo' && (w.eval('TRI')[k2]||{}).motivo==='Ruido conocido');
  // 4) Período relativo y consultas guardadas
  const old=[]; for(let i=0;i<5;i++) old.push({Timestamp:new Date(2026,9,20,10,i),User:'antiguo',SourceIP:'10.9.9.9',Host:'WS-OLD',EventID:'4624',Action:'Inicio de sesión',Status:'Success',Process:'',LogonType:'2'});
  base([...w.generarDemo(), ...old]); await w.loadDemo(); await wait(700);
  w.showTab('explo'); await wait(200);
  const total=parseInt((d.getElementById('qCount').textContent.match(/\d+/)||[0])[0],10);
  const rel=d.getElementById('dRel'); rel.value='24'; rel.dispatchEvent(new w.Event('change',{bubbles:true})); await wait(150);
  const enDia=parseInt((d.getElementById('qCount').textContent.match(/\d+/)||[0])[0],10);
  check('período "últimas 24 horas" reduce resultados', enDia < total && enDia > 0, 'todo: '+total+' · 24h: '+enDia);
  rel.value=''; rel.dispatchEvent(new w.Event('change',{bubbles:true})); await wait(100);
  w.prompt=()=>'Mi búsqueda';
  d.getElementById('q').value='user:jperez'; d.getElementById('qSave').click(); await wait(80);
  check('consulta guardada aparece en la lista', w.eval('savedQ().length')===1 && d.getElementById('qSaved').options.length>=2);
  d.getElementById('q').value='';
  const qs=d.getElementById('qSaved'); qs.value='0'; qs.dispatchEvent(new w.Event('change',{bubbles:true})); await wait(100);
  check('consulta guardada se vuelve a aplicar', d.getElementById('q').value==='user:jperez');
  // 5) Línea base histórica entre análisis
  const hist=[]; for(let dia=0;dia<3;dia++) for(let k=0;k<2;k++) hist.push({Timestamp:new Date(2026,9,20+dia,10,k*5),User:'mlopez',SourceIP:'10.10.1.21',Host:'WS-RH-02',EventID:'4663',Action:'Acceso a objeto de archivo',Status:'Success',Process:'',LogonType:''});
  base(hist); await w.loadDemo(); await wait(500);
  const spike=[]; for(let k=0;k<45;k++) spike.push({Timestamp:new Date(2026,9,27,10,k),User:'mlopez',SourceIP:'10.10.1.21',Host:'WS-RH-02',EventID:'4663',Action:'Copia de archivo a USB',Status:'Success',Process:'',LogonType:''});
  base(spike); await w.loadDemo(); await wait(700);
  const ex=w.eval('FINDINGS').filter(f=>f.cat==='Posible exfiltración');
  check('línea base: detecta el pico usando el historial de otro archivo', ex.length>=1, ex.map(f=>f.title).join(' | '));
  check('línea base se guarda en el navegador', w.localStorage.getItem('soclens.v5.baseline')!==null || w.localStorage.getItem(Object.keys(w.localStorage).find(k=>/baseline$/.test(k)))!==null);
  console.log(results.join('\n'));
  console.log('ERRORES: '+(errors.length? errors.slice(0,6).join(' | ') : 'ninguno'));
  process.exit(0);
})().catch(e=>{ console.log('EXCEPCIÓN: '+e.message); console.log(results.join('\n')); process.exit(1); });
