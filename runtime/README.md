# Runtime API scaffold (sin secretos)

Este runtime prepara la capa backend mínima para el frontend público ya cerrado.

## Endpoints preparados

- `GET /api/health`
- `GET /api/listings/status`
- `POST /api/listings/upsert`
- `POST /api/stripe/checkout-contact-unlock`
- `POST /api/stripe/checkout-mas-visibilidad`
- `POST /api/stripe/checkout-sensacional`
- `POST /api/stripe/checkout-plan-basico`
- `POST /api/stripe/checkout-plan-premium`
- `POST /api/stripe/webhook`

## Arranque local

```bash
node runtime/server.js
```

Puerto por defecto: `8081`.

## Estado operativo actual

- Listings (`upsert/status`): funcional con persistencia JSON local.
- Stripe checkout/webhook: operativo con reconciliación de eventos (`checkout.session.completed`, `payment_intent.succeeded`) y persistencia comercial en el store de listings.

## Contrato JSON operativo (listings)

Cada listing puede incluir estado comercial persistido en:

```json
{
  "id": "re_xxx",
  "status": "published",
  "visibility_rank": 1,
  "commercial": {
    "contact_unlocked": true,
    "contact_unlocked_at": "2026-04-21T00:00:00.000Z",
    "sensacional_until": "2026-04-22T00:00:00.000Z",
    "subscription": {
      "tier": "premium",
      "active": true,
      "updated_at": "2026-04-21T00:00:00.000Z"
    },
    "effects": {
      "contact_unlock": { "count": 1, "last_applied_at": "..." },
      "mas_visibilidad": { "count": 1, "last_applied_at": "..." },
      "sensacional_24h": { "count": 1, "last_applied_at": "..." },
      "plan_basico": { "count": 1, "last_applied_at": "..." },
      "plan_premium": { "count": 1, "last_applied_at": "..." }
    },
    "processed_event_ids": ["evt_xxx"],
    "processed_transaction_keys": ["pi_xxx"],
    "ledger": [{ "at": "...", "effect_key": "contact_unlock" }]
  }
}
```

Notas:
- El webhook usa idempotencia por `payment_intent` (o `session/event` fallback) para evitar dobles aplicaciones.
- Si falta `listing_id` o no existe en store, el webhook responde `200` pero marca reconciliación no aplicada (sin romper entrega de Stripe).

## Qué falta para activar pagos reales

1. Configurar variables `STRIPE_*` en entorno seguro (no en repo).
2. Configurar URL de webhook en Stripe apuntando a `/api/stripe/webhook`.
3. Activar `neural-backend-ready=true` y `neural-api-base` en el frontend desplegado.
