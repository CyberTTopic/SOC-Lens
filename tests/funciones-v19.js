const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const nodeCrypto = require('crypto');
const html = fs.readFileSync(process.argv[2], 'utf8');
const errors = []; const results = []; const downloads = [];
const vc = new VirtualConsole(); vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.message || e))); vc.on('error', e => errors.push('console.error: ' + e));
const stubChart = function(){ this.destroy=()=>{}; this.toBase64Image=()=>'data:image/png;base64,AA=='; this.update=()=>{}; }; stubChart.getChart=()=>null; stubChart.defaults={plugins:{},scales:{},color:'',borderColor:'',font:{}};
const ctx = new Proxy({}, {get:(t,k)=>(k in t?t[k]:()=>({width:10}))});
const blobs = {};
const dom = new JSDOM(html.replace(/<script src="(https:\/\/cdnjs|vendor\/)[^"]+"><\/script>/g,''), { url:'http://localhost/', runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:vc,
  beforeParse(win){
    Object.defineProperty(win, 'crypto', { value: nodeCrypto.webcrypto, configurable: true });
    win.XLSX={read:()=>({}),utils:{sheet_to_json:()=>[]},SSF:{}}; win.Chart=stubChart;
    win.jspdf={jsPDF:function(){return new Proxy({},{get:(t,k)=>k==='internal'?{pageSize:{getWidth:()=>210,getHeight:()=>297}}:k==='splitTextToSize'?(x)=>[String(x)]:k==='getNumberOfPages'?()=>1:(()=>{})})}};
    win.alert=()=>{}; win.confirm=()=>true; win.scrollTo=()=>{};
    win.matchMedia=()=>({matches:false,addListener(){},addEventListener(){},removeListener(){},removeEventListener(){}});
    win.requestAnimationFrame=cb=>setTimeout(cb,0); win.HTMLCanvasElement.prototype.getContext=()=>ctx; win.HTMLCanvasElement.prototype.toDataURL=()=>'data:image/png;base64,AA==';
    win.Blob = class { constructor(parts, opts){ this.parts = parts; this.opts = opts; } };
    win.URL.createObjectURL = (b) => { const id = 'blob:' + Object.keys(blobs).length; blobs[id] = b; return id; }; win.URL.revokeObjectURL=()=>{};
    win.HTMLAnchorElement.prototype.click = function(){ downloads.push({ name: this.download, href: this.href }); };
  }});
const w=dom.window,d=w.document; const wait=ms=>new Promise(r=>setTimeout(r,ms));
const check=(n,ok,x='')=>results.push((ok?'PASS ':'FAIL ')+n+(x?' — '+x:''));
(async()=>{
  await wait(300);
  await w.loadDemo(); await wait(600);
  w.eval('TRI = { "H-01": { estado: "Confirmado", nota: "dato-secreto-42" } }');
  w.showTab('ajustes'); await wait(200);
  // 1) Exportación cifrada
  d.getElementById('xCasePass').value = 'contrasena-larga-1';
  await w.eval('caseExport()'); await wait(300);
  const dl = downloads.find(x => /cifrado\.json$/.test(x.name));
  check('exporta un caso cifrado', !!dl, downloads.map(x=>x.name).join(','));
  const txt = dl ? blobs[dl.href].parts.join('') : '';
  check('el archivo cifrado no muestra el contenido', txt.includes('soc-lens-caso-cifrado') && !txt.includes('dato-secreto-42') && !txt.includes('"triage"'));
  // 2) Contraseña incorrecta no restaura nada
  w.eval('TRI = {}');
  const file = new w.File([txt], 'caso.cifrado.json', { type: 'application/json' });
  w.prompt = () => 'contrasena-equivocada';
  await w.caseImport(file); await wait(300);
  check('contraseña incorrecta no importa nada', Object.keys(w.eval('TRI')).length === 0);
  // 3) Contraseña correcta restaura el caso
  w.prompt = () => 'contrasena-larga-1';
  await w.caseImport(file); await wait(300);
  check('contraseña correcta restaura el triage', (w.eval('TRI')['H-01']||{}).nota === 'dato-secreto-42');
  // 4) Contraseña corta se rechaza
  d.getElementById('xCasePass').value = 'corta';
  const antes = downloads.length;
  await w.eval('caseExport()'); await wait(100);
  check('contraseña menor de 8 caracteres no exporta', downloads.length === antes);
  // 5) Atajos de teclado
  w.showTab('dash'); await wait(100);
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: '2', bubbles: true }));
  await wait(100);
  check('atajo "2" abre la pestaña de incidentes', !d.getElementById('t-inc').hidden);
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: '/', bubbles: true }));
  await wait(100);
  check('atajo "/" abre el explorador y enfoca la búsqueda', !d.getElementById('t-explo').hidden && d.activeElement === d.getElementById('q'));
  d.getElementById('q').blur();
  d.getElementById('q').dispatchEvent(new w.KeyboardEvent('keydown', { key: '1', bubbles: true }));
  await wait(60);
  check('los atajos no se disparan mientras se escribe en un campo', !d.getElementById('t-explo').hidden);
  // 6) Word con encabezado y número de página
  const doc = w.buildWordHtml();
  check('Word incluye encabezado y pie con número de página', doc.includes('mso-element:header') && doc.includes('mso-element:footer') && doc.includes("' PAGE '") && doc.includes("' NUMPAGES '"));
  console.log(results.join('\n'));
  console.log('ERRORES: '+(errors.length? errors.slice(0,6).join(' | ') : 'ninguno'));
  process.exit(0);
})().catch(e=>{ console.log('EXCEPCIÓN: '+e.message); console.log(results.join('\n')); process.exit(1); });
