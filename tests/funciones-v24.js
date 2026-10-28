const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'); const path = require('path');
const file = process.argv[2];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (n, ok, x = '') => results.push((ok ? 'PASS ' : 'FAIL ') + n + (x ? ' — ' + x : ''));
async function load(htmlPath, ms) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const vc = new VirtualConsole();
  const dom = new JSDOM(html, { url: 'file://' + path.resolve(htmlPath), runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc });
  await new Promise((r) => dom.window.addEventListener('load', r));
  await wait(ms);
  return dom;
}
(async () => {
  // 1) Con vendor/ presente: las tres librerías cargan desde vendor/
  const d1 = await load(file, 2500);
  const w1 = d1.window;
  check('vendor/: XLSX cargada', typeof w1.XLSX !== 'undefined' && w1.XLSX.version === '0.18.5');
  check('vendor/: Chart.js cargada', typeof w1.Chart !== 'undefined' && w1.Chart.version === '4.4.1');
  check('vendor/: jsPDF cargada', !!(w1.jspdf && w1.jspdf.jsPDF));
  check('vendor/: origen registrado', w1.LIB_RESULTS && Object.values(w1.LIB_RESULTS).every((v) => /vendor\//.test(v) || v === 'ya cargada'), JSON.stringify(w1.LIB_RESULTS));
  check('vendor/: sin aviso de librerías', w1.document.getElementById('libWarn').hidden === true);
  check('vendor/: la app arranca (pestaña inicio visible)', !w1.document.getElementById('t-inicio').hidden);
  // 2) Sin vendor/ y sin red: el aviso aparece con pasos concretos
  const dir = '/tmp/novendor'; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  // En la copia de prueba, jsDelivr se reemplaza por una dirección inalcanzable:
  // así la prueba no depende de internet (en GitHub Actions sí hay red).
  const contenido = fs.readFileSync(file, 'utf8').replace(/https:\/\/cdn\.jsdelivr\.net/g, 'http://127.0.0.1:9');
  fs.writeFileSync(path.join(dir, 'index.html'), contenido);
  const d2 = await load(path.join(dir, 'index.html'), 6000);
  const w2 = d2.window;
  check('sin vendor/: el aviso aparece', w2.document.getElementById('libWarn').hidden === false);
  check('sin vendor/: el aviso indica qué hacer', /Qué hacer/.test(w2.document.getElementById('libWarn').textContent) && /vendor\//.test(w2.document.getElementById('libWarn').textContent));
  check('sin vendor/: la app sigue abierta (no se congela)', !w2.document.getElementById('t-inicio').hidden);
  console.log(results.join('\n'));
  process.exit(0);
})().catch((e) => { console.log('EXCEPCIÓN: ' + e.message); console.log(results.join('\n')); process.exit(1); });
