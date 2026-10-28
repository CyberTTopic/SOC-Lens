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
(async()=>{
  await wait(300);
  await w.loadDemo(); await wait(700);
  // 1) Cadena de hash de la bitácora
  w.auditLog('Prueba A','uno'); w.auditLog('Prueba B','dos'); w.auditLog('Prueba C','tres');
  await wait(200);
  let v = await w.eval('auditVerify()');
  check('bitácora: cadena válida tras registrar cambios', v.ok === true && v.total >= 3, JSON.stringify(v));
  w.eval('AUDIT[AUDIT.length-2].det = "alterado a mano"');
  v = await w.eval('auditVerify()');
  check('bitácora: detecta una entrada alterada', v.ok === false && v.firstBad >= 0, 'primera alterada: '+v.firstBad);
  // 2) Confianza y explicación por hallazgo
  check('cada hallazgo tiene confianza y explicación', w.eval('FINDINGS.length>0 && FINDINGS.every(f=>f.confianza && f.explicacion)'));
  check('confianza usa solo valores definidos', w.eval('FINDINGS.every(f=>["Directa","Media","Indirecta"].includes(f.confianza))'));
  // 3) Hoja para directivos
  const hoja = w.hojaDirectivosHtml();
  const texto = hoja.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  const palabras = texto.trim().split(' ').length;
  check('hoja: incluye secciones clave', /Qué hacer ahora/.test(hoja) && /Hallazgos principales/.test(hoja) && /Confianza:/.test(hoja) && /Quién decide/.test(hoja));
  check('hoja: cabe en una página (≤ 450 palabras)', palabras <= 450, palabras+' palabras');
  // 4) Varios archivos con encabezados distintos
  const dec = new (w.TextDecoder || TextDecoder)();
  const enc = new (w.TextEncoder || TextEncoder)();
  const fakeXlsx = { read: (buf) => JSON.parse(dec.decode(buf)), utils: { sheet_to_json: (ws) => ws.aoa }, SSF: {} };
  const oldX = w.XLSX; w.XLSX = fakeXlsx;
  const aoa1 = [['Timestamp','User','SourceIP','Host','EventID','Action','Status']];
  for (let i=0;i<8;i++) aoa1.push(['2026-10-26 02:1'+i+':00','jperez','198.51.100.23','SRV-DC-01','4625','Fallo de inicio de sesión','Failure']);
  const aoa2 = [['Fecha','Cuenta','IP origen','Equipo','Event ID','Descripción','Resultado']];
  for (let i=0;i<3;i++) aoa2.push(['2026-10-26 09:0'+i+':00','rgomez','10.10.1.22','WS-TI-04','4624','Inicio de sesión','Success']);
  const mk = (name, aoa) => ({ name, size: 100, arrayBuffer: async () => enc.encode(JSON.stringify({ SheetNames:['S'], Sheets:{ S:{ aoa } } })).buffer });
  await w.handleFiles([mk('firewall.xlsx', aoa1), mk('windows.xlsx', aoa2)]);
  await wait(700);
  w.XLSX = oldX;
  console.log('TOASTS: '+(d.getElementById('toasts')?d.getElementById('toasts').textContent:'(sin contenedor)'));
  console.log('LIB: '+JSON.stringify(w.eval('libStatus()')));
  check('varios archivos: se combinan todas las filas', w.eval('RAW.length') === 11, 'filas: '+w.eval('RAW.length'));
  check('varios archivos: columnas de ambos se reconocen', w.eval('RAW.filter(r=>r.User).length') === 11, 'con usuario: '+w.eval('RAW.filter(r=>r.User).length'));
  check('varios archivos: se conserva el origen de cada fila', w.eval('RAW.filter(r=>r._archivo==="windows.xlsx").length') === 3);
  check('varios archivos: el nombre del caso lista los archivos', /firewall\.xlsx/.test(w.eval('srcName')) && /windows\.xlsx/.test(w.eval('srcName')));
  console.log(results.join('\n'));
  console.log('ERRORES: '+(errors.length? errors.slice(0,6).join(' | ') : 'ninguno'));
  process.exit(0);
})().catch(e=>{ console.log('EXCEPCIÓN: '+e.message); console.log(results.join('\n')); process.exit(1); });
