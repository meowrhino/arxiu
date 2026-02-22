# proceso

## 2026-02-23 — creación inicial del proyecto arxiu

**sinopsis:** construcción completa del repositorio de pdfs con interfaz web, sistema de hashtags, modo +18 y automatizaciones con github actions.

**descripción del proceso:**

el proyecto se construye como una aplicación web estática alojada en github pages, usando html, css y javascript vainilla sin ninguna dependencia externa.

la arquitectura se basa en un único archivo `data.json` que actúa como base de datos. la interfaz lee este archivo al cargar y renderiza la lista de pdfs dinámicamente. cuando el usuario sube un pdf, el javascript usa la api rest de github para subir el archivo a la carpeta `/data` y actualizar el `data.json` directamente desde el navegador, usando un personal access token (pat) que se pide una sola vez por sesión.

**archivos creados:**

- `index.html` — estructura del html con el topbar de hashtags, el grid de archivos, el footer con los dos botones, y el modal de subida.
- `style.css` — estilos completos con dos temas: el normal (gris-azulado, windows 7-ish) y el +18 (oscuro, amarillo). usa variables css para hacer el cambio de tema limpio y sin javascript.
- `app.js` — toda la lógica: carga del data.json, renderizado de hashtags y archivos, filtrado, toggle del modo +18, drag & drop, y subida a github via api rest.
- `data.json` — archivo de datos con tres entradas de ejemplo (dos normales y una +18).
- `.github/workflows/update-hashtags.yml` — github action que se ejecuta cada domingo a las 03:00 utc. lee todos los hashtags de los archivos en data.json, los deduplica, los ordena y actualiza el campo `hashtags` del json.
- `.github/workflows/content-filter.yml` — github action que se ejecuta el día 11 de cada mes a las 04:00 utc. usa `pdfplumber` para extraer el texto de cada pdf y comprobarlo contra una lista de palabras prohibidas. si encuentra alguna, marca el archivo como `is_18_plus: true` en el data.json.
- `manus/proceso.md` — este archivo.
