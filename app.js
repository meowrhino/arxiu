const CONFIG = {
  API_URL:       "https://api.arxiu.meowrhino.studio",
  MAX_FILE_SIZE: 2 * 1024 * 1024,
};


const state = {
  files:     [],
  hashtags:  [],
  activeTag: null,
  mode18:    false,
};


/* ============================================================
   REFERENCIAS AL DOM
   ============================================================ */
const dom = {
  /* ventana principal */
  hashtagNav:      document.getElementById("hashtag-nav"),
  fileGrid:        document.getElementById("file-grid"),
  statusCount:     document.getElementById("status-count"),

  /* botones fuera de la ventana */
  btnUpload:       document.getElementById("btn-upload"),
  btnCreate:       document.getElementById("btn-create"),
  btn18:           document.getElementById("btn-18"),

  /* velo de confirmación de edad */
  ageVeil:         document.getElementById("age-veil"),
  ageYes:          document.getElementById("age-yes"),
  ageNo:           document.getElementById("age-no"),

  /* modal de subida */
  modalUpload:     document.getElementById("modal-upload"),
  modalOverlay:    document.getElementById("modal-overlay"),
  modalCloseDot:   document.getElementById("modal-close-dot"),
  uploadForm:      document.getElementById("upload-form"),
  inputAuthor:     document.getElementById("input-author"),
  inputName:       document.getElementById("input-name"),
  inputHashtags:   document.getElementById("input-hashtags"),
  dropZone:        document.getElementById("drop-zone"),
  inputFile:       document.getElementById("input-file"),
  fileInfo:        document.getElementById("file-info"),
  btnSubmit:       document.getElementById("btn-submit"),

  /* vistas del modal */
  formView:        document.getElementById("modal-form-view"),
  progressView:    document.getElementById("modal-progress-view"),

  /* progreso tipo transferencia */
  transferFilename: document.getElementById("transfer-filename"),
  transferStatus:   document.getElementById("transfer-status"),
  progressFill:     document.getElementById("progress-fill"),
  progressPercent:  document.getElementById("progress-percent"),

  /* modal del editor de texto */
  modalEditor:           document.getElementById("modal-editor"),
  editorCloseDot:        document.getElementById("editor-close-dot"),
  editorForm:            document.getElementById("editor-form"),
  editorTitle:           document.getElementById("editor-title"),
  editorAuthor:          document.getElementById("editor-author"),
  editorHashtags:        document.getElementById("editor-hashtags"),
  editorContent:         document.getElementById("editor-content"),
  btnCreateSubmit:       document.getElementById("btn-create-submit"),

  /* vistas del modal editor */
  editorFormView:        document.getElementById("editor-form-view"),
  editorProgressView:    document.getElementById("editor-progress-view"),

  /* progreso del editor */
  editorTransferFilename: document.getElementById("editor-transfer-filename"),
  editorTransferStatus:   document.getElementById("editor-transfer-status"),
  editorProgressFill:     document.getElementById("editor-progress-fill"),
  editorProgressPercent:  document.getElementById("editor-progress-percent"),
};


/* ============================================================
   ARRANQUE
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  console.log("[arxiu] iniciando...");
  bindEvents();
  loadData();
});


async function loadData() {
  try {
    const res = await fetch(`${CONFIG.API_URL}/files`, { cache: "no-store" });
    if (!res.ok) throw new Error(`http ${res.status}`);
    const json = await res.json();

    state.files    = json.files || [];
    state.hashtags = json.hashtags || [];

    console.log(`[arxiu] ${state.files.length} archivos cargados`);
    renderHashtags();
    renderFiles();
  } catch (err) {
    console.error("[arxiu] error al cargar datos:", err);
    dom.fileGrid.innerHTML = `<p id="empty-msg">error al cargar archivos.</p>`;
  }
}


/* ============================================================
   RENDERIZADO DE HASHTAGS
   ============================================================ */
