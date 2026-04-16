# FASE 15 - Piloto controlado de publicacion limpia real (subset)

Fecha: 2026-04-16

## Subset publicado fuera del LAB

Se publican solo estas rutas limpias reales:

- `/inmobiliario/`
- `/venta/`
- `/alquiler/`
- `/listing/piso-senorial-reformado-barrio-salamanca-madrid/`

No se publican aun fuera del LAB:

- `/pais/{slug}`
- `/ciudad/{slug}`
- `/hub/pais/{slug}`
- `/hub/ciudad/{slug}`

## Archivos creados

- `inmobiliario/index.html`
- `venta/index.html`
- `alquiler/index.html`
- `listing/piso-senorial-reformado-barrio-salamanca-madrid/index.html`
- `docs/migration-plan/clean-route-live-pilot-manifest.json`

## Convivencia con rutas .html actuales

En esta fase siguen activas y coexistiendo:

- `real-estate-index.html`
- `venta.html`
- `alquiler.html`
- `listing.html?slug=piso-senorial-reformado-barrio-salamanca-madrid`

No se eliminan rutas antiguas, no se activan redirecciones y no se tocan wrappers clean.

## Politica de canonical temporal del piloto

Dentro del subset piloto:

- cada ruta limpia nueva usa self-canonical propio

Fuera del subset:

- no se modifican canonicals publicos existentes

Riesgo temporal controlado:

- existe posible duplicidad transitoria entre rutas limpias nuevas y sus equivalentes `.html`
- se acepta en esta fase para validar publicacion estatica y navegacion real sin mover todo el vertical de golpe

## Navegacion y enlazado interno del subset

Malla interna cerrada del piloto:

- `/inmobiliario/` enlaza a `/venta/`, `/alquiler/` y al listing piloto
- `/venta/` enlaza a `/inmobiliario/`, `/alquiler/` y al listing piloto
- `/alquiler/` enlaza a `/inmobiliario/`, `/venta/` y al listing piloto
- el listing piloto enlaza a `/inmobiliario/`, `/venta/` y `/alquiler/`

## Como validar rastreabilidad y navegacion

1. abrir cada ruta limpia piloto y verificar:
   - `title`
   - `meta description`
   - breadcrumbs
   - self-canonical
2. verificar enlaces internos entre las 4 rutas
3. confirmar que no hay `noindex,nofollow` en este subset real
4. confirmar que LAB y legacy siguen operativos

## Riesgos controlados

- duplicidad temporal de contenido con `.html` equivalente
- subset aun incompleto (sin pais/ciudad/hubs reales)
- sitemap publico principal aun no incorpora este piloto

## Siguiente fase recomendada

FASE 16 - Integracion SEO controlada del piloto:

- anadir descubrimiento interno discreto del subset limpio
- preparar entrada controlada en sitemap del vertical sin sustitucion masiva
- evaluar señales de convivencia antes de ampliar a pais/ciudad/hubs
