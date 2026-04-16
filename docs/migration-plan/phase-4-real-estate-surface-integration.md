# FASE 4 — Integración visible controlada del vertical inmobiliario

Fecha: 2026-04-16

## 1. Archivos tocados

### Modificados

- `js/real-estate-adapters.js`
- `marketplace.html`
- `product.html`

### Creados

- `docs/migration-plan/phase-4-real-estate-surface-integration.md`

## 2. Qué cambia visualmente cuando el bridge está activo

### `marketplace.html`

- El hero deja de hablar de software y pasa a copy inmobiliario premium.
- El CTA principal visible pasa de vender software a publicar activo.
- Los filtros visibles se reinterpretan para inmobiliario:
  - operación
  - tipo de activo
  - país
  - ciudad o zona
- El contador, el empty state y el banner inferior dejan de mostrar copy SaaS.
- Las cards se renderizan con modelo inmobiliario derivado del presenter:
  - título
  - resumen
  - ubicación
  - superficie
  - habitaciones
  - baños
  - precio
  - CTA de contacto

### `product.html`

- La ficha visible deja de presentarse como software cuando el listing nuevo entra.
- Se reescriben breadcrumbs internos hacia una navegación coherente con activos.
- Los badges pasan a reflejar activo inmobiliario, destacado, verificación y badges del listing.
- La caja principal muestra CTA de contacto y llamada de inversión, no copy de compra SaaS.
- La pestaña de requisitos pasa a ficha técnica con datos reales del activo:
  - ubicación
  - superficie
  - habitaciones
  - baños
  - estado
  - verificación
  - badges
  - CTA
- El bloque de verificación y la nota contextual se reinterpretan en clave inmobiliaria.

## 3. Cómo funciona el fallback

El fallback legacy sigue intacto.

### `marketplace.html`

- Si falla la carga de datasets, presenters, adapters o flags:
  - sigue cargando `data/product-catalog.json`
  - sigue usando catálogo software hardcoded
  - sigue usando filtros y render legacy

### `product.html`

- Si no hay listing nuevo resoluble por `slug` o `id`, o falla cualquier parte del bridge:
  - sigue usando `PRODUCTS[id]`
  - sigue usando Stripe como flujo principal del modo legacy
  - siguen existiendo reviews, related y schema legacy

## 4. Impacto SEO de esta fase

- `product.html` refuerza metadatos coherentes con listing real:
  - `title`
  - `meta description`
  - `canonical`
  - `og:title`
  - `og:description`
  - `og:image`
  - `twitter:title`
  - `twitter:description`
  - `twitter:image`
- El JSON-LD pasa a un `Offer` con `itemOffered` inmobiliario mínimo y datos verificables del dataset.
- El breadcrumb visible ya apunta al futuro modelo de navegación por activos, aunque la ruta `/listing/{slug}` todavía no exista como página real.

## 5. Qué queda pendiente para una sustitución completa

- Ruta pública real para `/listing/{slug}`
- colección SEO específica para `marketplace.html`
- filtros visibles nativos en HTML en lugar de reinterpretar selects legacy
- mapa, ubicación avanzada y bloques documentales
- onboarding inmobiliario final en `provider-register.html`
- monetización visible del vertical inmobiliario
- limpieza completa del copy SaaS restante fuera del modo bridge

## 6. Límites actuales

- `marketplace.html` sigue reutilizando la estructura del marketplace legacy.
- Los filtros de país y ciudad/zona reaprovechan selects existentes; funcionan, pero todavía no son UI final.
- `product.html` convive con estructura de plantilla diseñada inicialmente para software, aunque el bridge oculta o sustituye las piezas más contaminantes.
- La activación sigue siendo local y doble:
  - flag en `data/site-settings.json`
  - query param `?re_bridge=1`

## 7. Resultado práctico

Con esta fase, cuando el bridge está activo:

- `marketplace.html` ya se percibe como superficie inmobiliaria real
- `product.html` ya se percibe como ficha inmobiliaria real
- el SEO del detalle queda mejor alineado con el activo
- el fallback legacy sigue siendo completo y verificable
