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
const w=dom.window; const wait=ms=>new Promise(r=>setTimeout(r,ms));
const check=(n,ok,x='')=>results.push((ok?'PASS ':'FAIL ')+n+(x?' — '+x:''));
(async()=>{
  await wait(300); await w.loadDemo(); await wait(600);
  w.tplSet({ idioma:'en' });
  const en = w.buildWordHtml();
  const hoja = w.hojaDirectivosHtml();
  check('resumen ejecutivo en inglés', en.includes('events were analyzed') && !en.includes('eventos fueron analizados'));
  check('narrativa de incidentes en inglés', /Between .* and .* \d+ finding\(s\) were recorded/.test(en) || en.includes('were recorded'));
  check('decisiones en inglés', /Escalate to incident response|Investigate with priority|Contain|Monitor and validate/.test(en));
  check('planes en inglés (contención, evidencia, recuperación)', en.includes('Containment') && en.includes('Evidence preservation') && en.includes('Recovery'));
  check('recomendaciones en inglés', en.includes('Force a password reset') && en.includes('Document exclusions'));
  check('títulos de incidente en inglés', en.includes('Incident: '));
  check('la hoja en inglés usa el resumen en inglés', hoja.includes('events were analyzed') && hoja.includes('What to do now') && hoja.includes('Who decides'));
  check('la hoja en inglés no contiene encabezados en español', !/Qué hacer ahora|Quién decide|Hallazgos principales/.test(hoja));
  w.tplSet({ idioma:'es' });
  const es = w.buildWordHtml();
  check('en español el informe sigue igual (resumen en español)', es.includes('eventos') && es.includes('1. Resumen ejecutivo') && es.includes('Contención'));
  check('en español la recomendación original sigue en español', es.includes('Forzar cambio de contraseña'));
  console.log(results.join('\n'));
  console.log('ERRORES: '+(errors.length? errors.slice(0,6).join(' | ') : 'ninguno'));
  process.exit(0);
})().catch(e=>{ console.log('EXCEPCIÓN: '+e.message); console.log(results.join('\n')); process.exit(1); });
