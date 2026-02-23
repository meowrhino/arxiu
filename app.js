/* ============================================================
   CONFIGURACIÓN
   cambia WORKER_URL por la url de tu cloudflare worker
   una vez desplegado.
   ============================================================ */
const CONFIG = {
  WORKER_URL:    "https://arxiu-worker.manuellatourf.workers.dev",
  MAX_FILE_SIZE:  2 * 1024 * 1024, // 2 mb
};


/* ============================================================
   ESTADO GLOBAL
   ============================================================ */
const state = {
  files:       [],
  hashtags:    [],
  activeTag:   null,
  mode18:      false,
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
  editorFontsize:        document.getElementById("editor-fontsize"),
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


/* ============================================================
   CARGA DE DATOS
   carga desde el worker (que lee directamente de github,
   sin caché de github pages) con fallback al data.json local.
   ============================================================ */
async function loadData() {
  try {
    /* intentar cargar desde el worker (datos frescos) */
    let json;
    try {
      const res = await fetch(CONFIG.WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_index" }),
      });
      if (res.ok) {
        json = await res.json();
        console.log("[arxiu] datos cargados desde el worker");
      }
    } catch (workerErr) {
      console.warn("[arxiu] worker no disponible, usando data.json local");
    }

    /* fallback: data.json local (puede estar cacheado) */
    if (!json) {
      const res = await fetch(`data.json?t=${Date.now()}`);
      if (!res.ok) throw new Error(`http ${res.status}`);
      json = await res.json();
      console.log("[arxiu] datos cargados desde data.json local");
    }

    state.files    = json.files    || [];
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
    /* ocultar +18 si el modo no está activo */
    if (f.is_18_plus && !state.mode18) return false;
    /* filtrar por hashtag activo */
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
  card.href      = `data/${file.filename}`;
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


/* ============================================================
   SUBIDA VIA CLOUDFLARE WORKER
   el worker actúa de proxy seguro: guarda el token de github
   como variable de entorno y el visitante no necesita nada.
   ============================================================ */
async function handleUpload(e) {
  e.preventDefault();

  const file = dom.inputFile.files[0];
  if (!file) {
    dom.fileInfo.textContent = "selecciona un archivo primero.";
    return;
  }

  /* parsear campos */
  const author = dom.inputAuthor.value.trim() || null;
  const hashtags = dom.inputHashtags.value
    .split(",")
    .map(t => t.trim().replace(/^#/, "").toLowerCase())
    .filter(t => t.length > 0);

  const filename = sanitizeFilename(file.name);

  /* cambiar a vista de progreso */
  switchToProgress(filename);
  dom.btnSubmit.disabled = true;

  try {
    /* paso 1: leer archivo como base64 */
    updateProgress("leyendo archivo...", 10);
    const base64 = await fileToBase64(file);

    /* paso 2: subir el pdf via worker */
    updateProgress("subiendo pdf...", 30);
    const uploadRes = await workerPost("upload_pdf", {
      filename: filename,
      content_base64: base64,
    });
    if (!uploadRes.ok) throw new Error(uploadRes.error || "error al subir pdf");

    /* paso 3: actualizar el índice via worker */
    updateProgress("indexando...", 65);
    const entry = {
      id:          generateId(),
      filename:    filename,
      author:      author,
      hashtags:    hashtags,
      is_18_plus:  false,
      upload_date: new Date().toISOString(),
    };
    const indexRes = await workerPost("update_index", { entry });
    if (!indexRes.ok && !indexRes.files) throw new Error(indexRes.error || "error al indexar");

    /* paso 4: actualizar interfaz con los datos devueltos */
    updateProgress("¡listo!", 100);

    /* el worker devuelve el data.json actualizado */
    const data = indexRes.data || indexRes;
    if (data.files) {
      state.files    = data.files;
      state.hashtags = data.hashtags || state.hashtags;
    } else {
      /* fallback: añadir localmente */
      state.files.push(entry);
      hashtags.forEach(tag => {
        if (!state.hashtags.includes(tag)) state.hashtags.push(tag);
      });
      state.hashtags.sort();
    }

    renderHashtags();
    renderFiles();

    /* cerrar modal tras un momento */
    setTimeout(closeModal, 2000);

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
  dom.editorContent.innerHTML = "";
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
   EDITOR: barra de herramientas
   ============================================================ */
function bindEditorToolbar() {
  /* botones de formato (bold, italic, underline, listas) */
  document.querySelectorAll(".editor-tool[data-cmd]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      document.execCommand(btn.dataset.cmd, false, null);
      dom.editorContent.focus();
    });
  });

  /* selector de tamaño */
  dom.editorFontsize.addEventListener("change", () => {
    document.execCommand("fontSize", false, dom.editorFontsize.value);
    dom.editorContent.focus();
  });
}


/* ============================================================
   EDITOR: generar PDF desde HTML y subir
   genera un PDF usando un canvas oculto para renderizar
   el contenido del editor como páginas A4.
   ============================================================ */
async function handleCreateText(e) {
  e.preventDefault();

  const title   = dom.editorTitle.value.trim();
  const content = dom.editorContent.innerHTML.trim();

  if (!title) {
    dom.editorTitle.focus();
    dom.editorTitle.style.borderColor = "#cc0000";
    setTimeout(() => dom.editorTitle.style.borderColor = "", 2000);
    return;
  }
  if (!content || dom.editorContent.textContent.trim() === "") {
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
    /* paso 1: generar el PDF */
    editorUpdateProgress("generando pdf...", 15);
    const pdfBase64 = await htmlToPdfBase64(title, content);

    /* paso 2: subir el PDF via worker */
    editorUpdateProgress("subiendo pdf...", 40);
    const uploadRes = await workerPost("upload_pdf", {
      filename: filename,
      content_base64: pdfBase64,
    });
    if (!uploadRes.ok) throw new Error(uploadRes.error || "error al subir pdf");

    /* paso 3: actualizar el índice */
    editorUpdateProgress("indexando...", 70);
    const entry = {
      id:          generateId(),
      filename:    filename,
      author:      author,
      hashtags:    hashtags,
      is_18_plus:  false,
      upload_date: new Date().toISOString(),
    };
    const indexRes = await workerPost("update_index", { entry });
    if (!indexRes.ok && !indexRes.files) throw new Error(indexRes.error || "error al indexar");

    /* paso 4: actualizar interfaz */
    editorUpdateProgress("¡listo!", 100);

    const data = indexRes.data || indexRes;
    if (data.files) {
      state.files    = data.files;
      state.hashtags = data.hashtags || state.hashtags;
    } else {
      state.files.push(entry);
      hashtags.forEach(tag => {
        if (!state.hashtags.includes(tag)) state.hashtags.push(tag);
      });
      state.hashtags.sort();
    }

    renderHashtags();
    renderFiles();

    setTimeout(closeEditorModal, 2000);

  } catch (err) {
    console.error("[arxiu] error al crear texto:", err);
    editorUpdateProgress(`error: ${err.message}`, 0);
  }
}


/* ============================================================
   GENERADOR DE PDF DESDE HTML
   construye un PDF válido con texto plano extraído del editor.
   sin dependencias externas — genera la estructura PDF a mano.
   ============================================================ */
function htmlToPdfBase64(title, htmlContent) {
  return new Promise((resolve) => {
    /* extraer texto plano del HTML, respetando saltos de línea */
    const temp = document.createElement("div");
    temp.innerHTML = htmlContent;

    /* convertir <br>, <p>, <div>, <li> en saltos de línea */
    temp.querySelectorAll("br").forEach(el => el.replaceWith("\n"));
    temp.querySelectorAll("div, p").forEach(el => {
      el.prepend("\n");
    });
    temp.querySelectorAll("li").forEach(el => {
      el.prepend("\n  - ");
    });

    const rawText = temp.textContent || "";
    const lines = rawText.split("\n").filter((l, i) => i > 0 || l.trim() !== "");

    /* parámetros de página A4 en puntos (72 dpi) */
    const pageW  = 595;
    const pageH  = 842;
    const margin = 60;
    const lineH  = 16;
    const titleH = 24;
    const maxLineChars = 72;
    const contentStartY = pageH - margin - titleH - 20;

    /* partir líneas largas en trozos que quepan */
    const wrappedLines = [];
    lines.forEach(line => {
      if (line.trim() === "") {
        wrappedLines.push("");
        return;
      }
      while (line.length > maxLineChars) {
        /* buscar el último espacio antes del límite */
        let breakAt = line.lastIndexOf(" ", maxLineChars);
        if (breakAt <= 0) breakAt = maxLineChars;
        wrappedLines.push(line.substring(0, breakAt));
        line = line.substring(breakAt).trimStart();
      }
      wrappedLines.push(line);
    });

    /* calcular cuántas líneas caben por página */
    const linesPerPage = Math.floor(contentStartY / lineH);

    /* dividir en páginas */
    const pages = [];
    for (let i = 0; i < wrappedLines.length; i += linesPerPage) {
      pages.push(wrappedLines.slice(i, i + linesPerPage));
    }
    if (pages.length === 0) pages.push([""]);

    /* escapar paréntesis para PDF */
    function esc(str) {
      return str.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    }

    /* construir el PDF objeto por objeto */
    const objects = [];
    let objCount = 0;

    function addObj(content) {
      objCount++;
      objects.push({ id: objCount, content });
      return objCount;
    }

    /* obj 1: catalog */
    const catalogId = addObj(""); // placeholder
    /* obj 2: pages container */
    const pagesId = addObj(""); // placeholder

    /* obj 3: font Helvetica */
    const fontId = addObj(
      `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`
    );

    /* obj 4: font Helvetica-Bold */
    const fontBoldId = addObj(
      `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`
    );

    /* crear cada página */
    const pageIds = [];
    pages.forEach((pageLines, pageIdx) => {
      /* stream de contenido para esta página */
      let stream = "BT\n";

      /* título solo en la primera página */
      if (pageIdx === 0) {
        stream += `/F2 18 Tf\n`;
        stream += `${margin} ${pageH - margin} Td\n`;
        stream += `(${esc(title)}) Tj\n`;
        stream += `0 -${titleH + 10} Td\n`;
        stream += `/F1 11 Tf\n`;
      } else {
        stream += `/F1 11 Tf\n`;
        stream += `${margin} ${pageH - margin} Td\n`;
      }

      /* líneas de texto */
      pageLines.forEach((line, i) => {
        if (i > 0 || pageIdx > 0) {
          stream += `0 -${lineH} Td\n`;
        }
        stream += `(${esc(line)}) Tj\n`;
      });

      stream += "ET";

      const contentId = addObj(
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
      );

      const pageId = addObj(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageW} ${pageH}] ` +
        `/Contents ${contentId} 0 R ` +
        `/Resources << /Font << /F1 ${fontId} 0 R /F2 ${fontBoldId} 0 R >> >> >>`
      );
      pageIds.push(pageId);
    });

    /* actualizar catalog */
    objects[catalogId - 1].content = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;

    /* actualizar pages container */
    const kidsStr = pageIds.map(id => `${id} 0 R`).join(" ");
    objects[pagesId - 1].content =
      `<< /Type /Pages /Kids [${kidsStr}] /Count ${pageIds.length} >>`;

    /* serializar el PDF completo */
    let pdf = "%PDF-1.4\n";
    const offsets = [];

    objects.forEach(obj => {
      offsets.push(pdf.length);
      pdf += `${obj.id} 0 obj\n${obj.content}\nendobj\n`;
    });

    /* tabla de referencias cruzadas */
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objCount + 1}\n`;
    pdf += "0000000000 65535 f \n";
    offsets.forEach(off => {
      pdf += String(off).padStart(10, "0") + " 00000 n \n";
    });

    pdf += `trailer\n<< /Size ${objCount + 1} /Root ${catalogId} 0 R >>\n`;
    pdf += `startxref\n${xrefOffset}\n%%EOF`;

    /* convertir a base64 */
    const base64 = btoa(unescape(encodeURIComponent(pdf)));
    resolve(base64);
  });
}


/* ============================================================
   HELPER: llamada al worker
   ============================================================ */
async function workerPost(action, data = {}) {
  const res = await fetch(CONFIG.WORKER_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ action, ...data }),
  });
  return res.json();
}


/* ============================================================
   UTILIDADES
   ============================================================ */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* limpia el nombre pero conserva caracteres unicode (acentos, ñ, etc.) */
function sanitizeFilename(name) {
  return name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[<>:"/\\|?*]/g, "");
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
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
