# Moderation Workflow (Fase 19)

Fecha: 2026-04-16

## Flujo de decisión

1. Ingesta listing
2. Normalización (`normalizeListingForRisk`)
3. Cálculo señales duplicado
4. Cálculo señales fraude
5. Score agregado
6. Clasificación outcome
7. Emisión de resumen auditable

## Outcomes operativos

- `allow`: publicación normal
- `allow_with_monitoring`: publicación + seguimiento reforzado
- `pending_review`: cola de revisión humana
- `quarantine`: bloqueo temporal preventivo
- `suspend_candidate`: caso escalado para suspensión

## Trazabilidad mínima requerida

- `decision_id`
- `listing_id`
- `computed_score`
- `outcome`
- `top_flags`
- `analyst_notes`
- `created_at`
- `resolved_at`

## Señales anti-abuso documentadas

- re-subidas tras `expired` / `off_market`
- abuso de free tier por volumen
- rotación anómala de estados
- creación automatizada por IP/dispositivo
- reutilización de contacto entre cuentas

## Nota legal-operativa

El flujo de fase 19 es de portal de anuncios con moderación/riesgo. No introduce intermediación contractual ni custodia de dinero.
