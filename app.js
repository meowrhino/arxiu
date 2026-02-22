/* ============================================================
   CONFIGURACIÓN
   Edita estas variables antes de subir el proyecto a GitHub.
   ============================================================ */
const CONFIG = {
  // tu usuario de GitHub
  GITHUB_USER:  "meowrhino",
  // nombre del repositorio donde vive esta app
  GITHUB_REPO:  "arxiu",
  // rama principal del repositorio
  GITHUB_BRANCH: "main",
  // tamaño máximo de archivo en bytes (2 MB)
  MAX_FILE_SIZE: 2 * 1024 * 1024,
};

/* ============================================================
   ESTADO GLOBAL
   ============================================================ */
let state = {
  files:          [],      // todos los archivos del data.json
  hashtags:       [],      // todos los hashtags únicos
  activeTag:      null,    // hashtag activo para filtrar (null = todos)
  mode18:         false,   // si el modo +18 está activo
  githubToken:    null,    // token de GitHub (se pide una sola vez)
};

/* ============================================================
   REFERENCIAS AL DOM
   ============================================================ */
const dom = {
  hashtagNav:   document.getElementById("hashtag-nav"),
  fileGrid:     document.getElementById("file-grid"),
  btnUpload:    document.getElementById("btn-upload"),
  btn18:        document.getElementById("btn-18"),

  // modal de subida
  modalUpload:  document.getElementById("modal-upload"),
  modalOverlay: document.getElementById("modal-overlay"),
  modalClose:   document.getElementById("modal-close-btn"),
  uploadForm:   document.getElementById("upload-form"),
  dropZone:     document.getElementById("drop-zone"),
  inputFile:    document.getElementById("input-file"),
  fileInfo:     document.getElementById("file-info"),
  inputTags:    document.getElementById("input-hashtags"),
  btnSubmit:    document.getElementById("btn-submit"),
  uploadStatus: document.getElementById("upload-status"),
  statusMsg:    document.getElementById("status-msg"),
  progressBar:  document.getElementById("progress-bar"),
};


/* ============================================================
   ARRANQUE
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  console.log("[arxiu] iniciando...");
  loadData();
  bindEvents();
});


/* ============================================================
   CARGA DE DATOS
   Lee el data.json del repositorio y actualiza el estado.
   ============================================================ */
async function loadData() {
  try {
    // añadimos un timestamp para evitar caché del navegador
    const url = `data.json?t=${Date.now()}`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`http ${res.status}`);
    const json = await res.json();

    state.files    = json.files    || [];
    state.hashtags = json.hashtags || [];

    console.log(`[arxiu] ${state.files.length} archivos cargados`);
    renderHashtags();
    renderFiles();
  } catch (err) {
    console.error("[arxiu] error al cargar data.json:", err);
    dom.fileGrid.innerHTML = `<p id="empty-msg">error al cargar los archivos. revisa la consola.</p>`;
  }
}


/* ============================================================
   RENDERIZADO DE HASHTAGS
   Construye los botones de filtro en la barra superior.
   ============================================================ */
function renderHashtags() {
  dom.hashtagNav.innerHTML = "";

  // botón "todos"
  const allBtn = makeTagButton("todos", null, !state.activeTag);
  allBtn.classList.add("all-btn");
  dom.hashtagNav.appendChild(allBtn);

  // un botón por cada hashtag
  state.hashtags.forEach(tag => {
    const btn = makeTagButton(`#${tag}`, tag, state.activeTag === tag);
    dom.hashtagNav.appendChild(btn);
  });
}

function makeTagButton(label, tagValue, isActive) {
  const btn = document.createElement("button");
  btn.className   = "tag-btn" + (isActive ? " active" : "");
  btn.textContent = label;
  btn.addEventListener("click", () => {
    state.activeTag = tagValue;
    renderHashtags();
    renderFiles();
  });
  return btn;
}


/* ============================================================
   RENDERIZADO DE ARCHIVOS
   Muestra la lista de archivos filtrada según el estado.
   ============================================================ */
