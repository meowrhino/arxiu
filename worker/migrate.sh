#!/usr/bin/env bash
set -euo pipefail

BUCKET="arxiu-pdfs"
DB="arxiu-db"

cd "$(dirname "$0")/.."

echo "[1/3] cargando schema en d1 remoto..."
npx wrangler d1 execute "$DB" --file=worker/schema.sql --remote

echo "[2/3] cargando datos iniciales en d1 remoto..."
npx wrangler d1 execute "$DB" --file=worker/migrate-data.sql --remote

echo "[3/3] subiendo pdfs a r2 (key = id.pdf)..."
export BUCKET
node -e '
const fs = require("fs");
const { execSync } = require("child_process");
const bucket = process.env.BUCKET;
const data = JSON.parse(fs.readFileSync("data.json", "utf8"));
for (const f of data.files) {
  const src = "data/" + f.filename;
  if (!fs.existsSync(src)) { console.warn("[warn] falta", src); continue; }
  const key = f.id + ".pdf";
  console.log("  ->", f.filename, "->", key);
  execSync(`npx wrangler r2 object put "${bucket}/${key}" --file="${src}" --content-type="application/pdf" --remote`, { stdio: "inherit" });
}
'

echo "[ok] migración completa"
