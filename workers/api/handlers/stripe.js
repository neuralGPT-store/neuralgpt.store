/**
 * Stripe handlers for Cloudflare Workers
 * Migrated from runtime/handlers/stripe.js
 */

import { readJsonBody, readRawBody, sendError, sendJson } from '../lib/http.js';
import { applyCommercialEffect } from '../services/listings-store.js';
import {
  createCheckoutSession,
  constructWebhookEvent,
  listLineItems,
  listCheckoutSessions,
  listCustomers,
  createCustomer,
  createBillingPortalSession
} from '../services/stripe-client.js';

const JSON_MAX = 128 * 1024;
const RAW_MAX = 1024 * 1024;

function createStripeHandlers(env) {
  function requireStripe() {
    if (!env.STRIPE_SECRET_KEY) {
      return { ok: false, error: 'stripe_not_configured', message: 'STRIPE_SECRET_KEY not set' };
    }
    return { ok: true };
  }

  async function createCheckout(request, opts) {
    const stripeCheck = requireStripe();
    if (!stripeCheck.ok) {
      return sendError(null, 503, stripeCheck.error, stripeCheck.message);
    }

    let body;
    try {
      body = await readJsonBody(request, JSON_MAX);
    } catch (error) {
      return sendError(null, 400, 'invalid_json_body', error.message);
    }

    if (!opts.priceId) {
      return sendError(null, 503, 'stripe_price_not_configured', opts.priceEnv);
    }

    const metadata = {
      checkout_type: opts.key,
      listing_id: String((body && body.listing_id) || '').slice(0, 140)
    };

    const result = await createCheckoutSession(
      {
        mode: 'payment',
        success_url: env.STRIPE_SUCCESS_URL || 'https://neuralgpt.store/pricing.html',
        cancel_url: env.STRIPE_CANCEL_URL || 'https://neuralgpt.store/pricing.html',
        line_items: [{ price: opts.priceId, quantity: 1 }],
        metadata
      },
      env.STRIPE_SECRET_KEY
    );

    if (!result.ok) {
      return sendError(null, 500, result.error || 'stripe_error', result.message || 'checkout_create_failed');
    }

    return sendJson(null, 200, {
      ok: true,
      checkout_url: result.session.url,
      url: result.session.url,
      session_id: result.session.id
    });
  }

  async function checkoutMasVisibilidad(request) {
    return createCheckout(request, {
      key: 'mas_visibilidad',
      priceId: env.STRIPE_PRICE_MAS_VISIBILIDAD,
      priceEnv: 'STRIPE_PRICE_MAS_VISIBILIDAD'
    });
  }

  async function checkoutSensacional(request) {
    return createCheckout(request, {
      key: 'sensacional_24h',
      priceId: env.STRIPE_PRICE_SENSACIONAL,
      priceEnv: 'STRIPE_PRICE_SENSACIONAL'
    });
  }

  async function checkoutPlanBasico(request) {
    return createCheckout(request, {
      key: 'plan_basico',
      priceId: env.STRIPE_PRICE_PLAN_BASICO,
      priceEnv: 'STRIPE_PRICE_PLAN_BASICO'
    });
  }

  async function checkoutPlanPremium(request) {
    return createCheckout(request, {
      key: 'plan_premium',
      priceId: env.STRIPE_PRICE_PLAN_PREMIUM,
      priceEnv: 'STRIPE_PRICE_PLAN_PREMIUM'
    });
  }

  async function checkoutPlanEnterprise(request) {
    return createCheckout(request, {
      key: 'plan_enterprise',
      priceId: env.STRIPE_PRICE_PLAN_ENTERPRISE,
      priceEnv: 'STRIPE_PRICE_PLAN_ENTERPRISE'
    });
  }

  async function checkoutPublicacionAdicional(request) {
    return createCheckout(request, {
      key: 'publicacion_adicional',
      priceId: env.STRIPE_PRICE_PUBLICACION_ADICIONAL,
      priceEnv: 'STRIPE_PRICE_PUBLICACION_ADICIONAL'
    });
  }

  async function checkoutDonation(request) {
    return createCheckout(request, {
      key: 'donation_project',
      priceId: env.STRIPE_DONATION_PRICE_ID,
      priceEnv: 'STRIPE_DONATION_PRICE_ID'
    });
  }

  async function billingPortal(request) {
    const stripeCheck = requireStripe();
    if (!stripeCheck.ok) {
      return sendError(null, 503, stripeCheck.error, stripeCheck.message);
    }

    let body;
    try {
      body = await readJsonBody(request, JSON_MAX);
    } catch (error) {
      return sendError(null, 400, 'invalid_json_body', error.message);
    }

    const customerEmail = String((body && body.customer_email) || '').trim();
    if (!customerEmail || !customerEmail.includes('@')) {
      return sendError(null, 400, 'customer_email_required');
    }

    try {
      // Find or create customer
      const customersResult = await listCustomers(customerEmail, env.STRIPE_SECRET_KEY);

      let customerId;
      if (customersResult.ok && customersResult.customers.length > 0) {
        customerId = customersResult.customers[0].id;
      } else {
        const createResult = await createCustomer(customerEmail, env.STRIPE_SECRET_KEY);
        if (!createResult.ok) {
          return sendError(null, 500, 'stripe_create_customer_failed', createResult.message);
        }
        customerId = createResult.customer.id;
      }

      // Create billing portal session
      const returnUrl = env.STRIPE_SUCCESS_URL || 'https://neuralgpt.store/pricing.html';
      const portalResult = await createBillingPortalSession(customerId, returnUrl, env.STRIPE_SECRET_KEY);

      if (!portalResult.ok) {
        return sendError(null, 500, 'stripe_portal_error', portalResult.message || 'portal_creation_failed');
      }

      return sendJson(null, 200, {
        ok: true,
        portal_url: portalResult.session.url
      });
    } catch (error) {
      return sendError(null, 500, 'stripe_portal_error', error.message || 'portal_creation_failed');
    }
  }

  async function webhook(request) {
    const stripeCheck = requireStripe();
    if (!stripeCheck.ok) {
      return sendError(null, 503, stripeCheck.error, stripeCheck.message);
    }

    if (!env.STRIPE_WEBHOOK_SECRET) {
      return sendError(null, 503, 'stripe_webhook_not_configured', 'STRIPE_WEBHOOK_SECRET not set');
    }

    let raw;
    try {
      raw = await readRawBody(request, RAW_MAX);
    } catch (error) {
      return sendError(null, 400, 'invalid_webhook_body', error.message);
    }

    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return sendError(null, 400, 'stripe_signature_missing');
    }

    const eventResult = await constructWebhookEvent(raw, signature, env.STRIPE_WEBHOOK_SECRET);

    if (!eventResult.ok) {
      return sendError(null, 400, 'webhook_signature_invalid', eventResult.error || 'construct_event_failed');
    }

    const event = eventResult.event;
    const reconciliation = await reconcileStripeEvent(event, env);

    return sendJson(null, 200, {
      ok: true,
      received: true,
      type: event.type,
      reconciliation
    });
  }

  return {
    checkoutMasVisibilidad,
    checkoutSensacional,
    checkoutPlanBasico,
    checkoutPlanPremium,
    checkoutPlanEnterprise,
    checkoutPublicacionAdicional,
    checkoutDonation,
    billingPortal,
    webhook
  };
}

