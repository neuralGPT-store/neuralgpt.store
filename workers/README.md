# neuralgpt.store Cloudflare Workers API

Runtime completo migrado a Cloudflare Workers para producción.

## Estructura

```
workers/
├── api/
│   ├── index.js                 # Entry point del Worker
│   ├── router.js                # Rutas /api/*
│   ├── handlers/
│   │   ├── listings.js          # ✅ Migrado completamente
│   │   ├── stripe-placeholder.js   # ⚠️ Pendiente migración completa
│   │   └── alerts-placeholder.js   # ⚠️ Pendiente migración completa
│   ├── services/
│   │   ├── listings-store.js    # ✅ Adaptado para KV + Web Crypto
│   │   └── stripe-client.js     # ✅ Compatible Workers
│   ├── lib/
│   │   └── http.js              # ✅ Web APIs estándar (Request/Response)
│   └── config/
│       └── env.js               # Configuración desde wrangler
├── package.json
└── README.md
```

## Estado de migración

### ✅ Completado
- **Listings**: Crear, editar, obtener status
- **KV Storage**: Reemplaza filesystem
- **Web Crypto**: Reemplaza Node crypto (sha256, randomToken)
- **HTTP utils**: Request/Response estándar
- **Multipart parsing**: Compatible Workers
- **Router**: Todas las rutas mapeadas
- **CORS**: Headers configurados
- **API Key auth**: Protección endpoints sensibles

### ⚠️ Pendiente
- **Stripe handlers completos**: Actualmente placeholders (503)
- **Alerts handlers completos**: Actualmente placeholders (503)

## Configuración

### 1. Instalar dependencias

```bash
cd workers
npm install
```

### 2. Configurar secrets

```bash
wrangler secret put API_SECRET_KEY
wrangler secret put LISTINGS_EDIT_KEY_PEPPER
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put STRIPE_PRICE_MAS_VISIBILIDAD
wrangler secret put STRIPE_PRICE_SENSACIONAL
wrangler secret put STRIPE_PRICE_PLAN_BASICO
wrangler secret put STRIPE_PRICE_PLAN_PREMIUM
wrangler secret put STRIPE_PRICE_PLAN_ENTERPRISE
wrangler secret put STRIPE_PRICE_PUBLICACION_ADICIONAL
```

### 3. Crear KV namespace

```bash
wrangler kv:namespace create LISTINGS_KV
# Copiar el ID generado y actualizar wrangler.toml
```

### 4. Verificar compilación

```bash
npx wrangler dev --local
```

### 5. Deploy a producción

```bash
npx wrangler deploy
```

El Worker se desplegará en: `https://neuralgpt-api.pokerprofe.workers.dev`

## Frontend configuration

En producción, configurar en `index.html` y otros HTMLs:

```html
<meta name="neural-api-base" content="https://neuralgpt-api.pokerprofe.workers.dev">
<meta name="neural-backend-ready" content="true">
```

O antes de cargar `js/runtime-config.js`:

```html
<script>
  window.NEURAL_API_BASE = 'https://neuralgpt-api.pokerprofe.workers.dev';
  window.NEURAL_BACKEND_READY = true;
</script>
```

## Rutas disponibles

### Listings (públicas)
- `POST /api/listings/status` - Obtener estado con edit_key
- `POST /api/listings/upsert` - Crear/editar anuncio

### Stripe (protegidas con API key)
- `POST /api/stripe/checkout-mas-visibilidad`
- `POST /api/stripe/checkout-sensacional`
- `POST /api/stripe/checkout-plan-basico`
- `POST /api/stripe/checkout-plan-premium`
- `POST /api/stripe/checkout-plan-enterprise`
- `POST /api/stripe/checkout-publicacion-adicional`
- `POST /api/stripe/billing-portal`
- `POST /api/stripe/webhook` (autenticado por Stripe signature)

### Alerts (públicas)
- `POST /api/alerts/subscribe`
- `DELETE /api/alerts/unsubscribe`

### Health
- `GET /api/health`

## Diferencias con Node runtime

1. **Storage**: KV en lugar de filesystem
2. **Crypto**: Web Crypto API en lugar de Node crypto
3. **HTTP**: Request/Response estándar en lugar de Node http
4. **Imports**: ES modules (`import/export`) en lugar de CommonJS (`require`)
5. **Globals**: No `process`, `__dirname`, `Buffer` de Node

## Próximos pasos

1. ✅ Migrar handlers/stripe.js completo (reconcileStripeEvent, etc.)
2. ✅ Migrar handlers/alerts.js completo (createAlert, cancelAlert con KV)
3. ✅ Migrar services/alerts.js para usar KV directamente
4. ⚠️ Testing en wrangler dev
5. ⚠️ Deploy a producción
