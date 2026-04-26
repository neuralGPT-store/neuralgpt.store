'use strict';

const path = require('path');

function text(name, fallback) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return fallback;
  return String(raw).trim();
}

function required(name) {
  const value = text(name, '');
  if (!value) {
    const err = new Error('missing_env_' + name.toLowerCase());
    err.code = 'missing_env';
    err.env = name;
    throw err;
  }
  return value;
}

function bool(name, fallback) {
  const raw = text(name, fallback ? 'true' : 'false').toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

const rootDir = path.resolve(__dirname, '..');

const env = {
  nodeEnv: text('NODE_ENV', 'development'),
  port: Number(text('PORT', '8081')),
  publicBaseUrl: text('NEURAL_PUBLIC_BASE_URL', 'https://neuralgpt.store'),
  apiBaseUrl: text('NEURAL_API_BASE_URL', 'http://localhost:8081'),
  corsOrigin: text('NEURAL_CORS_ORIGIN', ''),
  listingsStorePath: text('LISTINGS_STORE_PATH', path.join(rootDir, 'data', 'listings-store.private.json')),
  listingsEditKeyPepper: text('LISTINGS_EDIT_KEY_PEPPER', ''),
  strictEditPepper: bool('LISTINGS_STRICT_EDIT_PEPPER', false),
  stripeSecretKey: text('STRIPE_SECRET_KEY', ''),
  stripeWebhookSecret: text('STRIPE_WEBHOOK_SECRET', ''),
  stripePriceMasVisibilidad: text('STRIPE_PRICE_MAS_VISIBILIDAD', ''),
  stripePriceSensacional: text('STRIPE_PRICE_SENSACIONAL', ''),
  stripePricePlanBasico: text('STRIPE_PRICE_PLAN_BASICO', ''),
  stripePricePlanPremium: text('STRIPE_PRICE_PLAN_PREMIUM', ''),
  stripeDonationPriceId: text('STRIPE_DONATION_PRICE_ID', ''),
  stripePricePublicacionAdicional: text('STRIPE_PRICE_PUBLICACION_ADICIONAL', ''),
  stripeProductPublicacionAdicional: text('STRIPE_PRODUCT_PUBLICACION_ADICIONAL', ''),
  freeListingsPerUser: Number(text('FREE_LISTINGS_PER_USER', '10')),
  stripeSuccessUrl: text('STRIPE_SUCCESS_URL', 'https://neuralgpt.store/confirm.html'),
  stripeCancelUrl: text('STRIPE_CANCEL_URL', 'https://neuralgpt.store/pricing.html')
};

function assertRuntimeReadyForStripe() {
  required('STRIPE_SECRET_KEY');
  required('STRIPE_WEBHOOK_SECRET');
  required('STRIPE_PRICE_MAS_VISIBILIDAD');
  required('STRIPE_PRICE_SENSACIONAL');
  required('STRIPE_PRICE_PLAN_BASICO');
  required('STRIPE_PRICE_PLAN_PREMIUM');
}

module.exports = {
  env,
  required,
  assertRuntimeReadyForStripe
};
