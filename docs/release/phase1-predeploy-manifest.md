# Manifest Predeploy Fase 1 (Web Inmobiliaria)

Fecha: 2026-04-19
Estado: READY_FOR_CLEAN_PUSH
Alcance: solo portal inmobiliario fase 1 (sin vacacional visible, sin Chany Local)

## 1) Scope limpio para release

### Incluir en predeploy
- Web pública y UX fase 1:
  - `index.html`, `real-estate-index.html`, `venta.html`, `alquiler.html`, `listing.html`
  - `contact.html`, `confirm.html`, `edit.html`, `404.html`, `sponsors.html`
  - `about.html`, `terms.html`, `privacy.html`, `legal.html`
  - `pais.html`, `ciudad.html`, `hub-pais.html`, `hub-ciudad.html`
- SEO y cobertura:
  - `robots.txt`, `sitemap.xml`, `sitemap-real-estate.html`
  - `data/site-settings.json`, `data/taxonomy.json`
- Chany visible y ops web:
  - `data/agent-kb.json`, `js/agent-chat.js`
  - `ops/chany/console.html`, `js/chany-ops-console.js`
- Lógica portal (publicación/edición/moderación/seguridad):
  - `scripts/serve.js`, `scripts/listing-flow-engine.js`, `scripts/image-pipeline.js`
  - `scripts/ops-action-engine.js`, `scripts/ops-batch-preflight-engine.js`, `scripts/ops-batch-execution-engine.js`, `scripts/ops-batch-review-engine.js`, `scripts/ops-batch-item-review-engine.js`
- Checks mínimos recomendados en rama release:
  - `scripts/check-public-listing-endpoint-e2e.js`, `scripts/check-listing-flow-integration.js`, `scripts/check-chany-snapshot-regression.js`, `scripts/check-image-pipeline.js`

### Excluir del predeploy (legacy/documental/cuarentena)
- Borrados/artefactos legacy no inmobiliarios y rutas antiguas de software:
  - `marketplace.html`, `product.html`, `providers*.html`, `pricing.html`, `api.html`, `blog.html`, `category.html`, `vendor-onboarding.html`, `quantum.html`, `console.html`
  - `assets/outreach/*`, `assets/sponsors/sponsor-*.html`, `assets/public/sitemap.xml`, y wallpapers/imagenes legacy ajenas a fase 1
- Documentación de migración y reportes internos:
  - `docs/migration-plan/*`, `reports/*`
- Logs/temporales locales:
  - `data/chany/public-listing-upsert-log.jsonl`, `data/moderation-events.log.jsonl`, temporales de `/tmp`
- Cualquier cambio fiscal/local privado y cualquier activación de vacacional fase 2

## 2) Features incluidas
- Publicación/edición/confirmación pública con `listing_id + edit_key`
- Subida de imágenes con pipeline y guardas
- Moderación por capas: duplicados + content policy (`review_required`, `abuse_blocked`, `content_policy_blocked`)
- Contacto anunciante restringido tras pago: nombre + teléfono + correo
- Sponsors sectoriales rotatorios
- Cobertura visible fase 1: Europa + Reino Unido + Irlanda + Escocia + Turquía + Islandia + Groenlandia
- Chany asistente inmobiliaria alineada a flujos reales
- Chany Ops conectada a snapshot/riesgo/lotes/moderación con control humano

## 3) Flags y cosas NO activadas
- Vacacional/corta estancia: NO visible, NO endpoints públicos
- Chany Local fuera de web: NO tocado
- Automatismos destructivos: NO habilitados
- `feature_flags` no activadas en `data/site-settings.json` se mantienen como están

## 4) Riesgos conocidos no bloqueantes
- Árbol Git muy sucio: riesgo de mezclar cambios legacy si no se hace staging selectivo
- Sin screenshot automation de UI: queda QA visual humano final por viewport
- Heurística de moderación de imagen/texto es conservadora (sin clasificador visual pesado)

## 5) Pasos exactos para push limpio (sin ejecutar aquí)
1. Crear rama release (si aplica): `git checkout -b release/fase1-predeploy`
2. Staging selectivo SOLO de scope incluido (por archivo/ruta), no usar `git add .`
3. Revisar staged: `git diff --cached --name-only`
4. Ejecutar checks:
   - `npm run check:static`
   - `node scripts/check-listing-flow-integration.js`
   - `node scripts/check-public-listing-endpoint-e2e.js`
   - `node scripts/check-chany-snapshot-regression.js`
5. Confirmar ausencia de residuos software en staged (`marketplace`, `product`, `providers`, `crypto`, etc.)
6. Commit + push + PR (fuera de este bloque)

## 6) Checklist GitHub pre-merge
- PR solo con archivos del scope fase 1
- CI/checks en verde
- Diff de seguridad revisado (`scripts/serve.js`, `scripts/listing-flow-engine.js`)
- Confirmación explícita: sin vacacional visible, sin Chany Local, sin fiscal/local privado

## 7) Checklist Cloudflare (sin ejecutar aquí)
### Antes del deploy
- Build output correcto (estático) y ruta raíz esperada
- Variables de entorno necesarias del servidor/ops definidas
- Access/Basic Auth de `/ops/*` verificado

### Después del deploy
- Smoke HTTP:
  - `200`: `/`, `/real-estate-index.html`, `/venta.html`, `/alquiler.html`, `/listing.html`, `/contact.html`, `/confirm.html`, `/edit.html`, `/sponsors.html`, `/about.html`, `/terms.html`, `/privacy.html`, `/legal.html`, `/robots.txt`, `/sitemap.xml`
  - `404`: ruta inexistente
  - `/ops/chany/console.html` protegido (no público)
- Flujo publicar/confirmar/editar en entorno staging
- Chany visible y copy inmobiliaria
- Sponsors y correos correctos

