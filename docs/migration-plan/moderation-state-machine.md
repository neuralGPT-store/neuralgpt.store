# Moderation State Machine (Internal)

## Outcomes
- `allow`
- `allow_with_monitoring`
- `pending_review`
- `quarantine`
- `suspend_candidate`

## Transition policy base

### `null`
Permitidas:
- `allow`
- `allow_with_monitoring`
- `pending_review`

### `allow`
Permitidas:
- `allow`
- `allow_with_monitoring`
- `pending_review`

### `allow_with_monitoring`
Permitidas:
- `allow_with_monitoring`
- `allow`
- `pending_review`
- `quarantine`

### `pending_review`
Permitidas:
- `pending_review`
- `allow_with_monitoring`
- `quarantine`
- `suspend_candidate`

### `quarantine`
Permitidas:
- `quarantine`
- `pending_review`
- `suspend_candidate`

### `suspend_candidate`
Permitidas:
- `suspend_candidate`
- `quarantine`

## Sensitive transitions (override obligatorio)
- `allow_with_monitoring -> allow`
- `pending_review -> allow_with_monitoring`
- `pending_review -> allow`
- `quarantine -> pending_review`
- `suspend_candidate -> quarantine`

Racional editorial:
- Son de-escalados o movimientos críticos de riesgo que requieren evidencia fuerte y rastro auditable.

## Override hardening
Para ejecutar transiciones inválidas o sensibles:
- Flag explícito: `--override-transition`
- `override_reason_code` obligatorio (permitidos):
  - `evidence_verified`
  - `false_positive`
  - `policy_exception`
  - `appeal_upheld`
  - `data_correction`
- `override_justification` obligatorio (mínimo 24 caracteres)
- `actor_type` permitido solo en: `moderator`, `ops`, `compliance`
- `actor_type=system` prohibido para override
- `actor_id` obligatorio en override

## Artefactos técnicos
- `scripts/lib/moderation-ledger-core.js`
- `data/moderation-state-machine.json`
- `scripts/append-moderation-event.js`
