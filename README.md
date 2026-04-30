# neuralgpt.store — Portal Inmobiliario España

Portal inmobiliario premium con cobertura nacional en España (península, Baleares, Canarias, Ceuta y Melilla).

## Descripción

neuralgpt.store es un portal de publicación de anuncios inmobiliarios verificados para venta y alquiler estable. No actúa como agencia, intermediario, mediador, representante, asesor inmobiliario ni parte en ninguna operación.

## Características

- **Verificación manual** de cada anuncio antes de publicar
- **Contacto directo** con anunciantes (datos visibles GRATIS para compradores)
- **Cobertura nacional** en toda España
- **Moderación de imágenes** client-side con NSFWJS
- **Política comercial transparente**: hasta 5 anuncios gratis, anuncios adicionales 5€

## Estructura del proyecto

```
/
├── index.html              # Página principal
├── contact.html            # Formulario de publicación
├── edit.html               # Edición de anuncios
├── real-estate-index.html  # Índice de inmuebles
├── pricing.html            # Planes y precios
├── runtime/                # Backend Node.js
│   ├── handlers/          # API handlers (listings, stripe)
│   └── services/          # Servicios (store, KV, moderación)
├── js/                     # JavaScript frontend
│   └── image-moderation.js # Moderación NSFWJS
└── css/                    # Estilos

```

## Tecnología

- **Frontend**: HTML5, CSS3 (variables CSS), JavaScript vanilla
- **Backend**: Node.js (runtime opcional para /api/*)
- **Moderación**: NSFWJS + TensorFlow.js (client-side)
- **Pagos**: Stripe (opcional)
- **Deployment**: Estático (Netlify/Cloudflare Pages compatible)

## Rutas bloqueadas

Las siguientes rutas están bloqueadas en robots.txt y con X-Robots-Tag noindex:

- `/data/*`
- `/ops/*`
- `/runtime/*`
- `/confirm.html`
- `/edit.html`
- `/hub-pais*`
- `/hub-ciudad*`

## Contacto

**Email**: neuralgpt.store@protonmail.com

**Soporte**: 1-2 días laborables  
**Seguridad**: hasta 48h laborables

## Legal

- [Términos de Servicio](/terms.html)
- [Política de Privacidad](/privacy.html)
- [Aviso Legal](/legal.html)

---

© 2025–2026 neuralgpt.store · Portal inmobiliario premium
