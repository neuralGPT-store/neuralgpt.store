# Runtime `/api/*` map (fase 1)

Fecha: 2026-04-21  
Estado actual frontend: degradación segura en despliegue estático (GitHub Pages) con `backendReady=false` por defecto.

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
