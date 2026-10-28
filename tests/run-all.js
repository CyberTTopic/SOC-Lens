// Ejecuta todas las pruebas de SOC Lens.
// Uso: node tests/run-all.js ../index_v14.html   (requiere: npm install jsdom)
const { execFileSync } = require('child_process');
const path = require('path');
const html = process.argv[2];
if (!html) { console.error('Indica la ruta del HTML. Ej.: node tests/run-all.js ../index_v14.html'); process.exit(2); }
const tests = ['funcional-recorrido.js','seguridad-inyeccion.js','beacon-destino.js','funciones-v14.js','funciones-v16.js','funciones-v17.js','funciones-v18.js','funciones-v19.js','funciones-v20.js','funciones-v21.js','funciones-v22.js','funciones-v23.js','accesibilidad.js','funciones-v24.js','funciones-v25.js','funciones-v26.js','funciones-v27.js','funciones-v28.js','funciones-v29.js','funciones-v30.js','funciones-v31.js','rendimiento.js'];
let failed = 0;
for (const t of tests) {
  console.log('\n=== ' + t + ' ===');
  let out = '';
  try { out = execFileSync('node', [path.join(__dirname, t), html], { encoding: 'utf8', timeout: 400000 }); }
  catch (e) { out = (e.stdout || '') + (e.stderr || ''); failed++; }
  process.stdout.write(out);
  if (/FAIL|ERRORES \((?!0)/.test(out) || /PAYLOAD EJECUTADO VECES: [1-9]/.test(out)) failed++;
}
console.log('\n' + (failed ? 'Pruebas con problemas: ' + failed : 'Todas las pruebas pasaron.'));
process.exit(failed ? 1 : 0);
