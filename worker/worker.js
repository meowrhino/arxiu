const MAX_SIZE       = 2 * 1024 * 1024;
const RL_MAX_PER_HR  = 5;
const GITHUB_USER    = "meowrhino";
const GITHUB_REPO    = "arxiu";
const GITHUB_BRANCH  = "main";

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return cors(request, env, new Response(null, { status: 204 }));

    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;
    const isRead = method === "GET" || method === "HEAD";

    try {
      if (isRead          && path === "/files")               return cors(request, env, await listFiles(env));
      if (method === "POST" && path === "/upload")            return cors(request, env, await uploadFile(request, env));
      if (isRead          && path.startsWith("/files/"))      return cors(request, env, await serveFile(path.slice(7), env));
      if (method === "POST" && path === "/moderate")          return cors(request, env, await moderate(request, env));
      if (isRead          && path === "/health")              return cors(request, env, json(200, { ok: true }));
      return cors(request, env, json(404, { error: "not found" }));
    } catch (err) {
      return cors(request, env, json(500, { error: err.message }));
    }
  },

  async scheduled(event, env) {
    if (event.cron === "0 3 * * *") await reindexHashtags(env);
    if (event.cron === "0 4 * * 7") await backupToRepo(env);
  },
};


async function listFiles(env) {
  const { results } = await env.DB.prepare(
    `SELECT id, filename, author, size, uploaded_at, is_18_plus, hashtags_json
       FROM files
      WHERE status = 'published'
      ORDER BY uploaded_at DESC`
  ).all();

  const tagSet = new Set();
  const files = results.map(r => {
    const hashtags = JSON.parse(r.hashtags_json || "[]");
    for (const t of hashtags) tagSet.add(t);
    return {
      id:          r.id,
      filename:    r.filename,
      author:      r.author,
      size:        r.size,
      upload_date: r.uploaded_at,
      is_18_plus:  r.is_18_plus === 1,
      hashtags,
    };
  });

  return json(200, { files, hashtags: [...tagSet].sort() });
}


