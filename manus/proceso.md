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

---

## 2026-02-23 — segunda iteración: rediseño completo

**sinopsis:** rediseño completo de la interfaz con estética finder/windows-antiguo + pixel-art, añadido campo autor, velo de confirmación de edad +18, y refactorización modular del código.

**cambios realizados:**

### index.html
- añadido el `#age-veil`: una capa fija con blur y un cuadro de diálogo que bloquea la pantalla antes de activar el modo +18. tiene dos botones: "sí, tengo 18 o más" y "no, volver".
- el modal de subida ahora incluye el campo `autor` como primer campo del formulario, antes del nombre y los hashtags.
- los iconos de documento en el grid son SVGs pixel-art inline generados dinámicamente desde `app.js`.
- la ventana principal tiene una titlebar con los tres puntos de color (rojo/amarillo/verde) al estilo macOS/finder.

### style.css
- reescrito completamente con variables CSS para los dos temas: normal (gris-azulado, windows-7-ish) y +18 (oscuro, amarillo).
- el fondo de puntos usa `body::before` con `opacity` independiente para que no afecte al contenido.
- los iconos usan `image-rendering: pixelated` para mantener la estética pixel-art al escalar.
- la ventana tiene `max-height: 88dvh` y el área de contenido tiene `overflow-y: auto` para el scroll.
- el velo `#age-veil` usa `backdrop-filter: blur(6px)` y `z-index: 300` para estar siempre encima de todo.

### app.js
- refactorizado en módulos claros: CONFIG, state, dom, arranque, carga de datos, renderizado de hashtags, renderizado de archivos, modo +18 + velo, modal, drag & drop, subida a github, helpers de api, utilidades, binding de eventos.
- el campo `author` se guarda en cada entrada del `data.json` como `"author": "nombre"` o `null` si está vacío.
- el velo de confirmación de edad intercepta el clic en "soy mayor de 18" antes de activar el modo.
- todos los mensajes de estado y error van a la consola del navegador (`console.log`, `console.error`, `console.warn`).

### data.json
- añadido el campo `author` a todas las entradas de ejemplo.
- los ejemplos usan nombres de autores reales del diseño gráfico como referencia.

---

## 2026-02-23 — iteración 3: reescritura completa

### sinopsis
reescritura total de los tres archivos principales (html, css, js) para cumplir con el brief completo del usuario.

### cambios realizados

**estructura (index.html):**
- botones "subir pdf" y "soy mayor de 18" movidos FUERA de la ventana, debajo del div principal
- velo de confirmación de edad como capa independiente con blur
- velo de configuración de token de github integrado en la UI (sin prompt() del navegador)
- modal de subida con dos vistas: formulario y progreso tipo transferencia de archivo
- campo "autor:" añadido antes de los hashtags en el modal
- campo "nombre:" que se rellena automáticamente al seleccionar archivo
- titlebar con tres dots (rojo, amarillo, verde) estilo finder

**estética (style.css):**
- estética windows clásico / retro completa:
  - bordes 3d outset/inset en ventana, botones, inputs, barra de progreso
  - gradiente azul clásico en titlebar (como windows xp/2000)
  - scrollbar estilizada con bordes retro
  - sin border-radius en ningún elemento (todo recto, pixel-perfect)
  - fuente "lucida console" / "courier new" para monospace
  - fuente "segoe ui" / tahoma para el body
- tema normal: grises claros (#ece9d8), azul oscuro (#0a246a), blanco
- tema +18: negro (#0a0a00), amarillo (#f5c400), dorado
- barra de progreso con patrón de rayas animadas tipo windows
- fondo de puntos con los valores exactos del prompt original

**lógica (app.js):**
- token de github guardado en localStorage (no se pide cada vez)
- velo integrado para pedir el token la primera vez (con link directo a crear PAT)
- progreso de subida en vista tipo "transferencia de archivo" dentro del modal
- sanitizeFilename() ya no elimina caracteres unicode (acentos, ñ, etc.)
- si el token es inválido (401), se limpia y se pide de nuevo
- código modular con secciones claras

**estructura de archivos:**
- creada carpeta /data con .gitkeep como placeholder

---

## 2026-02-23 — iteración 4: cloudflare worker como proxy seguro

### sinopsis
se elimina el sistema de token que pedía al visitante un PAT de github. se reemplaza por un cloudflare worker que actúa de intermediario: el token se guarda como variable de entorno en cloudflare y el visitante no necesita nada.

### cambios realizados

**nuevo: `worker/worker.js`**
el código del worker. tiene 3 acciones:
- `upload_pdf`: sube un pdf a /data/ via la api de github
- `update_index`: lee data.json, añade la nueva entrada, guarda
- `get_index`: lee data.json fresco sin caché de github pages

**nuevo: `worker/wrangler.toml`**
configuración para desplegar el worker con `wrangler deploy`. las variables secretas (GITHUB_TOKEN, ALLOWED_ORIGIN) se configuran con `wrangler secret put`.

**modificado: `app.js`**
- eliminado todo lo relacionado con el token del visitante: localStorage, velo de token, requestToken(), ensureToken(), githubGetFile(), githubPutFile()
- añadido `workerPost(action, data)` como helper genérico para hablar con el worker
- `loadData()` ahora intenta cargar desde el worker primero (datos frescos) con fallback al data.json local
- `handleUpload()` ahora envía el pdf y la entrada al worker en vez de usar la api de github directamente

**modificado: `index.html`**
- eliminado el bloque completo del velo de token (#token-veil)

**modificado: `README.md`**
- reescrito completamente con:
  - explicación del flujo (frontend → worker → github)
  - diagrama mermaid
  - guía paso a paso para desplegar el worker
  - guía para configurar github pages
  - guía para subir los workflows manualmente
  - estructura del proyecto actualizada
