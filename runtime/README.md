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
- Stripe checkout/webhook: preparado, pero devuelve error controlado si faltan env vars.

## Qué falta para activar pagos reales

1. Configurar variables `STRIPE_*` en entorno seguro (no en repo).
2. Configurar URL de webhook en Stripe apuntando a `/api/stripe/webhook`.
3. Añadir reconciliación de eventos en webhook (TODO en handler).
4. Activar `neural-backend-ready=true` y `neural-api-base` en el frontend desplegado.
