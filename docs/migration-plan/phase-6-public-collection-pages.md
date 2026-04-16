# FASE 6 — Colecciones inmobiliarias públicas mínimas

Fecha: 2026-04-16

## 1. Archivos creados y modificados

### Creados

- `venta.html`
- `alquiler.html`
- `pais.html`
- `ciudad.html`
- `docs/migration-plan/phase-6-public-collection-pages.md`

### Modificados

- `data/taxonomy.json`
- `marketplace.html`
- `listing.html`

## 2. Cómo funciona cada colección

### `venta.html`

- Colección pública dedicada a listings con `operation = sale`
- Ruta estable sin query params
- Canonical actual:
  - `/venta.html`

### `alquiler.html`

- Colección pública dedicada a:
  - `long_term_rent`
  - `room_rent`
- Ruta estable sin query params
- Canonical actual:
  - `/alquiler.html`

### `pais.html`

- Colección pública filtrada por país
- Query param soportado:
  - `?country=es`
  - `?country=pt`
  - `?country=de`
  - `?country=it`
  - `?country=nl`
  - `?country=fr`
- Canonical actual:
  - `/pais.html?country={code}`

### `ciudad.html`

- Colección pública filtrada por ciudad
- Query param soportado:
  - `?city=madrid`
  - `?city=milan`
  - `?city=lisboa`
  - `?city=berlin`
  - `?city=lyon`
  - `?city=valencia`
  - `?city=rotterdam`
- Normaliza acentos y variaciones básicas mediante slug interno
- Canonical actual:
  - `/ciudad.html?city={slug}`

## 3. Query params soportados

- `pais.html`
  - `country`
- `ciudad.html`
  - `city`

`venta.html` y `alquiler.html` no requieren query params.

## 4. Encaje en la arquitectura futura

Estas páginas preparan la transición hacia rutas limpias sin romper la base actual:

- actual:
  - `/venta.html`
  - `/alquiler.html`
  - `/pais.html?country=es`
  - `/ciudad.html?city=madrid`
  - `/listing.html?slug=...`

- objetivo futuro:
  - `/venta`
  - `/alquiler`
  - `/pais/es`
  - `/ciudad/madrid`
  - `/listing/{slug}`

## 5. Impacto SEO de esta fase

- Se añaden cuatro superficies públicas nuevas con contenido indexable no SaaS.
- Cada página define:
  - `title`
  - `meta description`
  - `canonical`
  - OG básicos
  - Twitter básicos
  - JSON-LD de colección
- La navegación interna queda mejor enlazada:
  - `marketplace.html` → colecciones públicas
  - colecciones públicas → `listing.html`
  - `listing.html` → colección de operación, país y ciudad

## 6. Límites actuales

- Las rutas públicas todavía son `.html` o query-based, no rutas limpias finales.
- `marketplace.html` sigue siendo una superficie bridge sobre una plantilla heredada.
- No existe aún sitemap público real ni índice automatizado de colecciones.
- Las colecciones no tienen todavía paginación, módulos editoriales ni hubs más profundos.

## 7. Siguiente bloque recomendado

FASE 7 — Sitemap interno y hubs editoriales mínimos

Objetivo exacto:

- crear base documental y técnica para sitemap XML/HTML
- preparar un hub editorial mínimo por país o ciudad
- reforzar enlazado entre home, colección, detalle y hubs
- consolidar canónicos previstos antes de migrar a rutas limpias
