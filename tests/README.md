# Pruebas de SOC Lens

Estas pruebas abren la página en un navegador simulado (jsdom), cargan datos de demostración y revisan:

- **funcional-recorrido.js**: todas las pestañas, el mapa de ataque, el explorador, el informe y las exportaciones.
- **seguridad-inyeccion.js**: intenta inyectar HTML en usuarios, equipos, comandos y acciones, y confirma que no se ejecuta.
- **beacon-destino.js**: actividad periódica hacia dos destinos distintos.
- **funciones-v14.js**: reglas personalizadas (Sigma y KQL), actividad periódica, exfiltración con línea base, bitácora, casos (guardar e importar) y plantilla Word.
- **rendimiento.js**: tiempo de análisis con 30.000 filas.

## Cómo ejecutarlas

```
npm install jsdom
node tests/run-all.js ../index_v14.html
```

Limitaciones: las librerías de cdnjs (SheetJS, Chart.js, jsPDF) se simulan porque el entorno de prueba no tiene acceso a internet. Las pruebas no reemplazan una revisión visual en Edge o Chrome ni la política de seguridad (CSP) aplicada por el navegador.
