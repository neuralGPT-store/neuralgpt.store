# Pre-Push Commit Slicing Plan

## Objetivo
Separar el historial en capas coherentes para minimizar riesgo de regresión, facilitar revisión y mantener trazabilidad técnica/auditable.

## Commit 1 — Base vertical inmobiliaria pública controlada
- Alcance:
  - rutas públicas del vertical (`inmobiliario/`, `venta/`, `alquiler/`, `listing/...`, `pais/...`, `ciudad/...`)
  - páginas puente públicas (`real-estate-index.html`, `venta.html`, `alquiler.html`, `pais.html`, `ciudad.html`, `listing.html`)
  - assets y JS de adaptación necesarios para render estático
- Archivos incluidos:
  - `inmobiliario*/`, `venta*/`, `alquiler*/`, `listing*/`, `pais*/`, `ciudad*/`, `hub-*.html`, `real-estate-index.html`, `sitemap-real-estate.*`, `assets/img/real-estate/**`, `js/real-estate-*.js`, `js/clean-route-wrappers.js`, `data/listings.json`, `data/taxonomy.json`, `data/site-settings.json`
- Razón:
  - establecer capa de producto inmobiliario y geo piloto antes de auditoría interna.
- Riesgo:
  - SEO/canonical coexistencia; mitigado por despliegue controlado sin 301.
- Dependencias:
  - ninguna previa; es la base.

## Commit 2 — Motor de riesgo y reglas de moderación
- Alcance:
  - motor anti-duplicados/anti-fraude + datasets de reglas
  - builders de risk-report y summary
- Archivos incluidos:
  - `js/real-estate-risk-engine.js`
  - `data/fraud-rules.json`, `data/moderation-rules.json`, `data/risk-report.json`
  - `scripts/build-risk-report.js`, `scripts/run-risk-engine-smoke.js`, `scripts/build-risk-summary.js`, `scripts/validate-real-estate-data.js`
  - `reports/risk-report-summary.md`
- Razón:
  - aislar lógica de scoring de la capa pública y permitir validación independiente.
- Riesgo:
  - drift entre reportes y dataset; mitigado con rebuild reproducible.
- Dependencias:
  - Commit 1 (dataset y modelo base).

## Commit 3 — Ledger + integrity chain + state machine
- Alcance:
  - ledger append-only de moderación
  - validador de integridad y reporte de integridad
  - state machine y hardening de transiciones/override
- Archivos incluidos:
  - `data/moderation-events.log.jsonl`, `data/moderation-state-machine.json`
  - `scripts/lib/moderation-ledger-core.js`
  - `scripts/append-moderation-event.js`, `scripts/validate-moderation-ledger.js`, `scripts/build-moderation-integrity-report.js`, `scripts/build-moderation-audit-view.js`
  - `reports/moderation-audit.md`, `reports/moderation-integrity.md`
- Razón:
  - encapsular trazabilidad operativa enterprise-grade.
- Riesgo:
  - incompatibilidad con eventos legacy; mitigado por compatibilidad v1 con warnings.
- Dependencias:
  - Commit 2 (outcomes/risk base).

## Commit 4 — Snapshots inmutables + compliance/drift
- Alcance:
  - snapshots por evento
  - export de cumplimiento
  - detección de drift ledger↔risk-report
- Archivos incluidos:
  - `data/moderation-review-snapshots.log.jsonl`
  - `scripts/build-review-snapshot.js`, `scripts/build-moderation-compliance-export.js`, `scripts/check-moderation-risk-drift.js`
  - `reports/moderation-compliance-export.md`, `reports/moderation-risk-drift.md`
- Razón:
  - cerrar trazabilidad completa evento->snapshot->compliance.
- Riesgo:
  - gaps iniciales por eventos legacy; mitigado con reporte explícito.
- Dependencias:
  - Commit 3.

## Commit 5 — Higiene pre-push y gobernanza documental
- Alcance:
  - auditoría de repo
  - resolución de bloqueos pre-push
  - política de `.gitignore` para docs y artefactos LAB/transición
  - documentación de fases y plan operativo
- Archivos incluidos:
  - `.gitignore`
  - `scripts/repo-hygiene-audit.js`
  - `reports/repo-hygiene-audit.md`
  - `docs/migration-plan/pre-push-blockers.md`
  - `docs/migration-plan/pre-push-commit-slicing-plan.md`
  - `docs/migration-plan/phase-25-pre-push-resolution-and-commit-slicing.md`
  - resto de docs de fase necesarias
- Razón:
  - dejar el repo defendible para revisión/push sin ruido accidental.
- Riesgo:
  - dejar fuera docs críticos si política `docs/` no queda bien aplicada.
- Dependencias:
  - Commits 1-4 (contexto documental y auditoría).

## Exclusiones deliberadas de este pack
- `marketplace.html`, `product.html`, `index.html` (cambios tracked sensibles fuera de alcance editorial actual):
  - deben viajar en slice independiente o rama dedicada tras revisión funcional específica.
