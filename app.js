/* ============================================================
   CONFIGURACIÓN
   Edita GITHUB_USER y GITHUB_REPO antes de desplegar.
   ============================================================ */
const CONFIG = {
  GITHUB_USER:   "meowrhino",
  GITHUB_REPO:   "arxiu",
  GITHUB_BRANCH: "main",
  MAX_FILE_SIZE:  2 * 1024 * 1024, // 2 MB en bytes
};


/* ============================================================
   ESTADO GLOBAL
   ============================================================ */
const state = {
  files:       [],    // todos los archivos del data.json
  hashtags:    [],    // lista de hashtags únicos
  activeTag:   null,  // hashtag activo para filtrar (null = todos)
  mode18:      false, // si el modo +18 está activo
  githubToken: null,  // PAT de GitHub (se pide una vez por sesión)
};


/* ============================================================
   REFERENCIAS AL DOM
   ============================================================ */
const dom = {
  // ventana principal
  hashtagNav:    document.getElementById("hashtag-nav"),
  fileGrid:      document.getElementById("file-grid"),
  statusCount:   document.getElementById("status-count"),
  btnUpload:     document.getElementById("btn-upload"),
  btn18:         document.getElementById("btn-18"),

  // velo de confirmación de edad
  ageVeil:       document.getElementById("age-veil"),
  ageConfirmYes: document.getElementById("age-confirm-yes"),
  ageConfirmNo:  document.getElementById("age-confirm-no"),

  // modal de subida
  modalUpload:   document.getElementById("modal-upload"),
  modalOverlay:  document.getElementById("modal-overlay"),
  modalClose:    document.getElementById("modal-close-btn"),
  uploadForm:    document.getElementById("upload-form"),
  inputAuthor:   document.getElementById("input-author"),
  inputHashtags: document.getElementById("input-hashtags"),
  dropZone:      document.getElementById("drop-zone"),
  inputFile:     document.getElementById("input-file"),
  fileInfo:      document.getElementById("file-info"),
  btnSubmit:     document.getElementById("btn-submit"),
  uploadStatus:  document.getElementById("upload-status"),
  statusMsg:     document.getElementById("status-msg"),
  progressBar:   document.getElementById("progress-bar"),
};


/* ============================================================
   ARRANQUE
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  console.log("[arxiu] iniciando...");
  bindEvents();
  loadData();
});


/* ============================================================
   CARGA DE DATOS
   Lee data.json y actualiza el estado global.
   ============================================================ */
async function loadData() {
  try {
    const res  = await fetch(`data.json?t=${Date.now()}`);
    if (!res.ok) throw new Error(`http ${res.status}`);
    const json = await res.json();

    state.files    = json.files    || [];
    state.hashtags = json.hashtags || [];

    console.log(`[arxiu] ${state.files.length} archivos cargados`);
    renderHashtags();
    renderFiles();
  } catch (err) {
    console.error("[arxiu] error al cargar data.json:", err);
    dom.fileGrid.innerHTML = `<p id="empty-msg">error al cargar archivos. revisa la consola.</p>`;
  }
}


/* ============================================================
   RENDERIZADO DE HASHTAGS
   Construye los botones de filtro en la toolbar.
   ============================================================ */
function renderHashtags() {
  dom.hashtagNav.innerHTML = "";

  // botón "todos"
  const allBtn = createTagButton("todos", null, state.activeTag === null);
  allBtn.classList.add("all-btn");
  dom.hashtagNav.appendChild(allBtn);

  // un botón por hashtag
  state.hashtags.forEach(tag => {
    dom.hashtagNav.appendChild(
      createTagButton(`#${tag}`, tag, state.activeTag === tag)
    );
  });
}

function createTagButton(label, value, isActive) {
  const btn = document.createElement("button");
  btn.className   = "tag-btn" + (isActive ? " active" : "");
  btn.textContent = label;
  btn.addEventListener("click", () => {
    state.activeTag = value;
    renderHashtags();
    renderFiles();
  });
  return btn;
}


/* ============================================================
   RENDERIZADO DE ARCHIVOS
   Filtra y muestra los iconos de archivo.
   ============================================================ */
