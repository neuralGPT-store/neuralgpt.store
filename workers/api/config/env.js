/**
 * Environment configuration for Cloudflare Workers
 * Variables come from wrangler.toml [vars] and wrangler secrets
 */

function getEnv(workerEnv) {
  return {
    nodeEnv: workerEnv.NODE_ENV || 'production',
    publicBaseUrl: workerEnv.PUBLIC_BASE_URL || 'https://neuralgpt.store',
    apiBaseUrl: workerEnv.API_BASE_URL || 'https://neuralgpt-api.pokerprofe.workers.dev',
    corsOrigin: workerEnv.CORS_ORIGIN || '',

    // API Security
    apiSecretKey: workerEnv.API_SECRET_KEY || '',

    // Listings
    listingsEditKeyPepper: workerEnv.LISTINGS_EDIT_KEY_PEPPER || '',
    strictEditPepper: workerEnv.LISTINGS_STRICT_EDIT_PEPPER === 'true',
    freeListingsPerUser: Number(workerEnv.FREE_LISTINGS_PER_USER || '5'),

    // Stripe
    stripeSecretKey: workerEnv.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: workerEnv.STRIPE_WEBHOOK_SECRET || '',
    stripePriceMasVisibilidad: workerEnv.STRIPE_PRICE_MAS_VISIBILIDAD || '',
    stripePriceSensacional: workerEnv.STRIPE_PRICE_SENSACIONAL || '',
    stripePricePlanBasico: workerEnv.STRIPE_PRICE_PLAN_BASICO || '',
    stripePricePlanPremium: workerEnv.STRIPE_PRICE_PLAN_PREMIUM || '',
    stripePricePlanEnterprise: workerEnv.STRIPE_PRICE_PLAN_ENTERPRISE || '',
    stripeDonationPriceId: workerEnv.STRIPE_DONATION_PRICE_ID || '',
    stripePricePublicacionAdicional: workerEnv.STRIPE_PRICE_PUBLICACION_ADICIONAL || '',
    stripeProductPlanEnterprise: workerEnv.STRIPE_PRODUCT_PLAN_ENTERPRISE || '',
    stripeProductPublicacionAdicional: workerEnv.STRIPE_PRODUCT_PUBLICACION_ADICIONAL || '',
    stripeSuccessUrl: workerEnv.STRIPE_SUCCESS_URL || 'https://neuralgpt.store/confirm.html',
    stripeCancelUrl: workerEnv.STRIPE_CANCEL_URL || 'https://neuralgpt.store/pricing.html',

    // Cloudflare KV (for alerts - bindings are in env directly)
    cfAccountId: workerEnv.CF_ACCOUNT_ID || '',
    cfKvNamespaceId: workerEnv.CF_KV_NAMESPACE_ID || '',
    cfKvApiToken: workerEnv.CF_KV_API_TOKEN || ''
  };
}

export { getEnv };
