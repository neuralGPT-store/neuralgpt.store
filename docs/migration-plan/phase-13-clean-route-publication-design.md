# FASE 13 — Diseño técnico de publicación real de rutas limpias

Fecha de ejecución: 2026-04-16  
Ámbito: análisis técnico y propuesta de publicación. No activa rutas limpias, no activa 301 y no modifica canonicals públicos actuales.

## 1. Base real de despliegue verificada en el repo

Hallazgos verificables:

- existe `CNAME` con `neuralgpt.store`
- existe workflow de GitHub Pages en `.github/workflows/pages.yml`
- el workflow publica la raíz completa del repo con `actions/upload-pages-artifact@v1` y `path: ./`
- el paso de build es opcional y solo corre si `npm run build` existe
- actualmente no existe `package.json`
- actualmente no existe `_redirects`
- actualmente no existe `wrangler.toml`
- actualmente no existe configuración de Netlify o Vercel en el repo
- existe `404.html`
- el proyecto está descrito en `README.md` como sitio estático HTML/CSS/JS servido desde host estático o CDN

Conclusión técnica:

- el despliegue real actual es GitHub Pages estático publicando archivos desde la raíz del repo
- no hay evidencia en el repo de soporte activo para rewrites del servidor
- cualquier estrategia de rutas limpias debe partir de archivos/carpetas estáticas reales o de un build que las genere antes de publicar

## 2. Opciones analizadas

### 2.1 Opción A — Estática pura con archivos/carpetas dedicadas

Descripción:

- crear rutas limpias reales como carpetas con `index.html`
- ejemplos:
  - `/inmobiliario/index.html`
  - `/venta/index.html`
  - `/alquiler/index.html`
  - `/pais/es/index.html`
  - `/ciudad/madrid/index.html`
  - `/hub/pais/es/index.html`
  - `/hub/ciudad/madrid/index.html`
  - `/listing/piso-senorial-reformado-barrio-salamanca-madrid/index.html`

Viabilidad real en este repo:

- alta
- GitHub Pages sirve carpetas con `index.html` sin necesidad de backend
- el repo ya es estático y la publicación actual encaja con este patrón

Compatibilidad con GitHub Pages:

- alta
- totalmente alineada con publicar archivos físicos en la raíz

Compatibilidad con SEO:

- alta
- cada ruta limpia existiría como URL real rastreable
- permite canonical futuro directo sin depender de query params
- permite sitemap XML limpio sin hacks

Coste técnico:

- medio
- para pocas rutas fijas es simple
- para muchas ciudades/países/listings exige generación automática o duplicación manual inviable

Riesgo de rotura:

- bajo si se mantiene coexistencia con `.html`
- sube a medio si se intenta hacer manualmente para muchos listings

Impacto en canonicals:

- óptimo
- permite mover canonical a rutas limpias reales sin artificios

Impacto en enlazado interno:

- positivo
- el enlazado puede apuntar directamente a URLs finales

Impacto en mantenimiento futuro:

- bueno si se añade generación
- malo si se mantiene artesanal

Impacto en expansión a muchas ciudades/países/listings:

- malo sin generador
- bueno con generador estático controlado

### 2.2 Opción B — Wrappers evolucionados

Descripción:

- reutilizar wrappers como `venta-clean.html` o `listing-clean.html`
- ampliar su uso como capa permanente de publicación limpia aparente
- confiar en redirección cliente y fallback

Viabilidad real en este repo:

- media
- ya existen wrappers
- técnicamente es fácil mantenerlos

Compatibilidad con GitHub Pages:

- alta a nivel técnico
- son simples HTML estáticos

Compatibilidad con SEO:

- baja
- una URL wrapper con JS que redirige al destino real no equivale a una ruta limpia final rastreable
- no resuelve `/venta` o `/listing/{slug}` como URL real
- no debe usarse como publicación final del vertical

Coste técnico:

- bajo

Riesgo de rotura:

- bajo como capa QA
- medio si se intenta promocionar públicamente

Impacto en canonicals:

- pobre
- obliga a mantener canonicals temporales o redirecciones cliente
- crea riesgo de duplicidad y señales débiles

Impacto en enlazado interno:

- mediocre
- añadiría una capa intermedia artificial

