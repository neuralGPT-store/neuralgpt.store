# FASE 3 — Puente controlado entre base inmobiliaria y UI pública

Fecha: 2026-04-16

## 1. Archivos tocados

### Creados

- `js/real-estate-adapters.js`
- `docs/migration-plan/phase-3-controlled-ui-bridge.md`

### Modificados

- `data/site-settings.json`
- `marketplace.html`
- `product.html`
- `index.html`

## 2. Cómo funciona el fallback

El bridge no sustituye el flujo actual por defecto.

Cada página modificada sigue este orden:

1. Carga de módulos nuevos:
   - `js/real-estate-data.js`
   - `js/real-estate-presenters.js`
   - `js/real-estate-adapters.js`
2. Intento de activación del modo inmobiliario
3. Si el modo inmobiliario:
   - no está activado
   - no puede cargar datos
   - no encuentra listing
   - lanza cualquier error

   entonces la página vuelve al flujo legacy actual sin interrumpir el sitio.

### Fallback por página

#### `marketplace.html`

- Si el bridge falla o no está activo:
  - sigue cargando `data/product-catalog.json`
  - sigue usando el catálogo hardcoded legacy
  - sigue renderizando el marketplace actual

#### `product.html`

- Si el bridge falla o no está activo:
  - sigue resolviendo `PRODUCTS[id]`
  - sigue manteniendo Stripe como fallback principal
  - sigue usando reviews, related y schema legacy

#### `index.html`

- Si el bridge falla o no está activo:
  - la home queda exactamente como estaba
  - no se tocan métricas ni destacados

## 3. Cómo activar y desactivar el bridge

El bridge queda desactivado por defecto en `data/site-settings.json`.

### Flags disponibles

En `data/site-settings.json`:

- `feature_flags.real_estate_marketplace`
- `feature_flags.real_estate_product`
- `feature_flags.real_estate_home`
- `feature_flags.activation_query_param`

### Estado actual

- Todas las flags están en `false`
- El query param de activación es `re_bridge`

### Activación segura

Para activar una página en local hay que cumplir dos condiciones:

1. Poner en `true` la flag correspondiente en `data/site-settings.json`
2. Abrir la URL con `?re_bridge=1`

Ejemplos:

- Marketplace:
  - activar `real_estate_marketplace: true`
  - abrir `/marketplace.html?re_bridge=1`
- Product:
  - activar `real_estate_product: true`
  - abrir `/product.html?slug=piso-senorial-reformado-barrio-salamanca-madrid&re_bridge=1`
- Home:
  - activar `real_estate_home: true`
  - abrir `/?re_bridge=1`

### Desactivación

- Basta con dejar la flag en `false`
- o abrir la URL sin `?re_bridge=1`

Esto evita activar el modo inmobiliario por accidente en producción visible.

## 4. Qué páginas quedan parcialmente conectadas

### `marketplace.html`

Conexión parcial:

- Sí carga listings, taxonomy y settings si el bridge está activo
- Sí transforma la base inmobiliaria a una forma compatible con el grid actual
- Sí cambia filtros mínimos a operación y tipo de activo
- Sí mantiene fallback completo al marketplace legacy

No reemplazado todavía:

- HTML completo de marketplace
- taxonomía visual definitiva
- copy general de la página
- SEO específico del listado inmobiliario

### `product.html`

Conexión parcial:

- Sí resuelve listing por `slug` o `id`
- Sí renderiza ficha inmobiliaria si existe listing y el bridge está activo
- Sí actualiza:
  - `title`
  - `meta description`
  - `canonical`
  - `og:title`
  - `og:description`
  - `og:image`
  - JSON-LD básico
- Sí mantiene fallback legacy total cuando no entra el bridge

No reemplazado todavía:

- estructura completa de la ficha
- arquitectura de URLs final
- CTA y formularios definitivos
- monetización inmobiliaria

### `index.html`

Conexión parcial:

- Sí puede sustituir métricas del bloque superior
- Sí puede sustituir los 3 cards de “Nuestros Productos” por destacados inmobiliarios
- Sí mantiene la home actual intacta si no entra el bridge

No reemplazado todavía:

- hero principal
- promo reel
- categorías
- bloques narrativos SaaS
- CTA general de la home

## 5. Impacto SEO actual

### Mejoras introducidas

- `product.html` puede pasar a metadatos específicos de activo cuando el bridge entra
- se genera `canonicalPath` sugerido desde la nueva base
- se actualizan OG básicos y descripción según listing
- el modelo SEO usa los datos de la base nueva y no copy software

### Límites actuales

- `marketplace.html` todavía no genera metadatos de colección inmobiliaria específicos
- `index.html` no ha sido reescrita para SEO inmobiliario
- la ruta canónica sugerida de activo (`/listing/{slug}`) todavía no existe como ruta pública real
- el bridge solo aplica si se activa por flag local

## 6. Decisiones tomadas

- El activador requiere simultáneamente:
  - flag en `site-settings.json`
  - query param `re_bridge=1`
- Esto minimiza el riesgo de activar el vertical nuevo por accidente.
- `marketplace.html` reutiliza el grid actual con un modelo normalizado, en lugar de reescribir la página.
- `product.html` tiene un render inmobiliario separado y aislado del legacy.
- `index.html` solo toca destacados y métricas, tal como se pidió.

## 7. Qué no se ha reemplazado todavía

- catálogo software legacy
- checkout Stripe legacy
- home completa
- i18n legacy
- páginas legales
- provider onboarding y alta inmobiliaria final
- monetización inmobiliaria visible

## 8. Riesgos y límites

- `marketplace.html` sigue usando parte del layout y controles legacy; el bridge actual es de compatibilidad, no la versión final.
- `product.html` todavía convive con estructura pensada para software, aunque el render inmobiliario evita gran parte de esa contaminación cuando entra.
- `index.html` sigue visualmente dominada por el vertical software fuera de métricas y destacados.
- Los metadatos inmobiliarios solo se activan localmente por flag.

## 9. Resultado práctico de la fase

La base inmobiliaria ya puede llegar a la UI pública de forma controlada y reversible:

- listados inmobiliarios en `marketplace.html`
- ficha inmobiliaria en `product.html`
- destacados y métricas en `index.html`

Todo ello sin desmontar todavía la web actual y con fallback explícito y verificable.