function renderHashtags() {
  dom.hashtagNav.innerHTML = "";

  /* botón "todos" */
  dom.hashtagNav.appendChild(
    createTagButton("todos", null, state.activeTag === null)
  );

  /* un botón por hashtag */
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
   ============================================================ */
function renderFiles() {
  dom.fileGrid.innerHTML = "";

  const visible = state.files.filter(f => {
    if (f.is_18_plus && !state.mode18) return false;
    if (state.activeTag && !(f.hashtags || []).includes(state.activeTag)) return false;
    return true;
  });

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
  card.href      = getPdfUrl(file);
  card.target    = "_blank";
  card.rel       = "noopener noreferrer";
  card.title     = file.filename;

  /* icono SVG pixel-art */
  const iconWrap = document.createElement("div");
  iconWrap.className = "file-icon-wrap";
  iconWrap.innerHTML = svgDocIcon(file.is_18_plus);

  /* nombre (sin extensión) */
  const label = document.createElement("div");
  label.className   = "file-label";
  label.textContent = file.filename.replace(/\.pdf$/i, "");

  /* autor */
  const author = document.createElement("div");
  author.className   = "file-author";
  author.textContent = file.author || "";

  /* hashtags (máx 3 visibles) */
  const tags = document.createElement("div");
  tags.className = "file-tags";
  (file.hashtags || []).slice(0, 3).forEach(tag => {
    const span = document.createElement("span");
    span.className   = "file-tag";
    span.textContent = `#${tag}`;
    tags.appendChild(span);
  });

  /* badge +18 */
  if (file.is_18_plus) {
    const badge = document.createElement("span");
    badge.className   = "file-badge-18";
    badge.textContent = "+18";
    tags.prepend(badge);
  }

  card.appendChild(iconWrap);
  card.appendChild(label);
  if (file.author) card.appendChild(author);
  card.appendChild(tags);

  return card;
}

function getPdfUrl(file) {
  return `${CONFIG.API_URL}/files/${encodeURIComponent(file.id)}`;
}

/* SVG pixel-art de documento (16×20 viewbox) */
function svgDocIcon(is18) {
  const accent = is18 ? "#cc0000" : "var(--icon-doc-text)";
  const label  = is18 ? "+18" : "PDF";

  return `<svg viewBox="0 0 16 20" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
    <rect x="1" y="0" width="10" height="1" fill="var(--icon-doc-border)"/>
    <rect x="1" y="1" width="1" height="17" fill="var(--icon-doc-border)"/>
    <rect x="1" y="18" width="14" height="1" fill="var(--icon-doc-border)"/>
    <rect x="14" y="4" width="1" height="15" fill="var(--icon-doc-border)"/>
    <rect x="11" y="0" width="1" height="1" fill="var(--icon-doc-border)"/>
    <rect x="12" y="1" width="1" height="1" fill="var(--icon-doc-border)"/>
    <rect x="13" y="2" width="1" height="1" fill="var(--icon-doc-border)"/>
    <rect x="14" y="3" width="1" height="1" fill="var(--icon-doc-border)"/>
    <rect x="2" y="1" width="9" height="17" fill="var(--icon-doc-body)"/>
    <rect x="11" y="4" width="3" height="14" fill="var(--icon-doc-body)"/>
    <rect x="11" y="1" width="1" height="1" fill="var(--icon-doc-fold)"/>
    <rect x="11" y="2" width="2" height="1" fill="var(--icon-doc-fold)"/>
    <rect x="11" y="3" width="3" height="1" fill="var(--icon-doc-fold)"/>
    <rect x="3" y="8" width="9" height="1" fill="var(--icon-doc-border)" opacity="0.2"/>
    <rect x="3" y="10" width="8" height="1" fill="var(--icon-doc-border)" opacity="0.2"/>
    <rect x="3" y="12" width="9" height="1" fill="var(--icon-doc-border)" opacity="0.2"/>
    <rect x="3" y="14" width="6" height="1" fill="var(--icon-doc-border)" opacity="0.2"/>
    <text x="8" y="6.5" text-anchor="middle"
          font-size="3.5" font-family="monospace" font-weight="700"
          fill="${accent}">${label}</text>
  </svg>`;
}


/* ============================================================
   MODO +18 Y VELO DE CONFIRMACIÓN
   ============================================================ */
function handleBtn18Click() {
  if (state.mode18) {
    deactivate18();
  } else {
    showVeil(dom.ageVeil);
  }
}

function activate18() {
  state.mode18 = true;
  document.body.classList.add("mode-18");
  dom.btn18.textContent = "modo normal";
  console.log("[arxiu] modo +18 activado");
  renderFiles();
}

function deactivate18() {
  state.mode18 = false;
  document.body.classList.remove("mode-18");
  dom.btn18.textContent = "soy mayor de 18";
  console.log("[arxiu] modo +18 desactivado");
  renderFiles();
}


/* ============================================================
   VELOS (mostrar / ocultar)
   ============================================================ */
function showVeil(el) { el.hidden = false; }
function hideVeil(el) { el.hidden = true; }


/* ============================================================
   MODAL DE SUBIDA
   ============================================================ */
function openModal() {
  dom.modalUpload.hidden  = false;
  dom.modalOverlay.hidden = false;

  /* mostrar formulario, ocultar progreso */
  dom.formView.hidden     = false;
  dom.progressView.hidden = true;

  dom.uploadForm.reset();
  dom.inputName.value    = "";
  dom.fileInfo.textContent = "";
  dom.btnSubmit.disabled = false;
  dom.inputAuthor.focus();
}

function closeModal() {
  dom.modalUpload.hidden  = true;
  dom.modalOverlay.hidden = true;
}

/* cambiar a vista de progreso (tipo transferencia) */
function switchToProgress(filename) {
  dom.formView.hidden     = true;
  dom.progressView.hidden = false;
  dom.transferFilename.textContent = filename;
  dom.transferStatus.textContent   = "preparando...";
  dom.progressFill.style.width     = "0%";
  dom.progressPercent.textContent  = "0%";
}

function updateProgress(status, percent) {
  dom.transferStatus.textContent  = status;
  dom.progressFill.style.width    = `${percent}%`;
  dom.progressPercent.textContent = `${percent}%`;
  console.log(`[arxiu] ${status} (${percent}%)`);
}


/* ============================================================
   DRAG & DROP
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
    if (e.dataTransfer.files[0]) handleFileSelection(e.dataTransfer.files[0]);
  });

  dom.inputFile.addEventListener("change", () => {
    if (dom.inputFile.files[0]) handleFileSelection(dom.inputFile.files[0]);
  });
}

function handleFileSelection(file) {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    dom.fileInfo.textContent = "solo se admiten archivos .pdf";
    console.warn("[arxiu] archivo rechazado: no es pdf");
    return;
  }
  if (file.size > CONFIG.MAX_FILE_SIZE) {
    const mb = (CONFIG.MAX_FILE_SIZE / 1024 / 1024).toFixed(0);
    dom.fileInfo.textContent = `el archivo supera el límite de ${mb} mb`;
    console.warn("[arxiu] archivo rechazado: demasiado grande");
    return;
  }

  /* mostrar info y rellenar el campo de nombre */
  dom.fileInfo.textContent = `${file.name} · ${(file.size / 1024).toFixed(0)} kb`;
  dom.inputName.value = file.name.replace(/\.pdf$/i, "");

  /* inyectar en el input nativo */
  const dt = new DataTransfer();
  dt.items.add(file);
  dom.inputFile.files = dt.files;
}


