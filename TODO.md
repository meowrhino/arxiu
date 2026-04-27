# TODO

migración a cloudflare puro completada — 2026-04-27.

## estado actual

producción vacía y funcional. todo lo importante está en marcha:

- frontend: https://arxiu.meowrhino.studio (cloudflare pages)
- api: https://api.arxiu.meowrhino.studio (cloudflare worker)
- almacén: r2 bucket `arxiu-pdfs` (privado, servido a través del worker)
- índice: d1 database `arxiu-db` (tablas `files` y `hashtags`)
- rate-limit: kv namespace `RATE_LIMIT` (5 uploads/h por ip)
- cron diario 03:00 utc → reindexa hashtags
- cron semanal domingo 04:00 utc → backup d1+r2 al repo

probado end-to-end:

- editor markdown → pdf (h1/h2/h3, bold, italic, listas, hr, acentos)
- upload de pdf grande (1.6 mb, 150 págs) con md5 bit-a-bit idéntico
- listado refresca al instante (no espera al cron)
- modo +18 oculta archivos flagged
- /moderate borra de r2 + d1 y devuelve 410 después
- cors, magic bytes %PDF-, rate-limit funcionando

## info clave

- moderation token: guardado fuera del repo (chat / password manager). para verlo: `npx wrangler secret list` en `worker/` solo lista nombres, el valor no se puede recuperar — si lo pierdes, rota con `npx wrangler secret put MODERATION_TOKEN`.
- ids de recursos: en `worker/wrangler.toml`.

## pendiente

### sí o sí
nada urgente. el sistema está operativo.

### recomendado (2 minutos)
- [ ] **desactivar github pages**: en `settings → pages → source` del repo en github, elige `none` y save. la url vieja `meowrhino.github.io/arxiu/` está rota tras la limpieza del repo y conviene quitarla.

### opcional
- [ ] rotar el moderation token si te molesta tenerlo en este chat: `echo -n "NUEVO" | npx wrangler secret put MODERATION_TOKEN` desde `worker/`.
- [ ] quitar el cron de backup si no quieres commits automáticos cada domingo: editar `[triggers] crons` en `worker/wrangler.toml`, dejar solo `["0 3 * * *"]`, `npx wrangler deploy`.
- [ ] subir el límite de 2 mb cuando lo necesites: `MAX_SIZE` línea 1 de `worker/worker.js`. workers acepta hasta 100 mb gratis, r2 hasta 5 tb.
- [ ] añadir hashtag autocomplete o bulk delete via /moderate cuando crezca el archivo.

## automático (no haces nada)

- ssl auto-renovable en ambos custom domains
- backup semanal recreará `/data/` y `data.json` cuando haya archivos
- los crons corren solos via cloudflare workers triggers

## comandos útiles

```bash
# health
curl https://api.arxiu.meowrhino.studio/health

# listado
curl https://api.arxiu.meowrhino.studio/files | python3 -m json.tool

# moderar (flag/unflag/delete)
curl -X POST https://api.arxiu.meowrhino.studio/moderate \
  -H "x-moderation-token: TU_TOKEN" \
  -H "content-type: application/json" \
  -d '{"id":"<id>","action":"delete"}'

# query d1
cd worker && npx wrangler d1 execute arxiu-db --remote --command="SELECT * FROM files"

# logs en vivo del worker
cd worker && npx wrangler tail
```
