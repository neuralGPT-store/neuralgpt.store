# Phase 25 - Pre-Push Resolution and Commit Slicing

## Resumen
Se resolvieron bloqueos pre-push críticos con limpieza de bisturí, política de versionado explícita y plan de commit slicing por capas.

## Bloqueos resueltos
1. Residuo local `.codex` eliminado con evidencia (`archivo vacío, no productivo`).
2. Política para artefactos LAB/transición definida en `.gitignore` para excluirlos del push sin borrado destructivo.
3. Política para docs definida en `.gitignore`:
   - se ignora `docs/*`
   - se versiona `docs/migration-plan/**`

## Bloqueos no resueltos (requieren decisión de publicación)
1. Cambios tracked sensibles fuera de esta fase en `marketplace.html` y `product.html` (también `index.html` aparece modificado).
   - recomendación: separarlos del push editorial y tratarlos en slice específico.
2. Drift operativo reportado (`reports/moderation-risk-drift.md`):
   - `re-industrial-rotterdam-port-005` desalineado entre ledger y risk-report.
3. Gap compliance legacy (`reports/moderation-compliance-export.md`):
   - transición sensible legacy sin override (`evt_seed_20260416_004`).

## Decisiones de versionado
### Sí conviene versionar
- `scripts/` de motor, ledger, snapshots, compliance, drift, higiene.
- `data/` de reglas, risk-report, ledger y snapshots (`*.json`, `*.jsonl`).
- `reports/` auditable de riesgo/moderación/higiene relevantes.
- `docs/migration-plan/**`.

### Mantener fuera del push (por ahora)
- `_lab_clean_routes/` (entorno LAB noindex).
- wrappers de transición `*-clean.html`.
- residuos locales/tooling (`.codex`).

## Limpieza ejecutada
- Eliminado:
  - `.codex`
- No eliminado por cautela (clasificados para exclusión de push):
  - `_lab_clean_routes/`
  - `alquiler-clean.html`
  - `ciudad-clean.html`
  - `hub-ciudad-clean.html`
  - `hub-pais-clean.html`
  - `listing-clean.html`
  - `pais-clean.html`
  - `venta-clean.html`

## Política para docs/
Se aplicó ajuste mínimo y justificado en `.gitignore`:
- antes: `docs/` bloqueado completamente
- ahora: se permite versionar únicamente `docs/migration-plan/**`.

Motivo:
- cerrar bloqueo pre-push de trazabilidad documental sin abrir todo `docs/` indiscriminadamente.

## Auditoría de cambios tracked sensibles
- `marketplace.html`:
  - diff grande, introduce bridge inmobiliario y cambios de metadatos/UI/comportamiento.
  - decisión: **no incluir en este push editorial/auditoría**; separar en slice funcional público.
- `product.html`:
  - diff grande, introduce bridge inmobiliario y render alternativo del detalle.
  - decisión: **no incluir en este push editorial/auditoría**; separar en slice funcional público.
- `index.html`:
  - aparece modificado tracked y fuera del alcance de esta fase.
  - decisión: **separar y revisar aparte**.

## Plan de commits
Ver `docs/migration-plan/pre-push-commit-slicing-plan.md`.

## Nota sobre regeneración
En esta fase solo se regeneraron artefactos de higiene/pre-push y se verificó idempotencia de snapshots.
No se regeneraron reportes de riesgo general por no haber cambios funcionales en el motor/dataset base de riesgo.

## Siguiente fase recomendada
Fase 26 - Push Readiness Final Gate:
- resolver explícitamente si `marketplace.html`, `product.html`, `index.html` entran o se posponen
- cerrar drift ledger↔risk-report con evento/snapshot o sincronización de risk-report
- ejecutar checklist final de staging por commit slice