function renderFiles() {
  dom.fileGrid.innerHTML = "";

  const visible = state.files.filter(f => {
    // ocultar +18 si el modo no está activo
    if (f.is_18_plus && !state.mode18) return false;
    // filtrar por hashtag activo
    if (state.activeTag && !(f.hashtags || []).includes(state.activeTag)) return false;
    return true;
  });

  // actualizar contador en la statusbar
  dom.statusCount.textContent = `${visible.length} archivo${visible.length !== 1 ? "s" : ""}`;

  if (visible.length === 0) {
    dom.fileGrid.innerHTML = `<p id="empty-msg">no hay archivos aquí todavía.</p>`;
    return;
  }

  visible.forEach(f => dom.fileGrid.appendChild(createFileCard(f)));
}

function createFileCard(file) {
  const card = document.createElement("a");
  card.className = "file-card";
  card.href      = `data/${file.filename}`;
  card.target    = "_blank";
  card.rel       = "noopener noreferrer";
  card.title     = file.filename;

  // icono SVG pixel-art de documento
  const iconWrap = document.createElement("div");
  iconWrap.className = "file-icon-wrap";
  iconWrap.innerHTML = svgDocIcon(file.is_18_plus);

  // nombre del archivo (sin extensión)
  const label = document.createElement("div");
  label.className   = "file-label";
  label.textContent = file.filename.replace(/\.pdf$/i, "");

  // autor (si existe)
  const author = document.createElement("div");
  author.className   = "file-author";
  author.textContent = file.author ? file.author : "";

  // hashtags
  const tags = document.createElement("div");
  tags.className = "file-tags";
  (file.hashtags || []).slice(0, 3).forEach(tag => {
    const span = document.createElement("span");
    span.className   = "file-tag";
    span.textContent = `#${tag}`;
    tags.appendChild(span);
  });

  card.appendChild(iconWrap);
  card.appendChild(label);
  if (file.author) card.appendChild(author);
  card.appendChild(tags);

  return card;
}

/* SVG pixel-art de documento (16×16 grid, escalado a 56×64) */
function svgDocIcon(is18) {
  // color del texto del icono: rojo si es +18
  const textColor = is18 ? "#ff4444" : "var(--icon-doc-text)";
  const label     = is18 ? "+18" : "PDF";

  return `<svg viewBox="0 0 16 20" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
    <!-- cuerpo del documento -->
    <rect x="1"  y="0"  width="10" height="1"  fill="var(--icon-doc-border)"/>
    <rect x="1"  y="1"  width="1"  height="17" fill="var(--icon-doc-border)"/>
    <rect x="1"  y="18" width="14" height="1"  fill="var(--icon-doc-border)"/>
    <rect x="14" y="4"  width="1"  height="15" fill="var(--icon-doc-border)"/>
    <rect x="11" y="0"  width="1"  height="1"  fill="var(--icon-doc-border)"/>
    <rect x="12" y="1"  width="1"  height="1"  fill="var(--icon-doc-border)"/>
    <rect x="13" y="2"  width="1"  height="1"  fill="var(--icon-doc-border)"/>
    <rect x="14" y="3"  width="1"  height="1"  fill="var(--icon-doc-border)"/>
    <!-- relleno blanco del cuerpo -->
    <rect x="2"  y="1"  width="9"  height="17" fill="var(--icon-doc-body)"/>
    <rect x="11" y="1"  width="3"  height="3"  fill="var(--icon-doc-body)"/>
    <rect x="11" y="4"  width="3"  height="14" fill="var(--icon-doc-body)"/>
    <!-- esquina doblada (triángulo) -->
    <rect x="11" y="1"  width="1"  height="1"  fill="var(--icon-doc-fold)"/>
    <rect x="11" y="2"  width="2"  height="1"  fill="var(--icon-doc-fold)"/>
    <rect x="11" y="3"  width="3"  height="1"  fill="var(--icon-doc-fold)"/>
    <!-- líneas de texto simuladas -->
    <rect x="3"  y="8"  width="9"  height="1"  fill="var(--icon-doc-border)" opacity="0.25"/>
    <rect x="3"  y="10" width="8"  height="1"  fill="var(--icon-doc-border)" opacity="0.25"/>
    <rect x="3"  y="12" width="9"  height="1"  fill="var(--icon-doc-border)" opacity="0.25"/>
    <rect x="3"  y="14" width="6"  height="1"  fill="var(--icon-doc-border)" opacity="0.25"/>
    <!-- etiqueta PDF / +18 -->
    <text x="8" y="6.5" text-anchor="middle"
          font-size="3.5" font-family="monospace" font-weight="700"
          fill="${textColor}">${label}</text>
  </svg>`;
}


/* ============================================================
   MODO +18 Y VELO DE CONFIRMACIÓN
   ============================================================ */

