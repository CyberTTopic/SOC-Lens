const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const NS = (html.match(/const NS = '([^']+)'/)||[])[1] || 'soclens.v5.';
const errors = []; const results = []; const downloads = [];
const vc = new VirtualConsole(); vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.message || e))); vc.on('error', e => errors.push('console.error: ' + e));
const stubChart = function(){ this.destroy=()=>{}; this.toBase64Image=()=>'data:image/png;base64,AA=='; this.update=()=>{}; }; stubChart.getChart=()=>null; stubChart.defaults={plugins:{},scales:{},color:'',borderColor:'',font:{}};
const ctx = new Proxy({}, {get:(t,k)=>(k in t?t[k]:()=>({width:10}))});
const blobs = {};
const dom = new JSDOM(html.replace(/<script src="(https:\/\/cdnjs|vendor\/)[^"]+"><\/script>/g,''), { url:'http://localhost/', runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:vc,
  beforeParse(win){
    win.XLSX={read:()=>({}),utils:{sheet_to_json:()=>[]},SSF:{}}; win.Chart=stubChart;
    win.jspdf={jsPDF:function(){return new Proxy({},{get:(t,k)=>k==='internal'?{pageSize:{getWidth:()=>210,getHeight:()=>297}}:k==='splitTextToSize'?(x)=>[String(x)]:k==='getNumberOfPages'?()=>1:(()=>{})})}};
    win.alert=m=>errors.push('alert: '+m); win.confirm=()=>true; win.prompt=()=>null; win.scrollTo=()=>{};
    win.matchMedia=()=>({matches:false,addListener(){},addEventListener(){},removeListener(){},removeEventListener(){}});
    win.requestAnimationFrame=cb=>setTimeout(cb,0); win.HTMLCanvasElement.prototype.getContext=()=>ctx; win.HTMLCanvasElement.prototype.toDataURL=()=>'data:image/png;base64,AA==';
    win.Blob=class { constructor(parts,opts){ this.parts=parts; this.opts=opts; } };
    win.URL.createObjectURL=(b)=>{ const id='blob:'+Object.keys(blobs).length; blobs[id]=b; return id; }; win.URL.revokeObjectURL=()=>{};
    win.navigator.clipboard={writeText:async()=>{}};
    win.HTMLAnchorElement.prototype.click=function(){ downloads.push({name:this.download, href:this.href}); };
  }});