Impacto en mantenimiento futuro:

- aceptable como herramienta transicional
- malo como solución definitiva

Impacto en expansión a muchas ciudades/países/listings:

- limitado
- sigue sin resolver publicación real limpia ni indexación óptima

### 2.3 Opción C — Rewrites o mecanismos equivalentes compatibles con el despliegue actual

Descripción:

- apoyarse en rewrites del host para mapear rutas limpias a `.html`
- ejemplos típicos: reglas de servidor, `_redirects`, rewrites edge o rutas SPA con `404.html`

Viabilidad real en este repo:

- baja con la evidencia actual

Compatibilidad con GitHub Pages:

- baja para rewrites reales
- GitHub Pages no ofrece rewrites de servidor generales definidos desde este repo
- la única palanca visible aquí es `404.html`, que no sustituye una publicación SEO real de rutas limpias

Compatibilidad con SEO:

- baja a media según la técnica
- una estrategia tipo SPA fallback con `404.html` no es adecuada como arquitectura SEO principal para detalle y colecciones

Coste técnico:

- medio si se intenta forzar con hacks cliente
- alto si exige mover el hosting fuera del modelo actual

Riesgo de rotura:

- medio o alto
- puede romper rastreo, canónicos y navegación directa

Impacto en canonicals:

- incierto
- depende de un hosting o capa que hoy no está documentada en el repo

Impacto en enlazado interno:

- incierto
- puede introducir incoherencia entre URL visible y documento servido

Impacto en mantenimiento futuro:

- malo mientras el repo siga en GitHub Pages puro

Impacto en expansión a muchas ciudades/países/listings:

- teóricamente bueno si existiera un edge/router real
- no sustentado por la infraestructura actual del repo

### 2.4 Opción D — Combinación híbrida

Descripción:

- usar estática pura para rutas limpias reales finales
- mantener wrappers solo para QA y transición
- añadir generación controlada de carpetas/`index.html` para ciudades, países y listings
- mantener `.html` actuales durante la convivencia

Viabilidad real en este repo:

- alta

Compatibilidad con GitHub Pages:

- alta

Compatibilidad con SEO:

- alta

Coste técnico:

- medio

Riesgo de rotura:

- bajo a medio, controlable por fases

Impacto en canonicals:

- muy bueno

Impacto en enlazado interno:

- muy bueno

Impacto en mantenimiento futuro:

- bueno si se formaliza generación estática

Impacto en expansión a muchas ciudades/países/listings:

- bueno si se añade script/generador

## 3. Propuesta recomendada única

### 3.1 Recomendación

Recomiendo la **opción D: combinación híbrida** con este patrón exacto:

1. mantener las rutas `.html` actuales y wrappers como capa transicional
2. publicar rutas limpias reales mediante carpetas estáticas con `index.html`
3. generar esas carpetas desde datasets reales del vertical antes del deploy de GitHub Pages
4. solo después mover canonicals y enlazado interno

### 3.2 Por qué esta es la mejor opción en este repo

- porque el repo ya se publica como sitio estático puro en GitHub Pages
- porque GitHub Pages sí soporta carpetas con `index.html`
- porque el repo no muestra soporte real para rewrites de servidor
- porque ya existe una base de datasets y wrappers que permite preparar transición sin romper nada
- porque es la única vía que combina:
  - compatibilidad con el hosting actual
  - rastreabilidad SEO real
  - transición reversible

### 3.3 Qué descarto

Descarto como solución final:

- **opción B** como publicación definitiva
  - los wrappers sirven para QA y transición, no para SEO final
- **opción C** como estrategia principal
  - no hay evidencia de rewrites reales disponibles en el despliegue actual

### 3.4 Precondiciones que faltan

- crear un mecanismo de generación estática de carpetas limpias
- decidir si esa generación será:
  - script local versionado en repo
  - build step opcional incorporado al workflow de Pages
- preparar plantillas reutilizables o generadores para:
  - índice
  - colecciones
  - geografía
  - hubs
  - listing detail
- decidir cómo convivirá el `sitemap.xml` legacy con el vertical limpio futuro

### 3.5 Qué piezas actuales se reutilizan