/* el botón "soy mayor de 18" muestra el velo primero */
function handleBtn18Click() {
  if (state.mode18) {
    // si ya está activo, lo desactiva directamente
    deactivate18Mode();
  } else {
    // si no está activo, muestra el velo de confirmación
    showAgeVeil();
  }
}

function showAgeVeil() {
  dom.ageVeil.hidden = false;
}

function hideAgeVeil() {
  dom.ageVeil.hidden = true;
}

function activate18Mode() {
  state.mode18 = true;
  document.body.classList.add("mode-18");
  dom.btn18.textContent = "modo normal";
  console.log("[arxiu] modo +18 activado");
  renderFiles();
}

function deactivate18Mode() {
  state.mode18 = false;
  document.body.classList.remove("mode-18");
  dom.btn18.textContent = "soy mayor de 18";
  console.log("[arxiu] modo +18 desactivado");
  renderFiles();
}


/* ============================================================
   MODAL DE SUBIDA
   ============================================================ */
function openModal() {
  dom.modalUpload.hidden  = false;
  dom.modalOverlay.hidden = false;
  dom.uploadForm.reset();
  dom.fileInfo.textContent = "";
  resetUploadStatus();
  dom.inputAuthor.focus();
}

function closeModal() {
  dom.modalUpload.hidden  = true;
  dom.modalOverlay.hidden = true;
  resetUploadStatus();
}

function resetUploadStatus() {
  dom.uploadStatus.hidden       = true;
  dom.statusMsg.textContent     = "";
  dom.progressBar.style.width   = "0%";
  dom.btnSubmit.disabled        = false;
}

function setStatus(msg, progress) {
  dom.uploadStatus.hidden   = false;
  dom.statusMsg.textContent = msg;
  if (progress !== undefined) dom.progressBar.style.width = `${progress}%`;
  console.log(`[arxiu] ${msg}`);
}


/* ============================================================
   DRAG & DROP
   ============================================================ */
function bindDropZone() {
  // clic en la zona → abrir selector de archivo
  dom.dropZone.addEventListener("click", () => dom.inputFile.click());
  dom.dropZone.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") dom.inputFile.click();
  });

  // arrastrar sobre la zona
  dom.dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dom.dropZone.classList.add("drag-over");
  });
  dom.dropZone.addEventListener("dragleave", () => {
    dom.dropZone.classList.remove("drag-over");
  });

  // soltar archivo
  dom.dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dom.dropZone.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelection(file);
  });

  // selector nativo
  dom.inputFile.addEventListener("change", () => {
    if (dom.inputFile.files[0]) handleFileSelection(dom.inputFile.files[0]);
  });
}

function handleFileSelection(file) {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    dom.fileInfo.textContent = "solo se admiten archivos .pdf";
    console.warn("[arxiu] archivo rechazado: no es PDF");
    return;
  }
  if (file.size > CONFIG.MAX_FILE_SIZE) {
    const mb = (CONFIG.MAX_FILE_SIZE / 1024 / 1024).toFixed(0);
    dom.fileInfo.textContent = `el archivo supera el límite de ${mb} mb`;
    console.warn("[arxiu] archivo rechazado: demasiado grande");
    return;
  }
  dom.fileInfo.textContent = `${file.name} · ${(file.size / 1024).toFixed(0)} kb`;

  // inyectar el archivo en el input nativo para usarlo al enviar
  const dt = new DataTransfer();
  dt.items.add(file);
  dom.inputFile.files = dt.files;
}


/* ============================================================
   SUBIDA A GITHUB VIA API REST
   Pasos:
   1. Leer el archivo como base64
   2. Subir el PDF a /data/{filename}
   3. Leer el data.json actual (necesitamos su SHA para actualizarlo)
   4. Añadir la nueva entrada al JSON
   5. Subir el data.json actualizado
   ============================================================ */
