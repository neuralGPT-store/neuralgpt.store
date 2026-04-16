# FASE 18 - Segundo piloto geo mínimo + control de canibalización

Fecha: 2026-04-16

## Objetivo ejecutado

Se amplió el piloto geo limpio con dos rutas adicionales (`/pais/pt/` y `/ciudad/lisboa/`) para validar escalabilidad del patrón sin activar 301, manteniendo convivencia ordenada con legacy `.html`.

## Archivos creados

- `pais/pt/index.html`
- `ciudad/lisboa/index.html`
- `docs/migration-plan/phase-18-second-geo-pilot-and-cannibalization-control.md`

## Archivos modificados

- `sitemap-real-estate.xml`
- `sitemap-real-estate.html`
- `real-estate-index.html`
- `pais.html`
- `ciudad.html`
- `docs/migration-plan/clean-route-geo-pilot-status.json` (ampliado)

## Rutas limpias geográficas publicadas (estado actual)

- `/pais/es/`
- `/ciudad/madrid/`
- `/pais/pt/`
- `/ciudad/lisboa/`

## Integración SEO controlada aplicada

### Sitemap XML

Se añadieron en convivencia controlada:

- `https://neuralgpt.store/pais/pt/`
- `https://neuralgpt.store/ciudad/lisboa/`

Sin reemplazar entradas legacy geográficas existentes.

### Sitemap HTML

- Se añadieron `/pais/pt/` y `/ciudad/lisboa/` al bloque de piloto limpio.
- Se añadieron enlaces prudentes en bloques de países/ciudades como piloto limpio.
- Se mantiene fuera de publicación limpia todo `/hub/...`.

## Descubrimiento interno mínimo

- `pais.html?country=pt`: botón condicional a `/pais/pt/`.
- `ciudad.html?city=lisboa`: botón condicional a `/ciudad/lisboa/`.
- `real-estate-index.html`: entradas discretas para PT/Lisboa en colección principal.
- `sitemap-real-estate.html`: exposición controlada de ambas rutas.

## Matriz de convivencia y canibalización

- `/pais/es/` <-> `/pais.html?country=es`
- `/ciudad/madrid/` <-> `/ciudad.html?city=madrid`
- `/pais/pt/` <-> `/pais.html?country=pt`
- `/ciudad/lisboa/` <-> `/ciudad.html?city=lisboa`

Duplicidad temporal aceptada en fase piloto para medir señales antes de consolidar canonicals/301.

## Señales SEO a observar

1. Cobertura e indexación por URL limpia y legacy equivalente.
2. Distribución de impresiones/clics entre cada par limpio vs legacy.
3. Consultas por intención local (país/ciudad) y URL que captura el ranking principal.
4. Estabilidad de CTR y posición media en legacy tras publicar limpio.
5. Rastreo de nuevas rutas en sitemap sin degradar rastreo útil legacy.

## Criterio lógico para seguir expandiendo sin caos

Avanzar a siguiente expansión geo solo si durante una ventana mínima de 21-28 días:

1. cada ruta limpia nueva logra estado indexable y tráfico orgánico no nulo
2. ninguna ruta legacy equivalente pierde más del 20% de clics sostenidos sin compensación neta del par limpio
3. no aparecen conflictos de canonical reportados en inspección de URL
4. no se detectan errores de render/enlazado en la malla geo piloto

Si alguna condición falla, congelar expansión y ajustar enlazado/canonical antes de publicar más rutas limpias.

## Coste y escalabilidad

- Sin nuevas dependencias ni infraestructura dinámica.
- Sin assets pesados nuevos.
- Todo en superficies estáticas aptas para cache agresiva (Cloudflare/GitHub Pages).

## Límites vigentes (no ejecutar aún)

- no publicar `/hub/pais/{slug}` limpio
- no publicar `/hub/ciudad/{slug}` limpio
- no publicar más países/ciudades limpios
- no publicar más listings limpios
- no activar 301
- no cambiar canonicals legacy geográficos
