# Phase 24 - Immutable Snapshots, Policy Hardening and Pre-Push Hygiene

## Resumen de ejecución
Se reforzó la capa editorial interna con snapshots inmutables por evento, hardening de overrides/transiciones y auditoría de higiene pre-push.

## Archivos creados
- `data/moderation-review-snapshots.log.jsonl`
- `scripts/build-review-snapshot.js`
- `scripts/build-moderation-compliance-export.js`
- `reports/moderation-compliance-export.md`
- `scripts/check-moderation-risk-drift.js`
- `reports/moderation-risk-drift.md`
- `scripts/repo-hygiene-audit.js`
- `reports/repo-hygiene-audit.md`
- `docs/migration-plan/pre-push-blockers.md`
- `docs/migration-plan/phase-24-immutable-snapshots-policy-hardening-and-prepush-hygiene.md`

## Archivos modificados
- `scripts/lib/moderation-ledger-core.js`
- `scripts/append-moderation-event.js`
- `data/moderation-state-machine.json`

## Cómo funcionan los snapshots inmutables
- Builder: `scripts/build-review-snapshot.js`
- Entrada: `data/moderation-events.log.jsonl` + `data/risk-report.json`
- Salida append-only: `data/moderation-review-snapshots.log.jsonl`
- Regla idempotente por evento: no duplica snapshots del mismo `moderation_event_id`.
- Cada snapshot incluye:
  - `snapshot_id`
  - `moderation_event_id`
  - `listing_id`
  - `slug`
  - `risk_report_excerpt`
  - `duplicate_signals`
  - `fraud_signals`
  - `outcome_at_snapshot`
  - `review_priority`
  - `notes`
  - `created_at`
  - `snapshot_hash`
  - `schema_version`

## Cómo se endurecieron los overrides
- Se introdujo política formal en `scripts/lib/moderation-ledger-core.js`:
  - `SENSITIVE_TRANSITIONS`
  - `OVERRIDE_REASON_CODES`
  - `OVERRIDE_POLICY`
- `scripts/append-moderation-event.js` ahora exige para override:
  - `--override-transition`
  - `override_reason_code` válido
  - `override_justification` mínimo 24 caracteres
  - `actor_type` permitido (`moderator|ops|compliance`)
  - `actor_id` obligatorio
  - prohibido `actor_type=system`

## Cómo se genera compliance export
- Script: `scripts/build-moderation-compliance-export.js`
- Reporte: `reports/moderation-compliance-export.md`
- Incluye:
  - resumen de eventos
  - resumen de overrides
  - transiciones sensibles ejecutadas
  - snapshots asociados
  - gaps de trazabilidad
  - observaciones operativas

## Cómo se detecta drift
- Script: `scripts/check-moderation-risk-drift.js`
- Reporte: `reports/moderation-risk-drift.md`
- Detecta:
  - incoherencias de outcome ledger vs risk-report
  - eventos sin snapshot cuando aplica
  - snapshots huérfanos
  - listings en risk-report sin historial en ledger

## Bloqueos pre-push actuales
Ver `docs/migration-plan/pre-push-blockers.md`.
Bloqueos detectados:
1. `docs/` ignorado por `.gitignore`.
2. cambios tracked sensibles en `marketplace.html` y `product.html`.
3. residuos sospechosos pendientes de decisión.

## Nota explícita sobre `docs/` ignorado
En el estado actual del repo, `docs/` aparece ignorado por `.gitignore`, lo que impide stage automático de esta documentación para push.

## Límites actuales por ausencia de backend
- No hay locking de concurrencia multiusuario sobre logs append-only.
- No hay firma externa o anclaje criptográfico fuera de repositorio.
- No hay control de permisos/autenticación de actores.

## Siguiente fase recomendada
Fase 25 - Pre-Push Resolution Pack:
- resolver bloqueos de `pre-push-blockers.md`
- definir política final de `.gitignore` para docs y artefactos editoriales
- separar formalmente residuos seguros vs sospechosos
- ejecutar checklist final de publicación con commit slicing limpio