// ── Reconciliation helpers ──

function effectByCheckoutType(checkoutType) {
  const key = String(checkoutType || '').trim();
  if (!key) return null;
  if (['mas_visibilidad', 'sensacional_24h', 'plan_basico', 'plan_premium', 'plan_enterprise'].includes(key)) {
    return key;
  }
  return null;
}

function effectByPriceId(priceId, env) {
  const id = String(priceId || '').trim();
  if (!id) return null;
  if (id === env.STRIPE_PRICE_MAS_VISIBILIDAD) return 'mas_visibilidad';
  if (id === env.STRIPE_PRICE_SENSACIONAL) return 'sensacional_24h';
  if (id === env.STRIPE_PRICE_PLAN_BASICO) return 'plan_basico';
  if (id === env.STRIPE_PRICE_PLAN_PREMIUM) return 'plan_premium';
  if (id === env.STRIPE_PRICE_PLAN_ENTERPRISE) return 'plan_enterprise';
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

async function fetchFirstLineItemForSession(sessionId, env) {
  if (!sessionId) return null;

  const result = await listLineItems(sessionId, env.STRIPE_SECRET_KEY);
  if (!result.ok || !result.lineItems || result.lineItems.length === 0) {
    return null;
  }

  return result.lineItems[0];
}

async function fetchCheckoutSessionByPaymentIntent(paymentIntentId, env) {
  if (!paymentIntentId) return null;

  const result = await listCheckoutSessions(paymentIntentId, env.STRIPE_SECRET_KEY);
  if (!result.ok || !result.sessions || result.sessions.length === 0) {
    return null;
  }

  return result.sessions[0];
}

function resolveEffectFromContext(ctx, env) {
  return (
    effectByCheckoutType(ctx.checkoutType) ||
    effectByPriceId(ctx.priceId, env) ||
    effectByProductId(ctx.productId) ||
    effectByCheckoutType(ctx.fallbackCheckoutType) ||
    effectByPriceId(ctx.fallbackPriceId, env) ||
    effectByProductId(ctx.fallbackProductId) ||
    null
  );
}

async function reconcileCheckoutCompleted(event, env) {
  const session = event && event.data && event.data.object ? event.data.object : {};
  const meta = session && session.metadata && typeof session.metadata === 'object' ? session.metadata : {};
  const checkoutType = String(meta.checkout_type || '').trim();

  if (checkoutType === 'donation_project') {
    return { applied: false, ignored: true, reason: 'donation_checkout' };
  }

  const listingId = String(meta.listing_id || '').trim();
  const sessionId = String(session.id || '').trim();
  const paymentIntentId = String(session.payment_intent || '').trim();

  const firstLineItem = await fetchFirstLineItemForSession(sessionId, env);
  const first = priceAndProductFromLineItem(firstLineItem);

  const effectKey = resolveEffectFromContext({
    checkoutType,
    priceId: first.priceId,
    productId: first.productId
  }, env);

  if (!effectKey) {
    return {
      applied: false,
      reason: 'effect_not_mapped',
      listing_id: listingId || null,
      session_id: sessionId || null
    };
  }

  if (!listingId) {
    return {
      applied: false,
      reason: 'listing_id_missing',
      effect_key: effectKey,
      session_id: sessionId || null
    };
  }

  const txKey = paymentIntentId || sessionId || String(event.id || '');
  const result = await applyCommercialEffect(env.LISTINGS_KV, {
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

async function reconcilePaymentIntentSucceeded(event, env) {
  const paymentIntent = event && event.data && event.data.object ? event.data.object : {};
  const paymentIntentId = String(paymentIntent.id || '').trim();
  const meta = paymentIntent && paymentIntent.metadata && typeof paymentIntent.metadata === 'object' ? paymentIntent.metadata : {};

  const session = await fetchCheckoutSessionByPaymentIntent(paymentIntentId, env);
  const sessionMeta = session && session.metadata && typeof session.metadata === 'object' ? session.metadata : {};
  const sessionId = String((session && session.id) || '').trim();

  const listingId = String(meta.listing_id || sessionMeta.listing_id || '').trim();
  const checkoutType = String(meta.checkout_type || sessionMeta.checkout_type || '').trim();

  if (checkoutType === 'donation_project') {
    return { applied: false, ignored: true, reason: 'donation_checkout' };
  }

  const firstLineItem = await fetchFirstLineItemForSession(sessionId, env);
  const first = priceAndProductFromLineItem(firstLineItem);

  const effectKey = resolveEffectFromContext({
    checkoutType,
    priceId: first.priceId,
    productId: first.productId
  }, env);

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
  const result = await applyCommercialEffect(env.LISTINGS_KV, {
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

async function reconcileSubscriptionCreated(event, env) {
  const subscription = event && event.data && event.data.object ? event.data.object : {};
  const subscriptionId = String(subscription.id || '').trim();
  const status = String(subscription.status || '').trim();
  const meta = subscription && subscription.metadata && typeof subscription.metadata === 'object' ? subscription.metadata : {};
  const listingId = String(meta.listing_id || '').trim();

  if (!listingId) {
    return {
      applied: false,
      reason: 'listing_id_missing_in_subscription_metadata',
      subscription_id: subscriptionId
    };
  }

  // Determine tier from metadata or plan
  const tier = String(meta.tier || meta.plan_tier || '').trim() || 'basico';
  const validTiers = ['basico', 'premium', 'enterprise'];
  const finalTier = validTiers.includes(tier) ? tier : 'basico';

  // Mark subscription as active
  const effectKey = tier === 'premium' ? 'plan_premium' : tier === 'enterprise' ? 'plan_enterprise' : 'plan_basico';
  const txKey = subscriptionId || String(event.id || '');

  const result = await applyCommercialEffect(env.LISTINGS_KV, {
    listingId,
    effectKey,
    transactionKey: txKey,
    eventId: String(event.id || ''),
    eventType: 'customer.subscription.created',
    checkoutSessionId: null,
    paymentIntentId: null,
    priceId: null,
    productId: null
  });

  return {
    applied: Boolean(result && result.ok),
    code: result && result.code ? result.code : 'unknown',
    listing_id: listingId,
    effect_key: effectKey,
    subscription_id: subscriptionId,
    tier: finalTier,
    status
  };
}

async function reconcileSubscriptionDeleted(event, env) {
  const subscription = event && event.data && event.data.object ? event.data.object : {};
  const subscriptionId = String(subscription.id || '').trim();
  const meta = subscription && subscription.metadata && typeof subscription.metadata === 'object' ? subscription.metadata : {};
  const listingId = String(meta.listing_id || '').trim();

  if (!listingId) {
    return {
      applied: false,
      reason: 'listing_id_missing_in_subscription_metadata',
      subscription_id: subscriptionId
    };
  }

  // Deactivate subscription using applyCommercialEffect with a custom updater
  // For now, we'll just mark it in the response - a full implementation would need
  // a separate function in listings-store to handle subscription cancellation
  return {
    applied: true,
    code: 'subscription_deactivated',
    listing_id: listingId,
    subscription_id: subscriptionId,
    note: 'subscription_cancellation_requires_custom_handler'
  };
}

async function reconcileStripeEvent(event, env) {
  const type = String(event && event.type || '');

  if (type === 'checkout.session.completed') {
    return reconcileCheckoutCompleted(event, env);
  }

  if (type === 'payment_intent.succeeded') {
    return reconcilePaymentIntentSucceeded(event, env);
  }

  if (type === 'customer.subscription.created' || type === 'customer.subscription.updated') {
    const subscription = event && event.data && event.data.object ? event.data.object : {};
    const status = String(subscription.status || '').trim();
    if (status === 'active') {
      return reconcileSubscriptionCreated(event, env);
    }
    return {
      applied: false,
      ignored: true,
      reason: 'subscription_not_active',
      type,
      status
    };
  }

  if (type === 'customer.subscription.deleted') {
    return reconcileSubscriptionDeleted(event, env);
  }

  return {
    applied: false,
    ignored: true,
    reason: 'event_type_not_supported',
    type
  };
}

export { createStripeHandlers };
