// Descarga las librerías a vendor/ y registra su SHA-256 en vendor/SHA256SUMS.txt.
// Uso:
//   node scripts/fetch-vendor.js            descarga las que faltan y registra su hash
//   node scripts/fetch-vendor.js --verify   comprueba que los archivos no cambiaron
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'vendor');
const SUMS = path.join(DIR, 'SHA256SUMS.txt');
const FILES = [
  ['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'xlsx.full.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js', 'chart.umd.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf.umd.min.js']
];

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const readSums = () => {
  if (!fs.existsSync(SUMS)) return {};
  const out = {};
  fs.readFileSync(SUMS, 'utf8').split('\n').filter(Boolean).forEach((l) => { const [h, name] = l.split(/\s+/); out[name] = h; });
  return out;
};

async function main() {
  const verifyOnly = process.argv.includes('--verify');
  fs.mkdirSync(DIR, { recursive: true });
  const sums = readSums();
  let problems = 0;
  for (const [url, name] of FILES) {
    const file = path.join(DIR, name);
    if (!fs.existsSync(file)) {
      if (verifyOnly) { console.error('Falta ' + name); problems++; continue; }
      console.log('Descargando ' + name + ' …');
      const res = await fetch(url);
      if (!res.ok) throw new Error('No se pudo descargar ' + url + ' (' + res.status + ')');
      fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    }
    const h = sha256(fs.readFileSync(file));
    if (sums[name] && sums[name] !== h) { console.error('HASH DISTINTO: ' + name + ' cambió desde el último registro.'); problems++; continue; }
    if (!sums[name]) { sums[name] = h; console.log('Registrado ' + name + ' ' + h); }
    else console.log('OK ' + name);
  }
  fs.writeFileSync(SUMS, Object.entries(sums).map(([n, h]) => h + '  ' + n).join('\n') + '\n');
  if (problems) { console.error('Problemas: ' + problems); process.exit(1); }
  console.log('Librerías listas en vendor/.');
}
main().catch((e) => { console.error(e.message); process.exit(1); });
