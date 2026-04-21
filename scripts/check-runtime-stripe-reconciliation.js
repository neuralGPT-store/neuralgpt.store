#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { PassThrough } = require('stream');

const { createStripeHandlers } = require('../runtime/handlers/stripe');
const { writeStore, readStore } = require('../runtime/services/listings-store');

function createMockResponse() {
  return {
    headers: {},
    statusCode: 0,
    body: '',
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
    },
    end(payload) {
      this.body = payload == null ? '' : String(payload);
    }
  };
}

async function postWebhook(handlers, event) {
  const req = new PassThrough();
  req.headers = {
    'stripe-signature': 't=111,v1=fake-signature'
  };
  req.method = 'POST';
  req.url = '/api/stripe/webhook';

  const res = createMockResponse();
  const body = Buffer.from(JSON.stringify(event), 'utf8');

  const promise = handlers.webhook(req, res);
  req.end(body);
  await promise;

  let parsed;
  try {
    parsed = JSON.parse(res.body || '{}');
  } catch (_error) {
    parsed = null;
  }

  return { statusCode: res.statusCode, body: parsed };
}

async function run() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-stripe-reconcile-'));
  const storePath = path.join(tmpDir, 'listings-store.private.json');

  writeStore(storePath, [{
    id: 'lst-001',
    slug: 'demo-lst-001',
    title: 'Demo listing',
    status: 'published',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    edit_key_hash: 'x'
  }]);

  const sessionsByPaymentIntent = {
    pi_1: {
      id: 'cs_1',
      metadata: { listing_id: 'lst-001', checkout_type: 'contact_unlock' }
    },
    pi_2: {
      id: 'cs_2',
      metadata: { listing_id: 'lst-001', checkout_type: 'mas_visibilidad' }
    }
  };

  const firstLineItemBySession = {
    cs_1: { price: { id: 'price_contact_unlock', product: 'prod_contact_unlock' } },
    cs_2: { price: { id: 'price_mas_visibilidad', product: 'prod_mas_visibilidad' } },
    cs_3: { price: { id: 'price_sensacional', product: 'prod_sensacional' } },
    cs_4: { price: { id: 'price_plan_basico', product: 'prod_plan_basico' } },
    cs_5: { price: { id: 'price_plan_premium', product: 'prod_plan_premium' } }
  };

  const stripe = {
    webhooks: {
      constructEvent(raw, _signature, secret) {
        if (!secret) throw new Error('missing_webhook_secret');
        return JSON.parse(Buffer.from(raw).toString('utf8'));
      }
    },
    checkout: {
      sessions: {
        async listLineItems(sessionId) {
          const item = firstLineItemBySession[String(sessionId || '')] || null;
          return { data: item ? [item] : [] };
        },
        async list(params) {
          const pi = params && params.payment_intent;
          const session = sessionsByPaymentIntent[String(pi || '')] || null;
          return { data: session ? [session] : [] };
        }
      }
    }
  };

  const env = {
    stripeSecretKey: 'sk_test_runtime_dummy',
    stripeWebhookSecret: 'whsec_runtime_dummy',
    listingsStorePath: storePath,
    stripePriceContactUnlock: 'price_contact_unlock',
    stripePriceMasVisibilidad: 'price_mas_visibilidad',
    stripePriceSensacional: 'price_sensacional',
    stripePricePlanBasico: 'price_plan_basico',
    stripePricePlanPremium: 'price_plan_premium'
  };

  const handlers = createStripeHandlers(env, stripe);

  const events = [
    {
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_1',
          payment_intent: 'pi_1',
          metadata: { listing_id: 'lst-001', checkout_type: 'contact_unlock' }
        }
      }
    },
    {
      id: 'evt_2',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_1',
          metadata: {}
        }
      }
    },
    {
      id: 'evt_3',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_2',
          metadata: {}
        }
      }
    },
    {
      id: 'evt_4',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_3',
          payment_intent: 'pi_3',
          metadata: { listing_id: 'lst-001', checkout_type: 'sensacional_24h' }
        }
      }
    },
    {
      id: 'evt_5',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_4',
          payment_intent: 'pi_4',
          metadata: { listing_id: 'lst-001', checkout_type: 'plan_basico' }
        }
      }
    },
    {
      id: 'evt_6',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_5',
          payment_intent: 'pi_5',
          metadata: { listing_id: 'lst-001', checkout_type: 'plan_premium' }
        }
      }
    }
  ];

  const responses = [];
  for (const event of events) {
    // eslint-disable-next-line no-await-in-loop
    responses.push(await postWebhook(handlers, event));
  }

  const rows = readStore(storePath);
  const listing = rows.find((row) => String(row.id) === 'lst-001') || null;
  const commercial = listing && listing.commercial ? listing.commercial : {};
  const effects = commercial.effects || {};

  const checks = [
    ['webhook_http_ok', responses.every((r) => r.statusCode === 200)],
    ['contact_unlock_count_1_idempotent', Number((effects.contact_unlock && effects.contact_unlock.count) || 0) === 1],
    ['mas_visibilidad_count_1', Number((effects.mas_visibilidad && effects.mas_visibilidad.count) || 0) === 1],
    ['sensacional_count_1', Number((effects.sensacional_24h && effects.sensacional_24h.count) || 0) === 1],
    ['plan_basico_count_1', Number((effects.plan_basico && effects.plan_basico.count) || 0) === 1],
    ['plan_premium_count_1', Number((effects.plan_premium && effects.plan_premium.count) || 0) === 1],
    ['subscription_tier_premium', String((commercial.subscription && commercial.subscription.tier) || '') === 'premium'],
    ['visibility_rank_1', Number(listing && listing.visibility_rank || 0) === 1],
    ['sensacional_until_present', Boolean(commercial.sensacional_until)]
  ];

  const failed = checks.filter((entry) => !entry[1]);

  console.log('RUNTIME STRIPE RECONCILIATION CHECK');
  console.log('store:', storePath);
  for (const [name, ok] of checks) {
    console.log('-', name, ok ? 'OK' : 'FAIL');
  }

  if (failed.length > 0) {
    console.error('\nFAILED checks:', failed.map((entry) => entry[0]).join(', '));
    process.exit(2);
  }

  console.log('\nPASS');
}

run().catch((error) => {
  console.error('fatal:', error && error.stack ? error.stack : error);
  process.exit(1);
});