- `data/listings.json`
- `data/taxonomy.json`
- `data/site-settings.json`
- `js/real-estate-data.js`
- `js/real-estate-presenters.js`
- `js/real-estate-adapters.js`
- `real-estate-index.html`
- `venta.html`
- `alquiler.html`
- `pais.html`
- `ciudad.html`
- `hub-pais.html`
- `hub-ciudad.html`
- `listing.html`
- wrappers de fase 11 como capa de QA

### 3.6 Qué piezas dejarían de ser necesarias después

Una vez activada la migración real y estabilizada:

- `inmobiliario.html`
- `venta-clean.html`
- `alquiler-clean.html`
- `pais-clean.html`
- `ciudad-clean.html`
- `hub-pais-clean.html`
- `hub-ciudad-clean.html`
- `listing-clean.html`

Y más adelante:

- promoción pública de las rutas `.html` del vertical

## 4. Diseño de publicación por tipo de ruta futura

### 4.1 `/inmobiliario`

- fuente de contenido:
  - `real-estate-index.html`
  - datasets del vertical
- archivo/folder/wrapper temporal de soporte:
  - soporte actual: `inmobiliario.html`
  - publicación final recomendada: `/inmobiliario/index.html`
- estrategia de generación o resolución:
  - clonar o generar una variante limpia estable del índice maestro
- canonical futuro esperado:
  - `https://neuralgpt.store/inmobiliario`
- fallback transicional:
  - `real-estate-index.html`
- dificultad técnica:
  - baja

### 4.2 `/venta`

- fuente de contenido:
  - `venta.html`
  - `data/listings.json`
- archivo/folder/wrapper temporal de soporte:
  - soporte actual: `venta-clean.html`
  - publicación final recomendada: `/venta/index.html`
- estrategia de generación o resolución:
  - generar una copia limpia de la colección actual sin query params
- canonical futuro esperado:
  - `https://neuralgpt.store/venta`
- fallback transicional:
  - `venta.html`
- dificultad técnica:
  - baja

### 4.3 `/alquiler`

- fuente de contenido:
  - `alquiler.html`
  - `data/listings.json`
- archivo/folder/wrapper temporal de soporte:
  - soporte actual: `alquiler-clean.html`
  - publicación final recomendada: `/alquiler/index.html`
- estrategia de generación o resolución:
  - generar una copia limpia de la colección actual
- canonical futuro esperado:
  - `https://neuralgpt.store/alquiler`
- fallback transicional:
  - `alquiler.html`
- dificultad técnica:
  - baja

### 4.4 `/pais/{slug}`

- fuente de contenido:
  - `pais.html`
  - `data/taxonomy.json`
  - `data/listings.json`
- archivo/folder/wrapper temporal de soporte:
  - soporte actual: `pais-clean.html`
  - publicación final recomendada: `/pais/{slug}/index.html`
- estrategia de generación o resolución:
  - generar una carpeta por código de país soportado
  - hidratar con el mismo contenido que hoy deriva de `?country=...`
- canonical futuro esperado:
  - `https://neuralgpt.store/pais/{slug}`
- fallback transicional:
  - `pais.html?country={slug}`
- dificultad técnica:
  - media

### 4.5 `/ciudad/{slug}`

- fuente de contenido:
  - `ciudad.html`
  - `data/taxonomy.json`
  - `data/listings.json`
- archivo/folder/wrapper temporal de soporte:
  - soporte actual: `ciudad-clean.html`
  - publicación final recomendada: `/ciudad/{slug}/index.html`
- estrategia de generación o resolución:
  - generar una carpeta por ciudad soportada en el dataset
- canonical futuro esperado:
  - `https://neuralgpt.store/ciudad/{slug}`
- fallback transicional:
  - `ciudad.html?city={slug}`
- dificultad técnica:
  - media

### 4.6 `/hub/pais/{slug}`

- fuente de contenido:
  - `hub-pais.html`
  - `data/taxonomy.json`
  - `data/listings.json`
- archivo/folder/wrapper temporal de soporte:
  - soporte actual: `hub-pais-clean.html`
  - publicación final recomendada: `/hub/pais/{slug}/index.html`
- estrategia de generación o resolución:
  - generar una carpeta editorial por país soportado
