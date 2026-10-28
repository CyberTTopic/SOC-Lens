# SOC Lens

Análisis de logs de seguridad en el navegador. Carga un Excel o CSV exportado de tu SIEM, detecta patrones de ataque, agrupa los hallazgos en incidentes y genera informes.

## Privacidad

Los datos se procesan dentro del navegador de quien usa la herramienta. Nada se envía a un servidor, salvo que actives el asistente de IA (envía fragmentos del análisis a la API que elijas) o los enlaces de consulta de IOC (VirusTotal, AbuseIPDB, Shodan).

**Nunca subas al repositorio archivos de logs, casos exportados, informes ni claves de API.** El `.gitignore` ayuda, pero la revisión es tuya.

## Uso

1. Descarga el `.zip` de la última versión desde *Releases* y descomprímelo. Debe contener `index.html` y la carpeta `vendor/`: la app necesita ambos.
2. Ábrelo en Edge o Chrome. Pulsa **Usar demo** para probarla con datos sintéticos.

## Desarrollo

    npm install
    npm run vendor      # descarga las librerías a vendor/ (una vez)
    npm test            # ejecuta las pruebas

Antes de publicar, `vendor/` debe estar commiteado en el repositorio: el flujo de Release lo comprueba.

## Publicar una versión

Crea una etiqueta con el formato `v1.0.0`. El flujo de GitHub Actions ejecuta las pruebas y, si pasan, publica un `.zip` con `index.html` y `vendor/`, junto con los hashes SHA-256. Quien descargue el archivo puede comparar el hash del `.zip` con `SHA256SUMS.txt` para confirmar que no fue modificado.

    git tag v1.0.0
    git push origin v1.0.0

## Limitaciones

- Los hallazgos son indicadores que deben validarse contra los registros originales.
- Los umbrales de detección y los plazos del triage son valores de partida, ajustables en Ajustes. Puedes exportar esa configuración y tus reglas a un archivo JSON para compartirlas con tu equipo; el archivo no incluye casos, listas de cuentas ni la plantilla.
- Algunos textos de los hallazgos individuales se generan en español aunque el informe esté en inglés.

## Licencia

Pendiente de definir.
