# SOC Lens

Plataforma de correlación de logs para análisis SOC Nivel 2. Es una aplicación de una sola página (HTML, CSS y JavaScript) que se ejecuta en el navegador, sin instalación ni servidor.

## Funciones

- Carga de archivos .xlsx, .xls o .csv exportados de un SIEM
- Detección de fuerza bruta, inicios sospechosos, escalamiento, comandos y procesos, movimiento lateral y anomalías
- Agrupación de hallazgos en incidentes por usuario, IP y equipo
- Mapeo a MITRE ATT&CK y cadena de ataque
- Grafo de relaciones, explorador de logs y mapa de calor
- Extracción de IoC y cola de triage
- Exportación a PDF, CSV y JSON
- Asistente de IA opcional (requiere API key de Anthropic)

## Uso

1. Abre `index.html` en Chrome o Edge.
2. Pulsa **Usar demo** para probar con datos sintéticos, o carga tu archivo.
3. Verifica el mapeo de columnas y pulsa **Analizar y correlacionar**.

Requiere conexión a internet para cargar SheetJS, Chart.js y jsPDF desde cdnjs.

## Aviso

Los hallazgos son indicadores que deben validarse en los registros originales. Los umbrales son valores de partida y deben ajustarse al entorno. No subas logs reales ni datos de clientes a este repositorio.
