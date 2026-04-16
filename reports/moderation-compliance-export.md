# Moderation Compliance Export

- Generated at: 2026-04-16T18:09:04.057Z
- Ledger source: `data/moderation-events.log.jsonl`
- Snapshot source: `data/moderation-review-snapshots.log.jsonl`
- Total events: **7**
- Total snapshots: **7**
- Total overrides: **1**
- Excepciones legacy aceptadas: **1**

## Resumen de eventos

### Por actor_type
- `system`: 3
- `compliance`: 2
- `ops`: 2

### Por new_outcome
- `allow`: 4
- `allow_with_monitoring`: 2
- `pending_review`: 1

### Por trigger_type
- `risk_engine`: 3
- `manual_review`: 2
- `appeal_resolution`: 1
- `policy_update`: 1

## Resumen de overrides

- `evt_phase26_20260416_007` | transition=pending_review -> allow | reason=evidence_verified | actor=compliance/cmp_ops_01

## Transiciones sensibles ejecutadas

- `evt_seed_20260416_004` | listing=re-land-valencia-technological-006 | allow_with_monitoring -> allow | override=false
- `evt_phase26_20260416_007` | listing=re-industrial-rotterdam-port-005 | pending_review -> allow | override=true

## Snapshots asociados

- Eventos con snapshot: 7/7

## Posibles gaps de trazabilidad

- No se detectan gaps en este corte.

## Excepciones legacy aceptadas

- code=`sensitive_without_override` | event=evt_seed_20260416_004 | line=4 | Excepción legacy aceptada y documentada.

## Observaciones operativas

- El paquete ledger+snapshots mantiene trazabilidad operativa consistente en este corte.
- Recomendación: exigir snapshot inmediato tras cada evento sensible u override.
