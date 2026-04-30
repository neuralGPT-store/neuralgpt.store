/**
 * Stripe client for Cloudflare Workers
 * Direct REST API calls using native fetch() - no npm Stripe library
 * Docs: https://stripe.com/docs/api
 */

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

/**
 * Create a Stripe Checkout Session
 * @param {Object} params - {mode, success_url, cancel_url, line_items, metadata}
 * @param {string} secretKey - Stripe secret key
 * @returns {Promise<{ok: boolean, session?: Object, error?: string}>}
 */
async function createCheckoutSession(params, secretKey) {
  if (!secretKey) {
    return { ok: false, error: 'stripe_secret_key_required' };
  }

  const body = new URLSearchParams();
  body.append('mode', params.mode || 'payment');
  body.append('success_url', params.success_url);
  body.append('cancel_url', params.cancel_url);

  // Line items
  if (Array.isArray(params.line_items)) {
    params.line_items.forEach((item, idx) => {
      body.append(`line_items[${idx}][price]`, item.price);
      body.append(`line_items[${idx}][quantity]`, item.quantity || 1);
    });
  }

  // Metadata
  if (params.metadata && typeof params.metadata === 'object') {
    Object.keys(params.metadata).forEach((key) => {
      body.append(`metadata[${key}]`, String(params.metadata[key] || ''));
    });
  }

  try {
    const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        error: 'stripe_api_error',
        message: data.error?.message || 'checkout_session_create_failed',
        status: response.status
      };
    }

    return { ok: true, session: data };
  } catch (error) {
    return {
      ok: false,
      error: 'stripe_request_failed',
      message: error.message || 'network_error'
    };
  }
}

/**
 * Construct webhook event from request body and signature
 * Validates Stripe signature using HMAC SHA256
 * @param {string} body - Raw webhook body
 * @param {string} signature - Stripe-Signature header
 * @param {string} secret - Webhook signing secret
 * @returns {Promise<{ok: boolean, event?: Object, error?: string}>}
 */
async function constructWebhookEvent(body, signature, secret) {
  if (!body || !signature || !secret) {
    return { ok: false, error: 'missing_required_parameters' };
  }

  try {
    // Parse signature header
    // Format: t=1492774577,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd
    const sigParts = {};
    signature.split(',').forEach((part) => {
      const [key, value] = part.split('=');
      if (key && value) {
        sigParts[key.trim()] = value.trim();
      }
    });

    const timestamp = sigParts.t;
    const expectedSignature = sigParts.v1;

    if (!timestamp || !expectedSignature) {
      return { ok: false, error: 'invalid_signature_format' };
    }

    // Construct signed payload: timestamp.body
    const signedPayload = `${timestamp}.${body}`;

    // Compute HMAC SHA256
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(signedPayload);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const computedSignature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Verify signature
    if (computedSignature !== expectedSignature) {
      return { ok: false, error: 'signature_mismatch' };
    }

    // Parse event
    const event = JSON.parse(body);

    return { ok: true, event };
  } catch (error) {
    return {
      ok: false,
      error: 'webhook_verification_failed',
      message: error.message || 'unknown_error'
    };
  }
}

/**
 * List line items for a checkout session
 * @param {string} sessionId - Checkout session ID
 * @param {string} secretKey - Stripe secret key
 * @returns {Promise<{ok: boolean, lineItems?: Array, error?: string}>}
 */
async function listLineItems(sessionId, secretKey) {
  if (!sessionId || !secretKey) {
    return { ok: false, error: 'session_id_and_secret_key_required' };
  }

  try {
    const url = `${STRIPE_API_BASE}/checkout/sessions/${sessionId}/line_items?limit=10&expand[]=data.price.product`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        error: 'stripe_api_error',
        message: data.error?.message || 'list_line_items_failed',
        status: response.status
      };
    }

    return { ok: true, lineItems: data.data || [] };
  } catch (error) {
    return {
      ok: false,
      error: 'stripe_request_failed',
      message: error.message || 'network_error'
    };
  }
}

/**
 * List checkout sessions by payment intent
 * @param {string} paymentIntentId - Payment intent ID
 * @param {string} secretKey - Stripe secret key
 * @returns {Promise<{ok: boolean, sessions?: Array, error?: string}>}
 */
async function listCheckoutSessions(paymentIntentId, secretKey) {
  if (!paymentIntentId || !secretKey) {
    return { ok: false, error: 'payment_intent_id_and_secret_key_required' };
  }

  try {
    const url = `${STRIPE_API_BASE}/checkout/sessions?payment_intent=${paymentIntentId}&limit=1`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        error: 'stripe_api_error',
        message: data.error?.message || 'list_sessions_failed',
        status: response.status
      };
    }

    return { ok: true, sessions: data.data || [] };
  } catch (error) {
    return {
      ok: false,
      error: 'stripe_request_failed',
      message: error.message || 'network_error'
    };
  }
}

/**
 * List customers by email
 * @param {string} email - Customer email
 * @param {string} secretKey - Stripe secret key
 * @returns {Promise<{ok: boolean, customers?: Array, error?: string}>}
 */
async function listCustomers(email, secretKey) {
  if (!email || !secretKey) {
    return { ok: false, error: 'email_and_secret_key_required' };
  }

  try {
    const url = `${STRIPE_API_BASE}/customers?email=${encodeURIComponent(email)}&limit=1`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        error: 'stripe_api_error',
        message: data.error?.message || 'list_customers_failed',
        status: response.status
      };
    }

    return { ok: true, customers: data.data || [] };
  } catch (error) {
    return {
      ok: false,
      error: 'stripe_request_failed',
      message: error.message || 'network_error'
    };
  }
}

/**
 * Create a customer
 * @param {string} email - Customer email
 * @param {string} secretKey - Stripe secret key
 * @returns {Promise<{ok: boolean, customer?: Object, error?: string}>}
 */
async function createCustomer(email, secretKey) {
  if (!email || !secretKey) {
    return { ok: false, error: 'email_and_secret_key_required' };
  }

  try {
    const body = new URLSearchParams();
    body.append('email', email);

    const response = await fetch(`${STRIPE_API_BASE}/customers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        error: 'stripe_api_error',
        message: data.error?.message || 'create_customer_failed',
        status: response.status
      };
    }

    return { ok: true, customer: data };
  } catch (error) {
    return {
      ok: false,
      error: 'stripe_request_failed',
      message: error.message || 'network_error'
    };
  }
}

/**
 * Create a billing portal session
 * @param {string} customerId - Customer ID
 * @param {string} returnUrl - Return URL
 * @param {string} secretKey - Stripe secret key
 * @returns {Promise<{ok: boolean, session?: Object, error?: string}>}
 */
async function createBillingPortalSession(customerId, returnUrl, secretKey) {
  if (!customerId || !returnUrl || !secretKey) {
    return { ok: false, error: 'customer_id_return_url_and_secret_key_required' };
  }

  try {
    const body = new URLSearchParams();
    body.append('customer', customerId);
    body.append('return_url', returnUrl);

    const response = await fetch(`${STRIPE_API_BASE}/billing_portal/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        error: 'stripe_api_error',
        message: data.error?.message || 'create_portal_session_failed',
        status: response.status
      };
    }

    return { ok: true, session: data };
  } catch (error) {
    return {
      ok: false,
      error: 'stripe_request_failed',
      message: error.message || 'network_error'
    };
  }
}

export {
  createCheckoutSession,
  constructWebhookEvent,
  listLineItems,
  listCheckoutSessions,
  listCustomers,
  createCustomer,
  createBillingPortalSession
};