async function handleUpload(e) {
  e.preventDefault();

  const file = dom.inputFile.files[0];
  if (!file) {
    setStatus("selecciona un archivo primero.");
    return;
  }

  // parsear autor
  const author = dom.inputAuthor.value.trim();

  // parsear hashtags: separar por coma, limpiar espacios y '#'
  const hashtags = dom.inputHashtags.value
    .split(",")
    .map(t => t.trim().replace(/^#/, "").toLowerCase())
    .filter(t => t.length > 0);

  // pedir token si no lo tenemos aún en esta sesión
  if (!state.githubToken) {
    const token = prompt(
      "introduce tu GitHub Personal Access Token (PAT).\n" +
      "necesita permisos de escritura en el repo (scope: repo o contents:write).\n" +
      "solo se pedirá una vez por sesión."
    );
    if (!token) {
      setStatus("subida cancelada: no se proporcionó token.");
      return;
    }
    state.githubToken = token.trim();
  }

  dom.btnSubmit.disabled = true;

  try {
    // paso 1: leer el archivo como base64
    setStatus("leyendo archivo...", 10);
    const base64 = await fileToBase64(file);

    // paso 2: subir el PDF
    setStatus("subiendo pdf al repositorio...", 25);
    const filename = sanitizeFilename(file.name);
    await githubPutFile(`data/${filename}`, base64, `subir: ${filename}`);
    setStatus("pdf guardado.", 50);

    // paso 3: leer el data.json actual
    setStatus("leyendo índice actual...", 60);
    const { content: rawContent, sha: jsonSha } = await githubGetFile("data.json");
    const data = JSON.parse(atob(rawContent.replace(/\n/g, "")));

    // paso 4: añadir la nueva entrada
    setStatus("añadiendo entrada al índice...", 75);
    const newEntry = {
      id:          generateId(),
      filename:    filename,
      author:      author || null,
      hashtags:    hashtags,
      is_18_plus:  false,
      upload_date: new Date().toISOString(),
    };
    data.files.push(newEntry);

    // actualizar lista de hashtags únicos y ordenados
    hashtags.forEach(tag => {
      if (!data.hashtags.includes(tag)) data.hashtags.push(tag);
    });
    data.hashtags.sort();

    // paso 5: subir el data.json actualizado
    setStatus("guardando índice actualizado...", 88);
    const updatedBase64 = btoa(unescape(encodeURIComponent(
      JSON.stringify(data, null, 2)
    )));
    await githubPutFile("data.json", updatedBase64, `index: añadir ${filename}`, jsonSha);

    setStatus("¡listo! el archivo ya está en el arxiu.", 100);

    // actualizar la interfaz sin recargar la página
    state.files    = data.files;
    state.hashtags = data.hashtags;
    renderHashtags();
    renderFiles();

    // cerrar el modal tras un momento
    setTimeout(closeModal, 1800);

  } catch (err) {
    console.error("[arxiu] error en la subida:", err);
    setStatus(`error: ${err.message}`);
    dom.btnSubmit.disabled = false;
  }
}


/* ============================================================
   HELPERS DE LA API DE GITHUB
   ============================================================ */

/* leer un archivo del repositorio → devuelve { content, sha } */
async function githubGetFile(path) {
  const url = `https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/contents/${path}?ref=${CONFIG.GITHUB_BRANCH}`;
  const res  = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${state.githubToken}`,
      "Accept":        "application/vnd.github+json",
    },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || `error al leer ${path}`);
  }
  return res.json();
}

/* crear o actualizar un archivo en el repositorio */
async function githubPutFile(path, base64Content, message, sha = undefined) {
  const url  = `https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/contents/${path}`;
  const body = { message, content: base64Content, branch: CONFIG.GITHUB_BRANCH };
  if (sha) body.sha = sha; // sha requerido para actualizar un archivo existente

  const res = await fetch(url, {
    method:  "PUT",
    headers: {
      "Authorization": `Bearer ${state.githubToken}`,
      "Accept":        "application/vnd.github+json",
      "Content-Type":  "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || `error al escribir ${path}`);
  }
  return res.json();
}


/* ============================================================
   UTILIDADES
   ============================================================ */

/* convierte un File a string base64 (sin el prefijo data:...) */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* limpia el nombre del archivo para que sea seguro en URLs y sistemas de archivos */
function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._-]/g, "");
}

/* genera un ID único basado en timestamp + random */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}


/* ============================================================
   BINDING DE EVENTOS
   ============================================================ */
function bindEvents() {
  // botones del footer
  dom.btnUpload.addEventListener("click", openModal);
  dom.btn18.addEventListener("click", handleBtn18Click);

  // velo de confirmación de edad
  dom.ageConfirmYes.addEventListener("click", () => {
    hideAgeVeil();
    activate18Mode();
  });
  dom.ageConfirmNo.addEventListener("click", () => {
    hideAgeVeil();
  });

  // cerrar modal
  dom.modalClose.addEventListener("click", closeModal);
  dom.modalOverlay.addEventListener("click", closeModal);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeModal();
      hideAgeVeil();
    }
  });

  // formulario de subida
  dom.uploadForm.addEventListener("submit", handleUpload);

  // zona de arrastre
  bindDropZone();
}
