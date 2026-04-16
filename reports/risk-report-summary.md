# Risk Report Summary (Editorial Interno)

- Fecha de generacion: 2026-04-16 18:09:03 UTC
- Engine version: `v1.0.0`
- Moderation workflow version: `v1.0.0`
- Total de listings: **7**

## Distribucion por outcome

- `allow`: 7
- `allow_with_monitoring`: 0
- `pending_review`: 0
- `quarantine`: 0
- `suspend_candidate`: 0

## Top senales duplicado

- `missing_contact_identity`: 7 apariciones

## Top senales fraude

- `price_per_m2_outlier`: 4 apariciones
- `identity_unverified`: 1 apariciones

## Top listings por score total

1. `re-land-valencia-technological-006` (suelo-finalista-uso-terciario-corredor-tecnologico-valencia) | total=15 | dup=2 | fraud=13 | outcome=`allow`
2. `re-industrial-rotterdam-port-005` (nave-logistica-ultima-milla-rotterdam-port) | total=9 | dup=2 | fraud=7 | outcome=`allow`
3. `re-rent-lisbon-estrela-002` (apartamento-ejecutivo-larga-duracion-estrela-lisboa) | total=9 | dup=2 | fraud=7 | outcome=`allow`
4. `re-room-berlin-charlottenburg-003` (suite-amueblada-larga-estancia-charlottenburg-berlin) | total=9 | dup=2 | fraud=7 | outcome=`allow`
5. `re-commercial-milan-brera-004` (local-prime-esquina-brera-milan) | total=2 | dup=2 | fraud=0 | outcome=`allow`

## Casos que requieren revision humana

- No hay casos en `pending_review`, `quarantine` ni `suspend_candidate` en este corte.
- Explicacion operativa: el dataset actual no dispara umbrales altos de duplicado/fraude (scores totales maximos <= 15 y sin critical signals).
- Accion recomendada: mantener monitorizacion activa sobre `allow_with_monitoring` cuando aparezca, y re-ejecutar este reporte en cada alta o lote de ingesta.

## Observaciones operativas

- El reporte es **read-only** y auditable: deriva directamente de `data/risk-report.json` sin mutar capa publica.
- La senal de mayor presencia en este corte es `missing_contact_identity`; conviene priorizar verificacion de identidad de contacto en fases siguientes.
- El estado actual (todos `allow`) no invalida el sistema: refleja un dataset controlado y pequeno; para stress test, incorporar muestras sinteticas de abuso en entorno interno.
