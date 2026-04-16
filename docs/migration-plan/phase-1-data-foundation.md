# FASE 1 — Base de datos estática inmobiliaria

Fecha: 2026-04-16

## 1. Archivos creados

- `data/listings.json`
- `data/taxonomy.json`
- `data/site-settings.json`
- `js/real-estate-data.js`
- `docs/migration-plan/phase-1-data-foundation.md`

## 2. Objetivo de esta fase

Preparar una base inmobiliaria mínima, aislada y reversible, coexistiendo con la web actual sin modificar todavía:

- `index.html`
- `marketplace.html`
- `product.html`
- `provider-register.html`

En esta fase no se ha conectado nada nuevo a la UI pública actual.

## 3. Schema mínimo de cada dataset

### `data/listings.json`

Propósito:

- Servir como dataset base para el futuro listado inmobiliario y la futura ficha de activo.

Tipo:

- Array de listings.

Campos mínimos implementados por listing:

- `id`
- `slug`
- `title`
- `summary`
- `description`
- `operation`
- `asset_type`
- `country`
- `region`
- `city`
- `zone`
- `price`
- `currency`
- `surface_m2`
- `rooms`
- `bathrooms`
- `status`
- `verification_state`
- `featured`
- `published_at`
- `expiration_at`
- `images`
- `coordinates`
- `badges`
- `contact_cta`

Cobertura incluida:

- venta
- alquiler larga duración
- habitaciones larga estancia
- locales
- naves
- suelo
- activos singulares

Decisión tomada:

- Los anuncios son ficticios, premium y orientados a Europa.
- No se ha introducido ninguna tipología turística.
- No se ha reutilizado contenido del vertical software.

### `data/taxonomy.json`

Propósito:

- Centralizar taxonomías mínimas necesarias para filtros, formularios y consistencia del modelo.

Campos implementados:

- `operations`
- `asset_types`
- `countries`
- `languages`
- `listing_statuses`
- `verification_states`
- `badges`
- `sponsor_categories`

Decisión tomada:

- Se ha limitado el vocabulario a lo necesario para arrancar.
- No se han añadido taxonomías especulativas que todavía no tengan uso claro.

### `data/site-settings.json`

Propósito:

- Definir configuración pública mínima del nuevo vertical sin tocar todavía el HTML visible.

Campos implementados:

- `site_name`
- `tagline`
- `default_locale`
- `supported_locales`
- `default_currency`
- `public_contact_email`
- `legal_entity_name`
- `development_banner_text`
- `featured_pricing`
- `seo_defaults`
- `counters_placeholder`

Valores fijados por requisito:

- `Más visibilidad` = `29.95 EUR`
- `Sensacional 24h` = `9.95 EUR`
- `development_banner_text` = `Plataforma en desarrollo`

## 4. Módulo nuevo aislado

### `js/real-estate-data.js`

Propósito:

- Cargar los datasets nuevos con `fetch`.
- Exponer una API sencilla y estable para la siguiente fase.

Funciones expuestas:

- `loadListings()`
- `loadTaxonomy()`
- `loadSiteSettings()`
- `getFeaturedListings()`
- `getListingsByOperation(operation)`
- `getListingsByAssetType(assetType)`
- `findListingBySlug(slug)`

Decisiones técnicas:

- No depende del código legacy.
- No modifica el DOM.
- No se autoejecuta.
- Tiene validación mínima del tipo de dataset devuelto.
- Tiene manejo básico de errores para `fetch` y parseo JSON.
- Se expone en `window.RealEstateData` para poder integrarlo después sin bundler ni framework.

## 5. Cómo se conectará después

### Conexión futura con `marketplace.html`

- Sustituir la fuente de datos actual del catálogo software por `loadListings()`.
- Mapear filtros visibles a:
  - `operation`
  - `asset_type`
  - `country`
  - `region`
  - `price`
  - `surface_m2`
  - `verification_state`
- Usar `getFeaturedListings()`, `getListingsByOperation()` y `getListingsByAssetType()` como primera capa de integración.

### Conexión futura con `product.html`

- Resolver la ficha mediante `findListingBySlug(slug)` o adaptación de query string.
- Sustituir el schema de producto software por schema de anuncio/activo.
- Reemplazar CTA de compra por CTA de contacto o solicitud de documentación.

### Conexión futura con `index.html`

- Reutilizar `getFeaturedListings()` para destacados.
- Usar `site-settings.json` para banner, tagline, contacto y placeholders.
- Usar `taxonomy.json` para bloques de navegación inicial por operación o tipología.

## 6. Qué no se ha tocado todavía

- No se han modificado:
  - `index.html`
  - `marketplace.html`
  - `product.html`
  - `provider-register.html`
- No se ha tocado Stripe.
- No se ha tocado el flujo de checkout actual.
- No se ha tocado el i18n actual.
- No se ha conectado el nuevo módulo a ninguna página visible.
- No se han eliminado archivos legacy.
- No se han renombrado archivos existentes.

## 7. Riesgos y límites actuales

- Los nuevos `images` de `listings.json` apuntan a rutas placeholder nuevas no existentes todavía.
  - Esto no rompe la web actual porque aún no se consumen en la UI pública.
- El módulo `js/real-estate-data.js` está preparado para entorno estático y `window`, no para bundlers.
- El modelo actual todavía convive con datasets y copy del vertical software.
- No existe todavía compatibilidad entre query params legacy y slugs inmobiliarios.
- No se ha creado aún validación automática específica para los nuevos datasets.

## 8. Resultado práctico de esta fase

La base inmobiliaria mínima ya existe dentro del repo y puede empezar a consumirse en la siguiente fase sin tocar todavía el comportamiento público del sitio actual.