function renderFiles() {
  dom.fileGrid.innerHTML = "";

  // filtrar por modo +18 y por hashtag activo
  const visible = state.files.filter(file => {
    if (file.is_18_plus && !state.mode18) return false;
    if (state.activeTag && !file.hashtags.includes(state.activeTag)) return false;
    return true;
  });

  if (visible.length === 0) {
    dom.fileGrid.innerHTML = `<p id="empty-msg">no hay archivos aquí todavía.</p>`;
    return;
  }

  visible.forEach(file => {
    const card = makeFileCard(file);
    dom.fileGrid.appendChild(card);
  });
}

function makeFileCard(file) {
  // la tarjeta es un enlace que abre el PDF en una nueva pestaña
  const card = document.createElement("a");
  card.className = "file-card";
  card.href      = `data/${file.filename}`;
  card.target    = "_blank";
  card.rel       = "noopener noreferrer";

  // icono SVG de documento
  const icon = document.createElement("div");
  icon.className = "file-icon";
  icon.innerHTML = svgDocumentIcon();

  // info: nombre y hashtags
  const info = document.createElement("div");
  info.className = "file-info";

  const name = document.createElement("div");
  name.className   = "file-name";
  name.textContent = file.filename.replace(/\.pdf$/i, "");

  const tags = document.createElement("div");
  tags.className = "file-tags";
  (file.hashtags || []).forEach(tag => {
    const span = document.createElement("span");
    span.className   = "file-tag";
    span.textContent = `#${tag}`;
    tags.appendChild(span);
  });

  info.appendChild(name);
  info.appendChild(tags);

  // fecha
  const date = document.createElement("div");
  date.className   = "file-date";
  date.textContent = formatDate(file.upload_date);

  card.appendChild(icon);
  card.appendChild(info);
  card.appendChild(date);

  return card;
}

function formatDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function svgDocumentIcon() {
  // icono minimalista de documento con esquina doblada
  return `<svg viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 2h20l8 8v32a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
          fill="var(--icon-bg)" stroke="var(--icon-border)" stroke-width="1.5"/>
    <path d="M24 2v8h8" stroke="var(--icon-border)" stroke-width="1.5" fill="none"/>
    <text x="18" y="32" text-anchor="middle" font-size="8"
          font-family="var(--font-mono)" fill="var(--tag-color)" font-weight="700">PDF</text>
  </svg>`;
}


/* ============================================================
   MODO +18
   Alterna el tema oscuro/amarillo y muestra/oculta contenido.
   ============================================================ */
function toggle18Mode() {
  state.mode18 = !state.mode18;
  document.body.classList.toggle("mode-18", state.mode18);
  dom.btn18.textContent = state.mode18 ? "modo normal" : "soy mayor de 18";
  console.log(`[arxiu] modo +18: ${state.mode18}`);
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
  dom.inputTags.focus();
}

function closeModal() {
  dom.modalUpload.hidden  = true;
  dom.modalOverlay.hidden = true;
  resetUploadStatus();
}

function resetUploadStatus() {
  dom.uploadStatus.hidden = true;
  dom.statusMsg.textContent = "";
  dom.progressBar.style.width = "0%";
  dom.btnSubmit.disabled = false;
}

function setStatus(msg, progress) {
  dom.uploadStatus.hidden = false;
  dom.statusMsg.textContent = msg;
  if (progress !== undefined) {
    dom.progressBar.style.width = `${progress}%`;
  }
  console.log(`[arxiu] ${msg}`);
}


/* ============================================================
   DRAG & DROP en la zona de arrastre
   ============================================================ */
