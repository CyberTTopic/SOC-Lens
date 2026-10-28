# Librerías locales

La página necesita tres librerías. Guardarlas aquí evita depender de cdnjs.cloudflare.com.

| Archivo | Librería | Versión |
|---|---|---|
| xlsx.full.min.js | SheetJS | 0.18.5 |
| chart.umd.min.js | Chart.js | 4.4.1 |
| jspdf.umd.min.js | jsPDF | 2.5.1 |

Para descargarlas (una sola vez, desde tu computadora):

    npm install
    npm run vendor

El script descarga cada archivo y guarda su SHA-256 en `SHA256SUMS.txt`. Para comprobar más tarde que nadie los cambió:

    npm run vendor:verify
