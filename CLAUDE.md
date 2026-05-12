# CLAUDE.md — neuralgpt.store

## MODO DE TRABAJO
- Cero conversación. Ejecuta. Muestra resultado.
- Un paso por turno.
- Lee antes de tocar. Siempre lee el archivo antes de editarlo.
- Diagnóstico primero. Nunca asumas estado.

## EFICIENCIA DE TOKENS
- No expliques lo que vas a hacer — hazlo.
- No resumas lo que hiciste — el output habla solo.
- No escribas "Entendido" ni relleno social.
- Usa diffs mínimos (str_replace) en vez de reescribir archivos completos.
- Usa grep/sed/rangos de línea. No leas archivos completos innecesariamente.
- No releas archivos que ya leíste en la misma sesión.

## GIT
- Nunca hagas push sin confirmación explícita del usuario.
- Un commit por bloque lógico.
- npm run -s check:static debe pasar antes de cada commit.
- Nunca git add . — añade archivos específicos.
- Nunca borres archivos sin ruta verificada y confirmación.

## SEGURIDAD
- Nunca imprimas secrets ni API keys en ningún output.
- Nunca escribas secrets en archivos que puedan entrar en git.
- Verifica .gitignore antes de cualquier push con archivos nuevos.

## ARQUITECTURA
- Stack: HTML/CSS/JS + Cloudflare Workers (/workers/api/) + Supabase + Stripe + KV
- KV namespace: neuralgpt-leads (ID: e2a73e9b7f1942099f31507aef0f8469)
- apiBase está en js/runtime-config.js — pendiente actualizar a URL real del Worker
- RLS en Supabase pendiente de activar

## SECRETS EN WRANGLER
Listos: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PUBLICACION_ADICIONAL, STRIPE_PRICE_MAS_VISIBILIDAD
Pendientes: STRIPE_PRICE_SENSACIONAL, STRIPE_PRICE_PLAN_BASICO, STRIPE_PRICE_PLAN_PREMIUM, STRIPE_PRICE_PLAN_ENTERPRISE, LISTINGS_EDIT_KEY_PEPPER, FREE_LISTINGS_PER_USER, CF_ACCOUNT_ID, CF_KV_NAMESPACE_ID, CF_KV_API_TOKEN

## PENDIENTE DE PRODUCCIÓN (orden estricto)
1. Subir secrets restantes
2. npx wrangler deploy
3. Conectar Worker al dominio (ruta /api/*)
4. Actualizar apiBase en js/runtime-config.js
5. Activar RLS en Supabase
6. Sacar API keys del repositorio
7. Validación de inputs en el Worker
8. Push final del frontend
9. Prueba end-to-end
10. Sincronizar app móvil

## COMANDOS FRECUENTES
- Deploy: cd workers/api && npx wrangler deploy
- Subir secret: npx wrangler secret put NOMBRE
- Ver secrets: npx wrangler secret list
- Check: npm run -s check:static