async function handleUpload(e) {
  e.preventDefault();

  const file = dom.inputFile.files[0];
  if (!file) {
    dom.fileInfo.textContent = "selecciona un archivo primero.";
    return;
  }

  const author = dom.inputAuthor.value.trim();
  const hashtags = dom.inputHashtags.value
    .split(",")
    .map(t => t.trim().replace(/^#/, "").toLowerCase())
    .filter(t => t.length > 0)
    .join(",");

  const filename = sanitizeFilename(file.name);

  switchToProgress(filename);
  dom.btnSubmit.disabled = true;

  try {
    updateProgress("subiendo...", 20);
    const renamed = new File([file], filename, { type: "application/pdf" });
    const res = await uploadToApi(renamed, { author, hashtags, is_18_plus: false }, p => {
      updateProgress("subiendo...", Math.max(20, Math.min(90, 20 + Math.round(p * 70))));
    });

    if (!res.ok) throw new Error(res.error || "error al subir");

    updateProgress("actualizando lista...", 95);
    await loadData();
    updateProgress("¡listo!", 100);

    setTimeout(closeModal, 700);
  } catch (err) {
    console.error("[arxiu] error en la subida:", err);
    updateProgress(`error: ${err.message}`, 0);
  }
}


/* ============================================================
   MODAL DEL EDITOR DE TEXTO
   ============================================================ */
function openEditorModal() {
  dom.modalEditor.hidden  = false;
  dom.modalOverlay.hidden = false;

  /* mostrar formulario, ocultar progreso */
  dom.editorFormView.hidden     = false;
  dom.editorProgressView.hidden = true;

  dom.editorForm.reset();
  dom.editorContent.value = "";
  dom.btnCreateSubmit.disabled = false;
  dom.editorTitle.focus();
}

function closeEditorModal() {
  dom.modalEditor.hidden  = true;
  dom.modalOverlay.hidden = true;
}

function editorSwitchToProgress(filename) {
  dom.editorFormView.hidden     = true;
  dom.editorProgressView.hidden = false;
  dom.editorTransferFilename.textContent = filename;
  dom.editorTransferStatus.textContent   = "preparando...";
  dom.editorProgressFill.style.width     = "0%";
  dom.editorProgressPercent.textContent  = "0%";
}

function editorUpdateProgress(status, percent) {
  dom.editorTransferStatus.textContent  = status;
  dom.editorProgressFill.style.width    = `${percent}%`;
  dom.editorProgressPercent.textContent = `${percent}%`;
  console.log(`[arxiu] editor: ${status} (${percent}%)`);
}


/* ============================================================
   EDITOR: barra de herramientas (markdown)
   ============================================================ */
function bindEditorToolbar() {
  document.querySelectorAll(".editor-tool[data-md]").forEach(btn => {
    btn.addEventListener("mousedown", e => e.preventDefault());
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const action = btn.dataset.md;
      switch (action) {
        case "bold":   insertMarkdownWrap("**", "**"); break;
        case "italic": insertMarkdownWrap("*", "*"); break;
        case "h1":     insertMarkdownLine("# "); break;
        case "h2":     insertMarkdownLine("## "); break;
        case "h3":     insertMarkdownLine("### "); break;
        case "ul":     insertMarkdownLine("- "); break;
        case "ol":     insertMarkdownLine("1. "); break;
        case "hr":     insertMarkdownBlock("\n---\n"); break;
      }
    });
  });
}