const w=dom.window,d=w.document; const wait=ms=>new Promise(r=>setTimeout(r,ms));
const check=(name,ok,extra='')=>results.push((ok?'PASS ':'FAIL ')+name+(extra?' — '+extra:''));
(async()=>{
  await wait(300);
  // Reglas y datos de prueba
  w.localStorage.setItem(NS+'rules', JSON.stringify([{name:'PowerShell de cualquier cuenta', sev:'Alto', minCount:2, groupBy:'user', enabled:true, conds:[{field:'proc',op:'contiene',value:'powershell'}]}]));
  const base=w.generarDemo();
  const rows=[...base];
  const start=new Date(2026,9,26,8,0,0).getTime();
  // Beaconing: 14 eventos con intervalo de 300 s desde un mismo origen y proceso
  for(let i=0;i<14;i++) rows.push({Timestamp:new Date(start+i*300000),User:'svc_mon',SourceIP:'10.10.9.9',Host:'SRV-MON-01',EventID:'4688',Action:'Creación de proceso',Status:'Success',Process:'beacon.exe',LogonType:''});
  // Exfiltración: 3 días normales (2 accesos/día) y un día con 45 accesos a archivos
  for(let dia=0;dia<3;dia++) for(let k=0;k<2;k++) rows.push({Timestamp:new Date(2026,9,20+dia,10,k*5),User:'mlopez',SourceIP:'10.10.1.21',Host:'WS-RH-02',EventID:'4663',Action:'Acceso a objeto de archivo',Status:'Success',Process:'',LogonType:''});
  for(let k=0;k<45;k++) rows.push({Timestamp:new Date(2026,9,24,10,k),User:'mlopez',SourceIP:'10.10.1.21',Host:'WS-RH-02',EventID:'4663',Action:'Copia de archivo a USB',Status:'Success',Process:'',LogonType:''});
  // PowerShell de dos cuentas (regla con mínimo 2 por usuario)
  rows.push({Timestamp:new Date(2026,9,26,9,0),User:'rgomez',SourceIP:'10.10.1.22',Host:'WS-TI-04',EventID:'4688',Action:'Creación de proceso',Status:'Success',Process:'powershell.exe -c dir',LogonType:''});
  rows.push({Timestamp:new Date(2026,9,26,9,5),User:'rgomez',SourceIP:'10.10.1.22',Host:'WS-TI-04',EventID:'4688',Action:'Creación de proceso',Status:'Success',Process:'powershell.exe -c whoami',LogonType:''});
  w.generarDemo=()=>rows;
  await w.loadDemo(); await wait(900);
  const F=w.eval('FINDINGS');
  const cats=[...new Set(F.map(f=>f.cat))];
  check('detecta actividad periódica', cats.includes('Comportamiento periódico'), cats.join(', '));
  check('detecta posible exfiltración con línea base', cats.includes('Posible exfiltración'));
  check('regla personalizada genera hallazgo', cats.includes('Regla personalizada'));
  check('regla exige mínimo 2 usuarios distintos', F.filter(f=>f.cat==='Regla personalizada').length===1);
  // Sigma y KQL
  const sig=w.eval('ruleToSigma({name:"PS",sev:"Alto",conds:[{field:"proc",op:"contiene",value:"powershell"}]})');
  check('exporta Sigma', sig.includes('|contains') && sig.includes('level: high'));
  const kql=w.eval('ruleToKql({name:"PS",sev:"Alto",minCount:2,groupBy:"user",conds:[{field:"proc",op:"contiene",value:"powershell"}]})');
  check('exporta KQL', kql.includes('CommandLine contains "powershell"') && kql.includes('where Eventos >= 2'));
  // Bitácora: cambio de estado en triage
  const before=w.eval('AUDIT.length');
  w.showTab('triage'); await wait(200);
  const sel=d.querySelector('[data-tkey] , select[data-tkey]') || d.querySelector('#triBody select');
  if (sel){ sel.value='Confirmado'; sel.dispatchEvent(new w.Event('change',{bubbles:true})); }
  await wait(100);
  check('bitácora registra cambio de estado', sel && w.eval('AUDIT.length')>before, 'antes '+before+' después '+w.eval('AUDIT.length'));
  // Caso: exportar, borrar triage, importar
  w.eval('TRI');
  w.caseExport(); await wait(100);
  const dl=downloads.find(x=>/caso_/.test(x.name));
  check('exporta caso .json', !!dl);
  const blob=dl && blobs[dl.href];
  const text = blob ? blob.parts.join('') : '';
  check('caso contiene triage y bitácora', text.includes('"triage"') && text.includes('"bitacora"'));
  w.eval('TRI = {}'); 
  const file=new w.File([text],'caso.json',{type:'application/json'});
  await w.caseImport(file); await wait(150);
  check('importa caso y restaura triage', Object.keys(w.eval('TRI')).length>0);
  // Caso de otro archivo: debe rechazarse sin error
  const bad=new w.File([JSON.stringify({formato:'soc-lens-caso',version:2,dsKey:'otro',triage:{}})],'x.json');
  await w.caseImport(bad); await wait(100);
  check('rechaza caso de otro archivo', errors.filter(e=>/error/i.test(e)).length===0);
  // Plantilla Word
  w.tplSet({entidad:'Institución de prueba', secciones:{resumen:true,incidentes:true,hallazgos:true,plan:true,ioc:true,recomendaciones:true}});
  const doc=w.buildWordHtml();
  check('genera Word con entidad', doc.includes('Institución de prueba') && doc.includes('Informe técnico de seguridad'));
  w.tplSet({secciones:{...w.tplGet().secciones, ioc:false}});
  check('secciones se pueden ocultar', !w.buildWordHtml().includes('Indicadores de compromiso'));
  w.exportWord(); await wait(80);
  check('descarga .doc', downloads.some(x=>/\.doc$/.test(x.name)));
  // Ajustes renderiza el panel
  w.showTab('ajustes'); await wait(150);
  check('panel de casos/reglas/plantilla visible', !!d.getElementById('xCaseExp') && !!d.getElementById('xtWord'));
  console.log(results.join('\n'));
  console.log('ERRORES: '+(errors.length? errors.slice(0,8).join(' | ') : 'ninguno'));
  process.exit(0);
})().catch(e=>{ console.log('EXCEPCIÓN: '+e.message); console.log(results.join('\n')); process.exit(1); });
