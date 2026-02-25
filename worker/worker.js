/* ============================================================
   arxiu — cloudflare worker
   proxy seguro para subir archivos a github.
   el token de github se guarda como variable de entorno
   en cloudflare (nunca se expone al navegador).

   variables de entorno necesarias:
   - GITHUB_TOKEN: personal access token con permisos "repo"
   - ALLOWED_ORIGIN: url del frontend (ej. https://meowrhino.github.io)
   ============================================================ */

export default {
  async fetch(request, env) {

    /* ---- cors: preflight ---- */
    if (request.method === "OPTIONS") {
      return corsResponse(env, new Response(null, { status: 204 }));
    }

    /* ---- solo aceptamos POST ---- */
    if (request.method !== "POST") {
      return corsResponse(env, jsonResponse(405, { error: "método no permitido" }));
    }

    /* ---- parsear el body ---- */
    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse(env, jsonResponse(400, { error: "json inválido" }));
    }

    const { action } = body;

    /* ---- rutas ---- */
    try {
      if (action === "upload_pdf") {
        return corsResponse(env, await handleUploadPdf(body, env));
      }
      if (action === "update_index") {
        return corsResponse(env, await handleUpdateIndex(body, env));
      }
      if (action === "mark_published") {
        return corsResponse(env, await handleMarkPublished(body, env));
      }
      if (action === "get_index") {
        return corsResponse(env, await handleGetIndex(env));
      }
      return corsResponse(env, jsonResponse(400, { error: "acción desconocida" }));
    } catch (err) {
      return corsResponse(env, jsonResponse(500, { error: err.message }));
    }
  },
};


/* ============================================================
   ACCIÓN: subir un pdf a /data/
   body: { action, filename, content_base64 }
   ============================================================ */
async function handleUploadPdf(body, env) {
  const { filename, content_base64 } = body;

  if (!filename || !content_base64) {
    return jsonResponse(400, { error: "faltan filename o content_base64" });
  }

  /* comprobar que no supere 2 mb (base64 es ~33% más grande) */
  const sizeBytes = (content_base64.length * 3) / 4;
  if (sizeBytes > 2 * 1024 * 1024) {
    return jsonResponse(400, { error: "el archivo supera los 2 mb" });
  }

  const path = `data/${filename}`;
  const res = await githubPut(env, path, content_base64, `subir: ${filename}`);

  if (!res.ok) {
    const err = await res.json();
    return jsonResponse(res.status, { error: err.message || "error al subir pdf" });
  }

  return jsonResponse(200, { ok: true, path });
}


/* ============================================================
   ACCIÓN: leer data.json, añadir entrada, y guardarlo
   body: { action, entry }
   entry: { id, filename, author, hashtags, is_18_plus, upload_date }
   ============================================================ */
async function handleUpdateIndex(body, env) {
  const { entry } = body;

  if (!entry || !entry.filename) {
    return jsonResponse(400, { error: "falta entry o entry.filename" });
  }

  const { data, sha: currentSha, error, status } = await readIndex(env);
  if (!data) return jsonResponse(status, { error });

  const normalizedEntry = {
    ...entry,
    hashtags: Array.isArray(entry.hashtags) ? entry.hashtags : [],
    is_18_plus: Boolean(entry.is_18_plus),
    is_published: false,
  };

  /* añadir la nueva entrada */
  data.files.push(normalizedEntry);

  /* actualizar hashtags únicos */
  (normalizedEntry.hashtags || []).forEach(tag => {
    if (!data.hashtags.includes(tag)) data.hashtags.push(tag);
  });
  data.hashtags.sort();

  const putRes = await writeIndex(env, data, `index: añadir ${normalizedEntry.filename}`, currentSha);
  if (!putRes.ok) return putRes;

  return jsonResponse(200, { ok: true, data });
}

/* ============================================================
   ACCIÓN: marcar entrada como publicada en github pages
   body: { action, id }
   ============================================================ */
async function handleMarkPublished(body, env) {
  const { id } = body;
  if (!id) return jsonResponse(400, { error: "falta id" });

  const { data, sha: currentSha, error, status } = await readIndex(env);
  if (!data) return jsonResponse(status, { error });

  const target = data.files.find(file => file.id === id);
  if (!target) return jsonResponse(404, { error: "entrada no encontrada" });

  if (target.is_published === true) {
    return jsonResponse(200, { ok: true, data });
  }

  target.is_published = true;

  const putRes = await writeIndex(env, data, `index: publicar ${target.filename}`, currentSha);
  if (!putRes.ok) return putRes;

  return jsonResponse(200, { ok: true, data });
}


/* ============================================================
   ACCIÓN: leer data.json (para que el frontend no dependa
   de la caché de github pages)
   ============================================================ */
async function handleGetIndex(env) {
  const { data, error, status } = await readIndex(env);
  if (!data) return jsonResponse(status, { error });

  return jsonResponse(200, data);
}


/* ============================================================
   HELPERS: github api
   ============================================================ */
const GITHUB_USER = "meowrhino";
const GITHUB_REPO = "arxiu";
const GITHUB_BRANCH = "main";

async function githubGet(env, path) {
  const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;
  return fetch(url, {
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "Accept":        "application/vnd.github+json",
      "User-Agent":    "arxiu-worker",
    },
  });
}

async function githubPut(env, path, base64Content, message, sha) {
  const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}`;
  const body = { message, content: base64Content, branch: GITHUB_BRANCH };
  if (sha) body.sha = sha;

  return fetch(url, {
    method:  "PUT",
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "Accept":        "application/vnd.github+json",
      "Content-Type":  "application/json",
      "User-Agent":    "arxiu-worker",
    },
    body: JSON.stringify(body),
  });
}


/* ============================================================
   HELPERS: respuestas
   ============================================================ */
function jsonResponse(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseJsonFromBase64(base64Content) {
  const jsonText = base64ToUtf8(base64Content);
  return JSON.parse(jsonText);
}

function base64ToUtf8(base64Content) {
  const binary = atob(base64Content.replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder("utf-8").decode(bytes);
}

function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function readIndex(env) {
  const getRes = await githubGet(env, "data.json");
  if (!getRes.ok) {
    return { data: null, error: "no se pudo leer data.json", status: getRes.status };
  }

  const fileData = await getRes.json();
  const rawData = parseJsonFromBase64(fileData.content);
  const data = normalizeIndexData(rawData);

  return { data, sha: fileData.sha };
}

function normalizeIndexData(raw) {
  return {
    files: (raw.files || []).map(file => ({
      ...file,
      hashtags: Array.isArray(file.hashtags) ? file.hashtags : [],
      is_published: file.is_published !== false,
      is_18_plus: Boolean(file.is_18_plus),
    })),
    hashtags: Array.isArray(raw.hashtags) ? raw.hashtags : [],
  };
}

async function writeIndex(env, data, message, currentSha) {
  const updatedJson = JSON.stringify(data, null, 2);
  const updatedBase64 = utf8ToBase64(updatedJson);

  const putRes = await githubPut(env, "data.json", updatedBase64, message, currentSha);
  if (putRes.ok) return { ok: true };

  const err = await putRes.json();
  return jsonResponse(putRes.status, { error: err.message || "error al guardar índice" });
}

function corsResponse(env, response) {
  const origin = env.ALLOWED_ORIGIN || "*";
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Max-Age", "86400");
  return new Response(response.body, {
    status:     response.status,
    statusText: response.statusText,
    headers,
  });
}