/* insertar markdown alrededor de la selección en el textarea */
function insertMarkdownWrap(before, after) {
  const ta = dom.editorContent;
  const start = ta.selectionStart;
  const end   = ta.selectionEnd;
  const text  = ta.value;
  const selected = text.substring(start, end) || "texto";

  const insert = before + selected + after;
  ta.setRangeText(insert, start, end, "select");

  /* seleccionar solo el texto interior (sin los marcadores) */
  ta.selectionStart = start + before.length;
  ta.selectionEnd   = start + before.length + selected.length;
  ta.focus();
}

/* insertar prefijo markdown al inicio de la línea actual */
function insertMarkdownLine(prefix) {
  const ta = dom.editorContent;
  const start = ta.selectionStart;
  const text  = ta.value;

  /* encontrar el inicio de la línea */
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;

  /* comprobar si el prefijo ya está — toggle */
  const currentLine = text.substring(lineStart);
  if (currentLine.startsWith(prefix)) {
    /* quitar el prefijo */
    ta.setRangeText("", lineStart, lineStart + prefix.length, "end");
  } else {
    /* si hay otro heading/list prefix, reemplazarlo */
    const existingPrefix = currentLine.match(/^(#{1,3}\s|[-*]\s|\d+\.\s)/);
    if (existingPrefix) {
      ta.setRangeText(prefix, lineStart, lineStart + existingPrefix[0].length, "end");
    } else {
      ta.setRangeText(prefix, lineStart, lineStart, "end");
    }
  }
  ta.focus();
}

/* insertar un bloque markdown (ej: separador) */
function insertMarkdownBlock(block) {
  const ta = dom.editorContent;
  const start = ta.selectionStart;
  ta.setRangeText(block, start, ta.selectionEnd, "end");
  ta.focus();
}


/* ============================================================
   EDITOR: generar PDF desde HTML y subir
   genera un PDF usando un canvas oculto para renderizar
   el contenido del editor como páginas A4.
   ============================================================ */
async function handleCreateText(e) {
  e.preventDefault();

  const title   = dom.editorTitle.value.trim();
  const content = dom.editorContent.value.trim();

  if (!title) {
    dom.editorTitle.focus();
    dom.editorTitle.style.borderColor = "#cc0000";
    setTimeout(() => dom.editorTitle.style.borderColor = "", 2000);
    return;
  }
  if (!content) {
    dom.editorContent.focus();
    dom.editorContent.style.borderColor = "#cc0000";
    setTimeout(() => dom.editorContent.style.borderColor = "", 2000);
    return;
  }

  const author = dom.editorAuthor.value.trim() || null;
  const hashtags = dom.editorHashtags.value
    .split(",")
    .map(t => t.trim().replace(/^#/, "").toLowerCase())
    .filter(t => t.length > 0);

  const filename = sanitizeFilename(title) + ".pdf";

  editorSwitchToProgress(filename);
  dom.btnCreateSubmit.disabled = true;

  try {
    editorUpdateProgress("generando pdf...", 15);
    const pdfBlob = await markdownToPdfBlob(title, content);
    const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });

    editorUpdateProgress("subiendo...", 40);
    const hashtagsStr = hashtags.join(",");
    const res = await uploadToApi(pdfFile, { author: author || "", hashtags: hashtagsStr, is_18_plus: false });
    if (!res.ok) throw new Error(res.error || "error al subir");

    editorUpdateProgress("actualizando lista...", 90);
    await loadData();
    editorUpdateProgress("¡listo!", 100);

    setTimeout(closeEditorModal, 700);
  } catch (err) {
    console.error("[arxiu] error al crear texto:", err);
    editorUpdateProgress(`error: ${err.message}`, 0);
  }
}


/* ============================================================
   GENERADOR DE PDF DESDE MARKDOWN
   parsea markdown básico y genera un PDF válido a mano.
   sin dependencias externas.

   soporta: # h1, ## h2, ### h3, **bold**, *italic*,
   - listas, 1. listas numeradas, --- separador
   ============================================================ */
function markdownToPdfBlob(title, markdown) {
  return new Promise((resolve) => {

    /* ---- parámetros de página A4 ---- */
    const pageW  = 595;
    const pageH  = 842;
    const margin = 60;
    const usableW = pageW - margin * 2;

    /* tamaños para cada nivel */
    const SIZES = {
      h1:   { font: "F2", size: 28, lineH: 36, spaceAfter: 12 },
      h2:   { font: "F2", size: 22, lineH: 30, spaceAfter: 10 },
      h3:   { font: "F2", size: 16, lineH: 24, spaceAfter: 8 },
      body: { font: "F1", size: 11, lineH: 16, spaceAfter: 0 },
      bold: { font: "F2", size: 11 },
      italic: { font: "F3", size: 11 },
    };

    /* ---- anchos aproximados de caracteres (Helvetica, en unidades/1000) ---- */
    /* simplificación: ancho medio por carácter según el font-size */
    function approxCharsPerLine(fontSize) {
      /* Helvetica tiene ~500 units de ancho medio, a 1000 units = 1 pt */
      const charWidth = fontSize * 0.52;
      return Math.floor(usableW / charWidth);
    }

    /* ---- escapar paréntesis para PDF y filtrar a latin1 ---- */
    function esc(str) {
      /* reemplazar caracteres fuera de latin1 por equivalentes seguros */
      let s = str
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\u2026/g, "...")
        .replace(/\u2014/g, "--")
        .replace(/\u2013/g, "-")
        .replace(/\u2022/g, "-");
      /* escapar caracteres especiales de PDF */
      s = s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
      /* eliminar cualquier carácter fuera de latin1 (>255) que pueda quedar */
      s = s.replace(/[^\x00-\xFF]/g, "?");
      return s;
    }

    /* ---- word-wrap una línea ---- */
    function wrapLine(text, maxChars) {
      if (text.length <= maxChars) return [text];
      const result = [];
      while (text.length > maxChars) {
        let breakAt = text.lastIndexOf(" ", maxChars);
        if (breakAt <= 0) breakAt = maxChars;
        result.push(text.substring(0, breakAt));
        text = text.substring(breakAt).trimStart();
      }
      if (text) result.push(text);
      return result;
    }

    /* ---- parsear markdown a bloques ---- */
    const rawLines = markdown.split("\n");
    const blocks = []; /* { type, text, font, size, lineH, spaceAfter } */

    rawLines.forEach(raw => {
      const trimmed = raw.trim();

      /* línea vacía → espacio */
      if (trimmed === "") {
        blocks.push({ type: "space", height: 10 });
        return;
      }

      /* separador horizontal */
      if (/^-{3,}$/.test(trimmed) || /^\*{3,}$/.test(trimmed)) {
        blocks.push({ type: "hr" });
        return;
      }

      /* headings */
      const hMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
      if (hMatch) {
        const level = `h${hMatch[1].length}`;
        const s = SIZES[level];
        const maxC = approxCharsPerLine(s.size);
        wrapLine(hMatch[2], maxC).forEach(wl => {
          blocks.push({ type: "text", text: wl, font: s.font, size: s.size, lineH: s.lineH });
        });
        blocks.push({ type: "space", height: s.spaceAfter });
        return;
      }

      /* lista desordenada */
      const ulMatch = trimmed.match(/^[-*+]\s+(.*)$/);
      if (ulMatch) {
        const s = SIZES.body;
        const prefix = "  - ";
        const maxC = approxCharsPerLine(s.size) - prefix.length;
        const wrapped = wrapLine(ulMatch[1], maxC);
        wrapped.forEach((wl, i) => {
          blocks.push({ type: "text", text: (i === 0 ? prefix : "    ") + wl, font: s.font, size: s.size, lineH: s.lineH });
        });
        return;
      }

      /* lista ordenada */
      const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (olMatch) {
        const s = SIZES.body;
        const prefix = `  ${olMatch[1]}. `;
        const maxC = approxCharsPerLine(s.size) - prefix.length;
        const wrapped = wrapLine(olMatch[2], maxC);
        wrapped.forEach((wl, i) => {
          blocks.push({ type: "text", text: (i === 0 ? prefix : "      ") + wl, font: s.font, size: s.size, lineH: s.lineH });
        });
        return;
      }

      /* texto normal con inline markdown (**bold**, *italic*) */
      const s = SIZES.body;
      const maxC = approxCharsPerLine(s.size);

      /* quitar markdown inline para medir el wrap (texto plano) */
      const plainText = trimmed.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
      const wrappedPlain = wrapLine(plainText, maxC);

      /* para cada línea wrapeada, reconstruir los segments inline */
      /* simplificación: si tiene inline md, parsear segmentos */
      if (/\*/.test(trimmed)) {
        /* parsear la línea completa en segmentos y luego wrapear */
        const segments = parseInlineMarkdown(trimmed);
        const flatText = segments.map(s => s.text).join("");
        const wrapped = wrapLine(flatText, maxC);

        wrapped.forEach(wl => {
          /* mapear los segmentos a esta línea wrapeada */
          blocks.push({ type: "richtext", segments: mapSegmentsToLine(segments, wl), lineH: s.lineH });
        });
      } else {
        wrappedPlain.forEach(wl => {
          blocks.push({ type: "text", text: wl, font: s.font, size: s.size, lineH: s.lineH });
        });
      }
    });

    /* ---- parsear inline markdown (**bold**, *italic*) ---- */
    function parseInlineMarkdown(text) {
      const segments = [];
      const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
      let lastIdx = 0;
      let match;

      while ((match = regex.exec(text)) !== null) {
        /* texto antes del match */
        if (match.index > lastIdx) {
          segments.push({ text: text.substring(lastIdx, match.index), font: "F1", size: 11 });
        }
        if (match[2]) {
          /* **bold** */
          segments.push({ text: match[2], font: "F2", size: 11 });
        } else if (match[3]) {
          /* *italic* */
          segments.push({ text: match[3], font: "F3", size: 11 });
        }
        lastIdx = match.index + match[0].length;
      }
      /* texto después del último match */
      if (lastIdx < text.length) {
        segments.push({ text: text.substring(lastIdx), font: "F1", size: 11 });
      }
      if (segments.length === 0) {
        segments.push({ text, font: "F1", size: 11 });
      }
      return segments;
    }

    /* mapear segmentos al texto de una línea wrapeada */
    function mapSegmentsToLine(allSegments, lineText) {
      const result = [];
      let remaining = lineText;

      for (const seg of allSegments) {
        if (!remaining) break;
        if (remaining.startsWith(seg.text)) {
          result.push({ ...seg });
          remaining = remaining.substring(seg.text.length);
        } else if (seg.text.length > 0 && remaining.startsWith(seg.text.substring(0, 1))) {
          /* parcial: el segmento se corta por el wrap */
          const take = remaining.length < seg.text.length ? remaining.length : seg.text.length;
          const chunk = remaining.substring(0, take);
          if (chunk) result.push({ text: chunk, font: seg.font, size: seg.size });
          remaining = remaining.substring(take);
        }
      }
      /* si queda remaining no mapeado, ponerlo como body */
      if (remaining) {
        result.push({ text: remaining, font: "F1", size: 11 });
      }
      return result;
    }

    /* ---- paginar los bloques ---- */
    const pageBlocks = [[]]; /* array de páginas, cada una array de bloques */
    let curY = pageH - margin;

    /* primera página: título del documento */
    const titleLineH = SIZES.h1.lineH;
    curY -= SIZES.h1.size; /* bajar al baseline del título */

    /* título como primer bloque especial */
    pageBlocks[0].push({ type: "title", text: title, y: curY });
    curY -= titleLineH + 12; /* espacio después del título */

    blocks.forEach(block => {
      let blockH;
      if (block.type === "space") {
        blockH = block.height;
      } else if (block.type === "hr") {
        blockH = 16;
      } else {
        blockH = block.lineH || 16;
      }

      /* ¿cabe en la página actual? */
      if (curY - blockH < margin) {
        pageBlocks.push([]);
        curY = pageH - margin;
      }

      curY -= blockH;
      block.y = curY;
      pageBlocks[pageBlocks.length - 1].push(block);
    });

    /* ---- construir objetos PDF ---- */
    const objects = [];
    let objCount = 0;
    function addObj(content) {
      objCount++;
      objects.push({ id: objCount, content });
      return objCount;
    }

    const catalogId  = addObj(""); /* placeholder */
    const pagesId    = addObj(""); /* placeholder */
    const fontRegId  = addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
    const fontBoldId = addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`);
    const fontItalId = addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>`);

    const pageIds = [];
    pageBlocks.forEach(pBlocks => {
      let stream = "";

      pBlocks.forEach(block => {
        if (block.type === "title") {
          stream += `BT /F2 ${SIZES.h1.size} Tf ${margin} ${block.y} Td (${esc(block.text)}) Tj ET\n`;
        } else if (block.type === "text") {
          stream += `BT /${block.font} ${block.size} Tf ${margin} ${block.y} Td (${esc(block.text)}) Tj ET\n`;
        } else if (block.type === "richtext") {
          /* múltiples segmentos con distinto font en la misma línea */
          stream += `BT ${margin} ${block.y} Td\n`;
          block.segments.forEach(seg => {
            stream += `/${seg.font} ${seg.size} Tf (${esc(seg.text)}) Tj\n`;
          });
          stream += `ET\n`;
        } else if (block.type === "hr") {
          const y = block.y + 6;
          stream += `q 0.7 G 0.5 w ${margin} ${y} m ${pageW - margin} ${y} l S Q\n`;
        }
        /* "space" no genera stream, solo ocupa espacio */
      });

      const contentId = addObj(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      const pageId = addObj(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageW} ${pageH}] ` +
        `/Contents ${contentId} 0 R ` +
        `/Resources << /Font << /F1 ${fontRegId} 0 R /F2 ${fontBoldId} 0 R /F3 ${fontItalId} 0 R >> >> >>`
      );
      pageIds.push(pageId);
    });

    /* actualizar catalog y pages */
    objects[catalogId - 1].content = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    const kidsStr = pageIds.map(id => `${id} 0 R`).join(" ");
    objects[pagesId - 1].content = `<< /Type /Pages /Kids [${kidsStr}] /Count ${pageIds.length} >>`;

    /* ---- serializar PDF ---- */
    let pdf = "%PDF-1.4\n";
    const offsets = [];
    objects.forEach(obj => {
      offsets.push(pdf.length);
      pdf += `${obj.id} 0 obj\n${obj.content}\nendobj\n`;
    });

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objCount + 1}\n`;
    pdf += "0000000000 65535 f \n";
    offsets.forEach(off => {
      pdf += String(off).padStart(10, "0") + " 00000 n \n";
    });
    pdf += `trailer\n<< /Size ${objCount + 1} /Root ${catalogId} 0 R >>\n`;
    pdf += `startxref\n${xrefOffset}\n%%EOF`;

    const bytes = new Uint8Array(pdf.length);
    for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
    resolve(new Blob([bytes], { type: "application/pdf" }));
  });
}


function uploadToApi(file, fields, onProgress) {
  const fd = new FormData();
  fd.append("file", file, file.name);
  if (fields.author)    fd.append("author", fields.author);
  if (fields.hashtags)  fd.append("hashtags", fields.hashtags);
  if (fields.is_18_plus) fd.append("is_18_plus", "1");

  if (!onProgress) {
    return fetch(`${CONFIG.API_URL}/upload`, { method: "POST", body: fd }).then(r => r.json());
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${CONFIG.API_URL}/upload`);
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      try { resolve(JSON.parse(xhr.responseText)); }
      catch { reject(new Error("respuesta inválida")); }
    };
    xhr.onerror = () => reject(new Error("error de red"));
    xhr.send(fd);
  });
}

function sanitizeFilename(name) {
  return name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[<>:"/\\|?*]/g, "");
}


/* ============================================================
   BINDING DE EVENTOS
   ============================================================ */
function bindEvents() {
  /* botones fuera de la ventana */
  dom.btnUpload.addEventListener("click", openModal);
  dom.btnCreate.addEventListener("click", openEditorModal);
  dom.btn18.addEventListener("click", handleBtn18Click);

  /* velo de confirmación de edad */
  dom.ageYes.addEventListener("click", () => {
    hideVeil(dom.ageVeil);
    activate18();
  });
  dom.ageNo.addEventListener("click", () => {
    hideVeil(dom.ageVeil);
  });

  /* cerrar modales */
  dom.modalCloseDot.addEventListener("click", closeModal);
  dom.editorCloseDot.addEventListener("click", closeEditorModal);
  dom.modalOverlay.addEventListener("click", () => {
    closeModal();
    closeEditorModal();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeModal();
      closeEditorModal();
      hideVeil(dom.ageVeil);
    }
  });

  /* formulario de subida */
  dom.uploadForm.addEventListener("submit", handleUpload);

  /* formulario del editor de texto */
  dom.editorForm.addEventListener("submit", handleCreateText);
  bindEditorToolbar();

  /* zona de arrastre */
  bindDropZone();
}
