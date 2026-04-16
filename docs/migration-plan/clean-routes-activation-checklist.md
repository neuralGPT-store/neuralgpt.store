# Checklist operativo — activación futura de rutas limpias

Este checklist no activa nada. Sirve para ejecutar la transición futura sin saltarse pasos.

## 1. Antes de tocar canonicals

- verificar que la ruta limpia real existe y devuelve contenido correcto
- verificar que la ruta limpia carga el mismo dataset que la `.html` equivalente
- verificar que `title`, `meta description`, `og:url` y breadcrumb son coherentes
- verificar que no se depende del wrapper para navegación real
- verificar que la ruta `.html` sigue operativa como fallback

## 2. Antes de actualizar enlaces internos

- identificar todos los enlaces entrantes relevantes en las rutas públicas SEO
- actualizar primero enlaces hacia detalle limpio
- actualizar después colecciones principales
- actualizar después geografía
- actualizar después hubs
- actualizar el índice maestro al final

## 3. Antes de activar 301

- confirmar que canonical y enlaces internos ya apuntan a la ruta limpia
- confirmar que no hay cadenas `wrapper -> .html -> limpia`
- confirmar que sitemap y enlazado interno pueden rastrear la nueva ruta
- confirmar que bridge y legacy no dependen de la `.html` pública migrada

## 4. Controles de cierre por ruta

- la ruta limpia responde
- la ruta limpia se autorreferencia correctamente
- la ruta antigua no compite en canonical
- el enlace interno principal ya apunta a la ruta limpia
- la 301 no rompe fallback ni navegación transicional