function bindDropZone() {
  dom.dropZone.addEventListener("click", () => dom.inputFile.click());

  dom.dropZone.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") dom.inputFile.click();
  });

  dom.dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dom.dropZone.classList.add("drag-over");
  });

  dom.dropZone.addEventListener("dragleave", () => {
    dom.dropZone.classList.remove("drag-over");
  });

  dom.dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dom.dropZone.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelection(file);
  });

  dom.inputFile.addEventListener("change", () => {
    const file = dom.inputFile.files[0];
    if (file) handleFileSelection(file);
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

  // guardamos el archivo en el input para usarlo al enviar
  const dt = new DataTransfer();
  dt.items.add(file);
  dom.inputFile.files = dt.files;
}


/* ============================================================
   SUBIDA A GITHUB
   Usa la API REST de GitHub para:
   1. Subir el PDF a /data/{filename}
   2. Leer el data.json actual
   3. Añadir la nueva entrada
   4. Subir el data.json actualizado
   ============================================================ */
async function handleUpload(e) {
  e.preventDefault();

  const file = dom.inputFile.files[0];
  if (!file) {
    setStatus("selecciona un archivo primero.");
    return;
  }

  // parsear hashtags: separar por coma, limpiar espacios y '#'
  const rawTags   = dom.inputTags.value;
  const hashtags  = rawTags
    .split(",")
    .map(t => t.trim().replace(/^#/, "").toLowerCase())
    .filter(t => t.length > 0);

  // pedir token si no lo tenemos aún
  if (!state.githubToken) {
    const token = prompt(
      "introduce tu GitHub Personal Access Token (PAT) con permisos de escritura en el repo.\n" +
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
    // --- paso 1: leer el archivo como base64 ---
    setStatus("leyendo archivo...", 10);
    const base64Content = await fileToBase64(file);

    // --- paso 2: subir el PDF al repositorio ---
    setStatus("subiendo pdf...", 30);
    const filename  = sanitizeFilename(file.name);
    const pdfPath   = `data/${filename}`;
    await githubPutFile(pdfPath, base64Content, `subir: ${filename}`);
    setStatus("pdf subido.", 55);

    // --- paso 3: leer el data.json actual ---
    setStatus("actualizando índice...", 65);
    const { content: currentJson, sha: jsonSha } = await githubGetFile("data.json");
    const data = JSON.parse(atob(currentJson));

    // --- paso 4: añadir la nueva entrada ---
    const newEntry = {
      id:          generateId(),
      filename:    filename,
      hashtags:    hashtags,
      is_18_plus:  false,
      upload_date: new Date().toISOString(),
    };
    data.files.push(newEntry);

    // actualizar la lista de hashtags únicos
    hashtags.forEach(tag => {
      if (!data.hashtags.includes(tag)) data.hashtags.push(tag);
    });
    data.hashtags.sort();

    // --- paso 5: subir el data.json actualizado ---
    setStatus("guardando índice...", 80);
    const updatedJsonBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    await githubPutFile("data.json", updatedJsonBase64, `index: añadir ${filename}`, jsonSha);

    setStatus("¡listo! el archivo ya está en el arxiu.", 100);

    // actualizar la interfaz sin recargar
    state.files    = data.files;
    state.hashtags = data.hashtags;
    renderHashtags();
    renderFiles();

    // cerrar el modal después de un momento
    setTimeout(closeModal, 1800);

  } catch (err) {
    console.error("[arxiu] error en la subida:", err);
    setStatus(`error: ${err.message}`);
    dom.btnSubmit.disabled = false;
  }
}

/* --- helpers de la API de GitHub --- */

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
  return res.json(); // devuelve { content, sha, ... }
}

async function githubPutFile(path, base64Content, message, sha = undefined) {
  const url  = `https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.GITHUB_REPO}/contents/${path}`;
  const body = {
    message: message,
    content: base64Content,
    branch:  CONFIG.GITHUB_BRANCH,
  };
  if (sha) body.sha = sha; // necesario para actualizar un archivo existente

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

/* --- utilidades --- */

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => {
      // el resultado es "data:application/pdf;base64,XXXX"
      // nos quedamos solo con la parte base64
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function sanitizeFilename(name) {
  // minúsculas, sin espacios, solo caracteres seguros
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._-]/g, "");
}

function generateId() {
  // id único basado en timestamp + random
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}


/* ============================================================
   EVENTOS
   ============================================================ */
function bindEvents() {
  // botones del footer
  dom.btnUpload.addEventListener("click", openModal);
  dom.btn18.addEventListener("click", toggle18Mode);

  // cerrar modal
  dom.modalClose.addEventListener("click", closeModal);
  dom.modalOverlay.addEventListener("click", closeModal);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
  });

  // formulario de subida
  dom.uploadForm.addEventListener("submit", handleUpload);

  // zona de arrastre
  bindDropZone();
}