- canonical futuro esperado:
  - `https://neuralgpt.store/hub/pais/{slug}`
- fallback transicional:
  - `hub-pais.html?country={slug}`
- dificultad técnica:
  - media

### 4.7 `/hub/ciudad/{slug}`

- fuente de contenido:
  - `hub-ciudad.html`
  - `data/taxonomy.json`
  - `data/listings.json`
- archivo/folder/wrapper temporal de soporte:
  - soporte actual: `hub-ciudad-clean.html`
  - publicación final recomendada: `/hub/ciudad/{slug}/index.html`
- estrategia de generación o resolución:
  - generar una carpeta editorial por ciudad soportada
- canonical futuro esperado:
  - `https://neuralgpt.store/hub/ciudad/{slug}`
- fallback transicional:
  - `hub-ciudad.html?city={slug}`
- dificultad técnica:
  - media

### 4.8 `/listing/{slug}`

- fuente de contenido:
  - `listing.html`
  - `data/listings.json`
  - `data/site-settings.json`
- archivo/folder/wrapper temporal de soporte:
  - soporte actual: `listing-clean.html`
  - publicación final recomendada: `/listing/{slug}/index.html`
- estrategia de generación o resolución:
  - generar una carpeta por listing publicado
  - resolver contenido desde el slug ya existente en dataset
- canonical futuro esperado:
  - `https://neuralgpt.store/listing/{slug}`
- fallback transicional:
  - `listing.html?slug={slug}`
- dificultad técnica:
  - media/alta

## 5. Diseño operativo recomendado para GitHub Pages

### 5.1 Mecanismo concreto recomendado

Mecanismo recomendado:

- añadir una fase futura de generación estática dentro del repo
- esa fase debe producir carpetas limpias reales antes del deploy
- el workflow actual de Pages ya admite un build opcional si existe `package.json` y `npm run build`

Esto permite dos caminos compatibles con el repo real:

1. generar los archivos en el propio repo y publicarlos tal cual
2. introducir un build mínimo que genere carpetas limpias a partir de los datasets antes de publicar

### 5.2 Por qué no recomiendo depender de `404.html`

- `404.html` existe, pero usarla como resolvedor principal de rutas limpias sería una táctica cliente
- esa táctica no ofrece la misma solidez SEO que una ruta física real
- es aceptable como fallback de navegación, no como arquitectura final del vertical

### 5.3 Por qué no recomiendo rewrites como base

- no existe en el repo ninguna prueba de que el host actual acepte reglas de rewrite configurables
- `GitHub Pages + CNAME + artifact root` apunta a publicación estática clásica
- documentar rewrites como solución final aquí sería inventar capacidad no verificada

## 6. Escalabilidad a muchas ciudades, países y listings

Conclusión:

- para unas pocas rutas manuales, la estática pura es trivial
- para el vertical completo, hace falta generación estática controlada

Recomendación de escalado:

- derivar las carpetas limpias desde `data/listings.json` y `data/taxonomy.json`
- generar solo entidades válidas y publicadas
- mantener una lista explícita de países/ciudades/listings generados
- incorporar esa lista al sitemap XML del vertical en una fase futura

## 7. Artefacto auxiliar y su propósito

Se crea `docs/migration-plan/clean-route-publication-matrix.csv` para dejar por escrito:

- ruta actual
- ruta limpia objetivo
- formato físico recomendado en GitHub Pages
- mecanismo de publicación recomendado
- dificultad
- escalabilidad
- fallback

## 8. Incoherencias críticas detectadas

Resultado:

- no se ha detectado ninguna incoherencia crítica que obligue a modificar páginas existentes en esta fase

Observaciones no destructivas:

- `sitemap.xml` actual sigue centrado en rutas legacy y todavía no integra el vertical inmobiliario nuevo
- esto no se corrige en esta fase porque la migración real aún no está activada

## 9. Siguiente fase recomendada

FASE 14 recomendada:

- diseñar y crear el generador estático mínimo de rutas limpias
- sin activar todavía canonicals ni 301
- produciendo primero un artefacto de prueba local para:
  - `/inmobiliario/index.html`
  - `/venta/index.html`
  - `/alquiler/index.html`
  - una muestra mínima de país, ciudad, hub y listing
