const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const NS = (html.match(/const NS = '([^']+)'/) || [])[1] || 'soclens.v5.';
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
(async()=>{
  await wait(300);
  // Regla con "o": PowerShell O certutil, sin mínimo
  w.localStorage.setItem(NS+'rules', JSON.stringify([{name:'PS o certutil', sev:'Alto', minCount:1, groupBy:'user', mode:'o', enabled:true, conds:[{field:'proc',op:'contiene',value:'powershell'},{field:'proc',op:'contiene',value:'certutil'}]}]));
  const base=w.generarDemo(); const rows=[...base];
  rows.push({Timestamp:new Date(2026,9,26,9,0),User:'a',SourceIP:'10.1.1.1',Host:'WS-1',EventID:'4688',Action:'Creación de proceso',Status:'Success',Process:'powershell.exe -c x',LogonType:''});
  rows.push({Timestamp:new Date(2026,9,26,9,1),User:'b',SourceIP:'10.1.1.2',Host:'WS-2',EventID:'4688',Action:'Creación de proceso',Status:'Success',Process:'certutil -urlcache',LogonType:''});
  rows.push({Timestamp:new Date(2026,9,26,9,2),User:'c',SourceIP:'10.1.1.3',Host:'WS-3',EventID:'4688',Action:'Creación de proceso',Status:'Success',Process:'notepad.exe',LogonType:''});
  w.generarDemo=()=>rows; await w.loadDemo(); await wait(800);
  const F=w.eval('FINDINGS').filter(f=>f.cat==='Regla personalizada');
  const esperado=rows.filter(r=>/powershell|certutil/i.test(String(r.Process||'')+' '+String(r.Action||''))).length;
  check('regla O coincide con cualquiera de las dos condiciones', F.length===1 && F[0].evidenceTotal===esperado, 'hallazgo: '+F.map(f=>f.evidenceTotal).join(',')+' · esperado: '+esperado);
  check('descripción de la regla usa "o"', F.length===1 && /" o /.test(F[0].justification));
  const sig=w.eval('ruleToSigma({name:"x",sev:"Alto",mode:"o",conds:[{field:"proc",op:"contiene",value:"a"},{field:"proc",op:"contiene",value:"b"}]})');
  check('Sigma O genera selecciones y condición or', sig.includes('sel1:') && sig.includes('sel2:') && sig.includes('condition: sel1 or sel2'));
  const kql=w.eval('ruleToKql({name:"x",sev:"Alto",mode:"o",conds:[{field:"proc",op:"contiene",value:"a"},{field:"proc",op:"contiene",value:"b"}]})');
  check('KQL O usa or', /or CommandLine contains "b"/.test(kql));
  const kqlY=w.eval('ruleToKql({name:"x",sev:"Alto",conds:[{field:"proc",op:"contiene",value:"a"},{field:"proc",op:"contiene",value:"b"}]})');
  check('KQL Y sigue usando and', /and CommandLine contains "b"/.test(kqlY));
  // Bitácora de notas con límite de frecuencia
  const b0=w.eval('AUDIT.length');
  w.eval('auditNote("k1","Nota X")'); w.eval('auditNote("k1","Nota X")'); w.eval('auditNote("k1","Nota X")');
  await wait(200);
  check('notas: una entrada por ventana de 5 min', w.eval('AUDIT.length')-b0===1, 'entradas nuevas: '+(w.eval('AUDIT.length')-b0));
  // Word con gráficas
  w.tplSet({entidad:'Prueba', secciones:{...w.tplGet().secciones, graficas:true}});
  const doc1=w.buildWordHtml();
  check('Word incluye sección de gráficas', doc1.includes('Gráficas') && doc1.includes('<img src="data:image/png'));
  w.tplSet({secciones:{...w.tplGet().secciones, graficas:false}});
  check('Word puede ocultar gráficas', !w.buildWordHtml().includes('<h2>Gráficas</h2>'));
  // Resumen en 4 pasos
  w.showTab('inicio'); await wait(150);
  const g=d.getElementById('guiaBox');
  check('resumen en 4 pasos visible tras analizar', !!g && g.textContent.includes('Resumen en 4 pasos') && g.textContent.includes('Lo más urgente'));
  console.log(results.join('\n'));
  console.log('ERRORES: '+(errors.length?errors.slice(0,6).join(' | '):'ninguno'));
  process.exit(0);
})().catch(e=>{ console.log('EXCEPCIÓN: '+e.message); console.log(results.join('\n')); process.exit(1); });
