# Runtime `/api/*` map (fase 1)

Fecha: 2026-04-21  
Estado actual frontend: degradación segura en despliegue estático (GitHub Pages) con `backendReady=false` por defecto.

## 0) Diseño técnico final (bloque 16)

### Arquitectura elegida
- Frontend estático (ya cerrado) en `neuralgpt.store`.
- Backend Node dedicado para `/api/*` (dominio API o reverse proxy).
- Webhook Stripe solo en backend: `POST /api/stripe/webhook`.

### Por qué esta opción y no otra
- Es la mínima compatible con el frontend actual (`/api/*` ya integrado).
- GitHub Pages no ejecuta Node, por lo que backend debe ir separado.
- Mantiene secretos y webhook fuera de frontend.
- Evita introducir proveedores o servicios no confirmados.

### Variables de entorno necesarias
- Runtime:
  - `PORT`, `NODE_ENV`
  - `NEURAL_PUBLIC_BASE_URL`
  - `NEURAL_API_BASE_URL`
- Persistencia:
  - `LISTINGS_STORE_PATH`
  - `LISTINGS_EDIT_KEY_PEPPER`
- Stripe:
  - `STRIPE_SECRET_KEY` (no configurar aún)
  - `STRIPE_WEBHOOK_SECRET` (no configurar aún)
  - `STRIPE_PRICE_CONTACT_UNLOCK`
  - `STRIPE_PRICE_MAS_VISIBILIDAD`
  - `STRIPE_PRICE_SENSACIONAL`
  - `STRIPE_PRICE_PLAN_BASICO`
  - `STRIPE_PRICE_PLAN_PREMIUM`
  - `STRIPE_SUCCESS_URL`
  - `STRIPE_CANCEL_URL`

### Estructura mínima de carpetas (runtime nuevo)
```text
runtime/
  server.js
  router.js
  config/env.js
  handlers/listings.js
  handlers/stripe.js
  services/listings-store.js
  services/stripe-client.js
  lib/http.js
  lib/multipart.js
  data/.gitkeep
  .env.example
```

### Orden exacto de implementación
1. Base runtime (`server`, `router`, utilidades HTTP, `env`).
2. `listings/upsert` y `listings/status`.
3. Stripe checkout handlers con guardas de configuración.
4. Webhook con verificación de firma.
5. Ajuste de `neural-api-base` y `neural-backend-ready` en despliegue.
6. Prueba E2E con claves reales en último paso.

### Riesgos si se toca mal
- Exponer secretos Stripe en frontend.
- Aceptar `edit_key` sin hash/pepper.
- No validar firma `stripe-signature` en webhook.
- Cambiar contrato JSON esperado por frontend.
- Persistencia sin volumen (pérdida de datos).

## 1) Endpoints activos en frontend

### Publicación y edición de anuncios
- `GET /api/listings/status`
  - Página: `edit.html`
  - Query esperada: `listing_id`, `edit_key`
  - Respuesta esperada:
    - `200`: `{ ok: true, listing: {...} }`
    - `403`: clave inválida
    - `404`: anuncio no encontrado
- `POST /api/listings/upsert`
  - Páginas: `contact.html`, `edit.html`
  - Body: `multipart/form-data` con campos de ficha + contacto + `hp_check`
  - Respuesta esperada:
    - `{ ok: true, listing_id, listing_slug, mode, edit_key?, duplicate_review?, content_policy? }`
    - errores: `content_policy_blocked`, `advertiser_contact_required_fields_missing`, etc.

### Checkout / pagos
- `POST /api/stripe/checkout-contact-unlock`
  - Página: `listing.html`
  - Body JSON: `{ listing_id }`
  - Respuesta esperada: `{ checkout_url }`
- `POST /api/stripe/checkout-mas-visibilidad`
  - Página: `listing.html`
  - Body JSON: `{ listing_id }`
  - Respuesta esperada: `{ checkout_url }`
- `POST /api/stripe/checkout-sensacional`
  - Página: `listing.html`
  - Body JSON: `{ listing_id }`
  - Respuesta esperada: `{ checkout_url }`
- `POST /api/stripe/checkout-plan-basico`
  - Página: `pricing.html`
  - Body JSON: vacío
  - Respuesta esperada: `{ url }`
- `POST /api/stripe/checkout-plan-premium`
  - Página: `pricing.html`
  - Body JSON: vacío
  - Respuesta esperada: `{ url }`

## 2) Páginas afectadas
- `contact.html`
- `listing.html`
- `pricing.html`
- `edit.html` (noindex, flujo operativo)

## 3) Qué espera el frontend para estar 100% funcional
- API REST bajo prefijo configurable (actualmente `/api`).
- CORS/HTTPS coherente con dominio público.
- Respuestas JSON consistentes con los contratos anteriores.
- Integración Stripe server-side para creación de sesiones checkout.
- Persistencia de listings, validación editorial/riesgo y control de edición por `edit_key`.

## 4) Capa runtime mínima aplicada
- Archivo nuevo: `js/runtime-config.js`
  - `window.NeuralRuntime.apiBase` (default `/api`)
  - `window.NeuralRuntime.backendReady` (default `false`)
  - `window.NeuralRuntime.api(path)` para construir URLs API
- Comportamiento:
  - si `backendReady !== true`, UI muestra mensaje honesto y no simula éxito.
  - evita “botones que aparentan funcionar” en despliegue estático.

## 5) Archivos a tocar cuando exista backend real
- `js/runtime-config.js` (o meta tags/variables de despliegue)
  - activar `backendReady=true` por entorno
  - ajustar `apiBase` si no es `/api`
- `contact.html` (si cambia contrato de `upsert`)
- `edit.html` (si cambia contrato de `status/upsert`)
- `listing.html` (si cambian contratos de checkout)
- `pricing.html` (si cambian contratos de checkout planes)

## 6) Qué falta para E2E real
- Publicación real:
  - endpoint `POST /listings/upsert` operativo con almacenamiento, validación y respuesta estable.
- Edición real:
  - endpoint `GET /listings/status` con autenticación por `edit_key`.
- Pagos reales:
  - endpoints Stripe checkout operativos y webhooks de confirmación.
- Post-pago:
  - confirmación de desbloqueo de contacto y/o boost visible en listing.
- Observabilidad:
  - logging de errores de API y trazabilidad de checkout.

## 7) Separación clara de estado
- A) Frontend cerrado:
  - navegación, SEO, copy, legal, i18n y degradación segura en estático.
- B) Backend pendiente:
  - runtime `/api/*` para publicación, edición y pagos E2E.
