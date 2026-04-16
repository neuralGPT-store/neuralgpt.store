# Moderation Ledger Integrity Report

- Generated at: 2026-04-16T18:12:07.381Z
- Ledger: `data/moderation-events.log.jsonl`
- Health: **OK**
- total_events: **7**
- valid_events: **7**
- violations_count: **0**
- warnings_count: **3**

## Salud global del ledger

- integrity_ok: `true`
- integrity_fail: `false`
- chain_tail_hash: `sha256:2d731d1b949dcea848a401d46f82f8522ec076622454af276c2a45b06e72db94`

## Ultimos hashes

- line=3 | event=`evt_seed_20260416_003` | hash=`sha256:3e09aefbb8e6a2c6e9e216db94f5f6b01a986b5a7779fc1a347e1bccd30a925d`
- line=4 | event=`evt_seed_20260416_004` | hash=`sha256:3a2faa09d9380781188eef704225e26c02b3bb945417691cba05bd2816c0e4ad`
- line=5 | event=`evt_seed_20260416_005` | hash=`sha256:a13e8489754a469d90fe49ddde8e4b55baab7cd766b48346e8bf306412c67ed0`
- line=6 | event=`evt_phase23_20260416_006` | hash=`sha256:afde500db301f40ec1ac883665242c589d29e3351ba1eab9387089c0d63f50b7`
- line=7 | event=`evt_phase26_20260416_007` | hash=`sha256:2d731d1b949dcea848a401d46f82f8522ec076622454af276c2a45b06e72db94`

## Violaciones detectadas

- No se detectaron violaciones de integridad ni contrato.

## Warnings de compatibilidad

- line=3 | code=`legacy_listing_outcome_mismatch` | `previous_outcome` legacy no alineado con historial del listing. esperado=null, recibido=allow
- line=4 | code=`legacy_sensitive_exception_accepted` | Transicion sensible sin override aceptada por excepción legacy: evt_seed_20260416_004
- line=5 | code=`legacy_listing_outcome_mismatch` | `previous_outcome` legacy no alineado con historial del listing. esperado=null, recibido=allow

## Transiciones inválidas detectadas

- No se detectaron transiciones inválidas.

## Observaciones operativas

- La cadena de integridad está consistente para eventos v2 y mantiene compatibilidad con eventos legacy v1.
- Recomendación: emitir nuevos eventos siempre en `schema_version=2` para trazabilidad fuerte.
