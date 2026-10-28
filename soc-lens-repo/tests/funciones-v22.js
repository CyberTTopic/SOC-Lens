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
  const bad = ['Intentos fallidos','Ráfaga','cuentas afectadas','Qué pasó','Qué hacer','Quién decide','Hallazgos principales','Por qué esta criticidad','fallidos desde'];
  const hits = bad.filter(b => en.includes(b) || hoja.includes(b));
  check('el informe en inglés no contiene fragmentos en español de los hallazgos', hits.length===0, hits.join(', '));
  check('los títulos de hallazgos salen en inglés', /Failed sign-ins from|Periodic activity from|Privilege or group|Sessions across several hosts|Password changes outside|Service account used|Security audit log/.test(en));
  check('el hallazgo principal de la hoja sale en inglés', /Failed sign-ins from|Sessions across|Privilege|Periodic|Password|Service account|Activity|Abnormal|Security audit|Repeated|Matched|Custom/.test(hoja));
  check('no aparece el aviso de contenido en español', !en.includes('generated in Spanish'));
  w.tplSet({ idioma:'es' });
  const es = w.buildWordHtml();
  check('en español los hallazgos siguen con su texto original', es.includes('Intentos fallidos desde') || es.includes('Ráfaga') || es.includes('fallidos'));
  console.log(results.join('\n'));
  console.log('ERRORES: '+(errors.length? errors.slice(0,6).join(' | ') : 'ninguno'));
  process.exit(0);
})().catch(e=>{ console.log('EXCEPCIÓN: '+e.message); console.log(results.join('\n')); process.exit(1); });
