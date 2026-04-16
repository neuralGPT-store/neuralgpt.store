# Repo Hygiene Audit (Pre-Push)

- Generated at: 2026-04-16T18:09:04.118Z
- Total status entries: 60
- Tracked changes: 4
- Untracked files: 56

## Archivos no trackeados críticos

- `alquiler.html`
- `alquiler/`
- `assets/img/real-estate/`
- `ciudad.html`
- `ciudad/`
- `data/fraud-rules.json`
- `data/listings.json`
- `data/moderation-events.log.jsonl`
- `data/moderation-legacy-exceptions.json`
- `data/moderation-review-snapshots.log.jsonl`
- `data/moderation-rules.json`
- `data/moderation-state-machine.json`
- `data/risk-report.json`
- `data/site-settings.json`
- `data/taxonomy.json`
- `docs/`
- `hub-ciudad.html`
- `hub-pais.html`
- `inmobiliario.html`
- `inmobiliario/`
- `js/clean-route-wrappers.js`
- `js/real-estate-adapters.js`
- `js/real-estate-data.js`
- `js/real-estate-presenters.js`
- `js/real-estate-risk-engine.js`
- `listing.html`
- `listing/`
- `pais.html`
- `pais/`
- `real-estate-index.html`
- `reports/moderation-audit.md`
- `reports/moderation-compliance-export.md`
- `reports/moderation-integrity.md`
- `reports/moderation-risk-drift.md`
- `reports/pre-push-staging-status.md`
- `reports/repo-hygiene-audit.md`
- `reports/risk-dashboard.html`
- `reports/risk-report-summary.md`
- `scripts/append-moderation-event.js`
- `scripts/build-moderation-audit-view.js`
- `scripts/build-moderation-compliance-export.js`
- `scripts/build-moderation-integrity-report.js`
- `scripts/build-review-snapshot.js`
- `scripts/build-risk-report.js`
- `scripts/build-risk-summary.js`
- `scripts/check-moderation-risk-drift.js`
- `scripts/generate-clean-route-lab.js`
- `scripts/lib/`
- `scripts/repo-hygiene-audit.js`
- `scripts/run-risk-engine-smoke.js`
- `scripts/validate-moderation-ledger.js`
- `scripts/validate-real-estate-data.js`
- `sitemap-real-estate.html`
- `sitemap-real-estate.xml`
- `venta.html`
- `venta/`

## Artefactos generados que conviene versionar

- `data/fraud-rules.json`
- `data/listings.json`
- `data/moderation-events.log.jsonl`
- `data/moderation-legacy-exceptions.json`
- `data/moderation-review-snapshots.log.jsonl`
- `data/moderation-rules.json`
- `data/moderation-state-machine.json`
- `data/risk-report.json`
- `data/site-settings.json`
- `data/taxonomy.json`
- `reports/moderation-audit.md`
- `reports/moderation-compliance-export.md`
- `reports/moderation-integrity.md`
- `reports/moderation-risk-drift.md`
- `reports/pre-push-staging-status.md`
- `reports/repo-hygiene-audit.md`
- `reports/risk-report-summary.md`
- `scripts/append-moderation-event.js`
- `scripts/build-moderation-audit-view.js`
- `scripts/build-moderation-compliance-export.js`
- `scripts/build-moderation-integrity-report.js`
- `scripts/build-review-snapshot.js`
- `scripts/build-risk-report.js`
- `scripts/build-risk-summary.js`
- `scripts/check-moderation-risk-drift.js`
- `scripts/generate-clean-route-lab.js`
- `scripts/repo-hygiene-audit.js`
- `scripts/run-risk-engine-smoke.js`
- `scripts/validate-moderation-ledger.js`
- `scripts/validate-real-estate-data.js`

## Artefactos generados que NO conviene versionar (heurístico)

- No detectados por heurística.

## Residuos o duplicados sospechosos (no borrar aún)

- No detectados.

## Inconsistencias .gitignore vs artefactos necesarios

- No se detecta bloqueo de `docs/` en `.gitignore`.

## Bloqueos pre-push

- Hay cambios tracked en archivos sensibles públicos fuera de esta fase: index.html, marketplace.html, product.html

## Recomendación operativa

- No ejecutar push hasta resolver los bloqueos listados y definir una política explícita para docs/ y residuos sospechosos.
