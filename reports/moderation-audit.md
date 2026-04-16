# Moderation Audit View (Internal)

- Generated at: 2026-04-16T18:09:03.973Z
- Ledger source: `data/moderation-events.log.jsonl`
- Total de eventos: **7**

## Distribucion por actor_type

- `system`: 3
- `compliance`: 2
- `ops`: 2

## Distribucion por new_outcome

- `allow`: 4
- `allow_with_monitoring`: 2
- `pending_review`: 1

## Distribucion por trigger_type

- `risk_engine`: 3
- `manual_review`: 2
- `appeal_resolution`: 1
- `policy_update`: 1

## Ultimos eventos

- `evt_phase26_20260416_007` | listing=`re-industrial-rotterdam-port-005` | `pending_review` -> `allow` | trigger=`appeal_resolution` | signals=manual_evidence_verified | created_at=2026-04-16T17:40:00.000Z
- `evt_phase23_20260416_006` | listing=`re-industrial-rotterdam-port-005` | `allow_with_monitoring` -> `pending_review` | trigger=`manual_review` | signals=price_per_m2_outlier, missing_contact_identity | created_at=2026-04-16T16:50:00.000Z
- `evt_seed_20260416_005` | listing=`re-industrial-rotterdam-port-005` | `allow` -> `allow_with_monitoring` | trigger=`risk_engine` | signals=price_per_m2_outlier | created_at=2026-04-16T16:45:00.000Z
- `evt_seed_20260416_004` | listing=`re-land-valencia-technological-006` | `allow_with_monitoring` -> `allow` | trigger=`policy_update` | signals=identity_unverified | created_at=2026-04-16T16:33:00.000Z
- `evt_seed_20260416_003` | listing=`re-land-valencia-technological-006` | `allow` -> `allow_with_monitoring` | trigger=`manual_review` | signals=identity_unverified, price_per_m2_outlier | created_at=2026-04-16T16:24:00.000Z
- `evt_seed_20260416_002` | listing=`re-rent-lisbon-estrela-002` | `null` -> `allow` | trigger=`risk_engine` | signals=missing_contact_identity, price_per_m2_outlier | created_at=2026-04-16T16:21:00.000Z
- `evt_seed_20260416_001` | listing=`re-sale-madrid-salamanca-001` | `null` -> `allow` | trigger=`risk_engine` | signals=missing_contact_identity | created_at=2026-04-16T16:20:00.000Z

## Eventos por listing

- `re-industrial-rotterdam-port-005` (nave-logistica-ultima-milla-rotterdam-port): eventos=3, ultimo_outcome=`allow`, ultimo_evento=`evt_phase26_20260416_007`
- `re-land-valencia-technological-006` (suelo-finalista-uso-terciario-corredor-tecnologico-valencia): eventos=2, ultimo_outcome=`allow`, ultimo_evento=`evt_seed_20260416_004`
- `re-rent-lisbon-estrela-002` (apartamento-ejecutivo-larga-duracion-estrela-lisboa): eventos=1, ultimo_outcome=`allow`, ultimo_evento=`evt_seed_20260416_002`
- `re-sale-madrid-salamanca-001` (piso-senorial-reformado-barrio-salamanca-madrid): eventos=1, ultimo_outcome=`allow`, ultimo_evento=`evt_seed_20260416_001`

## Triggers mas frecuentes

- `price_per_m2_outlier`: 4
- `missing_contact_identity`: 3
- `identity_unverified`: 2
- `manual_evidence_verified`: 1

## Observaciones operativas

- El ledger es append-only y permite reconstruir transiciones por listing sin backend dinamico.
- Triggers dominantes actuales: `price_per_m2_outlier`.
- Eventos con outcomes de escalado (`pending_review+`): presentes.
- Recomendacion: registrar evento por cada override humano para mantener auditabilidad completa.
