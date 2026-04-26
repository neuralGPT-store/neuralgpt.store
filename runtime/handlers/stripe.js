'use strict';

const { readJsonBody, readRawBody, sendError, sendJson } = require('../lib/http');
const { applyCommercialEffect } = require('../services/listings-store');

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

  async function checkoutPlanEnterprise(req, res) {
    return createCheckout(req, res, {
      key: 'plan_enterprise',
      priceId: env.stripePricePlanEnterprise,
      priceEnv: 'STRIPE_PRICE_PLAN_ENTERPRISE'
    });
  }

  async function checkoutPublicacionAdicional(req, res) {
    return createCheckout(req, res, {
      key: 'publicacion_adicional',
      priceId: env.stripePricePublicacionAdicional,
      priceEnv: 'STRIPE_PRICE_PUBLICACION_ADICIONAL'
    });
  }

  async function checkoutDonation(req, res) {
    return createCheckout(req, res, {
      key: 'donation_project',
      priceId: env.stripeDonationPriceId,
      priceEnv: 'STRIPE_DONATION_PRICE_ID'
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
      const reconciliation = await reconcileStripeEvent(event);
      return sendJson(res, 200, { ok: true, received: true, type: event.type, reconciliation });
    } catch (error) {
      return sendError(res, 400, 'webhook_signature_invalid', error.message || 'construct_event_failed');
    }
  }

  function effectByCheckoutType(checkoutType) {
    const key = String(checkoutType || '').trim();
    if (!key) return null;
    if (['mas_visibilidad', 'sensacional_24h', 'plan_basico', 'plan_premium', 'plan_enterprise'].includes(key)) {
      return key;
    }
    return null;
  }

  function effectByPriceId(priceId) {
    const id = String(priceId || '').trim();
    if (!id) return null;
    if (id === env.stripePriceMasVisibilidad) return 'mas_visibilidad';
    if (id === env.stripePriceSensacional) return 'sensacional_24h';
    if (id === env.stripePricePlanBasico) return 'plan_basico';
    if (id === env.stripePricePlanPremium) return 'plan_premium';
    if (id === env.stripePricePlanEnterprise) return 'plan_enterprise';
    return null;
  }

  function effectByProductId(productId) {
    const id = String(productId || '').trim().toLowerCase();
    if (!id) return null;
    if (id.includes('visibilidad')) return 'mas_visibilidad';
    if (id.includes('sensacional')) return 'sensacional_24h';
    if (id.includes('enterprise')) return 'plan_enterprise';
    if (id.includes('premium')) return 'plan_premium';
    if (id.includes('basico') || id.includes('basic')) return 'plan_basico';
    return null;
  }

  function priceAndProductFromLineItem(item) {
    if (!item || typeof item !== 'object') return { priceId: '', productId: '' };
    const priceObj = item.price && typeof item.price === 'object' ? item.price : null;
    return {
      priceId: String((priceObj && priceObj.id) || item.price || '').trim(),
      productId: String((priceObj && priceObj.product) || item.product || '').trim()
    };
  }

  async function fetchFirstLineItemForSession(sessionId) {
    if (!sessionId) return null;
    if (!stripe.checkout || !stripe.checkout.sessions || typeof stripe.checkout.sessions.listLineItems !== 'function') {
      return null;
    }
    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 1, expand: ['data.price.product'] });
      if (!lineItems || !Array.isArray(lineItems.data) || !lineItems.data.length) return null;
      return lineItems.data[0];
    } catch (_error) {
      return null;
    }
  }

  async function fetchCheckoutSessionByPaymentIntent(paymentIntentId) {
    if (!paymentIntentId) return null;
    if (!stripe.checkout || !stripe.checkout.sessions || typeof stripe.checkout.sessions.list !== 'function') {
      return null;
    }
    try {
      const list = await stripe.checkout.sessions.list({
        payment_intent: paymentIntentId,
        limit: 1
      });
      if (!list || !Array.isArray(list.data) || !list.data.length) return null;
      return list.data[0];
    } catch (_error) {
      return null;
    }
  }

  function resolveEffectFromContext(ctx) {
    return (
      effectByCheckoutType(ctx.checkoutType) ||
      effectByPriceId(ctx.priceId) ||
      effectByProductId(ctx.productId) ||
      effectByCheckoutType(ctx.fallbackCheckoutType) ||
      effectByPriceId(ctx.fallbackPriceId) ||
      effectByProductId(ctx.fallbackProductId) ||
      null
    );
  }

  async function reconcileCheckoutCompleted(event) {
    const session = event && event.data && event.data.object ? event.data.object : {};
    const meta = session && session.metadata && typeof session.metadata === 'object' ? session.metadata : {};
    const checkoutType = String(meta.checkout_type || '').trim();
    if (checkoutType === 'donation_project') {
      return { applied: false, ignored: true, reason: 'donation_checkout' };
    }
    const listingId = String(meta.listing_id || '').trim();
    const sessionId = String(session.id || '').trim();
    const paymentIntentId = String(session.payment_intent || '').trim();

    const firstLineItem = await fetchFirstLineItemForSession(sessionId);
    const first = priceAndProductFromLineItem(firstLineItem);
    const effectKey = resolveEffectFromContext({
      checkoutType,
      priceId: first.priceId,
      productId: first.productId
    });

    if (!effectKey) {
      return { applied: false, reason: 'effect_not_mapped', listing_id: listingId || null, session_id: sessionId || null };
    }
    if (!listingId) {
      return { applied: false, reason: 'listing_id_missing', effect_key: effectKey, session_id: sessionId || null };
    }

    const txKey = paymentIntentId || sessionId || String(event.id || '');
    const result = applyCommercialEffect(env.listingsStorePath, {
      listingId,
      effectKey,
      transactionKey: txKey,
      eventId: String(event.id || ''),
      eventType: String(event.type || ''),
      checkoutSessionId: sessionId,
      paymentIntentId,
      priceId: first.priceId,
      productId: first.productId
    });

    return {
      applied: Boolean(result && result.ok),
      code: result && result.code ? result.code : 'unknown',
      listing_id: listingId,
      effect_key: effectKey,
      transaction_key: txKey
    };
  }

  async function reconcilePaymentIntentSucceeded(event) {
    const paymentIntent = event && event.data && event.data.object ? event.data.object : {};
    const paymentIntentId = String(paymentIntent.id || '').trim();
    const meta = paymentIntent && paymentIntent.metadata && typeof paymentIntent.metadata === 'object' ? paymentIntent.metadata : {};

    const session = await fetchCheckoutSessionByPaymentIntent(paymentIntentId);
    const sessionMeta = session && session.metadata && typeof session.metadata === 'object' ? session.metadata : {};
    const sessionId = String((session && session.id) || '').trim();
    const listingId = String(meta.listing_id || sessionMeta.listing_id || '').trim();
    const checkoutType = String(meta.checkout_type || sessionMeta.checkout_type || '').trim();
    if (checkoutType === 'donation_project') {
      return { applied: false, ignored: true, reason: 'donation_checkout' };
    }

    const firstLineItem = await fetchFirstLineItemForSession(sessionId);
    const first = priceAndProductFromLineItem(firstLineItem);
    const effectKey = resolveEffectFromContext({
      checkoutType,
      priceId: first.priceId,
      productId: first.productId
    });

    if (!effectKey) {
      return {
        applied: false,
        reason: 'effect_not_mapped',
        payment_intent_id: paymentIntentId || null,
        listing_id: listingId || null
      };
    }
    if (!listingId) {
      return {
        applied: false,
        reason: 'listing_id_missing',
        effect_key: effectKey,
        payment_intent_id: paymentIntentId || null
      };
    }

    const txKey = paymentIntentId || sessionId || String(event.id || '');
    const result = applyCommercialEffect(env.listingsStorePath, {
      listingId,
      effectKey,
      transactionKey: txKey,
      eventId: String(event.id || ''),
      eventType: String(event.type || ''),
      checkoutSessionId: sessionId,
      paymentIntentId,
      priceId: first.priceId,
      productId: first.productId
    });

    return {
      applied: Boolean(result && result.ok),
      code: result && result.code ? result.code : 'unknown',
      listing_id: listingId,
      effect_key: effectKey,
      transaction_key: txKey
    };
  }

  async function reconcileStripeEvent(event) {
    const type = String(event && event.type || '');
    if (type === 'checkout.session.completed') {
      return reconcileCheckoutCompleted(event);
    }
    if (type === 'payment_intent.succeeded') {
      return reconcilePaymentIntentSucceeded(event);
    }
    return { applied: false, ignored: true, reason: 'event_type_not_supported', type };
  }

  return {
    checkoutMasVisibilidad,
    checkoutSensacional,
    checkoutPlanBasico,
    checkoutPlanPremium,
    checkoutPlanEnterprise,
    checkoutPublicacionAdicional,
    checkoutDonation,
    webhook
  };
}

module.exports = {
  createStripeHandlers
};
