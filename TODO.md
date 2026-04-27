# TODO — migración a cloudflare puro

checklist para desplegar. cada bloque es un paso del README ampliado con lo que hay que copiar/pegar.

## 1. recursos cloudflare

```bash
cd worker
npx wrangler d1 create arxiu-db
# copia database_id → wrangler.toml (sustituye REEMPLAZAR_CON_ID_DE_D1)

npx wrangler r2 bucket create arxiu-pdfs

npx wrangler kv namespace create RATE_LIMIT
# copia id → wrangler.toml (sustituye REEMPLAZAR_CON_ID_DE_KV)
```

## 2. migración one-shot

```bash
./migrate.sh
```

verificar en el dashboard de cloudflare:
- d1 → arxiu-db → tabla `files` tiene 13 filas.
- r2 → arxiu-pdfs → tiene 13 objetos `<id>.pdf`.

## 3. secrets

```bash
npx wrangler secret put ALLOWED_ORIGIN    # ej: https://arxiu.meowrhino.studio
npx wrangler secret put MODERATION_TOKEN  # token arbitrario
npx wrangler secret put GITHUB_TOKEN      # pat con scope repo, para backup
```

## 4. deploy del worker

```bash
npx wrangler deploy
```

anota la url `arxiu-worker.<subdominio>.workers.dev`. prueba:

```bash
curl https://arxiu-worker.<subdominio>.workers.dev/health
curl https://arxiu-worker.<subdominio>.workers.dev/files
```

## 5. dns + custom domain

en cloudflare dashboard:
- dns → añade record cname `api.arxiu.meowrhino.studio` → `arxiu-worker.<subdominio>.workers.dev` (proxied).
- descomentar `[[routes]]` en `wrangler.toml` y redeploy.

verifica:
```bash
curl https://api.arxiu.meowrhino.studio/health
```

## 6. pages (frontend)

cloudflare dashboard → pages → conectar con repo github `arxiu`:
- build command: (vacío)
- output dir: `/`
- custom domain: `arxiu.meowrhino.studio`

actualiza `app.js` línea 2 con `https://api.arxiu.meowrhino.studio` y push.

## 7. humo

- abre `https://arxiu.meowrhino.studio` → 13 archivos.
- sube un pdf → aparece al instante.
- crea texto → aparece al instante.
- clica un archivo → abre el pdf.

## 8. limpieza post-migración (opcional)

cuando todo funcione durante una semana:
- el cron semanal reescribirá `/data/` y `data.json` en el repo → queda como espejo auditable.
- si quieres, desactiva el worker viejo si lo tenías en otra url.

## 9. moderación

el endpoint está vivo. para flag/unflag/delete, curl con `x-moderation-token`.
