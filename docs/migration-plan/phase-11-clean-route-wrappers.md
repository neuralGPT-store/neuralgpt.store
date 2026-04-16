# FASE 11 — Preparación técnica de wrappers para rutas limpias y transición controlada

Fecha de ejecución: 2026-04-16  
Ámbito: preparación local, reversible y sin activar redirecciones de servidor.

## 1. Archivos creados

### Helper JS

- `js/clean-route-wrappers.js`

### Wrappers HTML mínimos

- `inmobiliario.html`
- `venta-clean.html`
- `alquiler-clean.html`
- `pais-clean.html`
- `ciudad-clean.html`
- `hub-pais-clean.html`
- `hub-ciudad-clean.html`
- `listing-clean.html`

## 2. Propósito de cada wrapper

- `inmobiliario.html`
  - wrapper temporal de la futura ruta limpia del índice maestro del vertical
  - redirige a `/real-estate-index.html`
- `venta-clean.html`
  - wrapper temporal de la futura colección limpia de venta
  - redirige a `/venta.html`
- `alquiler-clean.html`
  - wrapper temporal de la futura colección limpia de alquiler
  - redirige a `/alquiler.html`
- `pais-clean.html`
  - wrapper temporal de la futura colección limpia por país
  - redirige a `/pais.html?country=...` cuando `country` es válido
  - si falta o falla el parámetro, deja fallback a `/pais.html`
- `ciudad-clean.html`
  - wrapper temporal de la futura colección limpia por ciudad
  - redirige a `/ciudad.html?city=...` cuando `city` es válido
  - si falta o falla el parámetro, deja fallback a `/ciudad.html`
- `hub-pais-clean.html`
  - wrapper temporal del futuro hub limpio por país
  - redirige a `/hub-pais.html?country=...` cuando `country` es válido
  - si falta o falla el parámetro, deja fallback a `/hub-pais.html`
- `hub-ciudad-clean.html`
  - wrapper temporal del futuro hub limpio por ciudad
  - redirige a `/hub-ciudad.html?city=...` cuando `city` es válido
  - si falta o falla el parámetro, deja fallback a `/hub-ciudad.html`
- `listing-clean.html`
  - wrapper temporal del futuro detalle limpio por slug
  - redirige a `/listing.html?slug=...` cuando `slug` es válido
  - si falta o falla el parámetro, deja fallback a `/listing.html`

## 3. Equivalencias con rutas actuales

| Wrapper temporal | Ruta actual equivalente |
| --- | --- |
| `inmobiliario.html` | `/real-estate-index.html` |
| `venta-clean.html` | `/venta.html` |
| `alquiler-clean.html` | `/alquiler.html` |
| `pais-clean.html?country=es` | `/pais.html?country=es` |
| `ciudad-clean.html?city=madrid` | `/ciudad.html?city=madrid` |
| `hub-pais-clean.html?country=es` | `/hub-pais.html?country=es` |
| `hub-ciudad-clean.html?city=madrid` | `/hub-ciudad.html?city=madrid` |
| `listing-clean.html?slug=piso-senorial-reformado-barrio-salamanca-madrid` | `/listing.html?slug=piso-senorial-reformado-barrio-salamanca-madrid` |

Relación con la fase 10:

- la tabla documental de fase 10 define la meta final sin `.html`
- estos wrappers no ejecutan esa migración todavía
- solo preparan una superficie técnica intermedia y verificable

## 4. Comportamiento del helper `js/clean-route-wrappers.js`

Funciones expuestas:

- `getWrapperParams()`
  - lee query params actuales
- `resolveCleanWrapperTarget(type, params)`
  - construye la ruta actual equivalente
- `isValidWrapperTarget(type, params)`
  - valida parámetros mínimos por tipo de wrapper
- `buildFallbackHref(type, params)`
  - devuelve el destino seguro que se usará como enlace de fallback

Reglas aplicadas:

- `country`
  - se normaliza a código ISO corto de dos letras
- `city`
  - se normaliza a slug ASCII sencillo
- `slug`
  - se normaliza a slug ASCII sencillo
- los wrappers sin parámetros (`inmobiliario`, `venta`, `alquiler`) siempre tienen destino válido
- los wrappers parametrizados solo redirigen automáticamente si el parámetro mínimo es válido

## 5. Limitaciones actuales

- no existen aún rutas limpias finales del tipo `/venta` o `/listing/{slug}`
- no hay redirecciones de servidor
- los wrappers no se promocionan todavía en navegación pública
- los wrappers usan `window.location.replace(...)` solo en cliente
- los wrappers se autocanibalizan como canonical temporal propio para no alterar canonicals existentes del vertical estable
- se añade `noindex,follow` para evitar competir con las rutas públicas SEO ya consolidadas

## 6. Por qué aún no se activan redirecciones reales

- porque el repo sigue manteniendo convivencia entre:
  - rutas públicas SEO nuevas del vertical
  - rutas bridge transicionales
  - rutas legacy con fallback operativo
- porque aún no se ha implementado la capa de servidor o reglas de rewrite necesarias para soportar rutas sin `.html`
- porque adelantar una redirección real antes de consolidar enlazado y canonicals aumentaría el riesgo de incoherencia SEO y técnica

## 7. Qué faltará para pasar de wrappers a rutas limpias definitivas

1. decidir la implementación real de rutas limpias en servidor o build estático
2. crear equivalentes finales para:
   - `/inmobiliario`
   - `/venta`
   - `/alquiler`
   - `/pais/{slug}`
   - `/ciudad/{slug}`
   - `/hub/pais/{slug}`
   - `/hub/ciudad/{slug}`
   - `/listing/{slug}`
3. mover canonicals desde las rutas `.html` públicas actuales a sus equivalentes limpios
4. actualizar el enlazado interno principal del vertical
5. mantener redirecciones 301 desde las rutas públicas actuales cuando la transición sea estable

## 8. Qué no se ha tocado en esta fase

- no se han modificado `real-estate-index.html`, `venta.html`, `alquiler.html`, `pais.html`, `ciudad.html`, `hub-pais.html`, `hub-ciudad.html` ni `listing.html`
- no se ha tocado `marketplace.html`
- no se ha tocado `product.html`
- no se ha tocado Stripe legacy
- no se han activado redirecciones del servidor
- no se ha cambiado la política canonical de las rutas públicas ya consolidadas

## 9. Siguiente fase recomendada

FASE 12 recomendada:

- definir el contrato técnico exacto para rutas limpias finales
- preparar la estrategia de rewrite o publicación estática por ruta
- crear matriz de correspondencia entre:
  - wrappers temporales
  - rutas `.html` actuales
  - rutas limpias finales
- planificar activación progresiva de canonicals y enlazado interno sin romper el fallback legacy
