# FASE 16 - Integración SEO controlada del subset piloto limpio

Fecha: 2026-04-16

## Objetivo ejecutado

Introducir descubrimiento interno discreto del subset limpio ya publicado, mantener convivencia explícita con rutas `.html` vigentes y dejar preparada la ampliación futura sin activar 301 ni sustituir capas legacy.

## Archivos modificados

- `sitemap-real-estate.xml`
- `sitemap-real-estate.html`
- `real-estate-index.html`
- `venta.html`
- `alquiler.html`
- `listing.html`

## Archivos creados

- `docs/migration-plan/clean-route-seo-pilot-status.json`
- `docs/migration-plan/phase-16-controlled-seo-integration-of-live-pilot.md`

## URLs limpias piloto que pasan a ser descubribles

- `/inmobiliario/`
- `/venta/`
- `/alquiler/`
- `/listing/piso-senorial-reformado-barrio-salamanca-madrid/`

## URLs antiguas que siguen coexistiendo como principales

- `real-estate-index.html`
- `venta.html`
- `alquiler.html`
- `listing.html?slug=...`
- `pais.html?country=...`
- `ciudad.html?city=...`
- `hub-pais.html?country=...`
- `hub-ciudad.html?city=...`

No se activan redirecciones 301 y no se cambian canonicals legacy de `venta.html`, `alquiler.html` ni `listing.html`.

## Qué se añadió al sitemap HTML/XML

### `sitemap-real-estate.xml`

- Se añadió bloque explícito de piloto limpio en convivencia:
  - `https://neuralgpt.store/inmobiliario/`
  - `https://neuralgpt.store/venta/`
  - `https://neuralgpt.store/alquiler/`
  - `https://neuralgpt.store/listing/piso-senorial-reformado-barrio-salamanca-madrid/`
- No se eliminaron ni sustituyeron entradas `.html` existentes.

### `sitemap-real-estate.html`

- Se añadió sección visible de “Piloto limpio en convivencia controlada” con los 4 enlaces limpios piloto.
- Se añadió una entrada discreta a `/inmobiliario/` dentro del bloque de colecciones.
- Se dejó explícito que país/ciudad/hubs limpios siguen fuera de publicación.

## Descubrimiento interno discreto añadido

- `real-estate-index.html`: enlace botón a `/inmobiliario/` + tarjeta discreta en “Colecciones principales”.
- `venta.html`: botón “Versión limpia piloto” a `/venta/`.
- `alquiler.html`: botón “Versión limpia piloto” a `/alquiler/`.
- `listing.html?slug=...`: para el slug piloto se muestran enlaces discretos a:
  - detalle limpio `/listing/piso-senorial-reformado-barrio-salamanca-madrid/`
  - colección limpia asociada (`/venta/` o `/alquiler/` según operación)

## Política temporal de convivencia SEO (sin 301)

- Clean piloto: self-canonical en cada ruta limpia del subset.
- Legacy `.html`: se mantiene canonical actual (sin cambios en esta fase).
- Duplicidad temporal aceptada y controlada solo para el subset de 4 rutas.
- Señales de control activas:
  - enlazado interno moderado (no masivo)
  - inclusión parcial en sitemap vertical
  - documentación explícita de estado y límites

## Duplicidades temporales existentes

- `/inmobiliario/` <-> `real-estate-index.html`
- `/venta/` <-> `venta.html`
- `/alquiler/` <-> `alquiler.html`
- `/listing/piso-senorial-reformado-barrio-salamanca-madrid/` <-> `listing.html?slug=piso-senorial-reformado-barrio-salamanca-madrid`

## Límites actuales

- No publicación limpia de `/pais/{slug}`.
- No publicación limpia de `/ciudad/{slug}`.
- No publicación limpia de `/hub/pais/{slug}` ni `/hub/ciudad/{slug}`.
- No cambios en `product.html`, `marketplace.html` ni Stripe legacy para esta fase.

## Señales a revisar antes de ampliar a país/ciudad/hubs limpios

1. Cobertura indexable de las 4 rutas limpias piloto en Search Console.
2. Coherencia de canonical detectada entre limpio y legacy en inspección URL.
3. Ausencia de caídas de impresiones/clics en `venta.html`, `alquiler.html` y `listing.html` legacy.
4. Ratio de rastreo útil en sitemap vertical tras incluir el bloque limpio.
5. Ausencia de errores de render/enlaces rotos en navegación interna del vertical.

## Siguiente fase recomendada

FASE 17 - Expansión SEO controlada a geografía limpia mínima:

- abrir solo un país limpio (`/pais/es/`) y una ciudad limpia (`/ciudad/madrid/`) en modo piloto
- mantener hubs limpios aún fuera
- añadir enlazado interno mínimo desde sus equivalentes `.html`
- mantener convivencia sin 301 y con revisión de señales antes de escalar
