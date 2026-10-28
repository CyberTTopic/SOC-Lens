const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const results = [];
const check = (n, ok, x = '') => results.push((ok ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : ''));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Contraste WCAG 2.x
const lum = (hex) => { const c = hex.replace('#', '').slice(0, 6).match(/../g).map((h) => parseInt(h, 16) / 255).map((v) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const vars = (block) => { const o = {}; (block.match(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g) || []).forEach((m) => { const [, k, v] = m.match(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/); o[k] = v; }); return o; };
const bloque = (sel) => { const i = html.indexOf(sel + '{'); if (i < 0) return ''; return html.slice(i, html.indexOf('}', i)); };
(async () => {
  const dark = vars(bloque(':root')), light = vars(bloque('body.light'));
  const altoDark = { ...dark, ...vars(bloque('body.alto-contraste')) };
  const altoLight = { ...light, ...vars(bloque('body.light.alto-contraste')) };
  const pares = [['txt', 'bg'], ['txt', 'panel'], ['mut', 'panel'], ['dim', 'panel'], ['cy', 'bg']];
  pares.forEach(([a, b]) => {
    const r = ratio(altoDark[a], altoDark[b]);
    check(`alto contraste oscuro: ${a} sobre ${b} cumple 7:1`, r >= 7, r.toFixed(2) + ':1');
  });
  pares.forEach(([a, b]) => {
    const r = ratio(altoLight[a], altoLight[b]);
    check(`alto contraste claro: ${a} sobre ${b} cumple 7:1`, r >= 7, r.toFixed(2) + ':1');
  });
  const rn = ratio(dark.txt, dark.bg), rp = ratio(dark.txt, dark.panel), rm = ratio(dark.mut, dark.panel);
  check('tema normal oscuro: texto principal cumple 4.5:1', rn >= 4.5 && rp >= 4.5, `fondo ${rn.toFixed(2)}:1, tarjeta ${rp.toFixed(2)}:1`);
  check('tema normal oscuro: texto secundario cumple 4.5:1', rm >= 4.5, rm.toFixed(2) + ':1');
  // Comportamiento de los controles
  const vc = new VirtualConsole();
  const stubChart = function(){ this.destroy=()=>{}; this.toBase64Image=()=>'data:image/png;base64,AA=='; this.update=()=>{}; }; stubChart.getChart=()=>null; stubChart.defaults={plugins:{},scales:{},color:'',borderColor:'',font:{}};
  const ctx = new Proxy({}, {get:(t,k)=>(k in t?t[k]:()=>({width:10}))});
  const dom = new JSDOM(html.replace(/<script src="(https:\/\/cdnjs|https:\/\/cdn\.jsdelivr|vendor\/)[^"]+"><\/script>/g,''), { url:'http://localhost/', runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:vc,
    beforeParse(win){ win.XLSX={read:()=>({}),utils:{sheet_to_json:()=>[]},SSF:{}}; win.Chart=stubChart; win.jspdf={jsPDF:function(){return new Proxy({},{get:()=>()=>{}})}}; win.alert=()=>{}; win.confirm=()=>true; win.scrollTo=()=>{}; win.matchMedia=()=>({matches:false,addListener(){},addEventListener(){},removeListener(){},removeEventListener(){}}); win.requestAnimationFrame=cb=>setTimeout(cb,0); win.HTMLCanvasElement.prototype.getContext=()=>ctx; win.HTMLCanvasElement.prototype.toDataURL=()=>'data:image/png;base64,AA=='; win.URL.createObjectURL=()=>'blob:x'; win.URL.revokeObjectURL=()=>{}; win.HTMLAnchorElement.prototype.click=function(){}; } });
  const w = dom.window, d = w.document;
  await wait(300);
  w.showTab('ajustes'); await wait(150);
  const chk = d.getElementById('uiContraste'), sel = d.getElementById('uiTexto');
  check('los controles de lectura existen en Ajustes', !!chk && !!sel);
  chk.checked = true; chk.dispatchEvent(new w.Event('change', { bubbles: true })); await wait(40);
  check('activar alto contraste aplica la clase al cuerpo', d.body.classList.contains('alto-contraste'));
  sel.value = 'grande'; sel.dispatchEvent(new w.Event('change', { bubbles: true })); await wait(40);
  check('texto grande aplica el zoom', d.documentElement.classList.contains('txt-grande') && !d.documentElement.classList.contains('txt-muy-grande'));
  sel.value = 'muy'; sel.dispatchEvent(new w.Event('change', { bubbles: true })); await wait(40);
  check('texto muy grande reemplaza al grande', d.documentElement.classList.contains('txt-muy-grande') && !d.documentElement.classList.contains('txt-grande'));
  const guardado = w.eval("lsGet('ui', {})");
  check('la preferencia se guarda', guardado.texto === 'muy' && guardado.contraste === true);
  chk.checked = false; chk.dispatchEvent(new w.Event('change', { bubbles: true })); await wait(40);
  check('desactivar alto contraste lo quita', !d.body.classList.contains('alto-contraste'));
  console.log(results.join('\n'));
  process.exit(0);
})().catch((e) => { console.log('EXCEPCIÓN: ' + e.message); console.log(results.join('\n')); process.exit(1); });
