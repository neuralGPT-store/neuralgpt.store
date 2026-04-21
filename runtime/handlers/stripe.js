'use strict';

const { readJsonBody, readRawBody, sendError, sendJson } = require('../lib/http');

const JSON_MAX = 128 * 1024;
const RAW_MAX = 1024 * 1024;

function createStripeHandlers(env, stripe) {
  function requireStripe(res) {
    if (!stripe || !env.stripeSecretKey) {
      sendError(res, 503, 'stripe_not_configured', 'pending_env_vars');
      return false;
    }
    return true;
  }

  async function createCheckout(req, res, opts) {
    if (!requireStripe(res)) return;

    let body;
    try {
      body = await readJsonBody(req, JSON_MAX);
    } catch (error) {
      return sendError(res, 400, error.message || 'invalid_json_body');
    }

    if (!opts.priceId) {
      return sendError(res, 503, 'stripe_price_not_configured', opts.priceEnv);
    }

    const metadata = {
      checkout_type: opts.key,
      listing_id: String((body && body.listing_id) || '').slice(0, 140)
    };

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: env.stripeSuccessUrl,
        cancel_url: env.stripeCancelUrl,
        line_items: [{
          price: opts.priceId,
          quantity: 1
        }],
        metadata
      });

      return sendJson(res, 200, {
        ok: true,
        checkout_url: session.url,
        url: session.url,
        session_id: session.id
      });
    } catch (error) {
      return sendError(res, 500, 'stripe_error', error.message || 'checkout_create_failed');
    }
  }

  async function checkoutContactUnlock(req, res) {
    return createCheckout(req, res, {
      key: 'contact_unlock',
      priceId: env.stripePriceContactUnlock,
      priceEnv: 'STRIPE_PRICE_CONTACT_UNLOCK'
    });
  }

  async function checkoutMasVisibilidad(req, res) {
    return createCheckout(req, res, {
      key: 'mas_visibilidad',
      priceId: env.stripePriceMasVisibilidad,
      priceEnv: 'STRIPE_PRICE_MAS_VISIBILIDAD'
    });
  }

  async function checkoutSensacional(req, res) {
    return createCheckout(req, res, {
      key: 'sensacional_24h',
      priceId: env.stripePriceSensacional,
      priceEnv: 'STRIPE_PRICE_SENSACIONAL'
    });
  }

  async function checkoutPlanBasico(req, res) {
    return createCheckout(req, res, {
      key: 'plan_basico',
      priceId: env.stripePricePlanBasico,
      priceEnv: 'STRIPE_PRICE_PLAN_BASICO'
    });
  }

  async function checkoutPlanPremium(req, res) {
    return createCheckout(req, res, {
      key: 'plan_premium',
      priceId: env.stripePricePlanPremium,
      priceEnv: 'STRIPE_PRICE_PLAN_PREMIUM'
    });
  }

  async function webhook(req, res) {
    if (!requireStripe(res)) return;
    if (!env.stripeWebhookSecret) return sendError(res, 503, 'stripe_webhook_not_configured', 'STRIPE_WEBHOOK_SECRET');

    let raw;
    try {
      raw = await readRawBody(req, RAW_MAX);
    } catch (error) {
      return sendError(res, 400, error.message || 'invalid_webhook_body');
    }

    try {
      const signature = req.headers['stripe-signature'];
      const event = stripe.webhooks.constructEvent(raw, signature, env.stripeWebhookSecret);
      // TODO(runtime): reconciliar estado de pago -> listing/contact unlock/boost.
      return sendJson(res, 200, {
        ok: true,
        received: true,
        type: event.type
      });
    } catch (error) {
      return sendError(res, 400, 'webhook_signature_invalid', error.message || 'construct_event_failed');
    }
  }

  return {
    checkoutContactUnlock,
    checkoutMasVisibilidad,
    checkoutSensacional,
    checkoutPlanBasico,
    checkoutPlanPremium,
    webhook
  };
}

module.exports = {
  createStripeHandlers
};
