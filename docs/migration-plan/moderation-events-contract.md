# Moderation Events Contract (Fase 20)

Fecha: 2026-04-16

## Objetivo

Definir un contrato estable para eventos de moderación/riesgo que permita trazabilidad completa cuando exista persistencia backend, sin acoplar todavía la capa actual a infraestructura dinámica.

## Entidad `moderation_event`

Campos mínimos:

- `moderation_event_id` (string, UUID/ULID)
- `listing_id` (string, requerido)
- `actor_type` (enum: `system`, `moderator`, `ops`, `compliance`)
- `actor_id` (string nullable)
- `previous_outcome` (enum nullable)
- `new_outcome` (enum requerido)
- `trigger_type` (enum: `risk_engine`, `manual_review`, `appeal_resolution`, `policy_update`)
- `trigger_signals` (array de códigos de señal)
- `notes` (string nullable)
- `created_at` (ISO datetime requerido)

## Eventos futuros a registrar

1. Resultado automático inicial tras evaluación de riesgo.
2. Cambio de outcome por revisión humana.
3. Escalado a cuarentena/suspensión por reincidencia.
4. Resolución de apelación del anunciante.
5. Reapertura por cambio de política o mejora de verificación.

## Acciones automáticas (futuras)

- `allow`: publicación normal
- `allow_with_monitoring`: añadir vigilancia reforzada
- `pending_review`: encolar revisión humana
- `quarantine`: congelar visibilidad y bloquear publicación adicional
- `suspend_candidate`: activar protocolo de suspensión de cuenta

## Acciones manuales (futuras)

- confirmar/descartar falsos positivos
- aplicar override documentado de outcome
- añadir notas de investigación y evidencias
- cerrar evento con resolución final

## Trazabilidad y auditoría

- cada transición de outcome debe generar evento inmutable
- cada evento mantiene referencia de señales que lo provocan
- cambios manuales requieren `actor_type != system` y `actor_id`
- toda decisión debe ser reconstruible cronológicamente por `listing_id`

## Ejemplo JSON de referencia

```json
{
  "moderation_event_id": "evt_01K...",
  "listing_id": "re-sale-madrid-salamanca-001",
  "actor_type": "system",
  "actor_id": null,
  "previous_outcome": "allow_with_monitoring",
  "new_outcome": "pending_review",
  "trigger_type": "risk_engine",
  "trigger_signals": ["duplicate_title_strong", "free_tier_velocity_limit"],
  "notes": "Escalado automático por score >= 35",
  "created_at": "2026-04-16T18:10:00.000Z"
}
```

## No alcance actual

- no persistencia real
- no API de escritura/consulta
- no UI de backoffice

Contrato listo para fase de backend sin reescribir semántica de eventos.