async function uploadFile(request, env) {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  if (!(await checkRateLimit(ip, env))) {
    return json(429, { error: "demasiadas subidas, espera una hora" });
  }

  const ct = request.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return json(400, { error: "se espera multipart/form-data" });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return json(400, { error: "falta campo 'file'" });
  }

  if (file.size > MAX_SIZE) {
    return json(413, { error: "el archivo supera los 2 mb" });
  }
  if (file.size === 0) {
    return json(400, { error: "archivo vacío" });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdfMagicBytes(bytes)) {
    return json(400, { error: "el archivo no es un pdf válido" });
  }

  const author = (form.get("author") || "").toString().trim() || null;
  const rawTags = (form.get("hashtags") || "").toString();
  const hashtags = rawTags
    .split(",")
    .map(t => t.trim().replace(/^#/, "").toLowerCase())
    .filter(t => t.length > 0 && t.length <= 32);

  const is18 = ["1", "true", "on"].includes((form.get("is_18_plus") || "").toString().toLowerCase());

  const filename = sanitizeFilename(file.name || "archivo.pdf");
  const id       = generateId();
  const key      = `${id}.pdf`;
  const uploadedAt = new Date().toISOString();

  await env.STORAGE.put(key, bytes, {
    httpMetadata: { contentType: "application/pdf" },
    customMetadata: { id, filename, author: author || "", uploaded_at: uploadedAt },
  });

  try {
    await env.DB.prepare(
      `INSERT INTO files (id, filename, author, size, mime, uploaded_at, is_18_plus, status, hashtags_json)
       VALUES (?, ?, ?, ?, 'application/pdf', ?, ?, 'published', ?)`
    ).bind(
      id, filename, author, bytes.length, uploadedAt, is18 ? 1 : 0, JSON.stringify(hashtags)
    ).run();
  } catch (err) {
    await env.STORAGE.delete(key).catch(() => {});
    throw err;
  }

  return json(200, {
    ok: true,
    file: {
      id, filename, author,
      size: bytes.length,
      upload_date: uploadedAt,
      is_18_plus: is18,
      hashtags,
    },
  });
}


async function serveFile(id, env) {
  const cleanId = id.replace(/\.pdf$/i, "");
  const row = await env.DB.prepare(
    `SELECT filename, status FROM files WHERE id = ?`
  ).bind(cleanId).first();

  if (!row) return json(404, { error: "no existe" });
  if (row.status !== "published") return json(410, { error: "no disponible" });

  const obj = await env.STORAGE.get(`${cleanId}.pdf`);
  if (!obj) return json(404, { error: "archivo no encontrado en almacenamiento" });

  const headers = new Headers();
  headers.set("Content-Type", "application/pdf");
  headers.set("Content-Disposition", `inline; filename="${encodeURIComponent(row.filename)}"`);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return new Response(obj.body, { headers });
}


async function moderate(request, env) {
  const token = request.headers.get("x-moderation-token");
  if (!token || token !== env.MODERATION_TOKEN) {
    return json(401, { error: "token inválido" });
  }

  const { id, action } = await request.json();
  if (!id || !["flag", "unflag", "delete"].includes(action)) {
    return json(400, { error: "falta id o action inválida" });
  }

  if (action === "delete") {
    await env.STORAGE.delete(`${id}.pdf`).catch(() => {});
    await env.DB.prepare(`UPDATE files SET status = 'deleted' WHERE id = ?`).bind(id).run();
  } else {
    const status = action === "flag" ? "flagged" : "published";
    await env.DB.prepare(`UPDATE files SET status = ? WHERE id = ?`).bind(status, id).run();
  }

  return json(200, { ok: true });
}


async function reindexHashtags(env) {
  const { results } = await env.DB.prepare(
    `SELECT hashtags_json FROM files WHERE status = 'published'`
  ).all();

  const counts = new Map();
  for (const row of results) {
    const tags = JSON.parse(row.hashtags_json || "[]");
    for (const t of tags) counts.set(t, (counts.get(t) || 0) + 1);
  }

  await env.DB.prepare(`DELETE FROM hashtags`).run();
  if (counts.size === 0) return;

  const stmts = [...counts.entries()].map(([tag, count]) =>
    env.DB.prepare(`INSERT INTO hashtags (tag, count) VALUES (?, ?)`).bind(tag, count)
  );
  await env.DB.batch(stmts);
}


async function backupToRepo(env) {
  if (!env.GITHUB_TOKEN) return;

  const { results } = await env.DB.prepare(
    `SELECT id, filename, author, size, uploaded_at, is_18_plus, status, hashtags_json
       FROM files
      WHERE status = 'published'
      ORDER BY uploaded_at ASC`
  ).all();

  const existing = await fetchRepoIndex(env);
  const existingIds = new Set((existing?.files || []).map(f => f.id));

  for (const row of results) {
    if (existingIds.has(row.id)) continue;
    const obj = await env.STORAGE.get(`${row.id}.pdf`);
    if (!obj) continue;
    const base64 = arrayBufferToBase64(await obj.arrayBuffer());
    await githubPut(env, `data/${row.filename}`, base64, `backup: ${row.filename}`);
  }

  const data = {
    files: results.map(r => ({
      id:           r.id,
      filename:     r.filename,
      author:       r.author,
      hashtags:     JSON.parse(r.hashtags_json || "[]"),
      is_18_plus:   r.is_18_plus === 1,
      upload_date:  r.uploaded_at,
      is_published: true,
    })),
    hashtags: [],
  };

  const { results: tags } = await env.DB.prepare(
    `SELECT tag FROM hashtags ORDER BY tag ASC`
  ).all();
  data.hashtags = tags.map(t => t.tag);

  const json = JSON.stringify(data, null, 2);
  const indexSha = existing?.sha;
  await githubPut(env, "data.json", utf8ToBase64(json), "backup: data.json", indexSha);
}


async function checkRateLimit(ip, env) {
  if (!env.RATE_LIMIT) return true;
  const key = `rl:${ip}`;
  const hits = parseInt(await env.RATE_LIMIT.get(key) || "0", 10);
  if (hits >= RL_MAX_PER_HR) return false;
  await env.RATE_LIMIT.put(key, String(hits + 1), { expirationTtl: 3600 });
  return true;
}

function isPdfMagicBytes(bytes) {
  return bytes.length >= 5 &&
    bytes[0] === 0x25 && bytes[1] === 0x50 &&
    bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
}

function sanitizeFilename(name) {
  const cleaned = name.trim()
    .replace(/\s+/g, "_")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "");
  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function cors(request, env, response) {
  const allowed   = (env.ALLOWED_ORIGIN || "*").split(",").map(s => s.trim()).filter(Boolean);
  const reqOrigin = request.headers.get("Origin") || "";
  let allowOrigin;
  if (allowed.includes("*"))            allowOrigin = "*";
  else if (allowed.includes(reqOrigin)) allowOrigin = reqOrigin;
  else                                  allowOrigin = allowed[0] || "*";

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", allowOrigin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, x-moderation-token");
  headers.set("Access-Control-Max-Age", "86400");
  headers.set("Vary", "Origin");
  return new Response(response.body, {
    status:     response.status,
    statusText: response.statusText,
    headers,
  });
}


async function fetchRepoIndex(env) {
  const res = await githubGet(env, "data.json");
  if (!res.ok) return null;
  const data = await res.json();
  return {
    sha:   data.sha,
    files: JSON.parse(base64ToUtf8(data.content)).files || [],
  };
}

async function githubGet(env, path) {
  return fetch(
    `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`,
    {
      headers: {
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "Accept":        "application/vnd.github+json",
        "User-Agent":    "arxiu-worker",
      },
    }
  );
}

async function githubPut(env, path, base64Content, message, sha) {
  const body = { message, content: base64Content, branch: GITHUB_BRANCH };
  if (sha) body.sha = sha;
  return fetch(
    `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "Accept":        "application/vnd.github+json",
        "Content-Type":  "application/json",
        "User-Agent":    "arxiu-worker",
      },
      body: JSON.stringify(body),
    }
  );
}

function base64ToUtf8(b64) {
  const bin = atob(b64.replace(/\n/g, ""));
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new TextDecoder("utf-8").decode(arr);
}

function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
