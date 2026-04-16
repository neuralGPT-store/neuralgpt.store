# Phase 22 - Append-Only Moderation Ledger and Audit

## Objetivo ejecutado
Se implementa una base de trazabilidad operativa append-only para moderación, con appender validado, builder de auditoría markdown y lectura read-only en dashboard interno.

## Archivos creados
- `data/moderation-events.log.jsonl`
- `scripts/append-moderation-event.js`
- `scripts/build-moderation-audit-view.js`
- `reports/moderation-audit.md` (generado por builder)
- `docs/migration-plan/phase-22-append-only-moderation-ledger-and-audit.md`

## Archivos modificados
- `reports/risk-dashboard.html` (integración read-only de ledger interno)

## Funcionamiento del ledger
- Formato: JSON Lines (`.jsonl`), un evento JSON por línea.
- Política: append-only; no reescritura histórica durante operación normal.
- Contrato mínimo validado por script:
  - `moderation_event_id`
  - `listing_id`
  - `slug`
  - `actor_type`
  - `actor_id` (nullable)
  - `previous_outcome` (nullable)
  - `new_outcome`
  - `trigger_type`
  - `trigger_signals`
  - `notes`
  - `created_at`

## Cómo agregar eventos
Comando por payload JSON inline:
```bash
node scripts/append-moderation-event.js --json '{"moderation_event_id":"evt_...","listing_id":"...","slug":"...","actor_type":"system","actor_id":null,"previous_outcome":"allow","new_outcome":"allow_with_monitoring","trigger_type":"risk_engine","trigger_signals":["missing_contact_identity"],"notes":"...","created_at":"2026-04-16T18:50:00.000Z"}'
```

Comando por archivo:
```bash
node scripts/append-moderation-event.js --json-file ./event.json
```

Comando por flags:
```bash
node scripts/append-moderation-event.js --moderation_event_id evt_... --listing_id re-... --slug slug-... --actor_type ops --actor_id ops_01 --previous_outcome allow --new_outcome pending_review --trigger_type manual_review --trigger_signals suspicious_price,missing_contact_identity --notes "Escalado" --created_at 2026-04-16T18:55:00.000Z
```

## Cómo generar la auditoría markdown
```bash
node scripts/build-moderation-audit-view.js
```

Salida:
- `reports/moderation-audit.md`

Incluye:
- total de eventos
- distribución por `actor_type`
- distribución por `new_outcome`
- distribución por `trigger_type`
- últimos eventos
- eventos por listing
- triggers más frecuentes
- observaciones operativas

## Integración con dashboard interno
`reports/risk-dashboard.html` ahora también consume:
- `../data/moderation-events.log.jsonl`

Y muestra:
- número total de eventos de moderación
- últimos eventos
- columna de eventos por listing en la tabla principal

La integración es read-only y no toca capa pública, legacy ni SEO público.

## Límites actuales (sin backend)
- No hay control transaccional multiusuario.
- No hay firma criptográfica/inmutabilidad externa del ledger.
- No hay autenticación/autorización de actores.
- No existe API de consulta histórica; todo se basa en archivos estáticos.

## Nota importante sobre `docs/` y `.gitignore`
`docs/` continúa ignorado por `.gitignore` en el estado actual del repo, por lo que esta documentación no se stagea por defecto. Debe definirse política explícita de versionado documental antes del push final.

## Siguiente fase recomendada
Fase 23 - Policy Guardrails + Integrity Controls:
- validador de integridad encadenada del ledger (hash de línea previa)
- firma local opcional de lotes de eventos
- reglas de transición permitida de outcomes (state machine)
- reporte de violaciones de política en `reports/moderation-integrity.md`
