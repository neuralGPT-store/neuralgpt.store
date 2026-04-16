# FASE 5 — Consolidación SEO y navegación pública del vertical inmobiliario

Fecha: 2026-04-16

## 1. Archivos creados y modificados

### Creados

- `listing.html`
- `docs/migration-plan/phase-5-seo-routing-foundation.md`

### Modificados

- `data/site-settings.json`
- `data/taxonomy.json`
- `js/real-estate-adapters.js`
- `marketplace.html`

## 2. Qué se ha preparado para SEO

### Detalle público nuevo

- Se crea `listing.html` como detalle inmobiliario público mínimo.
- Consume:
  - `js/real-estate-data.js`
  - `js/real-estate-presenters.js`
  - `js/real-estate-adapters.js`
- Resuelve el activo por `slug` o `id`.
- Actualiza metadatos básicos:
  - `title`
  - `meta description`
  - `canonical`
  - `og:title`
  - `og:description`
  - `og:url`
  - `og:image`
  - `twitter:title`
  - `twitter:description`
  - `twitter:image`
- Genera JSON-LD mínimo y coherente como `Offer` con `itemOffered`.

### Colección

- `marketplace.html` pasa a poder comportarse como landing de colección inmobiliaria cuando el bridge está activo.
- La colección actualiza SEO dinámico según:
  - colección principal
  - operación seleccionada
  - país seleccionado
  - ciudad o zona seleccionada
- La canonical actual de colección se mantiene en la ruta existente:
  - `/marketplace.html`

### Textos SEO controlados por dataset

Se amplía la base de datos estática mínima para no depender de copy hardcoded:

- En `data/site-settings.json`:
  - `seo_routes`
  - `seo_collections.marketplace`
- En `data/taxonomy.json`:
  - `operation_seo`
  - `country_seo`
  - `city_seo`

Estos textos son breves, orientados a colección y detalle, y alineados con el vertical inmobiliario.

## 3. Qué navegación pública nueva existe

### Nueva ruta pública disponible

- `listing.html?slug={slug}`

Ejemplo real actualmente válido:

- `/listing.html?slug=piso-senorial-reformado-barrio-salamanca-madrid`

### Enlazado ya preparado

- Los destacados inmobiliarios de `index.html` ya apuntan al nuevo detalle porque el bridge reutiliza el enlace generado por `js/real-estate-adapters.js`.
- Las cards inmobiliarias de `marketplace.html` ya apuntan a `listing.html?slug=...`.
- `product.html` no se elimina ni se rompe; simplemente deja de ser la ruta prioritaria para la navegación inmobiliaria nueva.

## 4. Convivencia con `product.html`

- `product.html` sigue existiendo como detalle legacy y como puente inmobiliario reversible.
- `listing.html` es la nueva superficie pública dedicada para detalle inmobiliario.
- Durante la transición:
  - la navegación nueva prioriza `listing.html`
  - el fallback legacy sigue usando `product.html`
  - no se rompe Stripe ni el flujo histórico

## 5. Base preparada para rutas futuras

### Ruta de detalle prevista

- Actual:
  - `/listing.html?slug={slug}`
- Futuro objetivo:
  - `/listing/{slug}`

### Colecciones futuras previstas

- `/venta`
- `/alquiler`
- `/pais/{slug}`
- `/ciudad/{slug}`

## 6. Estrategia de canonical interna

### Estado actual

- `listing.html` canoniza a su ruta real existente con query param:
  - `/listing.html?slug={slug}`
- `marketplace.html` canoniza a:
  - `/marketplace.html`

### Evolución prevista

- Cuando exista una ruta real `/listing/{slug}`, la canonical del detalle deberá migrar a esa ruta.
- Cuando existan colecciones reales por operación, país o ciudad, la canonical de filtros dejará de apuntar a la colección base y pasará a su ruta propia.

## 7. Estrategia de enlazado básico

- Home bridge:
  - destacados hacia detalle público nuevo
- Colección:
  - cards hacia detalle público nuevo
- Detalle:
  - breadcrumb de vuelta a colección
  - CTA de vuelta a colección

Este enlazado deja preparada una arquitectura simple:

- home → colección
- home → detalle
- colección → detalle
- detalle → colección

## 8. Límites actuales

- `listing.html` todavía no usa reescritura de URL limpia; depende de `?slug=`.
- `marketplace.html` sigue siendo una plantilla bridge sobre una estructura heredada.
- No existen aún páginas físicas para `/venta`, `/alquiler`, `/pais/{slug}` ni `/ciudad/{slug}`.
- La colección sigue dependiendo de activación por flags + `?re_bridge=1` para sustituir su superficie visible.

## 9. Siguiente paso recomendado

FASE 6 — Colecciones inmobiliarias públicas mínimas

Objetivo exacto:

- crear páginas públicas mínimas para:
  - `venta.html`
  - `alquiler.html`
  - `pais.html`
  - `ciudad.html`
- reutilizar dataset y presenters actuales
- enlazar desde `marketplace.html` y `listing.html`
- preparar sitemap interno y hubs indexables sin romper el legado
